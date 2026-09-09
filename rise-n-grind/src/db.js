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
  tier          TEXT NOT NULL DEFAULT 'free',
  referral_code TEXT UNIQUE,
  referred_by   TEXT,
  terms_accepted_at INTEGER,
  stripe_customer_id TEXT,
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
  country      TEXT NOT NULL DEFAULT 'US',
  region       TEXT,
  city         TEXT,
  blocked_hours TEXT NOT NULL DEFAULT '[]',
  goal_json    TEXT,
  conditions   TEXT,
  insurance_used_on TEXT,
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
  verified_cents INTEGER NOT NULL DEFAULT 0,
  ends_min       INTEGER,
  checkin_sent   INTEGER NOT NULL DEFAULT 0,
  note           TEXT,
  completed_at   INTEGER
);
CREATE INDEX IF NOT EXISTS idx_tasks_plan ON tasks (plan_id);
CREATE TABLE IF NOT EXISTS daily_scores (
  user_id        TEXT NOT NULL,
  date           TEXT NOT NULL,
  score          INTEGER NOT NULL DEFAULT 0,
  verified_score INTEGER NOT NULL DEFAULT 0,
  earnings_cents INTEGER NOT NULL DEFAULT 0,
  verified_cents INTEGER NOT NULL DEFAULT 0,
  league         TEXT NOT NULL DEFAULT 'bronze',
  country        TEXT,
  region         TEXT,
  city           TEXT,
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
CREATE TABLE IF NOT EXISTS crew_log (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    TEXT NOT NULL,
  date       TEXT NOT NULL,
  agent      TEXT NOT NULL,
  message    TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_crew_log ON crew_log (user_id, date, created_at);
CREATE TABLE IF NOT EXISTS crew_messages (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    TEXT NOT NULL,
  date       TEXT NOT NULL,
  role       TEXT NOT NULL,
  content    TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_crew_messages ON crew_messages (user_id, date, created_at);
CREATE TABLE IF NOT EXISTS briefs (
  city_key   TEXT NOT NULL,
  date       TEXT NOT NULL,
  brief      TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (city_key, date)
);
CREATE TABLE IF NOT EXISTS push_subscriptions (
  endpoint   TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL,
  data       TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_push_user ON push_subscriptions (user_id);
CREATE TABLE IF NOT EXISTS receipts (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id      TEXT NOT NULL,
  task_id      INTEGER NOT NULL,
  amount_cents INTEGER NOT NULL,
  source       TEXT,
  confidence   REAL,
  image_sha    TEXT,
  created_at   INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS challenges (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  challenger_id TEXT NOT NULL,
  opponent_id   TEXT NOT NULL,
  date          TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending',
  winner_id     TEXT,
  challenger_score INTEGER,
  opponent_score   INTEGER,
  created_at    INTEGER NOT NULL,
  settled_at    INTEGER
);
CREATE INDEX IF NOT EXISTS idx_challenges_date ON challenges (date, status);
CREATE TABLE IF NOT EXISTS badges (
  user_id    TEXT NOT NULL,
  badge      TEXT NOT NULL,
  date       TEXT NOT NULL,
  detail     TEXT,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, badge, date)
);
CREATE TABLE IF NOT EXISTS recaps (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    TEXT NOT NULL,
  week_end   TEXT NOT NULL,
  data       TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  UNIQUE(user_id, week_end)
);
`;

function open(file) {
  const target = file || process.env.DB_PATH || path.join(__dirname, '..', 'data', 'risengrind.db');
  if (target !== ':memory:') fs.mkdirSync(path.dirname(target), { recursive: true });
  const db = new Database(target);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(SCHEMA);
  migrate(db);
  return db;
}

// Columns added after the first release. ALTER TABLE ADD COLUMN is a no-op
// failure when the column already exists, so each one is tried independently.
const MIGRATIONS = [
  "ALTER TABLE users ADD COLUMN tier TEXT NOT NULL DEFAULT 'free'",
  'ALTER TABLE users ADD COLUMN referral_code TEXT',
  'ALTER TABLE users ADD COLUMN referred_by TEXT',
  'ALTER TABLE users ADD COLUMN terms_accepted_at INTEGER',
  'ALTER TABLE users ADD COLUMN stripe_customer_id TEXT',
  "ALTER TABLE profiles ADD COLUMN country TEXT NOT NULL DEFAULT 'US'",
  'ALTER TABLE profiles ADD COLUMN region TEXT',
  'ALTER TABLE profiles ADD COLUMN city TEXT',
  "ALTER TABLE profiles ADD COLUMN blocked_hours TEXT NOT NULL DEFAULT '[]'",
  'ALTER TABLE profiles ADD COLUMN goal_json TEXT',
  'ALTER TABLE profiles ADD COLUMN conditions TEXT',
  'ALTER TABLE profiles ADD COLUMN insurance_used_on TEXT',
  'ALTER TABLE tasks ADD COLUMN verified_cents INTEGER NOT NULL DEFAULT 0',
  'ALTER TABLE tasks ADD COLUMN ends_min INTEGER',
  'ALTER TABLE tasks ADD COLUMN checkin_sent INTEGER NOT NULL DEFAULT 0',
  'ALTER TABLE daily_scores ADD COLUMN verified_score INTEGER NOT NULL DEFAULT 0',
  'ALTER TABLE daily_scores ADD COLUMN verified_cents INTEGER NOT NULL DEFAULT 0',
  "ALTER TABLE daily_scores ADD COLUMN league TEXT NOT NULL DEFAULT 'bronze'",
  'ALTER TABLE daily_scores ADD COLUMN country TEXT',
  'ALTER TABLE daily_scores ADD COLUMN region TEXT',
  'ALTER TABLE daily_scores ADD COLUMN city TEXT',
  'CREATE UNIQUE INDEX IF NOT EXISTS idx_users_referral ON users (referral_code)',
];
function migrate(db) {
  for (const sql of MIGRATIONS) { try { db.exec(sql); } catch (_) { /* already applied */ } }
}

module.exports = { open, SCHEMA };
