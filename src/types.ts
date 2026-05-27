/** Normalized schema produced by every introspection source. */
export interface RawColumn {
  name: string;
  type: string;
  nullable: boolean;
  primaryKey: boolean;
  comment?: string | null;
}

export interface RawForeignKey {
  /** Local columns holding the reference, in definition order. */
  columns: string[];
  referencedTable: string;
}

export interface RawTable {
  name: string;
  comment?: string | null;
  columns: RawColumn[];
  foreignKeys: RawForeignKey[];
}

export interface RawSchema {
  tables: RawTable[];
}

/**
 * The shape consumed by the bundled front-end as `window.SCHEMA_DATA`.
 */
export interface SchemaColumn {
  name: string;
  type: string;
  key: "PK" | "FK" | "";
  comment: string | null;
}

export interface SchemaModel {
  TableName: string;
  TableComment: string;
  ModelName: string;
  IsModelExist: boolean;
  Columns: SchemaColumn[];
}

export interface SchemaRelation {
  LeftModelName: string;
  LeftValue: string;
  Line: string;
  RightModelName: string;
  RightValue: string;
  Comment: string;
}

export interface SchemaData {
  Models: SchemaModel[];
  Relations: SchemaRelation[];
}

export interface Introspector {
  introspect(): Promise<RawSchema>;
}
