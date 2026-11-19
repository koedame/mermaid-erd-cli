[English](./README.md) | [日本語](./README.ja.md) | [简体中文](./README.zh.md) | [한국어](./README.ko.md) | [Español](./README.es.md) | [Français](./README.fr.md) | [Deutsch](./README.de.md) | [Português](./README.pt.md) | [Русский](./README.ru.md)

<div align="center">

# mermaid-erd-cli

**実際のデータベースやスキーマダンプから [Mermaid](https://mermaid.js.org/) の ER 図を生成します。ORM やフレームワークは不要です。**

<a href="https://koedame.github.io/mermaid-erd-cli/#eyJzZWxlY3RNb2RlbHMiOlsidGVhbXMiLCJ1c2VycyIsInBvc3RzIiwiY29tbWVudHMiLCJ0YWdzIiwicG9zdF90YWdzIl0sImlzUHJldmlld1JlbGF0aW9ucyI6ZmFsc2UsImlzU2hvd1JlbGF0aW9uQ29tbWVudCI6ZmFsc2UsImlzU2hvd0tleSI6dHJ1ZSwiaXNTaG93Q29tbWVudCI6ZmFsc2UsImlzSGlkZUNvbHVtbnMiOmZhbHNlfQ=="><img alt="サンプルのブログ用スキーマの 6 テーブルと、外部キーによる関連を表示した mermaid-erd-cli の HTML ビューア" src="https://raw.githubusercontent.com/koedame/mermaid-erd-cli/main/docs/images/hero.png" width="800"></a>

[![CI](https://github.com/koedame/mermaid-erd-cli/actions/workflows/ci.yml/badge.svg)](https://github.com/koedame/mermaid-erd-cli/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/mermaid-erd-cli?color=336699)](https://www.npmjs.com/package/mermaid-erd-cli)
![Node.js 22.12+](https://img.shields.io/badge/node-%E2%89%A522.12-336699)
[![License: MIT](https://img.shields.io/badge/license-MIT-336699)](./LICENSE)

[ライブデモを開く](https://koedame.github.io/mermaid-erd-cli/#eyJzZWxlY3RNb2RlbHMiOlsidGVhbXMiLCJ1c2VycyIsInBvc3RzIiwiY29tbWVudHMiLCJ0YWdzIiwicG9zdF90YWdzIl0sImlzUHJldmlld1JlbGF0aW9ucyI6ZmFsc2UsImlzU2hvd1JlbGF0aW9uQ29tbWVudCI6ZmFsc2UsImlzU2hvd0tleSI6dHJ1ZSwiaXNTaG93Q29tbWVudCI6ZmFsc2UsImlzSGlkZUNvbHVtbnMiOmZhbHNlfQ==) · [クイックスタート](#クイックスタート) · [使い方](#使い方) · [Docker](#docker) · [オプション](#オプション)

</div>

スキーマ（テーブル・カラム・主キー・外部キー・コメント）を内省し、次のいずれかを出力します:

- 単一の自己完結型 **HTML ビューア**（Mermaid・Vue・Tailwind をインライン同梱、オフライン動作）。テーブルを選んで SVG/PNG エクスポートできる
- **Mermaid** テキスト / **JSON** を **標準出力** へ。他ツールと組み合わせて使える

関連は外部キーから導出します。参照される側が「1」、外部キーを持つ側が「多」。`NOT NULL` の外部キーは必須の関連（`||--o{`）、nullable な外部キーは任意の関連（`|o--o{`）として描画されます。

## ハイライト

- **実際の DB 3 種類とダンプ 2 種類に対応。** PostgreSQL・MySQL・SQLite に直接つなげるほか、Rails の `schema.rb` や SQL DDL は DB 接続もドライバーも不要です。
- **自己完結した HTML 1 ファイル。** Mermaid・Vue・Tailwind をインライン同梱しているのでオフラインで動き、テーブルを選んで SVG / PNG にエクスポートできます。
- **何にでもパイプできる。** `--format mermaid` と `--format json` は標準出力へ書き出します。
- **コンテナでも動く。** 3 つのドライバーをすべて同梱した distroless の Docker イメージを GHCR と Docker Hub で配布しています。
- **ビューアは 9 言語。** English, 日本語, 简体中文, 한국어, Español, Français, Deutsch, Português, Русский。

## クイックスタート

Node.js 22.12 以降が必要です。`npx` が CLI を取得するので、先にインストールするものはありません。

```bash
npx mermaid-erd-cli --schema ./db/schema.rb
```

`erd/index.html` が書き出されます。ブラウザで開き、サイドバーでテーブルを選んで SVG / PNG にエクスポートします。実際の DB を読むときは `--db "postgres://user:pass@localhost:5432/mydb"`（または SQLite のファイルパス）を渡します。ほかの例は[使い方](#使い方)にあります。

## 使い方

```bash
# インタラクティブな HTML ビューア（既定 → erd/index.html）
npx mermaid-erd-cli --db "postgres://user:pass@localhost:5432/mydb"
npx mermaid-erd-cli --db ./dev.sqlite3
npx mermaid-erd-cli --db ./dev.sqlite3 --serve        # HTTP で配信（ランダムポート）
npx mermaid-erd-cli --db ./dev.sqlite3 --serve --port 5173   # 固定ポートで配信

# スキーマダンプ（DB 接続不要）
npx mermaid-erd-cli --schema ./db/schema.rb           # Rails schema.rb
npx mermaid-erd-cli --schema ./dump.sql               # SQL DDL（CREATE TABLE ...）

# Mermaid / JSON を標準出力へ（パイプで何にでも繋げる）
npx mermaid-erd-cli --db ./dev.sqlite3 --format mermaid           # erDiagram テキスト
npx mermaid-erd-cli --db ./dev.sqlite3 --format mermaid > er.mmd
npx mermaid-erd-cli --schema schema.rb --format mermaid | mmdc -i - -o er.svg
npx mermaid-erd-cli --db ./dev.sqlite3 --format json | jq '.Models[].TableName'
```

`--out -` を付ければ HTML を含む任意のフォーマットを標準出力に出せます。

生成した HTML と、`--format json`・`--format mermaid` の出力には、テーブル名・カラム名・型・コメント・関連など、データベースのスキーマがそのまま含まれます。スキーマそのものを公開してよい範囲にだけ共有・配置してください。

### 対応データベース

ドライバは必要なときだけ読み込まれるので、使うものだけインストールすれば OK です:

| ソース | ドライバ |
| --- | --- |
| PostgreSQL | `pg` |
| MySQL | `mysql2` |
| SQLite | `better-sqlite3` |

スキーマダンプ解析（`--schema`）はドライバ不要です。

## Docker

ビルド済みイメージは各リリースごとに GitHub Container Registry と
Docker Hub に公開されています。ランタイムは最小限の distroless イメージで、
3 つのデータベースドライバがすべて同梱されているため、ライブ introspection も
追加インストールなしで動作します。

```bash
docker pull ghcr.io/koedame/mermaid-erd-cli   # または: docker pull koedame/mermaid-erd-cli
```

コンテナの作業ディレクトリは `/work` です。読み書きしたいディレクトリをここに
マウントしてください。以下の例では GHCR イメージを使用しています。Docker Hub を
使う場合は `ghcr.io/koedame/mermaid-erd-cli` を `koedame/mermaid-erd-cli` に
置き換えてください。

```bash
# カレントディレクトリのスキーマダンプ -> 同じ場所に erd/index.html
docker run --rm -u "$(id -u):$(id -g)" -v "$PWD:/work" \
  ghcr.io/koedame/mermaid-erd-cli --schema schema.rb

# Mermaid / JSON を標準出力へ
docker run --rm -v "$PWD:/work" ghcr.io/koedame/mermaid-erd-cli --schema dump.sql --format mermaid

# ライブの SQLite ファイル
docker run --rm -v "$PWD:/work" ghcr.io/koedame/mermaid-erd-cli --db /work/dev.sqlite3 --format mermaid
```

イメージは非 root ユーザーで実行されます。ホストディレクトリに書き込む場合は
（最初の例のように）`-u "$(id -u):$(id -g)"` を追加してください。標準出力のみの
コマンドには不要です。

ホスト上で動いているデータベースに接続するときは、コンテナ内の `localhost` が
コンテナ自身を指す点に注意してください。`host.docker.internal`（Docker Desktop）
または `--network host`（Linux）を使います。

```bash
docker run --rm --network host ghcr.io/koedame/mermaid-erd-cli \
  --db "postgres://user:pass@localhost:5432/mydb" --format mermaid
```

ビューアを配信するときは、コンテナ内で `0.0.0.0` にバインドしてポートを公開します。
公開したポート経由でのみアクセスできます。

```bash
docker run --rm -p 8080:8080 -v "$PWD:/work" ghcr.io/koedame/mermaid-erd-cli \
  --db /work/dev.sqlite3 --serve --host 0.0.0.0 --port 8080
# その後 http://localhost:8080 を開く
```

イメージを pull せず自分でビルドする場合:

```bash
docker build -t mermaid-erd-cli .
docker run --rm -v "$PWD:/work" mermaid-erd-cli --schema schema.rb
```

## オプション

| オプション | 説明 | 既定 |
| --- | --- | --- |
| `--db <url>` | 接続 URL または SQLite ファイルパス | — |
| `--schema <path>` | スキーマダンプ（`.rb` は Rails schema、`.sql` は DDL） | — |
| `--pg-schema <name>` | 内省する PostgreSQL スキーマ | `public` |
| `--format <html\|mermaid\|json>` | 出力フォーマット（`mmd` は `mermaid` のエイリアス） | `html` |
| `--out <path>` | 出力先。`-` で標準出力 | `erd/index.html`（html）/ 標準出力（mermaid・json） |
| `--serve` | HTML を生成し HTTP で配信 | off |
| `--port <number>` | `--serve` で待ち受けるポート番号 | ランダム |
| `--host <address>` | `--serve` でバインドするアドレス。`0.0.0.0` はすべてのネットワークインターフェースにスキーマ全体を公開します — 信頼できるネットワークでのみ使用してください | `127.0.0.1` |
| `--ignore-tables <patterns>` | 除外するテーブルの正規表現（カンマ区切り） | `^schema_migrations$,^ar_internal_metadata$` |
| `--config <path>` | 設定ファイルのパス | `mermaid-erd.yml` |
| `--title <name>` | ビューアに表示するタイトル | `Database` |

除外パターンは `mermaid-erd.yml` にも書けます:

```yaml
ignore_tables:
  - "^schema_migrations$"
  - "_old$"
```

## 開発

```bash
npm install
npm run build      # TypeScript を dist/ にコンパイル
npm test           # ユニット + 結合テスト（vitest）
npm run e2e        # 生成したビューアのヘッドレスブラウザ検証
```

## 謝辞

HTML ビューアと同梱フロントエンドライブラリは [rails-mermaid_erd](https://github.com/koedame/rails-mermaid_erd)（MIT）から派生しています。ビューアと `SCHEMA_DATA` の契約はそのまま流用し、Rails/ActiveRecord による抽出を DB 直接内省とスキーマダンプ解析に置き換えました。同梱の Mermaid・Vue と、Tailwind CSS で生成したスタイルシートは、各ライセンス（MIT・ISC・BSD-3-Clause・Apache-2.0 ほか）で再配布しています。著作権表示とライセンス本文は [`assets/vendor/LICENSES.md`](./assets/vendor/LICENSES.md) と、生成する HTML ファイルの先頭にあります。

## 商標

このプロジェクトは、Mermaid プロジェクト、Mermaid Chart Inc. と提携しておらず、これらの公認・後援も受けていません。Mermaid Chart Inc. は、米国で MERMAID CHART と MERMAID の商標を登録または出願しています。PostgreSQL、MySQL、SQLite、Docker、およびそのほかの商標は、それぞれの権利者に帰属します。

## ライセンス

MIT — [LICENSE](./LICENSE) を参照。
