import type { Introspector, RawForeignKey, RawSchema, RawTable } from "../types.js";
import { requireDriver } from "./driver.js";

interface TableInfoRow {
  name: string;
  type: string;
  notnull: number;
  pk: number;
}

interface ForeignKeyRow {
  id: number;
  seq: number;
  table: string;
  from: string;
}

export class SqliteIntrospector implements Introspector {
  constructor(private readonly file: string) {}

  async introspect(): Promise<RawSchema> {
    const Database = (await requireDriver<any>("better-sqlite3", "SQLite")).default;
    let db: any;
    try {
      db = new Database(this.file, { readonly: true, fileMustExist: true });
    } catch (err) {
      throw new Error(
        `Could not open SQLite database "${this.file}": ${err instanceof Error ? err.message : String(err)}`,
      );
    }
    try {
      const names = db
        .prepare(
          "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
        )
        .all()
        .map((r: { name: string }) => r.name);

      const tables: RawTable[] = names.map((name: string) => {
        // Names come from sqlite_master so they're already valid, but PRAGMA
        // takes no bound params; escape embedded quotes defensively.
        const quoted = `"${name.replace(/"/g, '""')}"`;
        const info = db.prepare(`PRAGMA table_info(${quoted})`).all() as TableInfoRow[];
        const fkRows = db.prepare(`PRAGMA foreign_key_list(${quoted})`).all() as ForeignKeyRow[];
        return {
          name,
          comment: null,
          columns: info.map((c) => ({
            name: c.name,
            type: c.type || "unknown",
            nullable: c.notnull === 0,
            primaryKey: c.pk > 0,
            comment: null,
          })),
          foreignKeys: groupForeignKeys(fkRows),
        };
      });

      return { tables };
    } finally {
      db.close();
    }
  }
}

/** `PRAGMA foreign_key_list` emits one row per column; group by `id`. */
function groupForeignKeys(rows: ForeignKeyRow[]): RawForeignKey[] {
  const byId = new Map<number, RawForeignKey>();
  for (const row of [...rows].sort((a, b) => a.seq - b.seq)) {
    const existing = byId.get(row.id);
    if (existing) {
      existing.columns.push(row.from);
    } else {
      byId.set(row.id, { columns: [row.from], referencedTable: row.table });
    }
  }
  return [...byId.values()];
}
