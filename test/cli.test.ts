import { type ChildProcess, execFile, spawn } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { get } from "node:http";
import { createServer } from "node:net";
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

// Ask the OS for a free TCP port, then release it so the CLI can claim it.
// There is an unavoidable TOCTOU window between releasing the probe and the CLI
// re-binding; on a busy host another process could grab the port first. We use
// it only because the CLI needs to be told the port before it starts.
function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const probe = createServer();
    probe.on("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const address = probe.address();
      const port = typeof address === "object" && address ? address.port : 0;
      probe.close(() => resolve(port));
    });
  });
}

// Spawn the long-lived `--serve` CLI and resolve once it reports its URL.
// `mermaidErd` waits for the process to exit, which never happens while serving.
// `stderr` is the output captured up to the URL line (includes any warning).
function spawnServe(
  args: string[],
): Promise<{ port: number; child: ChildProcess; stderr: string }> {
  const child = spawn("node", ["--import", "tsx", cli, ...args]);
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error("server did not start within 15s"));
    }, 15_000);
    let stderr = "";
    child.stderr?.on("data", (chunk) => {
      stderr += chunk;
      const match = stderr.match(/Serving ERD at (\S+)/);
      if (match) {
        clearTimeout(timer);
        const port = Number(new URL(match[1]).port);
        resolve({ port, child, stderr });
      }
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      clearTimeout(timer);
      reject(new Error(`server exited early (code ${code}): ${stderr}`));
    });
  });
}

// Terminate a served CLI and wait for it to exit so the port is freed before
// the next test runs.
function stopServe(child: ChildProcess): Promise<void> {
  return new Promise((resolve) => {
    child.once("exit", () => resolve());
    child.kill();
  });
}

function httpGet(port: number): Promise<{ body: string; contentType?: string }> {
  return new Promise((resolve, reject) => {
    get({ host: "127.0.0.1", port, path: "/" }, (res) => {
      let body = "";
      res.on("data", (chunk) => {
        body += chunk;
      });
      res.on("end", () => resolve({ body, contentType: res.headers["content-type"] }));
    }).on("error", reject);
  });
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

describe("CLI --serve", () => {
  it("serves the HTML viewer as text/html on the port given by --port", async () => {
    const port = await freePort();
    const { child, stderr } = await spawnServe(["--db", dbPath, "--serve", "--port", String(port)]);
    try {
      const { body, contentType } = await httpGet(port);
      expect(body).toContain("window.SCHEMA_DATA=");
      expect(contentType).toBe("text/html; charset=utf-8");
      // Loopback bind: advertised as localhost, no exposure warning.
      expect(stderr).toContain(`http://localhost:${port}/`);
      expect(stderr).not.toContain("warning:");
    } finally {
      await stopServe(child);
    }
  }, 20_000);

  it("starts on an OS-assigned port that it actually serves when --port is omitted", async () => {
    const { port, child } = await spawnServe(["--db", dbPath, "--serve"]);
    try {
      expect(port).toBeGreaterThan(0);
      expect(port).toBeLessThanOrEqual(65535);
      const { body } = await httpGet(port);
      expect(body).toContain("window.SCHEMA_DATA=");
    } finally {
      await stopServe(child);
    }
  }, 20_000);

  it("warns and binds every interface when --host is 0.0.0.0, staying reachable via localhost", async () => {
    const port = await freePort();
    const { child, stderr } = await spawnServe([
      "--db",
      dbPath,
      "--serve",
      "--host",
      "0.0.0.0",
      "--port",
      String(port),
    ]);
    try {
      expect(stderr).toContain("reachable from other machines on the network");
      expect(stderr).toContain(`http://localhost:${port}/`);
      const { body } = await httpGet(port);
      expect(body).toContain("window.SCHEMA_DATA=");
    } finally {
      await stopServe(child);
    }
  }, 20_000);

  it("exits with an error when the --port is already in use", async () => {
    const port = await freePort();
    const blocker = createServer();
    await new Promise<void>((resolve) => blocker.listen(port, "127.0.0.1", resolve));
    try {
      await expect(
        mermaidErd(["--db", dbPath, "--serve", "--port", String(port)]),
      ).rejects.toMatchObject({
        stderr: expect.stringContaining(`port ${port} is already in use`),
      });
    } finally {
      blocker.close();
    }
  });

  it("rejects an out-of-range --port before starting", async () => {
    await expect(mermaidErd(["--db", dbPath, "--serve", "--port", "99999"])).rejects.toMatchObject({
      stderr: expect.stringContaining('invalid --port "99999"'),
    });
  });

  // `--port -1` is rejected one layer earlier by parseArgs (a leading "-" looks
  // like an option), so negative values never reach this validator.
  it.each([
    "abc",
    "0x50",
    "1e3",
    "3000.5",
    "",
  ])("rejects the malformed --port %j before starting", async (bad) => {
    await expect(mermaidErd(["--db", dbPath, "--serve", "--port", bad])).rejects.toMatchObject({
      stderr: expect.stringContaining("invalid --port"),
    });
  });

  it("warns that --port has no effect without --serve", async () => {
    const { stderr } = await mermaidErd(["--db", dbPath, "--format", "mermaid", "--port", "3000"]);
    expect(stderr).toContain("--port and --host only take effect with --serve");
  });
});
