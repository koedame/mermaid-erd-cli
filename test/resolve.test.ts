import { describe, expect, it } from "vitest";
import { resolveIntrospector } from "../src/introspect/index.js";
import { MysqlIntrospector } from "../src/introspect/mysql.js";
import { PostgresIntrospector } from "../src/introspect/postgres.js";
import { SqliteIntrospector } from "../src/introspect/sqlite.js";

describe("resolveIntrospector", () => {
  it("selects the Postgres introspector for a postgres:// URL", async () => {
    const i = await resolveIntrospector({ db: "postgres://u:p@localhost/db" });
    expect(i).toBeInstanceOf(PostgresIntrospector);
  });

  it("threads --pg-schema into the Postgres introspector", async () => {
    const i = (await resolveIntrospector({
      db: "postgres://u:p@localhost/db",
      pgSchema: "analytics",
    })) as PostgresIntrospector;
    expect(i.schema).toBe("analytics");
  });

  it("defaults the Postgres schema to public", async () => {
    const i = (await resolveIntrospector({
      db: "postgres://u:p@localhost/db",
    })) as PostgresIntrospector;
    expect(i.schema).toBe("public");
  });

  it("selects MySQL and SQLite introspectors by URL/extension", async () => {
    expect(await resolveIntrospector({ db: "mysql://u:p@localhost/db" })).toBeInstanceOf(
      MysqlIntrospector,
    );
    expect(await resolveIntrospector({ db: "./dev.sqlite3" })).toBeInstanceOf(SqliteIntrospector);
  });

  it("rejects passing both --db and --schema", async () => {
    await expect(
      resolveIntrospector({ db: "postgres://x/y", schema: "schema.rb" }),
    ).rejects.toThrow(/not both/);
  });

  it("rejects an unrecognized database URL", async () => {
    await expect(resolveIntrospector({ db: "ftp://nope" })).rejects.toThrow(/detect database type/);
  });
});
