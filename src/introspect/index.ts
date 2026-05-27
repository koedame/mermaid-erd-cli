import { readFile } from "node:fs/promises";
import { extname } from "node:path";
import type { Introspector } from "../types.js";
import { RailsSchemaIntrospector } from "./dump/rails-schema.js";
import { SqlDdlIntrospector } from "./dump/sql-ddl.js";
import { MysqlIntrospector } from "./mysql.js";
import { PostgresIntrospector } from "./postgres.js";
import { SqliteIntrospector } from "./sqlite.js";

export interface SourceOptions {
  db?: string;
  schema?: string;
  /** PostgreSQL schema to introspect (default `public`). */
  pgSchema?: string;
}

/** Resolve a CLI source spec to the appropriate introspector. */
export async function resolveIntrospector(opts: SourceOptions): Promise<Introspector> {
  if (opts.db && opts.schema) {
    throw new Error("Pass either --db or --schema, not both.");
  }

  if (opts.schema) {
    const content = await readFile(opts.schema, "utf8");
    const ext = extname(opts.schema).toLowerCase();
    if (ext === ".rb" || /ActiveRecord::Schema/.test(content)) {
      return new RailsSchemaIntrospector(content);
    }
    return new SqlDdlIntrospector(content);
  }

  if (opts.db) {
    return introspectorForUrl(opts.db, opts.pgSchema);
  }

  throw new Error("No source provided. Pass --db <url> or --schema <file>.");
}

function introspectorForUrl(url: string, pgSchema?: string): Introspector {
  if (/^postgres(ql)?:\/\//i.test(url)) return new PostgresIntrospector(url, pgSchema ?? "public");
  if (/^mysql:\/\//i.test(url)) return new MysqlIntrospector(url);

  const sqlitePath = url.replace(/^sqlite:(\/\/)?/i, "");
  if (/^sqlite:/i.test(url) || /\.(sqlite3?|db)$/i.test(sqlitePath)) {
    return new SqliteIntrospector(sqlitePath);
  }

  throw new Error(
    `Could not detect database type from "${url}". Use a postgres://, mysql://, or sqlite:// URL, or a path ending in .sqlite/.sqlite3/.db.`,
  );
}
