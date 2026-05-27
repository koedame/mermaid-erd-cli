[English](./README.md) | [日本語](./README.ja.md) | [简体中文](./README.zh.md) | [한국어](./README.ko.md) | [Español](./README.es.md) | [Français](./README.fr.md) | [Deutsch](./README.de.md) | [Português](./README.pt.md) | [Русский](./README.ru.md)

# mermaid-erd-cli

[![CI](https://github.com/koedame/mermaid-erd-cli/actions/workflows/ci.yml/badge.svg)](https://github.com/koedame/mermaid-erd-cli/actions/workflows/ci.yml)
[![npm version](https://badge.fury.io/js/mermaid-erd-cli.svg)](https://www.npmjs.com/package/mermaid-erd-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

実際のデータベースやスキーマダンプから [Mermaid](https://mermaid.js.org/) の ER 図を生成します。ORM やフレームワークは不要です。

[![screenshot](https://raw.githubusercontent.com/koedame/mermaid-erd-cli/main/docs/screenshot.png)](https://koedame.github.io/mermaid-erd-cli/#eyJzZWxlY3RNb2RlbHMiOlsidGVhbXMiLCJ1c2VycyIsInBvc3RzIiwiY29tbWVudHMiLCJ0YWdzIiwicG9zdF90YWdzIl0sImlzUHJldmlld1JlbGF0aW9ucyI6ZmFsc2UsImlzU2hvd1JlbGF0aW9uQ29tbWVudCI6ZmFsc2UsImlzU2hvd0tleSI6dHJ1ZSwiaXNTaG93Q29tbWVudCI6ZmFsc2UsImlzSGlkZUNvbHVtbnMiOmZhbHNlfQ==)

**▶ [ライブデモを開く](https://koedame.github.io/mermaid-erd-cli/#eyJzZWxlY3RNb2RlbHMiOlsidGVhbXMiLCJ1c2VycyIsInBvc3RzIiwiY29tbWVudHMiLCJ0YWdzIiwicG9zdF90YWdzIl0sImlzUHJldmlld1JlbGF0aW9ucyI6ZmFsc2UsImlzU2hvd1JlbGF0aW9uQ29tbWVudCI6ZmFsc2UsImlzU2hvd0tleSI6dHJ1ZSwiaXNTaG93Q29tbWVudCI6ZmFsc2UsImlzSGlkZUNvbHVtbnMiOmZhbHNlfQ==)**

スキーマ（テーブル・カラム・主キー・外部キー・コメント）を内省し、次のいずれかを出力します:

- 単一の自己完結型 **HTML ビューア**（Mermaid・Vue・Tailwind をインライン同梱、オフライン動作）。テーブルを選んで SVG/PNG エクスポートできる
- **Mermaid** テキスト / **JSON** を **標準出力** へ。他ツールと組み合わせて使える

関連は外部キーから導出します。参照される側が「1」、外部キーを持つ側が「多」。`NOT NULL` の外部キーは必須の関連（`||--o{`）、nullable な外部キーは任意の関連（`|o--o{`）として描画されます。

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

### 対応データベース

ドライバは必要なときだけ読み込まれるので、使うものだけインストールすれば OK です:

| ソース | ドライバ |
| --- | --- |
| PostgreSQL | `pg` |
| MySQL | `mysql2` |
| SQLite | `better-sqlite3` |

スキーマダンプ解析（`--schema`）はドライバ不要です。

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

HTML ビューアと同梱フロントエンドライブラリは [rails-mermaid_erd](https://github.com/koedame/rails-mermaid_erd)（MIT）から派生しています。ビューアと `SCHEMA_DATA` の契約はそのまま流用し、Rails/ActiveRecord による抽出を DB 直接内省とスキーマダンプ解析に置き換えました。同梱の Mermaid・Vue・Tailwind は各 MIT ライセンスで再配布しています（[`assets/vendor/LICENSES.md`](./assets/vendor/LICENSES.md)）。

## ライセンス

MIT — [LICENSE](./LICENSE) を参照。
