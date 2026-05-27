import type { Introspector, RawColumn, RawForeignKey, RawSchema, RawTable } from "../../types.js";

/**
 * Parses CREATE TABLE / ALTER TABLE DDL across the common dialects (Postgres,
 * MySQL, SQLite). It is intentionally lenient: it recognizes column types,
 * NOT NULL, primary keys (inline and table-level), and foreign keys (inline
 * REFERENCES, table-level FOREIGN KEY, and separate ALTER TABLE statements as
 * emitted by pg_dump). Dialect-specific extras it doesn't understand are
 * skipped rather than treated as errors.
 */
export class SqlDdlIntrospector implements Introspector {
  constructor(private readonly sql: string) {}

  async introspect(): Promise<RawSchema> {
    return parseSqlDdl(this.sql);
  }
}

export function parseSqlDdl(sql: string): RawSchema {
  const cleaned = stripComments(sql);
  // A length-preserving copy with string-literal *contents* blanked out, used
  // for all structural parsing so commas, parens, and keywords inside a
  // `DEFAULT '...'` / `CHECK '...'` / enum literal don't corrupt the parse.
  // Real values (e.g. inline COMMENT text) are sliced from `cleaned` by index.
  const masked = maskLiterals(cleaned);
  const tables = new Map<string, RawTable>();

  for (const { name, body, maskedBody } of findCreateTables(cleaned, masked)) {
    tables.set(name, parseTableBody(name, body, maskedBody));
  }

  applyAlterStatements(cleaned, masked, tables);
  applyComments(cleaned, tables);

  // A column with both an inline `REFERENCES` and a table-level `FOREIGN KEY`
  // (or a separate ALTER) would otherwise emit duplicate edges. Dedupe by
  // (columns, referenced table) per table.
  for (const table of tables.values()) {
    const seen = new Set<string>();
    table.foreignKeys = table.foreignKeys.filter((fk) => {
      const key = `${[...fk.columns].sort().join(",")}|${fk.referencedTable}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  return { tables: [...tables.values()] };
}

/**
 * Split a dotted reference (`schema.table.col`) into unquoted segments,
 * honoring quoted/bracketed segments so a `.` inside `"a.b"` / `[a.b]` is not
 * treated as a separator.
 */
function dottedParts(ref: string): string[] {
  const parts: string[] = [];
  let current = "";
  let close = ""; // closing delimiter expected while inside a quoted segment
  for (const ch of ref.trim()) {
    if (close) {
      current += ch;
      if (ch === close) close = "";
    } else if (ch === '"' || ch === "`") {
      close = ch;
      current += ch;
    } else if (ch === "[") {
      close = "]";
      current += ch;
    } else if (ch === ".") {
      parts.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  if (current) parts.push(current);
  return parts.map(unwrapQuotes);
}

/** Apply pg_dump-style `COMMENT ON TABLE/COLUMN ... IS '...'` statements. */
function applyComments(sql: string, tables: Map<string, RawTable>): void {
  const decode = (s: string) => s.replace(/''/g, "'");

  const tableRe = new RegExp(`COMMENT\\s+ON\\s+TABLE\\s+(${ID})\\s+IS\\s+'((?:[^']|'')*)'`, "gi");
  for (const m of sql.matchAll(tableRe)) {
    const table = tables.get(unquote(m[1]));
    if (table) table.comment = decode(m[2]);
  }

  const colRe = new RegExp(`COMMENT\\s+ON\\s+COLUMN\\s+(${ID})\\s+IS\\s+'((?:[^']|'')*)'`, "gi");
  for (const m of sql.matchAll(colRe)) {
    const parts = dottedParts(m[1]);
    if (parts.length < 2) continue; // need at least table.column
    const columnName = parts[parts.length - 1];
    const tableName = parts[parts.length - 2];
    const table = tables.get(tableName);
    const column = table?.columns.find((c) => c.name === columnName);
    if (column) column.comment = decode(m[2]);
  }
}

function stripComments(sql: string): string {
  return sql.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/--[^\n]*/g, " ");
}

/** Opening delimiter -> closing delimiter for the maskable quoted spans. */
const QUOTE_CLOSE: Record<string, string> = { "'": "'", '"': '"', "`": "`", "[": "]" };

/**
 * Return a same-length copy of `sql` with the *contents* of quoted spans —
 * string literals (`'...'`) AND quoted identifiers (`"..."`, `` `...` ``,
 * `[...]`) — replaced by spaces, keeping the delimiters and honoring doubled
 * escapes. Structural scanners run against this so a span's commas, parens,
 * keywords, and stray apostrophes are inert; indices stay aligned with the
 * original, from which real names/values are sliced.
 */
function maskLiterals(sql: string): string {
  let out = "";
  let i = 0;
  while (i < sql.length) {
    const ch = sql[i];
    const close = QUOTE_CLOSE[ch];
    if (!close) {
      out += ch;
      i++;
      continue;
    }
    out += ch; // opening delimiter
    i++;
    while (i < sql.length) {
      if (sql[i] === close) {
        if (sql[i + 1] === close) {
          out += "  "; // doubled-delimiter escape -> content
          i += 2;
          continue;
        }
        out += close; // closing delimiter
        i++;
        break;
      }
      out += " ";
      i++;
    }
  }
  return out;
}

/** Strip surrounding quotes/brackets from a segment, collapsing doubled escapes. */
function unwrapQuotes(segment: string): string {
  const s = segment.trim();
  if (s.length >= 2 && s.startsWith('"') && s.endsWith('"'))
    return s.slice(1, -1).replace(/""/g, '"');
  if (s.length >= 2 && s.startsWith("`") && s.endsWith("`"))
    return s.slice(1, -1).replace(/``/g, "`");
  if (s.length >= 2 && s.startsWith("[") && s.endsWith("]"))
    return s.slice(1, -1).replace(/\]\]/g, "]");
  return s;
}

