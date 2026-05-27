import type { Introspector, RawColumn, RawForeignKey, RawSchema, RawTable } from "../../types.js";

/**
 * Parses a Rails `db/schema.rb`. Handles `create_table` blocks (implicit `id`
 * primary key, `t.<type>` columns, `t.references`/`t.belongs_to`,
 * `t.timestamps`) and `add_foreign_key` statements. Foreign keys come from
 * both `add_foreign_key` (authoritative) and `foreign_key: true` references,
 * deduplicated by table + columns.
 */
export class RailsSchemaIntrospector implements Introspector {
  constructor(private readonly source: string) {}

  async introspect(): Promise<RawSchema> {
    return parseRailsSchema(this.source);
  }
}

const STRING_OR_SYMBOL = `["']([^"']+)["']|:(\\w+)`;

function firstArg(line: string): string | null {
  const m = new RegExp(`\\(?\\s*(?:${STRING_OR_SYMBOL})`).exec(line);
  return m ? (m[1] ?? m[2]) : null;
}

function optionValue(line: string, key: string): string | null {
  const m = new RegExp(`${key}:\\s*(?:["']([^"']+)["']|:(\\w+)|(\\w+))`).exec(line);
  if (!m) return null;
  return m[1] ?? m[2] ?? m[3];
}

function hasOption(line: string, key: string, value: string): boolean {
  return new RegExp(`${key}:\\s*${value}\\b`).test(line);
}

export function parseRailsSchema(source: string): RawSchema {
  const lines = source.split("\n");
  const tables = new Map<string, RawTable>();
  const fkSeen = new Set<string>();

  const addForeignKey = (
    table: RawTable | undefined,
    columns: string[],
    referencedTable: string,
  ) => {
    if (!table) return;
    const dedupKey = `${table.name}|${[...columns].sort().join(",")}`;
    if (fkSeen.has(dedupKey)) return;
    fkSeen.add(dedupKey);
    table.foreignKeys.push({ columns, referencedTable });
  };

  let current: RawTable | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();

    const createMatch = /^create_table\s+(.*?)\s+do\s*\|/.exec(line);
    if (createMatch) {
      const header = createMatch[1];
      const name = firstArg(header);
      if (!name) continue;
      current = { name, comment: optionValue(header, "comment"), columns: [], foreignKeys: [] };
      tables.set(name, current);
      if (!hasOption(header, "id", "false")) {
        const pkName = optionValue(header, "primary_key") ?? "id";
        const idType = optionValue(header, "id") ?? "bigint";
        current.columns.push({
          name: pkName,
          type: idType,
          nullable: false,
          primaryKey: true,
          comment: null,
        });
      }
      continue;
    }

    if (line === "end" && current) {
      current = null;
      continue;
    }

    if (current && line.startsWith("t.")) {
      parseColumnLine(line, current, addForeignKey);
      continue;
    }

    const fkMatch = /^add_foreign_key\s+(.*)$/.exec(line);
    if (fkMatch) {
      const args = fkMatch[1];
      const names = [...args.matchAll(/["']([^"']+)["']/g)].map((m) => m[1]);
      if (names.length < 2) continue;
      const [fromTable, toTable] = names;
      const column = optionValue(args, "column") ?? `${singularize(toTable)}_id`;
      addForeignKey(tables.get(fromTable), [column], toTable);
    }
  }

  // `t.references` without `to_table:` guesses the target by naive
  // pluralization. If that guess isn't a real table but a singular/plural
  // variant is, snap to it so the edge isn't silently dropped downstream.
  const known = new Set(tables.keys());
  for (const table of tables.values()) {
    for (const fk of table.foreignKeys) {
      if (known.has(fk.referencedTable)) continue;
      const alt = [singularize(fk.referencedTable), pluralize(fk.referencedTable)].find((c) =>
        known.has(c),
      );
      if (alt) fk.referencedTable = alt;
    }
  }

  return { tables: [...tables.values()] };
}

function parseColumnLine(
  line: string,
  table: RawTable,
  addForeignKey: (t: RawTable, cols: string[], ref: string) => void,
): void {
  const typeMatch = /^t\.(\w+)\b\s*(.*)$/.exec(line);
  if (!typeMatch) return;
  const type = typeMatch[1];
  const rest = typeMatch[2];

  if (type === "index" || type === "check_constraint") return;

  if (type === "timestamps") {
    for (const name of ["created_at", "updated_at"]) {
      table.columns.push({
        name,
        type: "datetime",
        nullable: false,
        primaryKey: false,
        comment: null,
      });
    }
    return;
  }

  const name = firstArg(rest);
  if (!name) return;
  const nullable = !hasOption(rest, "null", "false");
  const comment = optionValue(rest, "comment");

  if (type === "references" || type === "belongs_to") {
    const refType = optionValue(rest, "type") ?? "bigint";
    table.columns.push({ name: `${name}_id`, type: refType, nullable, primaryKey: false, comment });
    if (hasOption(rest, "polymorphic", "true")) {
      table.columns.push({
        name: `${name}_type`,
        type: "string",
        nullable,
        primaryKey: false,
        comment: null,
      });
    } else if (/foreign_key:\s*(true|\{)/.test(rest)) {
      const referenced = optionValue(rest, "to_table") ?? pluralize(name);
      addForeignKey(table, [`${name}_id`], referenced);
    }
    return;
  }

  const column: RawColumn = { name, type, nullable, primaryKey: false, comment };
  table.columns.push(column);
}

function pluralize(word: string): string {
  if (/[^aeiou]y$/.test(word)) return word.replace(/y$/, "ies");
  if (/(s|x|z|ch|sh)$/.test(word)) return `${word}es`;
  return `${word}s`;
}

function singularize(word: string): string {
  if (/ies$/.test(word)) return word.replace(/ies$/, "y");
  if (/(ses|xes|zes|ches|shes)$/.test(word)) return word.replace(/es$/, "");
  if (/s$/.test(word)) return word.replace(/s$/, "");
  return word;
}
