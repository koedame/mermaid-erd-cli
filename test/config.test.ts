import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadIgnoreTables, parseIgnoreTablesYaml } from "../src/config.js";

describe("parseIgnoreTablesYaml", () => {
  it("reads a block list with quoted and bare entries", () => {
    const text = ["ignore_tables:", '  - "^schema_migrations$"', "  - _old$", ""].join("\n");
    expect(parseIgnoreTablesYaml(text)).toEqual(["^schema_migrations$", "_old$"]);
  });

  it("reads a flow list on one line", () => {
    expect(parseIgnoreTablesYaml('ignore_tables: ["a", "b"]')).toEqual(["a", "b"]);
  });

  it("ignores comments and stops at the next key", () => {
    const text = [
      "# config",
      "ignore_tables:",
      "  - ^temp_  # scratch tables",
      "  - _bak$",
      "other_key: value",
      "  - not_part_of_list",
    ].join("\n");
    expect(parseIgnoreTablesYaml(text)).toEqual(["^temp_", "_bak$"]);
  });

  it("ignores a trailing comment after a flow list, even one containing ]", () => {
    expect(parseIgnoreTablesYaml('ignore_tables: ["^a$", "_b$"]  # see foo[1]')).toEqual([
      "^a$",
      "_b$",
    ]);
  });

  it("keeps a # that is inside a quoted value (not a comment)", () => {
    expect(parseIgnoreTablesYaml('ignore_tables: ["a # b", "c"]')).toEqual(["a # b", "c"]);
    const block = ["ignore_tables:", '  - "a # b"', "  - bare$ # real comment"].join("\n");
    expect(parseIgnoreTablesYaml(block)).toEqual(["a # b", "bare$"]);
  });

  it("returns an empty list when ignore_tables is absent", () => {
    expect(parseIgnoreTablesYaml("other: 1\n")).toEqual([]);
  });
});

describe("loadIgnoreTables", () => {
  let dir: string;
  let cwd: string;

  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), "merd-config-"));
    cwd = process.cwd();
  });
  afterAll(() => {
    process.chdir(cwd);
    rmSync(dir, { recursive: true, force: true });
  });

  it("reads the list from a config file that was named", async () => {
    const file = join(dir, "named.yml");
    writeFileSync(file, "ignore_tables:\n  - ^secret_\n");
    expect(await loadIgnoreTables(file)).toEqual(["^secret_"]);
  });

  it("rejects when a named config file does not exist", async () => {
    await expect(loadIgnoreTables(join(dir, "missing.yml"))).rejects.toThrow(/cannot read config/);
  });

  it("rejects when a named config path is a directory", async () => {
    await expect(loadIgnoreTables(dir)).rejects.toThrow(/cannot read config/);
  });

  it("returns null when no config was named and the default file is absent", async () => {
    process.chdir(dir);
    expect(await loadIgnoreTables()).toBeNull();
  });

  it("rejects when no config was named and the default path is unreadable", async () => {
    const unreadable = mkdtempSync(join(dir, "unreadable-"));
    // A directory sitting at the default path fails with EISDIR, not ENOENT.
    mkdirSync(join(unreadable, "mermaid-erd.yml"));
    process.chdir(unreadable);
    await expect(loadIgnoreTables()).rejects.toThrow(/cannot read config/);
  });
});
