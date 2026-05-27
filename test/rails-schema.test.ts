import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseRailsSchema } from "../src/introspect/dump/rails-schema.js";

const fixture = join(dirname(fileURLToPath(import.meta.url)), "fixtures", "schema.rb");
const schema = parseRailsSchema(readFileSync(fixture, "utf8"));
const table = (name: string) => schema.tables.find((t) => t.name === name)!;

describe("parseRailsSchema", () => {
  it("adds an implicit bigint id primary key", () => {
    const id = table("teams").columns.find((c) => c.name === "id")!;
    expect(id.primaryKey).toBe(true);
    expect(id.type).toBe("bigint");
  });

  it("honors a custom primary key declaration", () => {
    const version = table("schema_migrations").columns.find((c) => c.name === "version")!;
    expect(version.primaryKey).toBe(true);
    expect(version.type).toBe("string");
  });

  it("expands t.references into a *_id column", () => {
    expect(table("users").columns.find((c) => c.name === "team_id")).toBeDefined();
    expect(table("users").columns.find((c) => c.name === "team_id")!.nullable).toBe(false);
  });

  it("expands t.timestamps into created_at and updated_at", () => {
    const names = table("posts").columns.map((c) => c.name);
    expect(names).toContain("created_at");
    expect(names).toContain("updated_at");
  });

  it("captures the table comment", () => {
    expect(table("users").comment).toBe("application users");
  });

  it("derives foreign keys from references and add_foreign_key without duplicating", () => {
    const userFks = table("users").foreignKeys;
    expect(userFks.some((fk) => fk.referencedTable === "teams")).toBe(true);
    expect(userFks.some((fk) => fk.columns[0] === "manager_id")).toBe(true);
    // posts has a foreign_key:true reference AND an add_foreign_key line.
    expect(table("posts").foreignKeys.filter((fk) => fk.columns[0] === "user_id")).toHaveLength(1);
  });
});
