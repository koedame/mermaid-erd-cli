# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0] - 2026-05-28

### Added

- Docker image for running the CLI without a local Node install. It is a
  distroless, non-root runtime that bundles all three database drivers, built
  from a `Dockerfile` and published per release to GitHub Container Registry
  (`ghcr.io/koedame/mermaid-erd-cli`) and Docker Hub (`koedame/mermaid-erd-cli`).
  The README documents volume mounts, reaching a host database, and serving the
  viewer.

### Changed

- The database drivers (`pg`, `mysql2`, `better-sqlite3`) are now declared only
  in `optionalDependencies` instead of being duplicated in `devDependencies`, so
  `npm ci --omit=dev` keeps them. No change for `npm install` users.

## [0.2.0] - 2026-05-27

### Added

- `--port` and `--host` to control the address `--serve` listens on (defaults:
  random port, loopback).

### Changed

- Raise the minimum supported Node.js to 20.19 and drop end-of-life Node 18.

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

[0.3.0]: https://github.com/koedame/mermaid-erd-cli/releases/tag/v0.3.0
[0.2.0]: https://github.com/koedame/mermaid-erd-cli/releases/tag/v0.2.0
[0.1.0]: https://github.com/koedame/mermaid-erd-cli/releases/tag/v0.1.0