/** Resolve an identifier to its final segment, unquoted (`public."Order"` -> `Order`). */
function unquote(identifier: string): string {
  const parts = dottedParts(identifier);
  return parts.length ? parts[parts.length - 1] : "";
}

/**
 * Slice capture group `n` from `source` using the match's `d`-flag indices.
 * Matches run against the masked copy, so the real text is sliced from the
 * aligned original rather than read from the (blanked) masked capture.
 */
function sliceGroup(source: string, match: RegExpExecArray, n: number): string {
  const span = match.indices?.[n];
  return span ? source.slice(span[0], span[1]) : (match[n] ?? "");
}

// A single identifier segment, then a dotted chain of segments. Supports
// quoted/bracketed, mixed-case, and schema-qualified names from any dialect.
const SEG = `(?:"(?:[^"]|"")+"|\`(?:[^\`]|\`\`)+\`|\\[(?:[^\\]]|\\]\\])+\\]|\\w+)`;
const ID = `${SEG}(?:\\.${SEG})*`;

/** First column-constraint keyword; everything before it is the column type. */
const COLUMN_CONSTRAINT_KEYWORD =
  /\b(NOT\s+NULL|NULL|PRIMARY\s+KEY|UNIQUE|REFERENCES|DEFAULT|CHECK|GENERATED|COLLATE|COMMENT|CONSTRAINT|AUTO_INCREMENT|AUTOINCREMENT|ON\s+UPDATE|ON\s+DELETE)\b/i;

function findCreateTables(
  cleaned: string,
  masked: string,
): Array<{ name: string; body: string; maskedBody: string }> {
  const re = new RegExp(`CREATE\\s+TABLE\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?(${ID})\\s*\\(`, "gid");
  const out: Array<{ name: string; body: string; maskedBody: string }> = [];
  // Match on `masked` so parens inside a literal/identifier can't be mistaken
  // for the table body; slice the real name and bodies from the same indices.
  for (const match of masked.matchAll(re)) {
    const openParen = (match.index ?? 0) + match[0].length - 1;
    const span = balancedSpan(masked, openParen);
    if (span === null) continue;
    out.push({
      name: unquote(sliceGroup(cleaned, match, 1)),
      body: cleaned.slice(span[0], span[1]),
      maskedBody: masked.slice(span[0], span[1]),
    });
  }
  return out;
}

