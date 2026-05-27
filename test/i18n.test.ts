import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const template = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "..", "assets", "template.html"),
  "utf8",
);

/** Extract the `window.i18n = { ... }` object literal by brace matching.
 *  Safe here because no i18n string value contains a `{` or `}`. */
function extractI18n(src: string): Record<string, unknown> {
  const start = src.indexOf("window.i18n");
  const open = src.indexOf("{", start);
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}" && --depth === 0) {
      return new Function(`return ${src.slice(open, i + 1)}`)();
    }
  }
  throw new Error("could not find a balanced window.i18n object");
}

function leafPaths(obj: unknown, prefix = ""): string[] {
  if (typeof obj !== "object" || obj === null) return [prefix];
  return Object.entries(obj).flatMap(([k, v]) => leafPaths(v, prefix ? `${prefix}.${k}` : k));
}

const i18n = extractI18n(template);
const locales = Object.keys(i18n);

describe("viewer i18n", () => {
  it("offers the major languages", () => {
    expect(locales).toEqual(["en", "ja", "zh", "ko", "es", "fr", "de", "pt", "ru"]);
  });

  it("gives every locale the exact same keys as English (no missing/extra strings)", () => {
    const en = leafPaths(i18n.en).sort();
    expect(en.length).toBeGreaterThan(20);
    for (const locale of locales) {
      expect(leafPaths(i18n[locale]).sort(), `locale ${locale}`).toEqual(en);
    }
  });

  it("has no empty translations", () => {
    for (const locale of locales) {
      for (const path of leafPaths(i18n[locale])) {
        const value = path.split(".").reduce<any>((o, k) => o[k], i18n[locale]);
        expect(typeof value === "string" && value.length > 0, `${locale}.${path}`).toBe(true);
      }
    }
  });

  it("has a language-selector option for every locale", () => {
    const options = [...template.matchAll(/<option value="([^"]+)">/g)].map((m) => m[1]);
    expect(options.sort()).toEqual([...locales].sort());
  });

  it("distinguishes the Mermaid / Markdown / link copied confirmations per locale", () => {
    for (const locale of locales) {
      const a = (i18n[locale] as any).actions;
      const confirmations = [a.copied_mermaid_code, a.copied_markdown_code, a.copied_url];
      expect(new Set(confirmations).size, `locale ${locale}`).toBe(3);
    }
  });
});
