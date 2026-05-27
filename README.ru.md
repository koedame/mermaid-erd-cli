[English](./README.md) | [日本語](./README.ja.md) | [简体中文](./README.zh.md) | [한국어](./README.ko.md) | [Español](./README.es.md) | [Français](./README.fr.md) | [Deutsch](./README.de.md) | [Português](./README.pt.md) | [Русский](./README.ru.md)

# mermaid-erd-cli

[![CI](https://github.com/koedame/mermaid-erd-cli/actions/workflows/ci.yml/badge.svg)](https://github.com/koedame/mermaid-erd-cli/actions/workflows/ci.yml)
[![npm version](https://badge.fury.io/js/mermaid-erd-cli.svg)](https://www.npmjs.com/package/mermaid-erd-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

Создаёт ER-диаграмму [Mermaid](https://mermaid.js.org/) из работающей базы данных или дампа схемы — без ORM и фреймворков.

![screenshot](https://raw.githubusercontent.com/koedame/mermaid-erd-cli/main/docs/screenshot.png)

Инструмент исследует вашу схему (таблицы, столбцы, первичные ключи, внешние ключи, комментарии) и может выводить:

- единый автономный **HTML-просмотрщик** (с встроенными Mermaid, Vue и Tailwind, работает офлайн), в котором вы выбираете таблицы и экспортируете в SVG/PNG; либо
- необработанный текст **Mermaid** / **JSON** в **стандартный вывод**, чтобы сочетать его с другими инструментами.

Связи выводятся из внешних ключей: таблица, на которую ссылаются, — это сторона «один», а таблица с внешним ключом — сторона «многие». Внешний ключ `NOT NULL` отображается как обязательная связь (`||--o{`), а допускающий NULL — как необязательная (`|o--o{`).

## Использование

```bash
# Интерактивный HTML-просмотрщик (по умолчанию → erd/index.html)
npx mermaid-erd-cli --db "postgres://user:pass@localhost:5432/mydb"
npx mermaid-erd-cli --db ./dev.sqlite3
npx mermaid-erd-cli --db ./dev.sqlite3 --serve        # раздавать по HTTP

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

### Поддерживаемые базы данных

Драйвер вашей базы загружается только при необходимости, поэтому установите лишь тот, что используете:

| Источник | Пакет драйвера |
| --- | --- |
| PostgreSQL | `pg` |
| MySQL | `mysql2` |
| SQLite | `better-sqlite3` |

Для разбора дампов схемы (`--schema`) драйвер вообще не нужен.

## Параметры

| Параметр | Описание | По умолчанию |
| --- | --- | --- |
| `--db <url>` | URL подключения или путь к SQLite | — |
| `--schema <path>` | Дамп схемы (`.rb` — схема Rails, `.sql` — DDL) | — |
| `--pg-schema <name>` | Схема PostgreSQL для исследования | `public` |
| `--format <html\|mermaid\|json>` | Формат вывода (`mmd` — псевдоним для `mermaid`) | `html` |
| `--out <path>` | Путь вывода; `-` означает стандартный вывод | `erd/index.html` (html); стандартный вывод (mermaid/json) |
| `--serve` | Отрендерить HTML и раздать по HTTP | выкл. |
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

HTML-просмотрщик и встроенные фронтенд-библиотеки происходят от [rails-mermaid_erd](https://github.com/koedame/rails-mermaid_erd) (MIT). Этот проект сохраняет тот же просмотрщик и контракт `SCHEMA_DATA`, заменяя извлечение через Rails/ActiveRecord прямым исследованием базы данных и разбором дампов схемы. Встроенные сборки Mermaid, Vue и Tailwind распространяются под их собственными лицензиями MIT; см. [`assets/vendor/LICENSES.md`](./assets/vendor/LICENSES.md).

## Лицензия

MIT — см. [LICENSE](./LICENSE).
