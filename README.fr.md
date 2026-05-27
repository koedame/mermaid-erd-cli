[English](./README.md) | [日本語](./README.ja.md) | [简体中文](./README.zh.md) | [한국어](./README.ko.md) | [Español](./README.es.md) | [Français](./README.fr.md) | [Deutsch](./README.de.md) | [Português](./README.pt.md) | [Русский](./README.ru.md)

# mermaid-erd-cli

[![CI](https://github.com/koedame/mermaid-erd-cli/actions/workflows/ci.yml/badge.svg)](https://github.com/koedame/mermaid-erd-cli/actions/workflows/ci.yml)
[![npm version](https://badge.fury.io/js/mermaid-erd-cli.svg)](https://www.npmjs.com/package/mermaid-erd-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

Génère un diagramme entité-association [Mermaid](https://mermaid.js.org/) à partir d’une base de données active ou d’un export de schéma — sans ORM ni framework.

![screenshot](https://raw.githubusercontent.com/koedame/mermaid-erd-cli/main/docs/screenshot.png)

L’outil introspecte votre schéma (tables, colonnes, clés primaires, clés étrangères, commentaires) et peut produire :

- un **visualiseur HTML** autonome (Mermaid, Vue et Tailwind intégrés en ligne, utilisable hors connexion) où vous choisissez les tables et exportez en SVG/PNG, ou
- du texte **Mermaid** / **JSON** brut sur la **sortie standard**, pour le combiner avec d’autres outils.

Les relations sont déduites des clés étrangères : la table référencée est le côté « un » et la table portant la clé étrangère est le côté « plusieurs ». Une clé étrangère `NOT NULL` est rendue comme une relation obligatoire (`||--o{`) ; une clé nullable comme une relation facultative (`|o--o{`).

## Utilisation

```bash
# Visualiseur HTML interactif (par défaut → erd/index.html)
npx mermaid-erd-cli --db "postgres://user:pass@localhost:5432/mydb"
npx mermaid-erd-cli --db ./dev.sqlite3
npx mermaid-erd-cli --db ./dev.sqlite3 --serve        # servir via HTTP

# Exports de schéma — aucune connexion à la base requise
npx mermaid-erd-cli --schema ./db/schema.rb           # Rails schema.rb
npx mermaid-erd-cli --schema ./dump.sql               # DDL SQL (CREATE TABLE ...)

# Envoyer le Mermaid / JSON sur la sortie standard (à rediriger vers n’importe quoi)
npx mermaid-erd-cli --db ./dev.sqlite3 --format mermaid           # texte erDiagram
npx mermaid-erd-cli --db ./dev.sqlite3 --format mermaid > er.mmd
npx mermaid-erd-cli --schema schema.rb --format mermaid | mmdc -i - -o er.svg
npx mermaid-erd-cli --db ./dev.sqlite3 --format json | jq '.Models[].TableName'
```

Utilisez `--out -` pour forcer n’importe quel format (y compris HTML) vers la sortie standard.

### Bases de données prises en charge

Le pilote de votre base n’est chargé qu’en cas de besoin ; installez donc uniquement celui que vous utilisez :

| Source | Paquet du pilote |
| --- | --- |
| PostgreSQL | `pg` |
| MySQL | `mysql2` |
| SQLite | `better-sqlite3` |

L’analyse des exports de schéma (`--schema`) ne nécessite aucun pilote.

## Options

| Option | Description | Par défaut |
| --- | --- | --- |
| `--db <url>` | URL de connexion ou chemin SQLite | — |
| `--schema <path>` | Export de schéma (`.rb` schéma Rails, `.sql` DDL) | — |
| `--pg-schema <name>` | Schéma PostgreSQL à introspecter | `public` |
| `--format <html\|mermaid\|json>` | Format de sortie (`mmd` est un alias de `mermaid`) | `html` |
| `--out <path>` | Chemin de sortie ; `-` signifie sortie standard | `erd/index.html` (html) ; sortie standard (mermaid/json) |
| `--serve` | Rendre le HTML et le servir via HTTP | désactivé |
| `--ignore-tables <patterns>` | Motifs regex séparés par des virgules à exclure | `^schema_migrations$,^ar_internal_metadata$` |
| `--config <path>` | Chemin du fichier de configuration | `mermaid-erd.yml` |
| `--title <name>` | Titre affiché dans le visualiseur HTML | `Database` |

Vous pouvez aussi conserver les motifs d’exclusion dans un `mermaid-erd.yml` :

```yaml
ignore_tables:
  - "^schema_migrations$"
  - "_old$"
```

## Développement

```bash
npm install
npm run build      # compiler le TypeScript vers dist/
npm test           # tests unitaires et d’intégration (vitest)
npm run e2e        # vérification du visualiseur généré dans un navigateur headless
```

## Remerciements

Le visualiseur HTML et les bibliothèques front-end intégrées dérivent de [rails-mermaid_erd](https://github.com/koedame/rails-mermaid_erd) (MIT). Ce projet conserve le même visualiseur et le contrat `SCHEMA_DATA`, en remplaçant l’extraction Rails/ActiveRecord par une introspection directe de la base de données et l’analyse d’exports de schéma. Les builds intégrés de Mermaid, Vue et Tailwind sont redistribués sous leurs propres licences MIT ; voir [`assets/vendor/LICENSES.md`](./assets/vendor/LICENSES.md).

## Licence

MIT — voir [LICENSE](./LICENSE).
