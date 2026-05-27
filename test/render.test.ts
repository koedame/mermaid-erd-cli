import { describe, expect, it } from "vitest";
import { renderHtml, renderMermaid } from "../src/render.js";
import type { SchemaData } from "../src/types.js";

const data: SchemaData = {
  Models: [
    {
      TableName: "users",
      TableComment: "",
      ModelName: "users",
      IsModelExist: true,
      Columns: [
        { name: "id", type: "bigint", key: "PK", comment: "" },
        { name: "team_id", type: "bigint", key: "FK", comment: "" },
      ],
    },
  ],
  Relations: [
    {
      LeftModelName: "teams",
      LeftValue: "||",
      Line: "--",
      RightModelName: "users",
      RightValue: "o{",
      Comment: "team_id",
    },
  ],
};

describe("renderMermaid", () => {
  it("emits an erDiagram with entities and a relation edge", () => {
    const mmd = renderMermaid(data);
    expect(mmd.startsWith("erDiagram")).toBe(true);
    expect(mmd).toContain("users {");
    expect(mmd).toContain("bigint id PK");
    expect(mmd).toContain('teams ||--o{ users : "team_id"');
  });
});

describe("renderHtml", () => {
  it("injects the schema and bundles assets with no leftover ERB tags", async () => {
    const html = await renderHtml(data, { title: "Sample" });
    expect(html).toContain('window.SCHEMA_DATA={"Models"');
    expect(html).not.toContain("<%=");
    expect(html).toContain("<title>Sample - Mermaid ERD</title>");
    // Bundled libraries are present inline (offline-capable).
    expect(html).toContain("Vue");
    expect(html.length).toBeGreaterThan(1_000_000);
  });

  it("does not let a table name containing </script> break out of the data script", async () => {
    const malicious: SchemaData = {
      Models: [
        {
          TableName: "</script><img src=x onerror=alert(1)>",
          TableComment: "",
          ModelName: "evil",
          IsModelExist: true,
          Columns: [],
        },
      ],
      Relations: [],
    };
    const html = await renderHtml(malicious);
    // The raw closing tag and angle brackets must be escaped in the script context.
    expect(html).not.toContain("</script><img");
    expect(html).toContain("\\u003c/script\\u003e\\u003cimg");
  });

  it("escapes a --title containing HTML so it cannot inject markup", async () => {
    const html = await renderHtml(data, { title: "</title><script>alert(1)</script>" });
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
  });
});
