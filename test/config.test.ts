import { describe, expect, it } from "vitest";
import { parseIgnoreTablesYaml } from "../src/config.js";

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
