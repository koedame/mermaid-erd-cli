-- Schema whose table names, column names and comments carry text that would
-- execute or load a resource if the viewer ever treated it as anything but text.

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
COMMENT ON TABLE "</script><img src=x onerror=window.__x=1>" IS '%%{init: {''themeCSS'': ''*{background-image:url(http://127.0.0.1:9/)}''}}%%';
