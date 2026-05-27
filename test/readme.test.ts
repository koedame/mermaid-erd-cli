import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// Locale code -> README filename (English is the default README.md).
const READMES: Record<string, string> = {
  en: "README.md",
  ja: "README.ja.md",
  zh: "README.zh.md",
  ko: "README.ko.md",
  es: "README.es.md",
  fr: "README.fr.md",
  de: "README.de.md",
  pt: "README.pt.md",
  ru: "README.ru.md",
};

const files = Object.values(READMES);
const read = (f: string) => readFileSync(join(root, f), "utf8");

describe("localized READMEs", () => {
  it("has a README for every viewer locale", () => {
    for (const f of files) expect(existsSync(join(root, f)), f).toBe(true);
  });

  it("starts each README with a toggle linking all nine languages", () => {
    for (const f of files) {
      const firstLine = read(f).split("\n")[0];
      for (const target of files) {
        expect(firstLine.includes(`(./${target})`), `${f} should link ${target}`).toBe(true);
      }
    }
  });

  it("keeps the badges and screenshot in every README (no structural drift)", () => {
    for (const f of files) {
      const text = read(f);
      expect(text, f).toContain("/actions/workflows/ci.yml/badge.svg");
      expect(text, f).toContain("docs/screenshot.png");
      expect(text, f).toContain("# mermaid-erd-cli");
    }
  });

  it("links the GitHub Pages live demo from every README", () => {
    for (const f of files) {
      expect(read(f), f).toContain("https://koedame.github.io/mermaid-erd-cli/");
    }
  });
});