/** Given the index of an opening `(`, return [innerStart, innerEnd) indices. */
function balancedSpan(sql: string, openIndex: number): [number, number] | null {
  let depth = 0;
  for (let i = openIndex; i < sql.length; i++) {
    const ch = sql[i];
    if (ch === "(") depth++;
    else if (ch === ")") {
      depth--;
      if (depth === 0) return [openIndex + 1, i];
    }
  }
  return null;
}

/** Top-level comma-separated item spans, ignoring commas inside parentheses. */
function topLevelSpans(body: string): Array<[number, number]> {
  const spans: Array<[number, number]> = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    else if (ch === "," && depth === 0) {
      spans.push([start, i]);
      start = i + 1;
    }
  }
  spans.push([start, body.length]);
  return spans.filter(([a, b]) => body.slice(a, b).trim() !== "");
}

/**
 * The leading identifier of a column-list item, dropping any trailing sort or
 * length modifier (`ASC`, `(10)`, ...). Matched on the masked copy so a quoted
 * name containing spaces/commas stays a single token, then sliced from the
 * real text by the aligned offset.
 */
function firstIdentifier(real: string, masked: string): string {
  const m = new RegExp(`^\\s*(${ID})`).exec(masked);
  if (!m) return "";
  const end = m[0].length;
  return unquote(real.slice(end - m[1].length, end));
}

/** Split a column-list body into identifier names, quote/space/comma-safe. */
function splitColumnNames(real: string, masked: string): string[] {
  return topLevelSpans(masked)
    .map(([s, e]) => firstIdentifier(real.slice(s, e), masked.slice(s, e)))
    .filter(Boolean);
}

const CONSTRAINT_PREFIX = /^CONSTRAINT\s+\S+\s+/i;

function parseTableBody(name: string, body: string, maskedBody: string): RawTable {
  const table: RawTable = { name, comment: null, columns: [], foreignKeys: [] };
  const pkColumns = new Set<string>();

  // Iterate spans computed from the masked body (literal commas are inert),
  // slicing the real and masked text at the same offsets.
  for (const [s, e] of topLevelSpans(maskedBody)) {
    const item = body.slice(s, e).trim();
    const maskedItem = maskedBody.slice(s, e).trim();
    const lead = item.replace(CONSTRAINT_PREFIX, "");
    const maskedLead = maskedItem.replace(CONSTRAINT_PREFIX, "");

    if (/^PRIMARY\s+KEY/i.test(maskedLead)) {
      for (const col of columnList(lead, maskedLead)) pkColumns.add(col);
      continue;
    }
    if (/^FOREIGN\s+KEY/i.test(maskedLead)) {
      const fk = parseTableForeignKey(lead, maskedLead);
      if (fk) table.foreignKeys.push(fk);
      continue;
    }
    if (/^(UNIQUE|CHECK|KEY|INDEX|EXCLUDE|PRIMARY)\b/i.test(maskedLead)) continue;

    const column = parseColumnDefinition(item, maskedItem);
    if (column) {
      table.columns.push(column.column);
      if (column.primaryKey) pkColumns.add(column.column.name);
      if (column.foreignKey) table.foreignKeys.push(column.foreignKey);
    }
  }

  for (const column of table.columns) {
    if (pkColumns.has(column.name)) column.primaryKey = true;
  }
  return table;
}

function columnList(clause: string, maskedClause: string): string[] {
  const start = maskedClause.indexOf("(");
  if (start === -1) return [];
  // Use the FIRST balanced group on the masked clause (so a `)` inside a quoted
  // column name doesn't close it early), then slice the real names by index.
  const span = balancedSpan(maskedClause, start);
  if (span === null) return [];
  return splitColumnNames(clause.slice(span[0], span[1]), maskedClause.slice(span[0], span[1]));
}

function parseTableForeignKey(clause: string, maskedClause: string): RawForeignKey | null {
  const cols = columnList(clause, maskedClause);
  // Match REFERENCES on the masked clause so a column literally named
  // "REFERENCES" can't be mistaken for the keyword; slice the real target name.
  const ref = new RegExp(`REFERENCES\\s+(${ID})`, "id").exec(maskedClause);
  if (!cols.length || !ref) return null;
  return { columns: cols, referencedTable: unquote(sliceGroup(clause, ref, 1)) };
}

