import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dockerfile = readFileSync(join(root, "Dockerfile"), "utf8");
const runtime = dockerfile.slice(dockerfile.lastIndexOf("\nFROM "));

describe("Dockerfile runtime stage", () => {
  it("copies LICENSE to /app/LICENSE", () => {
    expect(runtime).toMatch(/^COPY (--from=\S+ )?\S*LICENSE \/app\/LICENSE$/m);
  });

  it("labels the image with its license and source", () => {
    expect(runtime).toContain('org.opencontainers.image.licenses="MIT"');
    expect(runtime).toContain(
      'org.opencontainers.image.source="https://github.com/koedame/mermaid-erd-cli"',
    );
  });
});
