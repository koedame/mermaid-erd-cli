import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { SchemaData } from "./types.js";

const ASSETS_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "assets");

/** Replace every occurrence of `token` with `value` without regex pitfalls. */
function inject(template: string, token: string, value: string): string {
  return template.split(token).join(value);
}

/**
 * Serialize data for embedding inside a `<script>` tag. `JSON.stringify` does
 * not escape `<`, `>`, or the JS line terminators U+2028/U+2029, so a value
 * containing `</script>` (or `<!--`) would break out of the script context —
 * a stored-XSS vector since table/column names and comments are untrusted.
 * Escaping these as unicode keeps the value a valid JS string literal.
 */
function scriptSafeJson(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

/** Escape a value interpolated into HTML text/attribute contexts. */
function htmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export interface RenderOptions {
  title?: string;
}

/**
 * Produce the self-contained HTML viewer by substituting the front-end
 * template's injection points with the bundled assets and the schema JSON.
 */
export async function renderHtml(data: SchemaData, options: RenderOptions = {}): Promise<string> {
  const [template, logo, tailwind, mermaid, vue] = await Promise.all([
    readFile(join(ASSETS_DIR, "template.html"), "utf8"),
    readFile(join(ASSETS_DIR, "logo.svg"), "utf8"),
    readFile(join(ASSETS_DIR, "vendor", "tailwindcss.js"), "utf8"),
    readFile(join(ASSETS_DIR, "vendor", "mermaid.min.js"), "utf8"),
    readFile(join(ASSETS_DIR, "vendor", "vue.global.prod.min.js"), "utf8"),
  ]);

  const title = htmlEscape(options.title ?? "Database");
  let html = template;
  html = inject(html, "<%= app_name %>", title);
  html = inject(html, "<%= Base64.encode64(logo) %>", Buffer.from(logo).toString("base64"));
  html = inject(html, "<%= logo %>", logo);
  html = inject(html, "<%= version %>", "1");
  html = inject(html, "<%= tailwindcss_js %>", tailwind);
  html = inject(html, "<%= mermaid_js %>", mermaid);
  html = inject(html, "<%= vue_js %>", vue);
  html = inject(html, "<%= result.to_json %>", scriptSafeJson(data));
  return html;
}

/** Serialize the schema data as pretty JSON for piping into other tools. */
export function renderJson(data: SchemaData): string {
  return JSON.stringify(data, null, 2);
}

/**
 * Build the raw `erDiagram` text for the whole schema, matching the layout the
 * front-end produces (so a copied diagram is identical to an exported one).
 */
export function renderMermaid(data: SchemaData): string {
  const lines: string[] = ["erDiagram"];

  for (const model of data.Models) {
    lines.push(`    %% table name: ${model.TableName}`);
    lines.push(`    %% table comment: ${model.TableComment}`);
    lines.push(`    ${model.ModelName.replace(/:/g, "-")} {`);
    for (const column of model.Columns) {
      lines.push(`        ${column.type} ${column.name} ${column.key} "${column.comment || ""}"`);
    }
    lines.push("    }");
    lines.push("");
  }

  for (const relation of data.Relations) {
    const left = relation.LeftModelName.replace(/:/g, "-");
    const right = relation.RightModelName.replace(/:/g, "-");
    lines.push(
      `    ${left} ${relation.LeftValue}${relation.Line}${relation.RightValue} ${right} : "${relation.Comment}"`,
    );
  }

  return lines.join("\n");
}
