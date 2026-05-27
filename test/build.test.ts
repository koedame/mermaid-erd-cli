import { describe, expect, it } from "vitest";
import { buildSchemaData } from "../src/build.js";
import type { RawSchema } from "../src/types.js";

const schema: RawSchema = {
  tables: [
    {
      name: "teams",
      comment: "the teams",
      columns: [
        { name: "id", type: "bigint", nullable: false, primaryKey: true, comment: null },
        {
          name: "name",
          type: "character varying(255)",
          nullable: false,
          primaryKey: false,
          comment: "display name",
        },
      ],
      foreignKeys: [],
    },
    {
      name: "users",
      comment: null,
      columns: [
        { name: "id", type: "bigint", nullable: false, primaryKey: true, comment: null },
        { name: "team_id", type: "bigint", nullable: false, primaryKey: false, comment: null },
        { name: "manager_id", type: "bigint", nullable: true, primaryKey: false, comment: null },
      ],
      foreignKeys: [
        { columns: ["team_id"], referencedTable: "teams" },
        { columns: ["manager_id"], referencedTable: "users" },
      ],
    },
  ],
};

describe("buildSchemaData", () => {
  it("marks primary key and foreign key columns", () => {
    const { Models } = buildSchemaData(schema);
    const users = Models.find((m) => m.TableName === "users")!;
    expect(users.Columns.find((c) => c.name === "id")!.key).toBe("PK");
    expect(users.Columns.find((c) => c.name === "team_id")!.key).toBe("FK");
    expect(users.Columns.find((c) => c.name === "manager_id")!.key).toBe("FK");
  });

  it("renders a NOT NULL foreign key as a mandatory relation", () => {
    const { Relations } = buildSchemaData(schema);
    const teamRel = Relations.find(
      (r) => r.LeftModelName === "teams" && r.RightModelName === "users",
    )!;
    expect(teamRel.LeftValue).toBe("||");
    expect(teamRel.RightValue).toBe("o{");
  });

  it("comments a relation with its has_many / belongs_to associations", () => {
    const { Relations } = buildSchemaData(schema);
    const teamRel = Relations.find(
      (r) => r.LeftModelName === "teams" && r.RightModelName === "users",
    )!;
    expect(teamRel.Comment).toBe("has_many: users, belongs_to: team");
  });

  it("renders a nullable foreign key as an optional relation", () => {
    const { Relations } = buildSchemaData(schema);
    const self = Relations.find((r) => r.Comment === "has_many: users, belongs_to: manager")!;
    expect(self.LeftValue).toBe("|o");
    expect(self.LeftModelName).toBe("users");
    expect(self.RightModelName).toBe("users");
  });

  it("sanitizes types that contain spaces so Mermaid can parse them", () => {
    const { Models } = buildSchemaData(schema);
    const name = Models[0].Columns.find((c) => c.name === "name")!;
    expect(name.type).toBe("character_varying(255)");
  });

  it("drops ignored tables and their dangling relations", () => {
    const { Models, Relations } = buildSchemaData(schema, { ignoreTables: ["^teams$"] });
    expect(Models.map((m) => m.TableName)).toEqual(["users"]);
    expect(Relations.some((r) => r.LeftModelName === "teams")).toBe(false);
  });
});

describe("buildSchemaData Mermaid safety", () => {
  const tricky: RawSchema = {
    tables: [
      {
        name: "order items",
        comment: 'has "quotes" and\nnewlines',
        columns: [
          {
            name: "full name",
            type: "text",
            nullable: false,
            primaryKey: true,
            comment: 'a: b {c}"',
          },
        ],
        foreignKeys: [],
      },
    ],
  };

  it("maps non-bareword identifiers to underscores so the diagram parses", () => {
    const { Models } = buildSchemaData(tricky);
    expect(Models[0].ModelName).toBe("order_items");
    expect(Models[0].Columns[0].name).toBe("full_name");
  });

  it("strips double quotes and newlines from comments", () => {
    const { Models } = buildSchemaData(tricky);
    expect(Models[0].TableComment).toBe("has quotes and newlines");
    expect(Models[0].Columns[0].comment).not.toContain('"');
    expect(Models[0].Columns[0].comment).not.toContain("\n");
  });
});
