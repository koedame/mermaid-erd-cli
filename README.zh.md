[English](./README.md) | [日本語](./README.ja.md) | [简体中文](./README.zh.md) | [한국어](./README.ko.md) | [Español](./README.es.md) | [Français](./README.fr.md) | [Deutsch](./README.de.md) | [Português](./README.pt.md) | [Русский](./README.ru.md)

# mermaid-erd-cli

[![CI](https://github.com/koedame/mermaid-erd-cli/actions/workflows/ci.yml/badge.svg)](https://github.com/koedame/mermaid-erd-cli/actions/workflows/ci.yml)
[![npm version](https://badge.fury.io/js/mermaid-erd-cli.svg)](https://www.npmjs.com/package/mermaid-erd-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

从实际数据库或模式转储生成 [Mermaid](https://mermaid.js.org/) ER 图——无需 ORM 或框架。

[![screenshot](https://raw.githubusercontent.com/koedame/mermaid-erd-cli/main/docs/screenshot.png)](https://koedame.github.io/mermaid-erd-cli/#eyJzZWxlY3RNb2RlbHMiOlsidGVhbXMiLCJ1c2VycyIsInBvc3RzIiwiY29tbWVudHMiLCJ0YWdzIiwicG9zdF90YWdzIl0sImlzUHJldmlld1JlbGF0aW9ucyI6ZmFsc2UsImlzU2hvd1JlbGF0aW9uQ29tbWVudCI6ZmFsc2UsImlzU2hvd0tleSI6dHJ1ZSwiaXNTaG93Q29tbWVudCI6ZmFsc2UsImlzSGlkZUNvbHVtbnMiOmZhbHNlfQ==)

**▶ [在线演示](https://koedame.github.io/mermaid-erd-cli/#eyJzZWxlY3RNb2RlbHMiOlsidGVhbXMiLCJ1c2VycyIsInBvc3RzIiwiY29tbWVudHMiLCJ0YWdzIiwicG9zdF90YWdzIl0sImlzUHJldmlld1JlbGF0aW9ucyI6ZmFsc2UsImlzU2hvd1JlbGF0aW9uQ29tbWVudCI6ZmFsc2UsImlzU2hvd0tleSI6dHJ1ZSwiaXNTaG93Q29tbWVudCI6ZmFsc2UsImlzSGlkZUNvbHVtbnMiOmZhbHNlfQ==)**

它会内省你的模式(表、列、主键、外键、注释),并可输出以下任意一种:

- 单个自包含的 **HTML 查看器**(内联打包 Mermaid、Vue、Tailwind,可离线使用),可在其中选择表并导出 SVG/PNG;或
- 将原始 **Mermaid** 文本 / **JSON** 输出到 **标准输出**,便于与其他工具组合。

关系由外键推导:被引用的表为「一」方,持有外键的表为「多」方。`NOT NULL` 的外键渲染为强制关系(`||--o{`),可空的外键渲染为可选关系(`|o--o{`)。

## 用法

```bash
# 交互式 HTML 查看器(默认 → erd/index.html)
npx mermaid-erd-cli --db "postgres://user:pass@localhost:5432/mydb"
npx mermaid-erd-cli --db ./dev.sqlite3
npx mermaid-erd-cli --db ./dev.sqlite3 --serve        # 通过 HTTP 提供

# 模式转储——无需数据库连接
npx mermaid-erd-cli --schema ./db/schema.rb           # Rails schema.rb
npx mermaid-erd-cli --schema ./dump.sql               # SQL DDL(CREATE TABLE ...)

# 将 Mermaid / JSON 输出到标准输出(可管道接入任何工具)
npx mermaid-erd-cli --db ./dev.sqlite3 --format mermaid           # erDiagram 文本
npx mermaid-erd-cli --db ./dev.sqlite3 --format mermaid > er.mmd
npx mermaid-erd-cli --schema schema.rb --format mermaid | mmdc -i - -o er.svg
npx mermaid-erd-cli --db ./dev.sqlite3 --format json | jq '.Models[].TableName'
```

使用 `--out -` 可将任意格式(包括 HTML)强制输出到标准输出。

### 支持的数据库

数据库驱动仅在需要时加载,因此只需安装你所使用的那一个:

| 来源 | 驱动包 |
| --- | --- |
| PostgreSQL | `pg` |
| MySQL | `mysql2` |
| SQLite | `better-sqlite3` |

模式转储解析(`--schema`)完全不需要任何驱动。

## 选项

| 选项 | 说明 | 默认值 |
| --- | --- | --- |
| `--db <url>` | 连接 URL 或 SQLite 路径 | — |
| `--schema <path>` | 模式转储(`.rb` 为 Rails schema,`.sql` 为 DDL) | — |
| `--pg-schema <name>` | 要内省的 PostgreSQL 模式 | `public` |
| `--format <html\|mermaid\|json>` | 输出格式(`mmd` 是 `mermaid` 的别名) | `html` |
| `--out <path>` | 输出路径;`-` 表示标准输出 | `erd/index.html`(html);标准输出(mermaid/json) |
| `--serve` | 渲染 HTML 并通过 HTTP 提供 | 关闭 |
| `--ignore-tables <patterns>` | 要排除的表的正则表达式(逗号分隔) | `^schema_migrations$,^ar_internal_metadata$` |
| `--config <path>` | 配置文件路径 | `mermaid-erd.yml` |
| `--title <name>` | HTML 查看器中显示的标题 | `Database` |

也可以将忽略规则写入 `mermaid-erd.yml`:

```yaml
ignore_tables:
  - "^schema_migrations$"
  - "_old$"
```

## 开发

```bash
npm install
npm run build      # 将 TypeScript 编译到 dist/
npm test           # 单元 + 集成测试(vitest)
npm run e2e        # 对生成的查看器进行无头浏览器检查
```

## 致谢

HTML 查看器及内置的前端库派生自 [rails-mermaid_erd](https://github.com/koedame/rails-mermaid_erd)(MIT)。本项目沿用了相同的查看器与 `SCHEMA_DATA` 约定,将 Rails/ActiveRecord 的抽取替换为直接的数据库内省与模式转储解析。内置的 Mermaid、Vue 和 Tailwind 构建按各自的 MIT 许可证再分发;参见 [`assets/vendor/LICENSES.md`](./assets/vendor/LICENSES.md)。

## 许可证

MIT——参见 [LICENSE](./LICENSE)。
