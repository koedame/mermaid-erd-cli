import { readFile } from "node:fs/promises";

export const DEFAULT_IGNORE_TABLES = ["^schema_migrations$", "^ar_internal_metadata$"];

/**
 * Read `ignore_tables` from a config file (default `mermaid-erd.yml`). Returns
 * null when no file is found so the caller can fall back to defaults.
 */
export async function loadIgnoreTables(path = "mermaid-erd.yml"): Promise<string[] | null> {
  let content: string;
  try {
    content = await readFile(path, "utf8");
  } catch {
    return null;
  }
  return path.endsWith(".json")
    ? validate(JSON.parse(content)?.ignore_tables, path)
    : validate(parseIgnoreTablesYaml(content), path);
}

/**
 * Minimal reader for the only config shape this tool needs: an `ignore_tables`
 * list of regex strings, in block or flow style, quoted or bare. This avoids a
 * full YAML dependency for a single key.
 *
 *   ignore_tables:
 *     - "^schema_migrations$"
 *     - _old$
 *
 *   ignore_tables: ["^schema_migrations$", "_old$"]
 */
/** Index of the `]` that closes a flow list, ignoring `]` inside quotes. */
function flowListClose(inline: string): number {
  let quote = "";
  for (let i = 1; i < inline.length; i++) {
    const ch = inline[i];
    if (quote) {
      if (ch === quote) quote = "";
    } else if (ch === '"' || ch === "'") {
      quote = ch;
    } else if (ch === "]") {
      return i;
    }
  }
  return -1;
}

export function parseIgnoreTablesYaml(text: string): string[] {
  const lines = text.split(/\r?\n/);
  const headerIndex = lines.findIndex((l) => /^ignore_tables\s*:/.test(l));
  if (headerIndex === -1) return [];

  const inline = lines[headerIndex].replace(/^ignore_tables\s*:/, "").trim();
  if (inline.startsWith("[")) {
    // Bound on the array's own closing `]`, found by a quote-aware scan so a
    // `]` inside a quoted item or a trailing `# comment` doesn't fool us.
    const close = flowListClose(inline);
    return (close >= 0 ? inline.slice(1, close) : inline.slice(1))
      .split(",")
      .map((item) => unquote(item.trim()))
      .filter(Boolean);
  }

  const out: string[] = [];
  for (const line of lines.slice(headerIndex + 1)) {
    if (line.trim() === "" || /^\s*#/.test(line)) continue;
    const item = /^\s*-\s*(.+?)\s*$/.exec(line);
    if (!item) break; // dedent or next key ends the list
    out.push(unquote(item[1]));
  }
  return out;
}

function unquote(value: string): string {
  const s = value.trim();
  // Quoted: return the content up to the closing quote verbatim (a `#` inside
  // a quoted scalar is data, not a comment). Bare: a trailing ` #...` is a
  // comment. Checking the quote first avoids corrupting values like `"a # b"`.
  const q = s[0];
  if (q === '"' || q === "'") {
    const end = s.indexOf(q, 1);
    if (end > 0) return s.slice(1, end);
  }
  return s.replace(/\s+#.*$/, "").trim();
}

function validate(value: unknown, path: string): string[] {
  if (value == null) return [];
  if (!Array.isArray(value) || !value.every((v) => typeof v === "string" && v.length > 0)) {
    throw new Error(`${path}: \`ignore_tables\` must be a list of non-empty regex strings.`);
  }
  return value;
}
