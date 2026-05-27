import type {
  RawSchema,
  RawTable,
  SchemaColumn,
  SchemaData,
  SchemaModel,
  SchemaRelation,
} from "./types.js";

export interface BuildOptions {
  /** Regex source strings; a table is dropped if any matches its name. */
  ignoreTables?: string[];
}

/**
 * Mermaid attribute types must be a single bareword token. DB types such as
 * `character varying(255)` or `timestamp without time zone` contain spaces
 * that break the `erDiagram` grammar, so collapse whitespace to underscores
 * and drop characters outside the set Mermaid accepts for a type.
 */
function sanitizeType(type: string): string {
  return (
    type
      .trim()
      .replace(/\s+/g, "_")
      .replace(/[^A-Za-z0-9_()[\]]/g, "") || "unknown"
  );
}

/**
 * Entity and attribute names in `erDiagram` must be barewords. Database
 * identifiers can legally contain spaces, quotes, and punctuation (quoted
 * identifiers), which would break the diagram, so map anything outside
 * `[A-Za-z0-9_]` to `_`. Done here so both the HTML viewer and the raw
 * `renderMermaid` output consume already-safe names.
 */
function sanitizeIdentifier(name: string): string {
  return name.replace(/[^A-Za-z0-9_]/g, "_") || "_";
}

/**
 * Comments and labels are emitted inside Mermaid double-quoted strings and
 * `%%` comment lines. Strip the characters that would break out of those
 * contexts (double quotes and newlines); collapse whitespace runs.
 */
function sanitizeText(text: string): string {
  return text
    .replace(/["\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Convert a normalized schema into the front-end's `SCHEMA_DATA`. Relations
 * are derived purely from foreign keys: the referenced table is the "one"
 * side, the table holding the FK is the "many" side. A FK whose columns are
 * all NOT NULL renders as mandatory (`||`), otherwise optional (`|o`).
 */
export function buildSchemaData(schema: RawSchema, options: BuildOptions = {}): SchemaData {
  const patterns = (options.ignoreTables ?? []).map((p) => {
    try {
      return new RegExp(p);
    } catch (err) {
      throw new Error(
        `Invalid ignore-tables pattern ${JSON.stringify(p)}: ${(err as Error).message}`,
      );
    }
  });
  const isIgnored = (name: string) => patterns.some((re) => re.test(name));

  const tables = schema.tables.filter((t) => !isIgnored(t.name));
  const kept = new Set(tables.map((t) => t.name));

  const models: SchemaModel[] = tables.map((table) => ({
    TableName: sanitizeText(table.name),
    TableComment: sanitizeText(table.comment ?? ""),
    ModelName: sanitizeIdentifier(table.name),
    IsModelExist: true,
    Columns: buildColumns(table),
  }));

  const relations: SchemaRelation[] = [];
  for (const table of tables) {
    for (const fk of table.foreignKeys) {
      // Skip edges that would dangle: the referenced table was filtered out
      // (or never introspected), so the diagram would show an orphan node.
      if (!kept.has(fk.referencedTable)) continue;

      const fkColumns = new Set(fk.columns);
      const cols = table.columns.filter((c) => fkColumns.has(c.name));
      // A FK is mandatory only when its columns are present and all NOT NULL.
      // An empty match (parse gap / column not found) must not vacuously read
      // as mandatory, so default to optional.
      const mandatory = cols.length > 0 && cols.every((c) => !c.nullable);

      relations.push({
        LeftModelName: sanitizeIdentifier(fk.referencedTable),
        LeftValue: mandatory ? "||" : "|o",
        Line: "--",
        RightModelName: sanitizeIdentifier(table.name),
        RightValue: "o{",
        Comment: sanitizeText(relationComment(table.name, fk.columns)),
      });
    }
  }

  return { Models: models, Relations: relations };
}

/**
 * Describe a foreign key as the association it implies: the referenced (left)
 * table `has_many` of the child, and the child `belongs_to` the parent. The
 * belongs_to name is derived from the foreign key column (`team_id` -> `team`),
 * which is usually the association name; composite keys are joined with `+`.
 */
function relationComment(childTable: string, fkColumns: string[]): string {
  const belongsTo = fkColumns.length === 1 ? fkColumns[0].replace(/_id$/, "") : fkColumns.join("+");
  return `has_many: ${childTable}, belongs_to: ${belongsTo}`;
}

function buildColumns(table: RawTable): SchemaColumn[] {
  const fkColumns = new Set(table.foreignKeys.flatMap((fk) => fk.columns));
  return table.columns.map((column) => {
    let key: SchemaColumn["key"] = "";
    if (column.primaryKey) key = "PK";
    else if (fkColumns.has(column.name)) key = "FK";
    return {
      name: sanitizeIdentifier(column.name),
      type: sanitizeType(column.type),
      key,
      comment: sanitizeText(column.comment ?? ""),
    };
  });
}
