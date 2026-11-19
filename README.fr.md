[English](./README.md) | [日本語](./README.ja.md) | [简体中文](./README.zh.md) | [한국어](./README.ko.md) | [Español](./README.es.md) | [Français](./README.fr.md) | [Deutsch](./README.de.md) | [Português](./README.pt.md) | [Русский](./README.ru.md)

<div align="center">

# mermaid-erd-cli

**Génère un diagramme entité-association [Mermaid](https://mermaid.js.org/) à partir d’une base de données active ou d’un export de schéma — sans ORM ni framework.**

<a href="https://koedame.github.io/mermaid-erd-cli/#eyJzZWxlY3RNb2RlbHMiOlsidGVhbXMiLCJ1c2VycyIsInBvc3RzIiwiY29tbWVudHMiLCJ0YWdzIiwicG9zdF90YWdzIl0sImlzUHJldmlld1JlbGF0aW9ucyI6ZmFsc2UsImlzU2hvd1JlbGF0aW9uQ29tbWVudCI6ZmFsc2UsImlzU2hvd0tleSI6dHJ1ZSwiaXNTaG93Q29tbWVudCI6ZmFsc2UsImlzSGlkZUNvbHVtbnMiOmZhbHNlfQ=="><img alt="Le visualiseur HTML de mermaid-erd-cli affichant six tables d’un schéma de blog d’exemple et les relations de clé étrangère entre elles" src="https://raw.githubusercontent.com/koedame/mermaid-erd-cli/main/docs/images/hero.png" width="900"></a>

[![CI](https://github.com/koedame/mermaid-erd-cli/actions/workflows/ci.yml/badge.svg)](https://github.com/koedame/mermaid-erd-cli/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/mermaid-erd-cli?color=336699)](https://www.npmjs.com/package/mermaid-erd-cli)
![Node.js 22.12+](https://img.shields.io/badge/node-%E2%89%A522.12-336699)
[![License: MIT](https://img.shields.io/badge/license-MIT-336699)](./LICENSE)

[Démo en direct](https://koedame.github.io/mermaid-erd-cli/#eyJzZWxlY3RNb2RlbHMiOlsidGVhbXMiLCJ1c2VycyIsInBvc3RzIiwiY29tbWVudHMiLCJ0YWdzIiwicG9zdF90YWdzIl0sImlzUHJldmlld1JlbGF0aW9ucyI6ZmFsc2UsImlzU2hvd1JlbGF0aW9uQ29tbWVudCI6ZmFsc2UsImlzU2hvd0tleSI6dHJ1ZSwiaXNTaG93Q29tbWVudCI6ZmFsc2UsImlzSGlkZUNvbHVtbnMiOmZhbHNlfQ==) · [Démarrage rapide](#démarrage-rapide) · [Utilisation](#utilisation) · [Docker](#docker) · [Options](#options)

</div>

L’outil introspecte votre schéma (tables, colonnes, clés primaires, clés étrangères, commentaires) et peut produire :

- un **visualiseur HTML** autonome (Mermaid, Vue et Tailwind intégrés en ligne, utilisable hors connexion) où vous choisissez les tables et exportez en SVG/PNG, ou
- du texte **Mermaid** / **JSON** brut sur la **sortie standard**, pour le combiner avec d’autres outils.

Les relations sont déduites des clés étrangères : la table référencée est le côté « un » et la table portant la clé étrangère est le côté « plusieurs ». Une clé étrangère `NOT NULL` est rendue comme une relation obligatoire (`||--o{`) ; une clé nullable comme une relation facultative (`|o--o{`).

## Points forts

- **Trois bases de données actives, deux formats d’export.** PostgreSQL, MySQL et SQLite directement ; `schema.rb` de Rails et fichiers SQL DDL sans connexion à une base ni pilote.
- **Un seul fichier HTML autonome.** Mermaid, Vue et Tailwind sont intégrés en ligne : le visualiseur fonctionne hors connexion, vous choisissez les tables puis exportez en SVG ou PNG.
- **Se branche sur n’importe quel outil par tube.** `--format mermaid` et `--format json` écrivent sur la sortie standard.
- **S’exécute dans un conteneur.** Une image Docker distroless embarque les trois pilotes (GHCR et Docker Hub).
- **Visualiseur en 9 langues.** English, 日本語, 简体中文, 한국어, Español, Français, Deutsch, Português et Русский.

## Démarrage rapide

Nécessite Node.js 22.12 ou plus récent. `npx` récupère la CLI, il n’y a donc rien à installer au préalable :

```bash
npx mermaid-erd-cli --schema ./db/schema.rb
```

Cette commande écrit `erd/index.html` : ouvrez-le dans un navigateur, choisissez des tables dans la barre latérale et exportez en SVG ou PNG. Pour lire une base active, passez plutôt `--db "postgres://user:pass@localhost:5432/mydb"` (ou un chemin de fichier SQLite). D’autres exemples se trouvent dans [Utilisation](#utilisation).

## Utilisation

```bash
# Visualiseur HTML interactif (par défaut → erd/index.html)
npx mermaid-erd-cli --db "postgres://user:pass@localhost:5432/mydb"
npx mermaid-erd-cli --db ./dev.sqlite3
npx mermaid-erd-cli --db ./dev.sqlite3 --serve        # servir via HTTP (port aléatoire)
npx mermaid-erd-cli --db ./dev.sqlite3 --serve --port 5173   # servir sur un port fixe

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

Le HTML généré, ainsi que la sortie de `--format json` et `--format mermaid`, contiennent le schéma de votre base de données : noms et types des tables et des colonnes, commentaires et relations. Ne les partagez ou ne les hébergez qu'avec le même public que celui avec lequel vous partageriez le schéma lui-même.

### Bases de données prises en charge

Le pilote de votre base n’est chargé qu’en cas de besoin ; installez donc uniquement celui que vous utilisez :

| Source | Paquet du pilote |
| --- | --- |
| PostgreSQL | `pg` |
| MySQL | `mysql2` |
| SQLite | `better-sqlite3` |

L’analyse des exports de schéma (`--schema`) ne nécessite aucun pilote.

## Docker

Des images préconstruites sont publiées à chaque version sur GitHub Container
Registry et Docker Hub. L’environnement d’exécution est une image distroless
minimale qui embarque les trois pilotes de base de données, si bien que
l’introspection en direct fonctionne sans rien installer d’autre.

```bash
docker pull ghcr.io/koedame/mermaid-erd-cli   # ou : docker pull koedame/mermaid-erd-cli
```

Le conteneur travaille dans `/work` ; montez-y le répertoire que vous voulez
lire et écrire. Les exemples utilisent l’image GHCR — remplacez
`ghcr.io/koedame/mermaid-erd-cli` par `koedame/mermaid-erd-cli` pour Docker Hub.

```bash
# Export de schéma dans le répertoire courant -> erd/index.html à côté
docker run --rm -u "$(id -u):$(id -g)" -v "$PWD:/work" \
  ghcr.io/koedame/mermaid-erd-cli --schema schema.rb

# Mermaid / JSON vers la sortie standard
docker run --rm -v "$PWD:/work" ghcr.io/koedame/mermaid-erd-cli --schema dump.sql --format mermaid

# Fichier SQLite en direct
docker run --rm -v "$PWD:/work" ghcr.io/koedame/mermaid-erd-cli --db /work/dev.sqlite3 --format mermaid
```

L’image s’exécute en tant qu’utilisateur non-root ; ajoutez donc
`-u "$(id -u):$(id -g)"` lorsqu’elle écrit dans un répertoire hôte qui vous
appartient (comme dans le premier exemple) ; les commandes qui n’écrivent que
sur la sortie standard n’en ont pas besoin.

Pour atteindre une base de données qui tourne sur l’hôte, rappelez-vous que
`localhost` dans le conteneur désigne le conteneur lui-même. Utilisez
`host.docker.internal` (Docker Desktop) ou `--network host` (Linux) :

```bash
docker run --rm --network host ghcr.io/koedame/mermaid-erd-cli \
  --db "postgres://user:pass@localhost:5432/mydb" --format mermaid
```

Pour servir la visionneuse, liez-vous à `0.0.0.0` dans le conteneur et publiez
le port : elle ne reste accessible que via le port que vous publiez.

```bash
docker run --rm -p 8080:8080 -v "$PWD:/work" ghcr.io/koedame/mermaid-erd-cli \
  --db /work/dev.sqlite3 --serve --host 0.0.0.0 --port 8080
# puis ouvrez http://localhost:8080
```

Pour construire l’image vous-même plutôt que de la télécharger :

```bash
docker build -t mermaid-erd-cli .
docker run --rm -v "$PWD:/work" mermaid-erd-cli --schema schema.rb
```

## Options

| Option | Description | Par défaut |
| --- | --- | --- |
| `--db <url>` | URL de connexion ou chemin SQLite | — |
| `--schema <path>` | Export de schéma (`.rb` schéma Rails, `.sql` DDL) | — |
| `--pg-schema <name>` | Schéma PostgreSQL à introspecter | `public` |
| `--format <html\|mermaid\|json>` | Format de sortie (`mmd` est un alias de `mermaid`) | `html` |
| `--out <path>` | Chemin de sortie ; `-` signifie sortie standard | `erd/index.html` (html) ; sortie standard (mermaid/json) |
| `--serve` | Rendre le HTML et le servir via HTTP | désactivé |
| `--port <number>` | Port d'écoute avec `--serve` | aléatoire |
| `--host <address>` | Adresse à lier avec `--serve`. `0.0.0.0` expose l'intégralité du schéma sur toutes les interfaces réseau — à utiliser uniquement sur des réseaux de confiance | `127.0.0.1` |
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

Le visualiseur HTML et les bibliothèques front-end intégrées dérivent de [rails-mermaid_erd](https://github.com/koedame/rails-mermaid_erd) (MIT). Ce projet conserve le même visualiseur et le contrat `SCHEMA_DATA`, en remplaçant l’extraction Rails/ActiveRecord par une introspection directe de la base de données et l’analyse d’exports de schéma. Les builds intégrés de Mermaid et Vue et la feuille de style générée avec Tailwind CSS sont redistribués sous leurs propres licences (MIT, ISC, BSD-3-Clause, Apache-2.0 et quelques autres). Leurs mentions de copyright et textes de licence se trouvent dans [`assets/vendor/LICENSES.md`](./assets/vendor/LICENSES.md) et au début de chaque fichier HTML généré.

## Marques

Ce projet n'est affilié ni au projet Mermaid, ni à Mermaid Chart Inc., et n'est ni approuvé ni parrainé par eux. Mermaid Chart Inc. a déposé ou enregistré les marques MERMAID CHART et MERMAID aux États-Unis. PostgreSQL, MySQL, SQLite, Docker et toutes les autres marques appartiennent à leurs propriétaires respectifs.

## Licence

MIT — voir [LICENSE](./LICENSE).
