'use strict';

// SQLite storage. One file, WAL mode, schema created on first open.

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  email         TEXT UNIQUE NOT NULL,
  display_name  TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at    INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  token      TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions (user_id);

CREATE TABLE IF NOT EXISTS profiles (
  user_id      TEXT PRIMARY KEY,
  location     TEXT,
  resources    TEXT NOT NULL DEFAULT '[]',
  skills       TEXT NOT NULL DEFAULT '[]',
  goals        TEXT,
  comfort      TEXT,
  target_hours REAL NOT NULL DEFAULT 8,
  start_hour   INTEGER NOT NULL DEFAULT 8,
  tz_offset    INTEGER NOT NULL DEFAULT 0,
  memory       TEXT NOT NULL DEFAULT '{}',
  active       INTEGER NOT NULL DEFAULT 1,
  created_at   INTEGER NOT NULL,
  updated_at   INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS plans (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       TEXT NOT NULL,
  date          TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'open',
  plan_json     TEXT NOT NULL,
  generated_by  TEXT,
  generated_at  INTEGER NOT NULL,
  closed_at     INTEGER,
  regenerations INTEGER NOT NULL DEFAULT 0,
  UNIQUE(user_id, date)
);
CREATE TABLE IF NOT EXISTS tasks (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  plan_id        INTEGER NOT NULL,
  order_num      INTEGER NOT NULL,
  play_id        TEXT,
  title          TEXT NOT NULL,
  hours          REAL NOT NULL DEFAULT 1,
  status         TEXT NOT NULL DEFAULT 'pending',
  earnings_cents INTEGER NOT NULL DEFAULT 0,
  note           TEXT,
  completed_at   INTEGER
);
CREATE INDEX IF NOT EXISTS idx_tasks_plan ON tasks (plan_id);
CREATE TABLE IF NOT EXISTS daily_scores (
  user_id        TEXT NOT NULL,
  date           TEXT NOT NULL,
  score          INTEGER NOT NULL DEFAULT 0,
  earnings_cents INTEGER NOT NULL DEFAULT 0,
  tasks_done     INTEGER NOT NULL DEFAULT 0,
  tasks_total    INTEGER NOT NULL DEFAULT 0,
  hours_done     REAL NOT NULL DEFAULT 0,
  streak         INTEGER NOT NULL DEFAULT 0,
  rank           INTEGER,
  closed         INTEGER NOT NULL DEFAULT 0,
  updated_at     INTEGER NOT NULL,
  PRIMARY KEY (user_id, date)
);
CREATE INDEX IF NOT EXISTS idx_scores_date ON daily_scores (date, score DESC);
CREATE TABLE IF NOT EXISTS debriefs (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    TEXT NOT NULL,
  date       TEXT NOT NULL,
  summary    TEXT,
  data       TEXT,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS champions (
  date       TEXT NOT NULL,
  rank       INTEGER NOT NULL,
  user_id    TEXT NOT NULL,
  score      INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (date, rank)
);
CREATE TABLE IF NOT EXISTS inbox (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    TEXT NOT NULL,
  kind       TEXT NOT NULL,
  title      TEXT NOT NULL,
  body       TEXT,
  read       INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_inbox_user ON inbox (user_id, read, created_at DESC);
`;

function open(file) {
  const target = file || process.env.DB_PATH || path.join(__dirname, '..', 'data', 'bossday.db');
  if (target !== ':memory:') fs.mkdirSync(path.dirname(target), { recursive: true });
  const db = new Database(target);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(SCHEMA);
  return db;
}

module.exports = { open, SCHEMA };
