CREATE TABLE teams (
  id BIGINT PRIMARY KEY,
  name VARCHAR(255) NOT NULL
);

CREATE TABLE users (
  id BIGINT PRIMARY KEY,
  team_id BIGINT NOT NULL REFERENCES teams (id),
  manager_id BIGINT REFERENCES users (id),
  email VARCHAR(255) NOT NULL,
  CONSTRAINT fk_users_team FOREIGN KEY (team_id) REFERENCES teams (id)
);

CREATE TABLE posts (
  id BIGINT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  title TEXT,
  FOREIGN KEY (user_id) REFERENCES users (id)
);

CREATE TABLE tags (
  id BIGINT PRIMARY KEY,
  name VARCHAR(100) NOT NULL
);

CREATE TABLE post_tags (
  post_id BIGINT NOT NULL,
  tag_id BIGINT NOT NULL,
  PRIMARY KEY (post_id, tag_id),
  FOREIGN KEY (post_id) REFERENCES posts (id),
  FOREIGN KEY (tag_id) REFERENCES tags (id)
);

-- Separate ALTER, pg_dump style.
ALTER TABLE ONLY posts
  ADD CONSTRAINT fk_posts_author FOREIGN KEY (user_id) REFERENCES users (id);
