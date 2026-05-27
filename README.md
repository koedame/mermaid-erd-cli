[English](./README.md) | [日本語](./README.ja.md) | [简体中文](./README.zh.md) | [한국어](./README.ko.md) | [Español](./README.es.md) | [Français](./README.fr.md) | [Deutsch](./README.de.md) | [Português](./README.pt.md) | [Русский](./README.ru.md)

# mermaid-erd-cli

[![CI](https://github.com/koedame/mermaid-erd-cli/actions/workflows/ci.yml/badge.svg)](https://github.com/koedame/mermaid-erd-cli/actions/workflows/ci.yml)
[![npm version](https://badge.fury.io/js/mermaid-erd-cli.svg)](https://www.npmjs.com/package/mermaid-erd-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

Generate a [Mermaid](https://mermaid.js.org/) ER diagram from a live database or a
schema dump — no ORM or framework required.

[![screenshot](https://raw.githubusercontent.com/koedame/mermaid-erd-cli/main/docs/screenshot.png)](https://koedame.github.io/mermaid-erd-cli/#eyJzZWxlY3RNb2RlbHMiOlsidGVhbXMiLCJ1c2VycyIsInBvc3RzIiwiY29tbWVudHMiLCJ0YWdzIiwicG9zdF90YWdzIl0sImlzUHJldmlld1JlbGF0aW9ucyI6ZmFsc2UsImlzU2hvd1JlbGF0aW9uQ29tbWVudCI6ZmFsc2UsImlzU2hvd0tleSI6dHJ1ZSwiaXNTaG93Q29tbWVudCI6ZmFsc2UsImlzSGlkZUNvbHVtbnMiOmZhbHNlfQ==)

**▶ [Live demo](https://koedame.github.io/mermaid-erd-cli/#eyJzZWxlY3RNb2RlbHMiOlsidGVhbXMiLCJ1c2VycyIsInBvc3RzIiwiY29tbWVudHMiLCJ0YWdzIiwicG9zdF90YWdzIl0sImlzUHJldmlld1JlbGF0aW9ucyI6ZmFsc2UsImlzU2hvd1JlbGF0aW9uQ29tbWVudCI6ZmFsc2UsImlzU2hvd0tleSI6dHJ1ZSwiaXNTaG93Q29tbWVudCI6ZmFsc2UsImlzSGlkZUNvbHVtbnMiOmZhbHNlfQ==)**

It introspects your schema (tables, columns, primary keys, foreign keys, comments)
and can output either:

- a single self-contained **HTML viewer** (Mermaid, Vue, Tailwind bundled inline, offline-capable) where you pick tables and export SVG/PNG, or
- raw **Mermaid** text / **JSON** to **stdout**, so it composes with other tools.

Relationships are derived from foreign keys: the referenced table is the "one" side
and the table holding the foreign key is the "many" side. A `NOT NULL` foreign key
renders as a mandatory relation (`||--o{`); a nullable one renders as optional
(`|o--o{`).

## Usage

```bash
# Interactive HTML viewer (default → erd/index.html)
npx mermaid-erd-cli --db "postgres://user:pass@localhost:5432/mydb"
npx mermaid-erd-cli --db ./dev.sqlite3
npx mermaid-erd-cli --db ./dev.sqlite3 --serve        # serve over HTTP (random port)
npx mermaid-erd-cli --db ./dev.sqlite3 --serve --port 5173   # serve on a fixed port

# Schema dumps — no database connection needed
npx mermaid-erd-cli --schema ./db/schema.rb           # Rails schema.rb
npx mermaid-erd-cli --schema ./dump.sql               # SQL DDL (CREATE TABLE ...)

# Stream Mermaid / JSON to stdout (pipe into anything)
npx mermaid-erd-cli --db ./dev.sqlite3 --format mermaid           # erDiagram text
npx mermaid-erd-cli --db ./dev.sqlite3 --format mermaid > er.mmd
npx mermaid-erd-cli --schema schema.rb --format mermaid | mmdc -i - -o er.svg
npx mermaid-erd-cli --db ./dev.sqlite3 --format json | jq '.Models[].TableName'
```

Use `--out -` to force any format (including HTML) to stdout.

### Supported databases

The driver for your database is loaded only when needed, so install just the one you use:

| Source | Driver package |
| --- | --- |
| PostgreSQL | `pg` |
| MySQL | `mysql2` |
| SQLite | `better-sqlite3` |

Schema-dump parsing (`--schema`) needs no driver at all.

## Options

| Option | Description | Default |
| --- | --- | --- |
| `--db <url>` | Connection URL or SQLite path | — |
| `--schema <path>` | Schema dump (`.rb` Rails schema, `.sql` DDL) | — |
| `--pg-schema <name>` | PostgreSQL schema to introspect | `public` |
| `--format <html\|mermaid\|json>` | Output format (`mmd` is an alias for `mermaid`) | `html` |
| `--out <path>` | Output path; `-` means stdout | `erd/index.html` (html); stdout (mermaid/json) |
| `--serve` | Render HTML and serve it over HTTP | off |
| `--port <number>` | Port to listen on with `--serve` | random |
| `--host <address>` | Address to bind with `--serve`. `0.0.0.0` exposes your full schema on every network interface — use only on trusted networks | `127.0.0.1` |
| `--ignore-tables <patterns>` | Comma-separated regex patterns to exclude | `^schema_migrations$,^ar_internal_metadata$` |
| `--config <path>` | Config file path | `mermaid-erd.yml` |
| `--title <name>` | Title shown in the HTML viewer | `Database` |

You can also keep ignore patterns in a `mermaid-erd.yml`:

```yaml
ignore_tables:
  - "^schema_migrations$"
  - "_old$"
```

## Development

```bash
npm install
npm run build      # compile TypeScript to dist/
npm test           # unit + integration tests (vitest)
npm run e2e        # headless-browser check of the generated viewer
```

## Acknowledgements

The HTML viewer and the vendored front-end libraries are derived from
[rails-mermaid_erd](https://github.com/koedame/rails-mermaid_erd) (MIT). This
project keeps the same viewer and `SCHEMA_DATA` contract, replacing the
Rails/ActiveRecord extraction with direct database introspection and schema-dump
parsing. The bundled Mermaid, Vue, and Tailwind builds are redistributed under
their own MIT licenses; see [`assets/vendor/LICENSES.md`](./assets/vendor/LICENSES.md).

## License

MIT — see [LICENSE](./LICENSE).
