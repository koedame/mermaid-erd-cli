import type { Introspector, RawForeignKey, RawSchema, RawTable } from "../types.js";
import { requireDriver } from "./driver.js";

const COLUMNS_SQL = `
  SELECT
    t.TABLE_NAME    AS table_name,
    t.TABLE_COMMENT AS table_comment,
    c.COLUMN_NAME   AS column_name,
    c.COLUMN_TYPE   AS data_type,
    c.IS_NULLABLE   AS is_nullable,
    c.COLUMN_KEY    AS column_key,
    c.COLUMN_COMMENT AS column_comment
  FROM information_schema.TABLES t
  JOIN information_schema.COLUMNS c
    ON c.TABLE_SCHEMA = t.TABLE_SCHEMA AND c.TABLE_NAME = t.TABLE_NAME
  WHERE t.TABLE_SCHEMA = ? AND t.TABLE_TYPE = 'BASE TABLE'
  ORDER BY t.TABLE_NAME, c.ORDINAL_POSITION;
`;

const FK_SQL = `
  SELECT
    CONSTRAINT_NAME        AS constraint_name,
    TABLE_NAME             AS table_name,
    REFERENCED_TABLE_NAME  AS referenced_table,
    COLUMN_NAME            AS column_name
  FROM information_schema.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA = ? AND REFERENCED_TABLE_NAME IS NOT NULL
  ORDER BY TABLE_NAME, CONSTRAINT_NAME, ORDINAL_POSITION;
`;

export class MysqlIntrospector implements Introspector {
  constructor(private readonly url: string) {}

  async introspect(): Promise<RawSchema> {
    // Derive the database name from the URL rather than `conn.config.database`
    // (an internal field not in mysql2's public types).
    const database = new URL(this.url).pathname.replace(/^\//, "");
    if (!database) {
      throw new Error(
        "MySQL URL must include a database name, e.g. mysql://user:pass@host:3306/mydb",
      );
    }
    const mysql = await requireDriver<any>("mysql2/promise", "MySQL");
    let conn: any;
    try {
      conn = await mysql.createConnection(this.url);
    } catch (err) {
      throw new Error(`Could not connect to MySQL: ${(err as Error).message}`);
    }
    try {
      const [columns] = await conn.query(COLUMNS_SQL, [database]);
      const [fks] = await conn.query(FK_SQL, [database]);
      return assembleSchema(columns as ColumnRow[], fks as FkRow[]);
    } finally {
      await conn.end();
    }
  }
}

interface ColumnRow {
  table_name: string;
  table_comment: string | null;
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_key: string;
  column_comment: string | null;
}

interface FkRow {
  constraint_name: string;
  table_name: string;
  referenced_table: string;
  column_name: string;
}

function assembleSchema(columns: ColumnRow[], fks: FkRow[]): RawSchema {
  const tables = new Map<string, RawTable>();

  for (const row of columns) {
    let table = tables.get(row.table_name);
    if (!table) {
      table = {
        name: row.table_name,
        comment: row.table_comment || null,
        columns: [],
        foreignKeys: [],
      };
      tables.set(row.table_name, table);
    }
    table.columns.push({
      name: row.column_name,
      type: row.data_type,
      nullable: row.is_nullable === "YES",
      primaryKey: row.column_key === "PRI",
      comment: row.column_comment || null,
    });
  }

  const fkByName = new Map<string, RawForeignKey>();
  for (const row of fks) {
    const key = `${row.table_name}.${row.constraint_name}`;
    const existing = fkByName.get(key);
    if (existing) {
      existing.columns.push(row.column_name);
    } else {
      const fk: RawForeignKey = {
        columns: [row.column_name],
        referencedTable: row.referenced_table,
      };
      fkByName.set(key, fk);
      tables.get(row.table_name)?.foreignKeys.push(fk);
    }
  }

  return { tables: [...tables.values()] };
}
