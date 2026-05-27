import { execFile } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import Database from "better-sqlite3";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const run = promisify(execFile);
const here = fileURLToPath(new URL(".", import.meta.url));
const cli = join(here, "..", "src", "cli.ts");

let dir: string;
let dbPath: string;

// Run the CLI from TypeScript source via tsx so the test doesn't depend on a
// prior build step.
function mermaidErd(args: string[]) {
  return run("node", ["--import", "tsx", cli, ...args], { maxBuffer: 64 * 1024 * 1024 });
}

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), "merd-cli-"));
  dbPath = join(dir, "sample.sqlite3");
  const db = new Database(dbPath);
  db.exec(`
    CREATE TABLE teams (id INTEGER PRIMARY KEY, name TEXT NOT NULL);
    CREATE TABLE users (id INTEGER PRIMARY KEY, team_id INTEGER NOT NULL REFERENCES teams(id), email TEXT NOT NULL);
  `);
  db.close();
});

afterAll(() => rmSync(dir, { recursive: true, force: true }));

describe("CLI output", () => {
  it("streams Mermaid text to stdout by default for --format mermaid", async () => {
    const { stdout } = await mermaidErd(["--db", dbPath, "--format", "mermaid"]);
    expect(stdout.startsWith("erDiagram")).toBe(true);
    expect(stdout).toContain("teams ||--o{ users");
  });

  it("keeps stdout free of log noise so it pipes cleanly", async () => {
    const { stdout, stderr } = await mermaidErd(["--db", dbPath, "--format", "mermaid"]);
    expect(stdout).not.toMatch(/tables, .*relations/);
    expect(stderr).toContain("tables");
  });

  it("emits parseable JSON for --format json", async () => {
    const { stdout } = await mermaidErd(["--db", dbPath, "--format", "json"]);
    const data = JSON.parse(stdout);
    expect(data.Models.map((m: { TableName: string }) => m.TableName).sort()).toEqual([
      "teams",
      "users",
    ]);
  });

  it("writes the HTML viewer to stdout when --out is '-'", async () => {
    const { stdout } = await mermaidErd(["--db", dbPath, "--format", "html", "--out", "-"]);
    expect(stdout).toContain("window.SCHEMA_DATA=");
    expect(stdout.length).toBeGreaterThan(1_000_000);
  });

  it("writes a file when --out is a path", async () => {
    const out = join(dir, "out", "erd.html");
    await mermaidErd(["--db", dbPath, "--out", out]);
    expect(existsSync(out)).toBe(true);
    expect(await readFile(out, "utf8")).toContain("window.SCHEMA_DATA=");
  });

  it("accepts mmd as an alias for mermaid", async () => {
    const { stdout } = await mermaidErd(["--db", dbPath, "--format", "mmd"]);
    expect(stdout.startsWith("erDiagram")).toBe(true);
  });
});
