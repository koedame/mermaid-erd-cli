[English](./README.md) | [日本語](./README.ja.md) | [简体中文](./README.zh.md) | [한국어](./README.ko.md) | [Español](./README.es.md) | [Français](./README.fr.md) | [Deutsch](./README.de.md) | [Português](./README.pt.md) | [Русский](./README.ru.md)

# mermaid-erd-cli

[![CI](https://github.com/koedame/mermaid-erd-cli/actions/workflows/ci.yml/badge.svg)](https://github.com/koedame/mermaid-erd-cli/actions/workflows/ci.yml)
[![npm version](https://badge.fury.io/js/mermaid-erd-cli.svg)](https://www.npmjs.com/package/mermaid-erd-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

실제 데이터베이스나 스키마 덤프로부터 [Mermaid](https://mermaid.js.org/) ER 다이어그램을 생성합니다. ORM이나 프레임워크가 필요 없습니다.

![screenshot](https://raw.githubusercontent.com/koedame/mermaid-erd-cli/main/docs/screenshot.png)

스키마(테이블, 컬럼, 기본 키, 외래 키, 주석)를 내성(introspect)하여 다음 중 하나를 출력할 수 있습니다.

- 단일 자체 완결형 **HTML 뷰어**(Mermaid, Vue, Tailwind를 인라인으로 번들링, 오프라인 동작 가능). 테이블을 선택하고 SVG/PNG로 내보낼 수 있습니다.
- 원시 **Mermaid** 텍스트 / **JSON**을 **표준 출력**으로. 다른 도구와 조합하기 좋습니다.

관계는 외래 키에서 도출됩니다. 참조되는 테이블이 "1" 측, 외래 키를 가진 테이블이 "다" 측입니다. `NOT NULL` 외래 키는 필수 관계(`||--o{`)로, nullable 외래 키는 선택 관계(`|o--o{`)로 렌더링됩니다.

## 사용법

```bash
# 인터랙티브 HTML 뷰어 (기본값 → erd/index.html)
npx mermaid-erd-cli --db "postgres://user:pass@localhost:5432/mydb"
npx mermaid-erd-cli --db ./dev.sqlite3
npx mermaid-erd-cli --db ./dev.sqlite3 --serve        # HTTP로 제공

# 스키마 덤프 — 데이터베이스 연결 불필요
npx mermaid-erd-cli --schema ./db/schema.rb           # Rails schema.rb
npx mermaid-erd-cli --schema ./dump.sql               # SQL DDL (CREATE TABLE ...)

# Mermaid / JSON을 표준 출력으로 (어디로든 파이프 가능)
npx mermaid-erd-cli --db ./dev.sqlite3 --format mermaid           # erDiagram 텍스트
npx mermaid-erd-cli --db ./dev.sqlite3 --format mermaid > er.mmd
npx mermaid-erd-cli --schema schema.rb --format mermaid | mmdc -i - -o er.svg
npx mermaid-erd-cli --db ./dev.sqlite3 --format json | jq '.Models[].TableName'
```

`--out -`를 사용하면 모든 형식(HTML 포함)을 표준 출력으로 보낼 수 있습니다.

### 지원 데이터베이스

데이터베이스 드라이버는 필요할 때만 로드되므로, 사용하는 것 하나만 설치하면 됩니다.

| 소스 | 드라이버 패키지 |
| --- | --- |
| PostgreSQL | `pg` |
| MySQL | `mysql2` |
| SQLite | `better-sqlite3` |

스키마 덤프 파싱(`--schema`)은 드라이버가 전혀 필요 없습니다.

## 옵션

| 옵션 | 설명 | 기본값 |
| --- | --- | --- |
| `--db <url>` | 연결 URL 또는 SQLite 경로 | — |
| `--schema <path>` | 스키마 덤프(`.rb`는 Rails schema, `.sql`은 DDL) | — |
| `--pg-schema <name>` | 내성할 PostgreSQL 스키마 | `public` |
| `--format <html\|mermaid\|json>` | 출력 형식(`mmd`는 `mermaid`의 별칭) | `html` |
| `--out <path>` | 출력 경로. `-`는 표준 출력 | `erd/index.html`(html) / 표준 출력(mermaid·json) |
| `--serve` | HTML을 렌더링하여 HTTP로 제공 | 끔 |
| `--ignore-tables <patterns>` | 제외할 테이블의 정규식(쉼표 구분) | `^schema_migrations$,^ar_internal_metadata$` |
| `--config <path>` | 설정 파일 경로 | `mermaid-erd.yml` |
| `--title <name>` | HTML 뷰어에 표시할 제목 | `Database` |

제외 패턴은 `mermaid-erd.yml`에 둘 수도 있습니다.

```yaml
ignore_tables:
  - "^schema_migrations$"
  - "_old$"
```

## 개발

```bash
npm install
npm run build      # TypeScript를 dist/로 컴파일
npm test           # 단위 + 통합 테스트(vitest)
npm run e2e        # 생성된 뷰어의 헤드리스 브라우저 검사
```

## 감사의 글

HTML 뷰어와 내장 프런트엔드 라이브러리는 [rails-mermaid_erd](https://github.com/koedame/rails-mermaid_erd)(MIT)에서 파생되었습니다. 이 프로젝트는 동일한 뷰어와 `SCHEMA_DATA` 계약을 유지하면서, Rails/ActiveRecord 기반 추출을 직접적인 데이터베이스 내성과 스키마 덤프 파싱으로 대체했습니다. 내장된 Mermaid, Vue, Tailwind 빌드는 각자의 MIT 라이선스로 재배포됩니다. [`assets/vendor/LICENSES.md`](./assets/vendor/LICENSES.md)를 참조하세요.

## 라이선스

MIT — [LICENSE](./LICENSE)를 참조하세요.
