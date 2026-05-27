-- Sample schema for the mermaid-erd-cli live demo.
-- Regenerate the demo page with: npm run demo
-- It exercises a mandatory 1:N, an optional self-reference, a join table with a
-- composite primary key, and column/table comments.

CREATE TABLE teams (
  id BIGINT PRIMARY KEY,
  name VARCHAR(255) NOT NULL
);

CREATE TABLE users (
  id BIGINT PRIMARY KEY,
  team_id BIGINT NOT NULL REFERENCES teams (id),
  manager_id BIGINT REFERENCES users (id),
  email VARCHAR(255) NOT NULL,
  display_name VARCHAR(255)
);
COMMENT ON TABLE users IS 'Application users';
COMMENT ON COLUMN users.manager_id IS 'Self-reference: the user''s manager';

CREATE TABLE posts (
  id BIGINT PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users (id),
  title TEXT NOT NULL,
  body TEXT,
  published_at TIMESTAMP
);
COMMENT ON COLUMN posts.published_at IS 'NULL until the post is published';

CREATE TABLE comments (
  id BIGINT PRIMARY KEY,
  post_id BIGINT NOT NULL REFERENCES posts (id),
  user_id BIGINT REFERENCES users (id),
  body TEXT NOT NULL
);

CREATE TABLE tags (
  id BIGINT PRIMARY KEY,
  name VARCHAR(100) NOT NULL
);

CREATE TABLE post_tags (
  post_id BIGINT NOT NULL REFERENCES posts (id),
  tag_id BIGINT NOT NULL REFERENCES tags (id),
  PRIMARY KEY (post_id, tag_id)
);
