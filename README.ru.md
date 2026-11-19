[English](./README.md) | [日本語](./README.ja.md) | [简体中文](./README.zh.md) | [한국어](./README.ko.md) | [Español](./README.es.md) | [Français](./README.fr.md) | [Deutsch](./README.de.md) | [Português](./README.pt.md) | [Русский](./README.ru.md)

<div align="center">

# mermaid-erd-cli

**Создаёт ER-диаграмму [Mermaid](https://mermaid.js.org/) из работающей базы данных или дампа схемы — без ORM и фреймворков.**

<a href="https://koedame.github.io/mermaid-erd-cli/#eyJzZWxlY3RNb2RlbHMiOlsidGVhbXMiLCJ1c2VycyIsInBvc3RzIiwiY29tbWVudHMiLCJ0YWdzIiwicG9zdF90YWdzIl0sImlzUHJldmlld1JlbGF0aW9ucyI6ZmFsc2UsImlzU2hvd1JlbGF0aW9uQ29tbWVudCI6ZmFsc2UsImlzU2hvd0tleSI6dHJ1ZSwiaXNTaG93Q29tbWVudCI6ZmFsc2UsImlzSGlkZUNvbHVtbnMiOmZhbHNlfQ=="><img alt="HTML-просмотрщик mermaid-erd-cli с шестью таблицами примерной схемы блога и связями по внешним ключам между ними" src="https://raw.githubusercontent.com/koedame/mermaid-erd-cli/main/docs/images/hero.png" width="800"></a>

[![CI](https://github.com/koedame/mermaid-erd-cli/actions/workflows/ci.yml/badge.svg)](https://github.com/koedame/mermaid-erd-cli/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/mermaid-erd-cli?color=336699)](https://www.npmjs.com/package/mermaid-erd-cli)
![Node.js 22.12+](https://img.shields.io/badge/node-%E2%89%A522.12-336699)
[![License: MIT](https://img.shields.io/badge/license-MIT-336699)](./LICENSE)

[Живая демонстрация](https://koedame.github.io/mermaid-erd-cli/#eyJzZWxlY3RNb2RlbHMiOlsidGVhbXMiLCJ1c2VycyIsInBvc3RzIiwiY29tbWVudHMiLCJ0YWdzIiwicG9zdF90YWdzIl0sImlzUHJldmlld1JlbGF0aW9ucyI6ZmFsc2UsImlzU2hvd1JlbGF0aW9uQ29tbWVudCI6ZmFsc2UsImlzU2hvd0tleSI6dHJ1ZSwiaXNTaG93Q29tbWVudCI6ZmFsc2UsImlzSGlkZUNvbHVtbnMiOmZhbHNlfQ==) · [Быстрый старт](#быстрый-старт) · [Использование](#использование) · [Docker](#docker) · [Параметры](#параметры)

</div>

Инструмент исследует вашу схему (таблицы, столбцы, первичные ключи, внешние ключи, комментарии) и может выводить:

- единый автономный **HTML-просмотрщик** (с встроенными Mermaid, Vue и Tailwind, работает офлайн), в котором вы выбираете таблицы и экспортируете в SVG/PNG; либо
- необработанный текст **Mermaid** / **JSON** в **стандартный вывод**, чтобы сочетать его с другими инструментами.

Связи выводятся из внешних ключей: таблица, на которую ссылаются, — это сторона «один», а таблица с внешним ключом — сторона «многие». Внешний ключ `NOT NULL` отображается как обязательная связь (`||--o{`), а допускающий NULL — как необязательная (`|o--o{`).

## Возможности

- **Три действующие СУБД и два формата дампа.** PostgreSQL, MySQL и SQLite напрямую; `schema.rb` из Rails и файлы SQL DDL — без подключения к базе и без драйвера.
- **Один автономный HTML-файл.** Mermaid, Vue и Tailwind встроены, поэтому просмотрщик работает офлайн: выберите таблицы и экспортируйте в SVG или PNG.
- **Подключается к любому конвейеру.** `--format mermaid` и `--format json` пишут в стандартный вывод.
- **Работает в контейнере.** Образ Docker на базе distroless содержит все три драйвера (GHCR и Docker Hub).
- **Просмотрщик на 9 языках.** English, 日本語, 简体中文, 한국어, Español, Français, Deutsch, Português и Русский.

## Быстрый старт

Требуется Node.js 22.12 или новее. `npx` сам загрузит CLI, поэтому ничего устанавливать заранее не нужно:

```bash
npx mermaid-erd-cli --schema ./db/schema.rb
```

Команда запишет `erd/index.html`: откройте его в браузере, выберите таблицы на боковой панели и экспортируйте в SVG или PNG. Чтобы прочитать действующую базу, передайте `--db "postgres://user:pass@localhost:5432/mydb"` (или путь к файлу SQLite). Другие примеры — в разделе [Использование](#использование).

## Использование

```bash
# Интерактивный HTML-просмотрщик (по умолчанию → erd/index.html)
npx mermaid-erd-cli --db "postgres://user:pass@localhost:5432/mydb"
npx mermaid-erd-cli --db ./dev.sqlite3
npx mermaid-erd-cli --db ./dev.sqlite3 --serve        # раздавать по HTTP (случайный порт)
npx mermaid-erd-cli --db ./dev.sqlite3 --serve --port 5173   # раздавать на фиксированном порту

# Дампы схемы — подключение к базе не требуется
npx mermaid-erd-cli --schema ./db/schema.rb           # Rails schema.rb
npx mermaid-erd-cli --schema ./dump.sql               # SQL DDL (CREATE TABLE ...)

# Вывод Mermaid / JSON в стандартный вывод (можно направить куда угодно)
npx mermaid-erd-cli --db ./dev.sqlite3 --format mermaid           # текст erDiagram
npx mermaid-erd-cli --db ./dev.sqlite3 --format mermaid > er.mmd
npx mermaid-erd-cli --schema schema.rb --format mermaid | mmdc -i - -o er.svg
npx mermaid-erd-cli --db ./dev.sqlite3 --format json | jq '.Models[].TableName'
```

Используйте `--out -`, чтобы принудительно вывести любой формат (включая HTML) в стандартный вывод.

Сгенерированный HTML, а также вывод `--format json` и `--format mermaid` содержат схему вашей базы данных: названия и типы таблиц и столбцов, комментарии и связи. Передавайте их и размещайте только в том кругу, в котором вы поделились бы самой схемой.

### Поддерживаемые базы данных

Драйвер вашей базы загружается только при необходимости, поэтому установите лишь тот, что используете:

| Источник | Пакет драйвера |
| --- | --- |
| PostgreSQL | `pg` |
| MySQL | `mysql2` |
| SQLite | `better-sqlite3` |

Для разбора дампов схемы (`--schema`) драйвер вообще не нужен.

## Docker

Готовые образы публикуются с каждым выпуском в GitHub Container Registry и
Docker Hub. Среда выполнения — минимальный образ distroless, включающий все три
драйвера баз данных, поэтому интроспекция в реальном времени работает без
установки чего-либо ещё.

```bash
docker pull ghcr.io/koedame/mermaid-erd-cli   # или: docker pull koedame/mermaid-erd-cli
```

Рабочий каталог контейнера — `/work`; примонтируйте туда каталог, который нужно
читать и в который нужно писать. В примерах используется образ из GHCR — замените
`ghcr.io/koedame/mermaid-erd-cli` на `koedame/mermaid-erd-cli` для Docker Hub.

```bash
# Дамп схемы в текущем каталоге -> erd/index.html рядом
docker run --rm -u "$(id -u):$(id -g)" -v "$PWD:/work" \
  ghcr.io/koedame/mermaid-erd-cli --schema schema.rb

# Mermaid / JSON в стандартный вывод
docker run --rm -v "$PWD:/work" ghcr.io/koedame/mermaid-erd-cli --schema dump.sql --format mermaid

# Живой файл SQLite
docker run --rm -v "$PWD:/work" ghcr.io/koedame/mermaid-erd-cli --db /work/dev.sqlite3 --format mermaid
```

Образ запускается от имени непривилегированного пользователя (non-root);
добавляйте `-u "$(id -u):$(id -g)"`, когда контейнер пишет в каталог на хосте,
принадлежащий вам (как в первом примере); команды, которые пишут только в
стандартный вывод, в этом не нуждаются.

Чтобы подключиться к базе данных, работающей на хосте, помните, что `localhost`
внутри контейнера — это сам контейнер. Используйте `host.docker.internal`
(Docker Desktop) или `--network host` (Linux):

```bash
docker run --rm --network host ghcr.io/koedame/mermaid-erd-cli \
  --db "postgres://user:pass@localhost:5432/mydb" --format mermaid
```

Чтобы раздавать просмотрщик, привяжитесь к `0.0.0.0` внутри контейнера и
опубликуйте порт — он остаётся доступным только через опубликованный порт:

```bash
docker run --rm -p 8080:8080 -v "$PWD:/work" ghcr.io/koedame/mermaid-erd-cli \
  --db /work/dev.sqlite3 --serve --host 0.0.0.0 --port 8080
# затем откройте http://localhost:8080
```

Чтобы собрать образ самостоятельно вместо загрузки:

```bash
docker build -t mermaid-erd-cli .
docker run --rm -v "$PWD:/work" mermaid-erd-cli --schema schema.rb
```

## Параметры

| Параметр | Описание | По умолчанию |
| --- | --- | --- |
| `--db <url>` | URL подключения или путь к SQLite | — |
| `--schema <path>` | Дамп схемы (`.rb` — схема Rails, `.sql` — DDL) | — |
| `--pg-schema <name>` | Схема PostgreSQL для исследования | `public` |
| `--format <html\|mermaid\|json>` | Формат вывода (`mmd` — псевдоним для `mermaid`) | `html` |
| `--out <path>` | Путь вывода; `-` означает стандартный вывод | `erd/index.html` (html); стандартный вывод (mermaid/json) |
| `--serve` | Отрендерить HTML и раздать по HTTP | выкл. |
| `--port <number>` | Порт для прослушивания при `--serve` | случайный |
| `--host <address>` | Адрес для привязки при `--serve`. `0.0.0.0` открывает полную схему на всех сетевых интерфейсах — используйте только в доверенных сетях | `127.0.0.1` |
| `--ignore-tables <patterns>` | Регэкс-шаблоны для исключения (через запятую) | `^schema_migrations$,^ar_internal_metadata$` |
| `--config <path>` | Путь к файлу конфигурации | `mermaid-erd.yml` |
| `--title <name>` | Заголовок, показываемый в HTML-просмотрщике | `Database` |

Шаблоны исключения также можно хранить в `mermaid-erd.yml`:

```yaml
ignore_tables:
  - "^schema_migrations$"
  - "_old$"
```

## Разработка

```bash
npm install
npm run build      # компиляция TypeScript в dist/
npm test           # модульные и интеграционные тесты (vitest)
npm run e2e        # проверка сгенерированного просмотрщика в headless-браузере
```

## Благодарности

HTML-просмотрщик и встроенные фронтенд-библиотеки происходят от [rails-mermaid_erd](https://github.com/koedame/rails-mermaid_erd) (MIT). Этот проект сохраняет тот же просмотрщик и контракт `SCHEMA_DATA`, заменяя извлечение через Rails/ActiveRecord прямым исследованием базы данных и разбором дампов схемы. Встроенные сборки Mermaid и Vue, а также таблица стилей, созданная с помощью Tailwind CSS, распространяются под их собственными лицензиями (MIT, ISC, BSD-3-Clause, Apache-2.0 и некоторые другие). Уведомления об авторских правах и тексты лицензий находятся в [`assets/vendor/LICENSES.md`](./assets/vendor/LICENSES.md) и в начале каждого создаваемого HTML-файла.

## Товарные знаки

Этот проект не связан с проектом Mermaid и Mermaid Chart Inc., не одобрен и не спонсируется ими. Mermaid Chart Inc. зарегистрировала или подала заявки на товарные знаки MERMAID CHART и MERMAID в США. PostgreSQL, MySQL, SQLite, Docker и все прочие товарные знаки принадлежат их владельцам.

## Лицензия

MIT — см. [LICENSE](./LICENSE).
