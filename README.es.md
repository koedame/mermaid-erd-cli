[English](./README.md) | [日本語](./README.ja.md) | [简体中文](./README.zh.md) | [한국어](./README.ko.md) | [Español](./README.es.md) | [Français](./README.fr.md) | [Deutsch](./README.de.md) | [Português](./README.pt.md) | [Русский](./README.ru.md)

# mermaid-erd-cli

[![CI](https://github.com/koedame/mermaid-erd-cli/actions/workflows/ci.yml/badge.svg)](https://github.com/koedame/mermaid-erd-cli/actions/workflows/ci.yml)
[![npm version](https://badge.fury.io/js/mermaid-erd-cli.svg)](https://www.npmjs.com/package/mermaid-erd-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

Genera un diagrama ER de [Mermaid](https://mermaid.js.org/) a partir de una base de datos en vivo o un volcado de esquema, sin necesidad de ORM ni framework.

![screenshot](https://raw.githubusercontent.com/koedame/mermaid-erd-cli/main/docs/screenshot.png)

Inspecciona tu esquema (tablas, columnas, claves primarias, claves foráneas, comentarios) y puede generar:

- un único **visor HTML** autocontenido (con Mermaid, Vue y Tailwind incluidos en línea, utilizable sin conexión) donde eliges las tablas y exportas a SVG/PNG, o
- texto **Mermaid** / **JSON** sin procesar a la **salida estándar**, para componerlo con otras herramientas.

Las relaciones se derivan de las claves foráneas: la tabla referenciada es el lado «uno» y la tabla que contiene la clave foránea es el lado «muchos». Una clave foránea `NOT NULL` se representa como una relación obligatoria (`||--o{`); una que admite nulos, como opcional (`|o--o{`).

## Uso

```bash
# Visor HTML interactivo (por defecto → erd/index.html)
npx mermaid-erd-cli --db "postgres://user:pass@localhost:5432/mydb"
npx mermaid-erd-cli --db ./dev.sqlite3
npx mermaid-erd-cli --db ./dev.sqlite3 --serve        # servir por HTTP

# Volcados de esquema — sin conexión a la base de datos
npx mermaid-erd-cli --schema ./db/schema.rb           # Rails schema.rb
npx mermaid-erd-cli --schema ./dump.sql               # DDL SQL (CREATE TABLE ...)

# Enviar Mermaid / JSON a la salida estándar (canalizable a cualquier cosa)
npx mermaid-erd-cli --db ./dev.sqlite3 --format mermaid           # texto erDiagram
npx mermaid-erd-cli --db ./dev.sqlite3 --format mermaid > er.mmd
npx mermaid-erd-cli --schema schema.rb --format mermaid | mmdc -i - -o er.svg
npx mermaid-erd-cli --db ./dev.sqlite3 --format json | jq '.Models[].TableName'
```

Usa `--out -` para forzar cualquier formato (incluido HTML) a la salida estándar.

### Bases de datos compatibles

El controlador de tu base de datos solo se carga cuando se necesita, así que instala únicamente el que uses:

| Origen | Paquete del controlador |
| --- | --- |
| PostgreSQL | `pg` |
| MySQL | `mysql2` |
| SQLite | `better-sqlite3` |

El análisis de volcados de esquema (`--schema`) no requiere ningún controlador.

## Opciones

| Opción | Descripción | Por defecto |
| --- | --- | --- |
| `--db <url>` | URL de conexión o ruta de SQLite | — |
| `--schema <path>` | Volcado de esquema (`.rb` esquema de Rails, `.sql` DDL) | — |
| `--pg-schema <name>` | Esquema de PostgreSQL a inspeccionar | `public` |
| `--format <html\|mermaid\|json>` | Formato de salida (`mmd` es un alias de `mermaid`) | `html` |
| `--out <path>` | Ruta de salida; `-` significa salida estándar | `erd/index.html` (html); salida estándar (mermaid/json) |
| `--serve` | Renderizar el HTML y servirlo por HTTP | desactivado |
| `--ignore-tables <patterns>` | Patrones regex separados por comas para excluir | `^schema_migrations$,^ar_internal_metadata$` |
| `--config <path>` | Ruta del archivo de configuración | `mermaid-erd.yml` |
| `--title <name>` | Título mostrado en el visor HTML | `Database` |

También puedes mantener los patrones de exclusión en un `mermaid-erd.yml`:

```yaml
ignore_tables:
  - "^schema_migrations$"
  - "_old$"
```

## Desarrollo

```bash
npm install
npm run build      # compilar TypeScript a dist/
npm test           # pruebas unitarias y de integración (vitest)
npm run e2e        # comprobación del visor generado en un navegador headless
```

## Agradecimientos

El visor HTML y las bibliotecas de frontend incluidas derivan de [rails-mermaid_erd](https://github.com/koedame/rails-mermaid_erd) (MIT). Este proyecto conserva el mismo visor y el contrato `SCHEMA_DATA`, sustituyendo la extracción de Rails/ActiveRecord por la inspección directa de la base de datos y el análisis de volcados de esquema. Las versiones incluidas de Mermaid, Vue y Tailwind se redistribuyen bajo sus propias licencias MIT; consulta [`assets/vendor/LICENSES.md`](./assets/vendor/LICENSES.md).

## Licencia

MIT — consulta [LICENSE](./LICENSE).
