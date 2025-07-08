CREATE TABLE sessions (
  session_id VARCHAR(255) NOT NULL PRIMARY KEY,
  expires INT(11) NOT NULL,
  data TEXT
);