-- Schema whose table names, column names and comments carry markup that
-- would execute or load a resource if the viewer ever rendered it as HTML.

CREATE TABLE "</script><img src=x onerror=window.__x=1>" (
  id BIGINT PRIMARY KEY,
  "</script><img src=x onerror=window.__x=1>" TEXT
);

CREATE TABLE posts (
  id BIGINT PRIMARY KEY,
  "</script><img src=x onerror=window.__x=1>" BIGINT REFERENCES "</script><img src=x onerror=window.__x=1>" (id),
  body TEXT
);

COMMENT ON TABLE posts IS '</script><img src=x onerror=window.__x=1>';
COMMENT ON COLUMN posts.body IS '</script><img src=x onerror=window.__x=1>';
