[English](./README.md) | [日本語](./README.ja.md) | [简体中文](./README.zh.md) | [한국어](./README.ko.md) | [Español](./README.es.md) | [Français](./README.fr.md) | [Deutsch](./README.de.md) | [Português](./README.pt.md) | [Русский](./README.ru.md)

<div align="center">

# mermaid-erd-cli

**Gera um diagrama ER do [Mermaid](https://mermaid.js.org/) a partir de um banco de dados ativo ou de um dump de esquema — sem ORM nem framework.**

<a href="https://koedame.github.io/mermaid-erd-cli/#eyJzZWxlY3RNb2RlbHMiOlsidGVhbXMiLCJ1c2VycyIsInBvc3RzIiwiY29tbWVudHMiLCJ0YWdzIiwicG9zdF90YWdzIl0sImlzUHJldmlld1JlbGF0aW9ucyI6ZmFsc2UsImlzU2hvd1JlbGF0aW9uQ29tbWVudCI6ZmFsc2UsImlzU2hvd0tleSI6dHJ1ZSwiaXNTaG93Q29tbWVudCI6ZmFsc2UsImlzSGlkZUNvbHVtbnMiOmZhbHNlfQ=="><img alt="O visualizador HTML do mermaid-erd-cli mostrando seis tabelas de um esquema de blog de exemplo e as relações de chave estrangeira entre elas" src="https://raw.githubusercontent.com/koedame/mermaid-erd-cli/main/docs/images/hero.png" width="800"></a>

[![CI](https://github.com/koedame/mermaid-erd-cli/actions/workflows/ci.yml/badge.svg)](https://github.com/koedame/mermaid-erd-cli/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/mermaid-erd-cli?color=336699)](https://www.npmjs.com/package/mermaid-erd-cli)
![Node.js 22.12+](https://img.shields.io/badge/node-%E2%89%A522.12-336699)
[![License: MIT](https://img.shields.io/badge/license-MIT-336699)](./LICENSE)

[Demo ao vivo](https://koedame.github.io/mermaid-erd-cli/#eyJzZWxlY3RNb2RlbHMiOlsidGVhbXMiLCJ1c2VycyIsInBvc3RzIiwiY29tbWVudHMiLCJ0YWdzIiwicG9zdF90YWdzIl0sImlzUHJldmlld1JlbGF0aW9ucyI6ZmFsc2UsImlzU2hvd1JlbGF0aW9uQ29tbWVudCI6ZmFsc2UsImlzU2hvd0tleSI6dHJ1ZSwiaXNTaG93Q29tbWVudCI6ZmFsc2UsImlzSGlkZUNvbHVtbnMiOmZhbHNlfQ==) · [Início rápido](#início-rápido) · [Uso](#uso) · [Docker](#docker) · [Opções](#opções)

</div>

Ele inspeciona seu esquema (tabelas, colunas, chaves primárias, chaves estrangeiras, comentários) e pode gerar:

- um único **visualizador HTML** autocontido (com Mermaid, Vue e Tailwind embutidos, utilizável offline), no qual você escolhe as tabelas e exporta para SVG/PNG; ou
- texto **Mermaid** / **JSON** bruto na **saída padrão**, para compor com outras ferramentas.

As relações são derivadas das chaves estrangeiras: a tabela referenciada é o lado "um" e a tabela que contém a chave estrangeira é o lado "muitos". Uma chave estrangeira `NOT NULL` é representada como uma relação obrigatória (`||--o{`); uma que aceita nulos, como opcional (`|o--o{`).

## Destaques

- **Três bancos de dados ativos e dois formatos de dump.** PostgreSQL, MySQL e SQLite diretamente; `schema.rb` do Rails e arquivos SQL DDL sem conexão com banco de dados nem driver.
- **Um único arquivo HTML autocontido.** Mermaid, Vue e Tailwind vêm embutidos, então o visualizador funciona offline: escolha as tabelas e exporte para SVG ou PNG.
- **Encaixa em qualquer pipe.** `--format mermaid` e `--format json` escrevem na saída padrão.
- **Roda em contêiner.** Uma imagem Docker distroless inclui os três drivers (GHCR e Docker Hub).
- **Visualizador em 9 idiomas.** English, 日本語, 简体中文, 한국어, Español, Français, Deutsch, Português e Русский.

## Início rápido

Requer Node.js 22.12 ou posterior. O `npx` baixa a CLI, então não há nada para instalar antes:

```bash
npx mermaid-erd-cli --schema ./db/schema.rb
```

Isso grava `erd/index.html`: abra-o no navegador, escolha tabelas na barra lateral e exporte para SVG ou PNG. Para ler um banco ativo, passe `--db "postgres://user:pass@localhost:5432/mydb"` (ou o caminho de um arquivo SQLite). Há mais exemplos em [Uso](#uso).

## Uso

```bash
# Visualizador HTML interativo (padrão → erd/index.html)
npx mermaid-erd-cli --db "postgres://user:pass@localhost:5432/mydb"
npx mermaid-erd-cli --db ./dev.sqlite3
npx mermaid-erd-cli --db ./dev.sqlite3 --serve        # servir via HTTP (porta aleatória)
npx mermaid-erd-cli --db ./dev.sqlite3 --serve --port 5173   # servir em uma porta fixa

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

O HTML gerado e a saída de `--format json` e `--format mermaid` contêm o esquema do seu banco de dados: nomes e tipos de tabelas e colunas, comentários e relacionamentos. Compartilhe-os ou hospede-os apenas com o mesmo alcance com que compartilharia o próprio esquema.

### Bancos de dados suportados

O driver do seu banco só é carregado quando necessário, então instale apenas o que você usa:

| Origem | Pacote do driver |
| --- | --- |
| PostgreSQL | `pg` |
| MySQL | `mysql2` |
| SQLite | `better-sqlite3` |

A análise de dumps de esquema (`--schema`) não requer driver algum.

## Docker

Imagens pré-compiladas são publicadas a cada lançamento no GitHub Container
Registry e no Docker Hub. O ambiente de execução é uma imagem distroless
mínima que já traz os três drivers de banco de dados, então a introspecção ao
vivo funciona sem instalar mais nada.

```bash
docker pull ghcr.io/koedame/mermaid-erd-cli   # ou: docker pull koedame/mermaid-erd-cli
```

O contêiner trabalha em `/work`; monte ali o diretório que você quer ler e
escrever. Os exemplos usam a imagem do GHCR — substitua
`ghcr.io/koedame/mermaid-erd-cli` por `koedame/mermaid-erd-cli` para o
Docker Hub.

```bash
# Dump de esquema no diretório atual -> erd/index.html ao lado
docker run --rm -u "$(id -u):$(id -g)" -v "$PWD:/work" \
  ghcr.io/koedame/mermaid-erd-cli --schema schema.rb

# Mermaid / JSON para a saída padrão
docker run --rm -v "$PWD:/work" ghcr.io/koedame/mermaid-erd-cli --schema dump.sql --format mermaid

# Arquivo SQLite ao vivo
docker run --rm -v "$PWD:/work" ghcr.io/koedame/mermaid-erd-cli --db /work/dev.sqlite3 --format mermaid
```

A imagem roda como usuário não root; adicione `-u "$(id -u):$(id -g)"` quando
ela precisar escrever em um diretório do host que você possui (como no primeiro
exemplo); comandos que apenas usam a saída padrão não precisam disso.

Para acessar um banco de dados rodando no host, lembre-se de que `localhost`
dentro do contêiner é o próprio contêiner. Use `host.docker.internal`
(Docker Desktop) ou `--network host` (Linux):

```bash
docker run --rm --network host ghcr.io/koedame/mermaid-erd-cli \
  --db "postgres://user:pass@localhost:5432/mydb" --format mermaid
```

Para servir o visualizador, faça o bind em `0.0.0.0` dentro do contêiner e
publique a porta — ele permanece acessível apenas pela porta publicada.

```bash
docker run --rm -p 8080:8080 -v "$PWD:/work" ghcr.io/koedame/mermaid-erd-cli \
  --db /work/dev.sqlite3 --serve --host 0.0.0.0 --port 8080
# depois abra http://localhost:8080
```

Para construir a imagem você mesmo em vez de baixá-la:

```bash
docker build -t mermaid-erd-cli .
docker run --rm -v "$PWD:/work" mermaid-erd-cli --schema schema.rb
```

## Opções

| Opção | Descrição | Padrão |
| --- | --- | --- |
| `--db <url>` | URL de conexão ou caminho do SQLite | — |
| `--schema <path>` | Dump de esquema (`.rb` esquema do Rails, `.sql` DDL) | — |
| `--pg-schema <name>` | Esquema do PostgreSQL a inspecionar | `public` |
| `--format <html\|mermaid\|json>` | Formato de saída (`mmd` é um alias de `mermaid`) | `html` |
| `--out <path>` | Caminho de saída; `-` significa saída padrão | `erd/index.html` (html); saída padrão (mermaid/json) |
| `--serve` | Renderizar o HTML e servi-lo via HTTP | desligado |
| `--port <number>` | Porta a escutar com `--serve` | aleatória |
| `--host <address>` | Endereço a vincular com `--serve`. `0.0.0.0` expõe o esquema completo em todas as interfaces de rede — use apenas em redes confiáveis | `127.0.0.1` |
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

O visualizador HTML e as bibliotecas de frontend incluídas derivam de [rails-mermaid_erd](https://github.com/koedame/rails-mermaid_erd) (MIT). Este projeto mantém o mesmo visualizador e o contrato `SCHEMA_DATA`, substituindo a extração do Rails/ActiveRecord pela inspeção direta do banco de dados e pela análise de dumps de esquema. As builds incluídas de Mermaid e Vue e a folha de estilos gerada com Tailwind CSS são redistribuídas sob suas próprias licenças (MIT, ISC, BSD-3-Clause, Apache-2.0 e algumas outras). Seus avisos de copyright e textos de licença estão em [`assets/vendor/LICENSES.md`](./assets/vendor/LICENSES.md) e no início de cada arquivo HTML gerado.

## Marcas registradas

Este projeto não é afiliado ao projeto Mermaid nem à Mermaid Chart Inc., e não é endossado nem patrocinado por eles. A Mermaid Chart Inc. registrou ou solicitou o registro das marcas MERMAID CHART e MERMAID nos Estados Unidos. PostgreSQL, MySQL, SQLite, Docker e as demais marcas pertencem aos seus respectivos proprietários.

## Licença

MIT — consulte [LICENSE](./LICENSE).
