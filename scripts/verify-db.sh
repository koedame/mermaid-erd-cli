#!/usr/bin/env bash
# Spin up throwaway Postgres + MySQL containers, seed an identical schema, run
# the CLI against each, and assert the generated Mermaid output is correct.
set -uo pipefail
cd "$(dirname "$0")/.."

PG=merd-verify-pg
MY=merd-verify-mysql
FAIL=0

cleanup() { docker rm -f "$PG" "$MY" >/dev/null 2>&1 || true; }
trap cleanup EXIT
cleanup

check() { # <file> <pattern> <label>
  if grep -qF "$2" "$1"; then echo "  ok: $3"; else echo "  MISSING: $3 ($2)"; FAIL=1; fi
}

PG_SQL="
CREATE TABLE teams (id bigint primary key, name varchar(255) not null);
COMMENT ON TABLE teams IS 'the teams';
COMMENT ON COLUMN teams.name IS 'display name';
CREATE TABLE users (id bigint primary key, team_id bigint not null references teams(id), manager_id bigint references users(id), email varchar(255) not null);
CREATE TABLE posts (id bigint primary key, user_id bigint not null references users(id), title text);
CREATE TABLE tags (id bigint primary key, name varchar(100));
CREATE TABLE post_tags (post_id bigint not null references posts(id), tag_id bigint not null references tags(id), primary key (post_id, tag_id));
CREATE TABLE schema_migrations (version varchar(255) primary key);
"

MY_SQL="
CREATE TABLE teams (id bigint primary key, name varchar(255) not null comment 'display name') comment='the teams';
CREATE TABLE users (id bigint primary key, team_id bigint not null, manager_id bigint, email varchar(255) not null,
  foreign key (team_id) references teams(id), foreign key (manager_id) references users(id));
CREATE TABLE posts (id bigint primary key, user_id bigint not null, title text, foreign key (user_id) references users(id));
CREATE TABLE tags (id bigint primary key, name varchar(100));
CREATE TABLE post_tags (post_id bigint not null, tag_id bigint not null, primary key (post_id, tag_id),
  foreign key (post_id) references posts(id), foreign key (tag_id) references tags(id));
CREATE TABLE schema_migrations (version varchar(255) primary key);
"

echo "== PostgreSQL =="
docker run -d --name "$PG" -e POSTGRES_PASSWORD=pass -e POSTGRES_DB=appdb -p 55432:5432 postgres:16 >/dev/null
until docker exec "$PG" pg_isready -U postgres -d appdb >/dev/null 2>&1; do sleep 2; done
sleep 2
echo "$PG_SQL" | docker exec -i "$PG" psql -U postgres -d appdb >/dev/null
PGMMD=/tmp/merd-pg/erd.mmd
rm -f "$PGMMD"
node dist/cli.js --db "postgres://postgres:pass@localhost:55432/appdb" --format mermaid --out "$PGMMD"
check "$PGMMD" 'teams ||--o{ users :' "mandatory FK teams->users"
check "$PGMMD" 'users |o--o{ users :' "optional self-ref users->users"
check "$PGMMD" 'posts ||--o{ post_tags :' "join table FK posts->post_tags"
check "$PGMMD" 'tags ||--o{ post_tags :' "join table FK tags->post_tags"
check "$PGMMD" '%% table comment: the teams' "table comment"
check "$PGMMD" 'post_id PK' "composite PK column"
if grep -q 'schema_migrations {' "$PGMMD"; then echo "  LEAK: schema_migrations not ignored"; FAIL=1; else echo "  ok: schema_migrations ignored"; fi

echo "== MySQL =="
docker run -d --name "$MY" -e MYSQL_ROOT_PASSWORD=pass -e MYSQL_DATABASE=appdb -p 33060:3306 mysql:8 >/dev/null
# `mysqladmin ping` over the container socket goes green during the init's
# temporary server, before the real TCP server restarts. Poll over TCP from
# the host with the actual driver so we only seed once the final server is up.
node -e '
const mysql = require("mysql2/promise");
(async () => {
  for (let i = 0; i < 60; i++) {
    try {
      const c = await mysql.createConnection("mysql://root:pass@localhost:33060/appdb");
      await c.query("SELECT 1");
      await c.end();
      process.exit(0);
    } catch { await new Promise((r) => setTimeout(r, 2000)); }
  }
  console.error("mysql did not become ready"); process.exit(1);
})();
'
echo "$MY_SQL" | docker exec -i "$MY" mysql -uroot -ppass appdb 2>/dev/null
MYMMD=/tmp/merd-my/erd.mmd
rm -f "$MYMMD"
node dist/cli.js --db "mysql://root:pass@localhost:33060/appdb" --format mermaid --out "$MYMMD"
check "$MYMMD" 'teams ||--o{ users :' "mandatory FK teams->users"
check "$MYMMD" 'users |o--o{ users :' "optional self-ref users->users"
check "$MYMMD" 'posts ||--o{ post_tags :' "join table FK posts->post_tags"
check "$MYMMD" '%% table comment: the teams' "table comment"
check "$MYMMD" 'post_id PK' "composite PK column"
if grep -q 'schema_migrations {' "$MYMMD"; then echo "  LEAK: schema_migrations not ignored"; FAIL=1; else echo "  ok: schema_migrations ignored"; fi

echo "================"
if [ "$FAIL" -eq 0 ]; then echo "DB VERIFY PASS"; else echo "DB VERIFY FAIL"; fi
exit $FAIL
