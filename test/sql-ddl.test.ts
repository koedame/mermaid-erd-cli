import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseSqlDdl } from "../src/introspect/dump/sql-ddl.js";

const fixture = join(dirname(fileURLToPath(import.meta.url)), "fixtures", "schema.sql");
const schema = parseSqlDdl(readFileSync(fixture, "utf8"));
const table = (name: string) => schema.tables.find((t) => t.name === name)!;

describe("parseSqlDdl", () => {
  it("parses every CREATE TABLE", () => {
    expect(schema.tables.map((t) => t.name).sort()).toEqual([
      "post_tags",
      "posts",
      "tags",
      "teams",
      "users",
    ]);
  });

  it("detects inline and table-level primary keys", () => {
    expect(table("teams").columns.find((c) => c.name === "id")!.primaryKey).toBe(true);
    const pk = table("post_tags")
      .columns.filter((c) => c.primaryKey)
      .map((c) => c.name);
    expect(pk).toEqual(["post_id", "tag_id"]);
  });

  it("reads NOT NULL", () => {
    expect(table("users").columns.find((c) => c.name === "team_id")!.nullable).toBe(false);
    expect(table("users").columns.find((c) => c.name === "manager_id")!.nullable).toBe(true);
  });

  it("collects inline, table-level, and ALTER TABLE foreign keys", () => {
    expect(table("users").foreignKeys.some((fk) => fk.referencedTable === "teams")).toBe(true);
    expect(table("users").foreignKeys.some((fk) => fk.columns[0] === "manager_id")).toBe(true);
    expect(table("posts").foreignKeys.some((fk) => fk.referencedTable === "users")).toBe(true);
  });

  it("keeps composite foreign keys in the join table", () => {
    expect(table("post_tags").foreignKeys).toHaveLength(2);
  });

  it("does not absorb inline constraints into the column type", () => {
    const t = parseSqlDdl(`CREATE TABLE t (
      id bigint PRIMARY KEY,
      qty integer NOT NULL,
      created timestamp without time zone DEFAULT now(),
      price numeric(10,2) NOT NULL,
      tags text[] NOT NULL
    );`).tables[0];
    const typeOf = (n: string) => t.columns.find((c) => c.name === n)!.type;
    expect(typeOf("id")).toBe("bigint");
    expect(typeOf("qty")).toBe("integer");
    expect(typeOf("created")).toBe("timestamp without time zone");
    expect(typeOf("price")).toBe("numeric(10,2)");
    expect(typeOf("tags")).toBe("text[]");
  });

  it("deduplicates an FK declared both inline and as a table-level clause", () => {
    const t = parseSqlDdl(`CREATE TABLE child (
      parent_id bigint NOT NULL REFERENCES parent (id),
      FOREIGN KEY (parent_id) REFERENCES parent (id)
    );`).tables[0];
    expect(t.foreignKeys).toHaveLength(1);
    expect(t.foreignKeys[0].columns).toEqual(["parent_id"]);
    expect(t.foreignKeys[0].referencedTable).toBe("parent");
  });

  it("extracts clean FK column names from a table-level clause (no trailing paren)", () => {
    const t = parseSqlDdl(`CREATE TABLE child (
      a bigint,
      FOREIGN KEY (a) REFERENCES parent (id)
    );`).tables[0];
    expect(t.foreignKeys[0].columns).toEqual(["a"]);
  });

  it("ignores SQL keywords and commas inside string literals", () => {
    const parsed = parseSqlDdl(`
      CREATE TABLE notes (
        id int PRIMARY KEY,
        body text DEFAULT 'see references manual',
        tags text DEFAULT 'a, b, c',
        flag text DEFAULT 'not null allowed',
        note text COMMENT 'kept'
      );
      CREATE TABLE manual (id int PRIMARY KEY);
    `);
    const notes = parsed.tables.find((t) => t.name === "notes")!;
    // No phantom FK from the word "references" inside a default literal.
    expect(notes.foreignKeys).toEqual([]);
    // The comma inside 'a, b, c' must not split the column list.
    expect(notes.columns.map((c) => c.name)).toEqual(["id", "body", "tags", "flag", "note"]);
    // "not null" inside a literal must not flip nullability.
    expect(notes.columns.find((c) => c.name === "flag")!.nullable).toBe(true);
    // Real inline COMMENT is still read.
    expect(notes.columns.find((c) => c.name === "note")!.comment).toBe("kept");
  });

  it("handles quoted schema-qualified identifiers (pg_dump mixed-case names)", () => {
    const parsed = parseSqlDdl(`
      CREATE TABLE "public"."Order" ( id integer NOT NULL, "userId" integer );
      CREATE TABLE "public"."User" ( id integer PRIMARY KEY );
      ALTER TABLE ONLY "public"."Order"
        ADD CONSTRAINT fk FOREIGN KEY ("userId") REFERENCES "public"."User"(id);
      COMMENT ON COLUMN "public"."Order"."userId" IS 'buyer';
    `);
    expect(parsed.tables.map((t) => t.name).sort()).toEqual(["Order", "User"]);
    const order = parsed.tables.find((t) => t.name === "Order")!;
    expect(order.foreignKeys).toEqual([{ columns: ["userId"], referencedTable: "User" }]);
    expect(order.columns.find((c) => c.name === "userId")!.comment).toBe("buyer");
  });

  it("handles identifiers containing an escaped (doubled) delimiter", () => {
    const parsed = parseSqlDdl(`CREATE TABLE "a""b" ( id integer PRIMARY KEY );`);
    expect(parsed.tables.map((t) => t.name)).toEqual(['a"b']);
  });

  it("does not drop tables when a quoted identifier contains an apostrophe or paren", () => {
    const parsed = parseSqlDdl(`
      CREATE TABLE t1 (id integer PRIMARY KEY, "O'Brien" text NOT NULL, email text);
      CREATE TABLE t2 (id int PRIMARY KEY, "a)b" text NOT NULL, c int);
      CREATE TABLE t3 (id int PRIMARY KEY, x text DEFAULT 'hi');
    `);
    expect(parsed.tables.map((t) => t.name)).toEqual(["t1", "t2", "t3"]);
    expect(parsed.tables[0].columns.map((c) => c.name)).toEqual(["id", "O'Brien", "email"]);
    expect(parsed.tables[1].columns.map((c) => c.name)).toEqual(["id", "a)b", "c"]);
  });

  it("resolves a table-level FOREIGN KEY whose quoted column name contains a paren", () => {
    const parsed = parseSqlDdl(`
      CREATE TABLE p (id int PRIMARY KEY);
      CREATE TABLE c (id int PRIMARY KEY, "a)b" int, FOREIGN KEY ("a)b") REFERENCES p (id));
    `);
    const c = parsed.tables.find((t) => t.name === "c")!;
    expect(c.foreignKeys).toEqual([{ columns: ["a)b"], referencedTable: "p" }]);
  });

  it("keeps quoted column names with spaces/commas in key clauses", () => {
    const parsed = parseSqlDdl(`
      CREATE TABLE p (id int PRIMARY KEY);
      CREATE TABLE t (id int, "first name" text, "a,b" int, PRIMARY KEY ("first name", id));
      ALTER TABLE t ADD FOREIGN KEY ("a,b") REFERENCES p (id);
    `);
    const t = parsed.tables.find((x) => x.name === "t")!;
    expect(
      t.columns
        .filter((c) => c.primaryKey)
        .map((c) => c.name)
        .sort(),
    ).toEqual(["first name", "id"]);
    expect(t.foreignKeys).toEqual([{ columns: ["a,b"], referencedTable: "p" }]);
  });

  it("resolves an inline REFERENCES to a quoted/case-sensitive table name", () => {
    const parsed = parseSqlDdl(`
      CREATE TABLE "Order" ( id integer PRIMARY KEY, "userId" integer REFERENCES "public"."User"(id) );
      CREATE TABLE "public"."User" ( id integer PRIMARY KEY );
    `);
    const order = parsed.tables.find((t) => t.name === "Order")!;
    // The quoted referenced name must survive masking (was blanked -> dropped edge).
    expect(order.foreignKeys).toEqual([{ columns: ["userId"], referencedTable: "User" }]);
  });

  it("reads pg_dump COMMENT ON TABLE/COLUMN statements", () => {
    const parsed = parseSqlDdl(`CREATE TABLE users (id bigint PRIMARY KEY, email text);
      COMMENT ON TABLE users IS 'app users';
      COMMENT ON COLUMN public.users.email IS 'login address';`);
    const t = parsed.tables[0];
    expect(t.comment).toBe("app users");
    expect(t.columns.find((c) => c.name === "email")!.comment).toBe("login address");
  });
});
