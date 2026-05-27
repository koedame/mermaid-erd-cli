[English](./README.md) | [日本語](./README.ja.md) | [简体中文](./README.zh.md) | [한국어](./README.ko.md) | [Español](./README.es.md) | [Français](./README.fr.md) | [Deutsch](./README.de.md) | [Português](./README.pt.md) | [Русский](./README.ru.md)

# mermaid-erd-cli

[![CI](https://github.com/koedame/mermaid-erd-cli/actions/workflows/ci.yml/badge.svg)](https://github.com/koedame/mermaid-erd-cli/actions/workflows/ci.yml)
[![npm version](https://badge.fury.io/js/mermaid-erd-cli.svg)](https://www.npmjs.com/package/mermaid-erd-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

Erzeugt ein [Mermaid](https://mermaid.js.org/)-ER-Diagramm aus einer aktiven Datenbank oder einem Schema-Dump – ohne ORM oder Framework.

![screenshot](https://raw.githubusercontent.com/koedame/mermaid-erd-cli/main/docs/screenshot.png)

Es untersucht (introspiziert) Ihr Schema (Tabellen, Spalten, Primärschlüssel, Fremdschlüssel, Kommentare) und kann wahlweise Folgendes ausgeben:

- einen einzelnen, eigenständigen **HTML-Viewer** (Mermaid, Vue und Tailwind inline gebündelt, offline nutzbar), in dem Sie Tabellen auswählen und als SVG/PNG exportieren, oder
- rohen **Mermaid**-Text / **JSON** auf die **Standardausgabe**, sodass er sich mit anderen Werkzeugen kombinieren lässt.

Beziehungen werden aus Fremdschlüsseln abgeleitet: Die referenzierte Tabelle ist die „Eins“-Seite, die Tabelle mit dem Fremdschlüssel die „Viele“-Seite. Ein `NOT NULL`-Fremdschlüssel wird als verpflichtende Beziehung (`||--o{`) dargestellt, ein nullbarer als optionale (`|o--o{`).

## Verwendung

```bash
# Interaktiver HTML-Viewer (Standard → erd/index.html)
npx mermaid-erd-cli --db "postgres://user:pass@localhost:5432/mydb"
npx mermaid-erd-cli --db ./dev.sqlite3
npx mermaid-erd-cli --db ./dev.sqlite3 --serve        # über HTTP bereitstellen

# Schema-Dumps – keine Datenbankverbindung nötig
npx mermaid-erd-cli --schema ./db/schema.rb           # Rails schema.rb
npx mermaid-erd-cli --schema ./dump.sql               # SQL-DDL (CREATE TABLE ...)

# Mermaid / JSON auf die Standardausgabe schreiben (in alles weiterleitbar)
npx mermaid-erd-cli --db ./dev.sqlite3 --format mermaid           # erDiagram-Text
npx mermaid-erd-cli --db ./dev.sqlite3 --format mermaid > er.mmd
npx mermaid-erd-cli --schema schema.rb --format mermaid | mmdc -i - -o er.svg
npx mermaid-erd-cli --db ./dev.sqlite3 --format json | jq '.Models[].TableName'
```

Mit `--out -` erzwingen Sie jede Ausgabe (auch HTML) auf die Standardausgabe.

### Unterstützte Datenbanken

Der Treiber für Ihre Datenbank wird nur bei Bedarf geladen – installieren Sie also nur den, den Sie verwenden:

| Quelle | Treiberpaket |
| --- | --- |
| PostgreSQL | `pg` |
| MySQL | `mysql2` |
| SQLite | `better-sqlite3` |

Das Parsen von Schema-Dumps (`--schema`) benötigt gar keinen Treiber.

## Optionen

| Option | Beschreibung | Standard |
| --- | --- | --- |
| `--db <url>` | Verbindungs-URL oder SQLite-Pfad | — |
| `--schema <path>` | Schema-Dump (`.rb` Rails-Schema, `.sql` DDL) | — |
| `--pg-schema <name>` | Zu introspizierendes PostgreSQL-Schema | `public` |
| `--format <html\|mermaid\|json>` | Ausgabeformat (`mmd` ist ein Alias für `mermaid`) | `html` |
| `--out <path>` | Ausgabepfad; `-` bedeutet Standardausgabe | `erd/index.html` (html); Standardausgabe (mermaid/json) |
| `--serve` | HTML rendern und über HTTP bereitstellen | aus |
| `--ignore-tables <patterns>` | Komma-getrennte Regex-Muster zum Ausschließen | `^schema_migrations$,^ar_internal_metadata$` |
| `--config <path>` | Pfad zur Konfigurationsdatei | `mermaid-erd.yml` |
| `--title <name>` | Im HTML-Viewer angezeigter Titel | `Database` |

Ausschlussmuster können Sie auch in einer `mermaid-erd.yml` ablegen:

```yaml
ignore_tables:
  - "^schema_migrations$"
  - "_old$"
```

## Entwicklung

```bash
npm install
npm run build      # TypeScript nach dist/ kompilieren
npm test           # Unit- und Integrationstests (vitest)
npm run e2e        # Headless-Browser-Prüfung des erzeugten Viewers
```

## Danksagung

Der HTML-Viewer und die mitgelieferten Frontend-Bibliotheken stammen von [rails-mermaid_erd](https://github.com/koedame/rails-mermaid_erd) (MIT) ab. Dieses Projekt behält denselben Viewer und den `SCHEMA_DATA`-Vertrag bei und ersetzt die Rails/ActiveRecord-Extraktion durch direkte Datenbank-Introspektion und das Parsen von Schema-Dumps. Die mitgelieferten Builds von Mermaid, Vue und Tailwind werden unter ihren eigenen MIT-Lizenzen weiterverteilt; siehe [`assets/vendor/LICENSES.md`](./assets/vendor/LICENSES.md).

## Lizenz

MIT – siehe [LICENSE](./LICENSE).
