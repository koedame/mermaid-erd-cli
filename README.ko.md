[English](./README.md) | [日本語](./README.ja.md) | [简体中文](./README.zh.md) | [한국어](./README.ko.md) | [Español](./README.es.md) | [Français](./README.fr.md) | [Deutsch](./README.de.md) | [Português](./README.pt.md) | [Русский](./README.ru.md)

# mermaid-erd-cli

[![CI](https://github.com/koedame/mermaid-erd-cli/actions/workflows/ci.yml/badge.svg)](https://github.com/koedame/mermaid-erd-cli/actions/workflows/ci.yml)
[![npm version](https://badge.fury.io/js/mermaid-erd-cli.svg)](https://www.npmjs.com/package/mermaid-erd-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

실제 데이터베이스나 스키마 덤프로부터 [Mermaid](https://mermaid.js.org/) ER 다이어그램을 생성합니다. ORM이나 프레임워크가 필요 없습니다.

[![screenshot](https://raw.githubusercontent.com/koedame/mermaid-erd-cli/main/docs/screenshot.png)](https://koedame.github.io/mermaid-erd-cli/#eyJzZWxlY3RNb2RlbHMiOlsidGVhbXMiLCJ1c2VycyIsInBvc3RzIiwiY29tbWVudHMiLCJ0YWdzIiwicG9zdF90YWdzIl0sImlzUHJldmlld1JlbGF0aW9ucyI6ZmFsc2UsImlzU2hvd1JlbGF0aW9uQ29tbWVudCI6ZmFsc2UsImlzU2hvd0tleSI6dHJ1ZSwiaXNTaG93Q29tbWVudCI6ZmFsc2UsImlzSGlkZUNvbHVtbnMiOmZhbHNlfQ==)

**▶ [라이브 데모](https://koedame.github.io/mermaid-erd-cli/#eyJzZWxlY3RNb2RlbHMiOlsidGVhbXMiLCJ1c2VycyIsInBvc3RzIiwiY29tbWVudHMiLCJ0YWdzIiwicG9zdF90YWdzIl0sImlzUHJldmlld1JlbGF0aW9ucyI6ZmFsc2UsImlzU2hvd1JlbGF0aW9uQ29tbWVudCI6ZmFsc2UsImlzU2hvd0tleSI6dHJ1ZSwiaXNTaG93Q29tbWVudCI6ZmFsc2UsImlzSGlkZUNvbHVtbnMiOmZhbHNlfQ==)**

스키마(테이블, 컬럼, 기본 키, 외래 키, 주석)를 내성(introspect)하여 다음 중 하나를 출력할 수 있습니다.

- 단일 자체 완결형 **HTML 뷰어**(Mermaid, Vue, Tailwind를 인라인으로 번들링, 오프라인 동작 가능). 테이블을 선택하고 SVG/PNG로 내보낼 수 있습니다.
- 원시 **Mermaid** 텍스트 / **JSON**을 **표준 출력**으로. 다른 도구와 조합하기 좋습니다.

관계는 외래 키에서 도출됩니다. 참조되는 테이블이 "1" 측, 외래 키를 가진 테이블이 "다" 측입니다. `NOT NULL` 외래 키는 필수 관계(`||--o{`)로, nullable 외래 키는 선택 관계(`|o--o{`)로 렌더링됩니다.

## 사용법

```bash
# 인터랙티브 HTML 뷰어 (기본값 → erd/index.html)
npx mermaid-erd-cli --db "postgres://user:pass@localhost:5432/mydb"
npx mermaid-erd-cli --db ./dev.sqlite3
npx mermaid-erd-cli --db ./dev.sqlite3 --serve        # HTTP로 제공 (임의 포트)
npx mermaid-erd-cli --db ./dev.sqlite3 --serve --port 5173   # 고정 포트로 제공

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

## Docker

사전 빌드된 이미지는 각 릴리스마다 GitHub Container Registry와
Docker Hub에 게시됩니다. 런타임은 최소한의 distroless 이미지로, 세 가지
데이터베이스 드라이버가 모두 포함되어 있어 라이브 introspection도
추가 설치 없이 동작합니다.

```bash
docker pull ghcr.io/koedame/mermaid-erd-cli   # 또는: docker pull koedame/mermaid-erd-cli
```

컨테이너의 작업 디렉터리는 `/work`입니다. 읽고 쓸 디렉터리를 여기에 마운트하세요.
아래 예시는 GHCR 이미지를 사용합니다. Docker Hub를 사용하려면
`ghcr.io/koedame/mermaid-erd-cli`를 `koedame/mermaid-erd-cli`로 바꾸세요.

```bash
# 현재 디렉터리의 스키마 덤프 -> 같은 위치에 erd/index.html 생성
docker run --rm -u "$(id -u):$(id -g)" -v "$PWD:/work" \
  ghcr.io/koedame/mermaid-erd-cli --schema schema.rb

# Mermaid / JSON을 표준 출력으로
docker run --rm -v "$PWD:/work" ghcr.io/koedame/mermaid-erd-cli --schema dump.sql --format mermaid

# 라이브 SQLite 파일
docker run --rm -v "$PWD:/work" ghcr.io/koedame/mermaid-erd-cli --db /work/dev.sqlite3 --format mermaid
```

이미지는 비 root 사용자로 실행됩니다. 소유한 호스트 디렉터리에 쓸 때는
(첫 번째 예시처럼) `-u "$(id -u):$(id -g)"`를 추가하세요. 표준 출력만 사용하는
명령에는 필요하지 않습니다.

호스트에서 실행 중인 데이터베이스에 연결할 때는, 컨테이너 내부의 `localhost`가
컨테이너 자신을 가리킨다는 점에 유의하세요. `host.docker.internal`(Docker Desktop)
또는 `--network host`(Linux)를 사용합니다.

```bash
docker run --rm --network host ghcr.io/koedame/mermaid-erd-cli \
  --db "postgres://user:pass@localhost:5432/mydb" --format mermaid
```

뷰어를 제공할 때는 컨테이너 내부에서 `0.0.0.0`에 바인딩하고 포트를 게시합니다.
게시한 포트를 통해서만 접근할 수 있습니다.

```bash
docker run --rm -p 8080:8080 -v "$PWD:/work" ghcr.io/koedame/mermaid-erd-cli \
  --db /work/dev.sqlite3 --serve --host 0.0.0.0 --port 8080
# 그런 다음 http://localhost:8080 을 엽니다
```

이미지를 직접 빌드하려면:

```bash
docker build -t mermaid-erd-cli .
docker run --rm -v "$PWD:/work" mermaid-erd-cli --schema schema.rb
```

## 옵션

| 옵션 | 설명 | 기본값 |
| --- | --- | --- |
| `--db <url>` | 연결 URL 또는 SQLite 경로 | — |
| `--schema <path>` | 스키마 덤프(`.rb`는 Rails schema, `.sql`은 DDL) | — |
| `--pg-schema <name>` | 내성할 PostgreSQL 스키마 | `public` |
| `--format <html\|mermaid\|json>` | 출력 형식(`mmd`는 `mermaid`의 별칭) | `html` |
| `--out <path>` | 출력 경로. `-`는 표준 출력 | `erd/index.html`(html) / 표준 출력(mermaid·json) |
| `--serve` | HTML을 렌더링하여 HTTP로 제공 | 끔 |
| `--port <number>` | `--serve` 에서 수신할 포트 | 임의 |
| `--host <address>` | `--serve` 에서 바인딩할 주소. `0.0.0.0` 은 모든 네트워크 인터페이스에 전체 스키마를 노출합니다 — 신뢰할 수 있는 네트워크에서만 사용하세요 | `127.0.0.1` |
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
