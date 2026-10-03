/**
 * End-to-end check of the generated viewer: open the HTML in a real headless
 * browser, drive the UI, and assert Mermaid actually renders an ERD. Exits
 * non-zero on any failure so it can gate CI / the dev loop.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import Database from "better-sqlite3";
import { type BrowserContext, chromium } from "playwright";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const work = mkdtempSync(join(tmpdir(), "merd-e2e-"));
const dbPath = join(work, "sample.sqlite3");
const outDir = join(work, "erd");
const outHtml = join(outDir, "index.html");
const screenshot = join(root, "test", "tmp", "e2e-screenshot.png");
const hostileSql = join(root, "test", "fixtures", "hostile.sql");
const hostileHtml = join(outDir, "hostile.html");
const PAYLOAD = "</script><img src=x onerror=window.__x=1>";

const EXPECTED_TABLES = ["post_tags", "posts", "tags", "teams", "users"];

function fail(message: string): never {
  console.error(`E2E FAIL: ${message}`);
  rmSync(work, { recursive: true, force: true });
  process.exit(1);
}

function seed(): void {
  const db = new Database(dbPath);
  db.exec(`
    CREATE TABLE teams (id INTEGER PRIMARY KEY, name TEXT NOT NULL);
    CREATE TABLE users (
      id INTEGER PRIMARY KEY,
      team_id INTEGER NOT NULL REFERENCES teams(id),
      manager_id INTEGER REFERENCES users(id),
      email TEXT NOT NULL
    );
    CREATE TABLE posts (id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), title TEXT);
    CREATE TABLE tags (id INTEGER PRIMARY KEY, name TEXT);
    CREATE TABLE post_tags (
      post_id INTEGER NOT NULL REFERENCES posts(id),
      tag_id INTEGER NOT NULL REFERENCES tags(id),
      PRIMARY KEY (post_id, tag_id)
    );
    CREATE TABLE schema_migrations (version TEXT PRIMARY KEY);
  `);
  db.close();
}

// Table/column names, comments and --title come from the user's database, so a
// value that looks like markup must show up as text and never run or load.
async function checkHostileSchema(context: BrowserContext): Promise<void> {
  execFileSync(
    "node",
    [
      join(root, "dist", "cli.js"),
      "--schema",
      hostileSql,
      "--out",
      hostileHtml,
      "--title",
      PAYLOAD,
    ],
    { stdio: "inherit" },
  );

  const page = await context.newPage();
  const problems: string[] = [];
  page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));
  page.on("request", (r) => {
    if (!/^(file|data):/.test(r.url())) problems.push(`request: ${r.url()}`);
  });
  await page.goto(pathToFileURL(hostileHtml).href);

  const checkboxes = page.locator(".model-list input[type=checkbox]");
  await checkboxes.first().waitFor({ timeout: 15_000 });
  const count = await checkboxes.count();
  if (count !== 2) fail(`hostile schema: expected 2 table checkboxes, found ${count}`);
  // Comments are only drawn when these options are on, so turn both on.
  await page.getByText("Show Column Comment", { exact: false }).first().click();
  await page.getByText("Show Relationship Comment", { exact: false }).first().click();
  for (let i = 0; i < count; i++) await checkboxes.nth(i).click();
  const svg = page.locator("#preview > svg");
  await svg.waitFor({ state: "attached", timeout: 20_000 });

  if ((await page.evaluate(() => (window as { __x?: number }).__x)) !== undefined) {
    fail("hostile schema: an injected onerror handler ran");
  }
  const injected = await page.locator("img[src=x]").count();
  if (injected) fail(`hostile schema: ${injected} injected <img> element(s) in the DOM`);
  if (!((await svg.textContent()) ?? "").includes("posts")) {
    fail("hostile schema: the diagram did not render");
  }
  if (await page.locator('[role="alert"]').count()) {
    fail("hostile schema: a render-error banner is visible");
  }
  if (problems.length) fail(`hostile schema: ${problems.join("\n")}`);
  await page.close();
}

async function main(): Promise<void> {
  mkdirSync(join(root, "test", "tmp"), { recursive: true });
  seed();
  execFileSync("node", [join(root, "dist", "cli.js"), "--db", dbPath, "--out", outHtml], {
    stdio: "inherit",
  });

  const browser = await chromium.launch();
  const context = await browser.newContext({
    permissions: ["clipboard-read", "clipboard-write"],
    acceptDownloads: true,
  });
  const page = await context.newPage();

  const consoleErrors: string[] = [];
  page.on("pageerror", (e) => consoleErrors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error") consoleErrors.push(`console.error: ${m.text()}`);
  });

  // Only the file itself and inline data: URLs may be fetched; anything else
  // means the viewer reaches out to the network.
  const outsideRequests: string[] = [];
  page.on("request", (r) => {
    if (!/^(file|data):/.test(r.url())) outsideRequests.push(r.url());
  });

  await page.goto(pathToFileURL(outHtml).href);

  // 1. Schema injected; schema_migrations excluded by the default ignore list.
  const checkboxes = page.locator(".model-list input[type=checkbox]");
  await checkboxes.first().waitFor({ timeout: 15_000 });
  const count = await checkboxes.count();
  if (count !== EXPECTED_TABLES.length) {
    fail(`expected ${EXPECTED_TABLES.length} table checkboxes, found ${count}`);
  }

  // 2. Select every table and wait for Mermaid to render an SVG.
  for (let i = 0; i < count; i++) await checkboxes.nth(i).click();
  const svg = page.locator("#preview > svg");
  await svg.waitFor({ state: "attached", timeout: 20_000 });

  const svgText = (await svg.textContent()) ?? "";
  for (const table of EXPECTED_TABLES) {
    if (!svgText.includes(table)) fail(`rendered SVG is missing entity "${table}"`);
  }

  // 3. Render error banner must not be showing.
  if (await page.locator('[role="alert"]').count()) {
    fail("a render-error banner is visible");
  }

  if (outsideRequests.length) {
    fail(`the viewer made requests outside file:/data::\n${outsideRequests.join("\n")}`);
  }

  await page.screenshot({ path: screenshot, fullPage: true });

  // 4. Copy-as-Markdown puts a fenced mermaid block on the clipboard.
  await page.getByText("Copy Markdown Code", { exact: false }).first().click();
  const clip = await page.evaluate(() => navigator.clipboard.readText());
  if (!clip.startsWith("```mermaid") || !clip.includes("erDiagram")) {
    fail(`clipboard did not contain a mermaid markdown block:\n${clip.slice(0, 80)}`);
  }

  // 5. PNG export triggers a real download.
  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout: 15_000 }),
    page.getByText("Download PNG File", { exact: false }).first().click(),
  ]);
  const pngPath = join(work, "erd.png");
  await download.saveAs(pngPath);
  if (statSync(pngPath).size < 100) fail("exported PNG is empty");

  if (consoleErrors.length) fail(`browser reported errors:\n${consoleErrors.join("\n")}`);

  await checkHostileSchema(context);

  await browser.close();
  rmSync(work, { recursive: true, force: true });
  console.log(
    `E2E PASS: ${count} tables rendered, markdown copy + PNG export verified, no outside requests, hostile schema inert.`,
  );
  console.log(`Screenshot: ${screenshot}`);
}

main().catch((e) => fail(e instanceof Error ? (e.stack ?? e.message) : String(e)));
