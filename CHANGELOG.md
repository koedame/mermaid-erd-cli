# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-05-27

### Added

- Generate a Mermaid ERD from a live database (PostgreSQL, MySQL, SQLite) by
  introspecting the schema and deriving relationships from foreign keys.
- Generate from a schema dump without a connection: Rails `schema.rb` and SQL
  DDL (`CREATE TABLE` / `ALTER TABLE ... FOREIGN KEY`, pg_dump style).
- Output formats: self-contained HTML viewer, raw Mermaid text, and JSON.
- Stream Mermaid/JSON to stdout (`--format mermaid|json`, or `--out -`) for
  piping into other tools.
- `--serve` to view the HTML over HTTP; `--ignore-tables` and `mermaid-erd.yml`
  config for excluding tables.
- `--pg-schema <name>` to introspect a non-`public` PostgreSQL schema.
- HTML viewer UI translated into 9 languages (English, Japanese, Chinese,
  Korean, Spanish, French, German, Portuguese, Russian), auto-detected from the
  browser language with a manual selector.

[0.1.0]: https://github.com/koedame/mermaid-erd-cli/releases/tag/v0.1.0
