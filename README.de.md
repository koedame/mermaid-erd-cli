[English](./README.md) | [日本語](./README.ja.md) | [简体中文](./README.zh.md) | [한국어](./README.ko.md) | [Español](./README.es.md) | [Français](./README.fr.md) | [Deutsch](./README.de.md) | [Português](./README.pt.md) | [Русский](./README.ru.md)

# mermaid-erd-cli

[![CI](https://github.com/koedame/mermaid-erd-cli/actions/workflows/ci.yml/badge.svg)](https://github.com/koedame/mermaid-erd-cli/actions/workflows/ci.yml)
[![npm version](https://badge.fury.io/js/mermaid-erd-cli.svg)](https://www.npmjs.com/package/mermaid-erd-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

Erzeugt ein [Mermaid](https://mermaid.js.org/)-ER-Diagramm aus einer aktiven Datenbank oder einem Schema-Dump – ohne ORM oder Framework.

[![screenshot](https://raw.githubusercontent.com/koedame/mermaid-erd-cli/main/docs/screenshot.png)](https://koedame.github.io/mermaid-erd-cli/#eyJzZWxlY3RNb2RlbHMiOlsidGVhbXMiLCJ1c2VycyIsInBvc3RzIiwiY29tbWVudHMiLCJ0YWdzIiwicG9zdF90YWdzIl0sImlzUHJldmlld1JlbGF0aW9ucyI6ZmFsc2UsImlzU2hvd1JlbGF0aW9uQ29tbWVudCI6ZmFsc2UsImlzU2hvd0tleSI6dHJ1ZSwiaXNTaG93Q29tbWVudCI6ZmFsc2UsImlzSGlkZUNvbHVtbnMiOmZhbHNlfQ==)

**▶ [Live-Demo](https://koedame.github.io/mermaid-erd-cli/#eyJzZWxlY3RNb2RlbHMiOlsidGVhbXMiLCJ1c2VycyIsInBvc3RzIiwiY29tbWVudHMiLCJ0YWdzIiwicG9zdF90YWdzIl0sImlzUHJldmlld1JlbGF0aW9ucyI6ZmFsc2UsImlzU2hvd1JlbGF0aW9uQ29tbWVudCI6ZmFsc2UsImlzU2hvd0tleSI6dHJ1ZSwiaXNTaG93Q29tbWVudCI6ZmFsc2UsImlzSGlkZUNvbHVtbnMiOmZhbHNlfQ==)**

Es untersucht (introspiziert) Ihr Schema (Tabellen, Spalten, Primärschlüssel, Fremdschlüssel, Kommentare) und kann wahlweise Folgendes ausgeben:

- einen einzelnen, eigenständigen **HTML-Viewer** (Mermaid, Vue und Tailwind inline gebündelt, offline nutzbar), in dem Sie Tabellen auswählen und als SVG/PNG exportieren, oder
- rohen **Mermaid**-Text / **JSON** auf die **Standardausgabe**, sodass er sich mit anderen Werkzeugen kombinieren lässt.

Beziehungen werden aus Fremdschlüsseln abgeleitet: Die referenzierte Tabelle ist die „Eins“-Seite, die Tabelle mit dem Fremdschlüssel die „Viele“-Seite. Ein `NOT NULL`-Fremdschlüssel wird als verpflichtende Beziehung (`||--o{`) dargestellt, ein nullbarer als optionale (`|o--o{`).

## Verwendung

```bash
# Interaktiver HTML-Viewer (Standard → erd/index.html)
npx mermaid-erd-cli --db "postgres://user:pass@localhost:5432/mydb"
npx mermaid-erd-cli --db ./dev.sqlite3
npx mermaid-erd-cli --db ./dev.sqlite3 --serve        # über HTTP bereitstellen (zufälliger Port)
npx mermaid-erd-cli --db ./dev.sqlite3 --serve --port 5173   # auf einem festen Port bereitstellen

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

## Docker

Vorgefertigte Images werden mit jedem Release in der GitHub Container Registry
und auf Docker Hub veröffentlicht. Die Laufzeit ist ein minimales, distroless
Image, das alle drei Datenbanktreiber enthält, sodass die Live-Introspektion
ohne weitere Installation funktioniert.

```bash
docker pull ghcr.io/koedame/mermaid-erd-cli   # oder: docker pull koedame/mermaid-erd-cli
```

Der Container arbeitet in `/work`; mounten Sie dorthin das Verzeichnis, das Sie
lesen und beschreiben möchten. Die Beispiele verwenden das GHCR-Image — ersetzen
Sie `ghcr.io/koedame/mermaid-erd-cli` durch `koedame/mermaid-erd-cli` für
Docker Hub.

```bash
# Schema-Dump im aktuellen Verzeichnis -> erd/index.html daneben
docker run --rm -u "$(id -u):$(id -g)" -v "$PWD:/work" \
  ghcr.io/koedame/mermaid-erd-cli --schema schema.rb

# Mermaid / JSON auf die Standardausgabe
docker run --rm -v "$PWD:/work" ghcr.io/koedame/mermaid-erd-cli --schema dump.sql --format mermaid

# Live-SQLite-Datei
docker run --rm -v "$PWD:/work" ghcr.io/koedame/mermaid-erd-cli --db /work/dev.sqlite3 --format mermaid
```

Das Image läuft als Nicht-Root-Benutzer; fügen Sie daher `-u "$(id -u):$(id -g)"`
hinzu, wenn es in ein Host-Verzeichnis schreibt, das Ihnen gehört (wie im ersten
Beispiel); Befehle, die nur auf die Standardausgabe schreiben, benötigen dies
nicht.

Um eine auf dem Host laufende Datenbank zu erreichen, beachten Sie, dass
`localhost` innerhalb des Containers der Container selbst ist. Verwenden Sie
`host.docker.internal` (Docker Desktop) oder `--network host` (Linux):

```bash
docker run --rm --network host ghcr.io/koedame/mermaid-erd-cli \
  --db "postgres://user:pass@localhost:5432/mydb" --format mermaid
```

Um den Viewer bereitzustellen, binden Sie im Container an `0.0.0.0` und
veröffentlichen Sie den Port – er bleibt nur über den veröffentlichten Port
erreichbar:

```bash
docker run --rm -p 8080:8080 -v "$PWD:/work" ghcr.io/koedame/mermaid-erd-cli \
  --db /work/dev.sqlite3 --serve --host 0.0.0.0 --port 8080
# dann http://localhost:8080 öffnen
```

Um das Image selbst zu bauen, anstatt es herunterzuladen:

```bash
docker build -t mermaid-erd-cli .
docker run --rm -v "$PWD:/work" mermaid-erd-cli --schema schema.rb
```

## Optionen

| Option | Beschreibung | Standard |
| --- | --- | --- |
| `--db <url>` | Verbindungs-URL oder SQLite-Pfad | — |
| `--schema <path>` | Schema-Dump (`.rb` Rails-Schema, `.sql` DDL) | — |
| `--pg-schema <name>` | Zu introspizierendes PostgreSQL-Schema | `public` |
| `--format <html\|mermaid\|json>` | Ausgabeformat (`mmd` ist ein Alias für `mermaid`) | `html` |
| `--out <path>` | Ausgabepfad; `-` bedeutet Standardausgabe | `erd/index.html` (html); Standardausgabe (mermaid/json) |
| `--serve` | HTML rendern und über HTTP bereitstellen | aus |
| `--port <number>` | Port, auf dem `--serve` lauscht | zufällig |
| `--host <address>` | Adresse, an die `--serve` bindet. `0.0.0.0` macht das vollständige Schema auf allen Netzwerkschnittstellen zugänglich — nur in vertrauenswürdigen Netzwerken verwenden | `127.0.0.1` |
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