interface ParsedColumn {
  column: RawColumn;
  primaryKey: boolean;
  foreignKey: RawForeignKey | null;
}

function parseColumnDefinition(item: string, maskedItem: string): ParsedColumn | null {
  const nameMatch = new RegExp(`^(${ID})\\s+(.*)$`, "is").exec(item);
  if (!nameMatch) return null;
  const name = unquote(nameMatch[1]);
  const rest = nameMatch[2];
  // Same offset in the masked item: the name is an identifier, so it is
  // byte-identical in both copies. Scan keywords on the masked rest so
  // keywords inside a literal (e.g. `DEFAULT 'not null'`) are ignored.
  const maskedRest = maskedItem.slice(item.length - rest.length);

  // Type is everything before the first column-constraint keyword. Stopping at
  // the keyword (rather than greedily consuming words) keeps multi-word types
  // like `timestamp without time zone` / `double precision` intact while not
  // absorbing `NOT NULL` / `PRIMARY KEY` / `REFERENCES ...` into the type.
  const kw = COLUMN_CONSTRAINT_KEYWORD.exec(maskedRest);
  const type = (kw ? rest.slice(0, kw.index) : rest).trim() || rest.trim().split(/\s+/)[0];

  const nullable = !/\bNOT\s+NULL\b/i.test(maskedRest);
  const primaryKey = /\bPRIMARY\s+KEY\b/i.test(maskedRest);

  // Comment value is read from the real text (the literal content matters here).
  const commentMatch = /\bCOMMENT\s+'((?:[^']|'')*)'/i.exec(rest);
  const comment = commentMatch ? commentMatch[1].replace(/''/g, "'") : null;

  let foreignKey: RawForeignKey | null = null;
  // Match on the masked rest (so `references` inside a literal is inert) but
  // slice the real referenced name from `rest` by index — a quoted/bracketed
  // table name is blanked in the masked copy, so reading the capture directly
  // would yield whitespace.
  const refMatch = new RegExp(`\\bREFERENCES\\s+(${ID})`, "id").exec(maskedRest);
  if (refMatch) {
    foreignKey = { columns: [name], referencedTable: unquote(sliceGroup(rest, refMatch, 1)) };
  }

  return {
    column: { name, type, nullable, primaryKey, comment },
    primaryKey,
    foreignKey,
  };
}

function applyAlterStatements(
  cleaned: string,
  masked: string,
  tables: Map<string, RawTable>,
): void {
  const cols = (match: RegExpExecArray): string[] => {
    const span = match.indices?.[2];
    if (!span) return [];
    return splitColumnNames(cleaned.slice(span[0], span[1]), masked.slice(span[0], span[1]));
  };

  const re = new RegExp(
    `ALTER\\s+TABLE\\s+(?:ONLY\\s+)?(${ID})\\s+ADD\\s+(?:CONSTRAINT\\s+\\S+\\s+)?` +
      `FOREIGN\\s+KEY\\s*\\(([^)]+)\\)\\s*REFERENCES\\s+(${ID})`,
    "gid",
  );
  for (const match of masked.matchAll(re)) {
    const table = tables.get(unquote(sliceGroup(cleaned, match, 1)));
    if (!table) continue;
    table.foreignKeys.push({
      columns: cols(match),
      referencedTable: unquote(sliceGroup(cleaned, match, 3)),
    });
  }

  const pkRe = new RegExp(
    `ALTER\\s+TABLE\\s+(?:ONLY\\s+)?(${ID})\\s+ADD\\s+(?:CONSTRAINT\\s+\\S+\\s+)?PRIMARY\\s+KEY\\s*\\(([^)]+)\\)`,
    "gid",
  );
  for (const match of masked.matchAll(pkRe)) {
    const table = tables.get(unquote(sliceGroup(cleaned, match, 1)));
    if (!table) continue;
    const pkCols = new Set(cols(match));
    for (const column of table.columns) {
      if (pkCols.has(column.name)) column.primaryKey = true;
    }
  }
}
