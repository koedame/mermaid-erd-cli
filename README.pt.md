[English](./README.md) | [日本語](./README.ja.md) | [简体中文](./README.zh.md) | [한국어](./README.ko.md) | [Español](./README.es.md) | [Français](./README.fr.md) | [Deutsch](./README.de.md) | [Português](./README.pt.md) | [Русский](./README.ru.md)

# mermaid-erd-cli

[![CI](https://github.com/koedame/mermaid-erd-cli/actions/workflows/ci.yml/badge.svg)](https://github.com/koedame/mermaid-erd-cli/actions/workflows/ci.yml)
[![npm version](https://badge.fury.io/js/mermaid-erd-cli.svg)](https://www.npmjs.com/package/mermaid-erd-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

Gera um diagrama ER do [Mermaid](https://mermaid.js.org/) a partir de um banco de dados ativo ou de um dump de esquema — sem ORM nem framework.

[![screenshot](https://raw.githubusercontent.com/koedame/mermaid-erd-cli/main/docs/screenshot.png)](https://koedame.github.io/mermaid-erd-cli/#eyJzZWxlY3RNb2RlbHMiOlsidGVhbXMiLCJ1c2VycyIsInBvc3RzIiwiY29tbWVudHMiLCJ0YWdzIiwicG9zdF90YWdzIl0sImlzUHJldmlld1JlbGF0aW9ucyI6ZmFsc2UsImlzU2hvd1JlbGF0aW9uQ29tbWVudCI6ZmFsc2UsImlzU2hvd0tleSI6dHJ1ZSwiaXNTaG93Q29tbWVudCI6ZmFsc2UsImlzSGlkZUNvbHVtbnMiOmZhbHNlfQ==)

**▶ [Demo ao vivo](https://koedame.github.io/mermaid-erd-cli/#eyJzZWxlY3RNb2RlbHMiOlsidGVhbXMiLCJ1c2VycyIsInBvc3RzIiwiY29tbWVudHMiLCJ0YWdzIiwicG9zdF90YWdzIl0sImlzUHJldmlld1JlbGF0aW9ucyI6ZmFsc2UsImlzU2hvd1JlbGF0aW9uQ29tbWVudCI6ZmFsc2UsImlzU2hvd0tleSI6dHJ1ZSwiaXNTaG93Q29tbWVudCI6ZmFsc2UsImlzSGlkZUNvbHVtbnMiOmZhbHNlfQ==)**

Ele inspeciona seu esquema (tabelas, colunas, chaves primárias, chaves estrangeiras, comentários) e pode gerar:

- um único **visualizador HTML** autocontido (com Mermaid, Vue e Tailwind embutidos, utilizável offline), no qual você escolhe as tabelas e exporta para SVG/PNG; ou
- texto **Mermaid** / **JSON** bruto na **saída padrão**, para compor com outras ferramentas.

As relações são derivadas das chaves estrangeiras: a tabela referenciada é o lado "um" e a tabela que contém a chave estrangeira é o lado "muitos". Uma chave estrangeira `NOT NULL` é representada como uma relação obrigatória (`||--o{`); uma que aceita nulos, como opcional (`|o--o{`).

## Uso

```bash
# Visualizador HTML interativo (padrão → erd/index.html)
npx mermaid-erd-cli --db "postgres://user:pass@localhost:5432/mydb"
npx mermaid-erd-cli --db ./dev.sqlite3
npx mermaid-erd-cli --db ./dev.sqlite3 --serve        # servir via HTTP

# Dumps de esquema — sem conexão com o banco de dados
npx mermaid-erd-cli --schema ./db/schema.rb           # Rails schema.rb
npx mermaid-erd-cli --schema ./dump.sql               # DDL SQL (CREATE TABLE ...)

# Enviar Mermaid / JSON para a saída padrão (encadeável com qualquer coisa)
npx mermaid-erd-cli --db ./dev.sqlite3 --format mermaid           # texto erDiagram
npx mermaid-erd-cli --db ./dev.sqlite3 --format mermaid > er.mmd
npx mermaid-erd-cli --schema schema.rb --format mermaid | mmdc -i - -o er.svg
npx mermaid-erd-cli --db ./dev.sqlite3 --format json | jq '.Models[].TableName'
```

Use `--out -` para forçar qualquer formato (inclusive HTML) para a saída padrão.

### Bancos de dados suportados

O driver do seu banco só é carregado quando necessário, então instale apenas o que você usa:

| Origem | Pacote do driver |
| --- | --- |
| PostgreSQL | `pg` |
| MySQL | `mysql2` |
| SQLite | `better-sqlite3` |

A análise de dumps de esquema (`--schema`) não requer driver algum.

## Opções

| Opção | Descrição | Padrão |
| --- | --- | --- |
| `--db <url>` | URL de conexão ou caminho do SQLite | — |
| `--schema <path>` | Dump de esquema (`.rb` esquema do Rails, `.sql` DDL) | — |
| `--pg-schema <name>` | Esquema do PostgreSQL a inspecionar | `public` |
| `--format <html\|mermaid\|json>` | Formato de saída (`mmd` é um alias de `mermaid`) | `html` |
| `--out <path>` | Caminho de saída; `-` significa saída padrão | `erd/index.html` (html); saída padrão (mermaid/json) |
| `--serve` | Renderizar o HTML e servi-lo via HTTP | desligado |
| `--ignore-tables <patterns>` | Padrões regex separados por vírgula para excluir | `^schema_migrations$,^ar_internal_metadata$` |
| `--config <path>` | Caminho do arquivo de configuração | `mermaid-erd.yml` |
| `--title <name>` | Título exibido no visualizador HTML | `Database` |

Você também pode manter os padrões de exclusão em um `mermaid-erd.yml`:

```yaml
ignore_tables:
  - "^schema_migrations$"
  - "_old$"
```

## Desenvolvimento

```bash
npm install
npm run build      # compilar TypeScript para dist/
npm test           # testes unitários e de integração (vitest)
npm run e2e        # verificação do visualizador gerado em navegador headless
```

## Agradecimentos

O visualizador HTML e as bibliotecas de frontend incluídas derivam de [rails-mermaid_erd](https://github.com/koedame/rails-mermaid_erd) (MIT). Este projeto mantém o mesmo visualizador e o contrato `SCHEMA_DATA`, substituindo a extração do Rails/ActiveRecord pela inspeção direta do banco de dados e pela análise de dumps de esquema. As builds incluídas de Mermaid, Vue e Tailwind são redistribuídas sob suas próprias licenças MIT; consulte [`assets/vendor/LICENSES.md`](./assets/vendor/LICENSES.md).

## Licença

MIT — consulte [LICENSE](./LICENSE).
