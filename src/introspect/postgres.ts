import type { Introspector, RawForeignKey, RawSchema, RawTable } from "../types.js";
import { requireDriver } from "./driver.js";

const COLUMNS_SQL = `
  SELECT
    c.relname                            AS table_name,
    obj_description(c.oid)               AS table_comment,
    a.attname                            AS column_name,
    format_type(a.atttypid, a.atttypmod) AS data_type,
    NOT a.attnotnull                     AS nullable,
    col_description(c.oid, a.attnum)     AS column_comment,
    COALESCE(pk.is_pk, false)            AS is_primary_key
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped
  LEFT JOIN (
    SELECT i.indrelid, a.attnum, true AS is_pk
    FROM pg_index i
    JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
    WHERE i.indisprimary
  ) pk ON pk.indrelid = c.oid AND pk.attnum = a.attnum
  WHERE c.relkind = 'r' AND n.nspname = $1
  ORDER BY c.relname, a.attnum;
`;

const FK_SQL = `
  SELECT
    con.conname            AS constraint_name,
    src.relname            AS table_name,
    tgt.relname            AS referenced_table,
    src_col.attname        AS column_name,
    k.ord                  AS ordinality
  FROM pg_constraint con
  JOIN pg_class src ON src.oid = con.conrelid
  JOIN pg_namespace n ON n.oid = con.connamespace
  JOIN pg_class tgt ON tgt.oid = con.confrelid
  JOIN LATERAL unnest(con.conkey) WITH ORDINALITY AS k(attnum, ord) ON true
  JOIN pg_attribute src_col ON src_col.attrelid = src.oid AND src_col.attnum = k.attnum
  WHERE con.contype = 'f' AND n.nspname = $1
  ORDER BY con.conname, k.ord;
`;

export class PostgresIntrospector implements Introspector {
  constructor(
    private readonly connectionString: string,
    readonly schema = "public",
  ) {}

  async introspect(): Promise<RawSchema> {
    const pg = await requireDriver<any>("pg", "PostgreSQL");
    const client = new pg.Client({ connectionString: this.connectionString });
    try {
      await client.connect();
    } catch (err) {
      throw new Error(`Could not connect to PostgreSQL: ${(err as Error).message}`);
    }
    try {
      const columns = (await client.query(COLUMNS_SQL, [this.schema])).rows;
      const fks = (await client.query(FK_SQL, [this.schema])).rows;
      return assembleSchema(columns, fks);
    } finally {
      await client.end();
    }
  }
}

interface ColumnRow {
  table_name: string;
  table_comment: string | null;
  column_name: string;
  data_type: string;
  nullable: boolean;
  column_comment: string | null;
  is_primary_key: boolean;
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
        comment: row.table_comment,
        columns: [],
        foreignKeys: [],
      };
      tables.set(row.table_name, table);
    }
    table.columns.push({
      name: row.column_name,
      type: row.data_type,
      nullable: row.nullable,
      primaryKey: row.is_primary_key,
      comment: row.column_comment,
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
