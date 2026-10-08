import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { renderHtml } from "../src/render.js";
import type { SchemaData } from "../src/types.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const vendor = join(root, "assets", "vendor");

const data: SchemaData = { Models: [], Relations: [] };

const sha256 = (file: string) => createHash("sha256").update(readFileSync(file)).digest("hex");

const checksums = Object.fromEntries(
  readFileSync(join(vendor, "CHECKSUMS.txt"), "utf8")
    .split("\n")
    .filter((line) => line.trim() && !line.startsWith("#"))
    .map((line) => {
      const [sum, file] = line.split(/\s+/);
      return [file, sum];
    }),
);

describe("generated HTML", () => {
  it("does not load the Tailwind Play CDN script and inlines a stylesheet built by the Tailwind CLI, when the HTML is generated", async () => {
    const html = await renderHtml(data);
    expect(html).not.toContain("cdn.tailwindcss.com");
    expect(html).not.toContain("tailwind.config");
    expect(html).toMatch(/<style>\/\*! tailwindcss v4\.3\.3 \| MIT License/);
  });

  it("carries this package's license and the third-party list in a comment at the top, when the HTML is generated", async () => {
    const html = await renderHtml(data);
    const notices = html.match(/^<!DOCTYPE html>\n<!--\n([\s\S]*?)\n-->\n/)?.[1] ?? "";
    expect(notices).toContain("Copyright (c) 2026 koedame");
    expect(notices).toContain("Copyright (c) 2014 - 2022 Knut Sveidqvist");
    expect(notices).toContain("Copyright (c) 2018-present, Yuxi (Evan) You");
    expect(notices).toContain("Copyright (c) Tailwind Labs, Inc.");
    expect(notices).toContain("Copyright (c) 2020 Refactoring UI Inc.");
    expect(notices).toContain("Permission is hereby granted, free of charge");
    expect(notices).toContain("Apache License");
    expect(notices).toContain(readFileSync(join(vendor, "LICENSES.md"), "utf8").trim());
    expect(notices).not.toMatch(/<\/?script/i);
  });
});

describe("vendored front-end files", () => {
  it("matches every file to its SHA-256 in CHECKSUMS.txt, when the vendored files are checked", () => {
    for (const [file, sum] of Object.entries(checksums)) {
      expect(sha256(join(vendor, file)), file).toBe(sum);
    }
  });

  it("fails when LICENSES.md lists a different SHA-256 than CHECKSUMS.txt, which means a file was replaced without regenerating the list", () => {
    const listed = Object.fromEntries(
      [
        ...readFileSync(join(vendor, "LICENSES.md"), "utf8").matchAll(
          /^\| `([^`]+)` \| `([0-9a-f]{64})` \|/gm,
        ),
      ].map((m) => [m[1], m[2]]),
    );
    expect(listed).toEqual(checksums);
  });
});
