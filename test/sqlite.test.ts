import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildSchemaData } from "../src/build.js";
import { SqliteIntrospector } from "../src/introspect/sqlite.js";
import type { RawSchema } from "../src/types.js";

let dir: string;
let dbPath: string;
let schema: RawSchema;

beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), "merd-"));
  dbPath = join(dir, "sample.sqlite3");
  const db = new Database(dbPath);
  db.exec(`
    CREATE TABLE teams (id INTEGER PRIMARY KEY, name TEXT NOT NULL);
    CREATE TABLE users (
      id INTEGER PRIMARY KEY,
      team_id INTEGER NOT NULL REFERENCES teams(id),
      manager_id INTEGER REFERENCES users(id),
      email TEXT NOT NULL
    );
    CREATE TABLE posts (
      id INTEGER PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      title TEXT
    );
  `);
  db.close();
  schema = await new SqliteIntrospector(dbPath).introspect();
});

afterAll(() => rmSync(dir, { recursive: true, force: true }));

describe("SqliteIntrospector", () => {
  it("lists user tables", () => {
    expect(schema.tables.map((t) => t.name).sort()).toEqual(["posts", "teams", "users"]);
  });

  it("reads primary keys, nullability, and foreign keys", () => {
    const users = schema.tables.find((t) => t.name === "users")!;
    expect(users.columns.find((c) => c.name === "id")!.primaryKey).toBe(true);
    expect(users.columns.find((c) => c.name === "team_id")!.nullable).toBe(false);
    expect(users.columns.find((c) => c.name === "manager_id")!.nullable).toBe(true);
    expect(users.foreignKeys.map((fk) => fk.referencedTable).sort()).toEqual(["teams", "users"]);
  });

  it("produces a self-referencing optional relation through the builder", () => {
    const { Relations } = buildSchemaData(schema);
    const self = Relations.find(
      (r) => r.LeftModelName === "users" && r.RightModelName === "users",
    )!;
    expect(self.LeftValue).toBe("|o");
  });
});
