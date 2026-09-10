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
CREATE TABLE IF NOT EXISTS feed (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    TEXT,
  kind       TEXT NOT NULL,
  text       TEXT NOT NULL,
  city       TEXT,
  amount_cents INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_feed_time ON feed (created_at DESC);
CREATE TABLE IF NOT EXISTS stories (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    TEXT NOT NULL,
  kind       TEXT NOT NULL,
  title      TEXT NOT NULL,
  body       TEXT NOT NULL,
  data       TEXT,
  public     INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS ledger (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  kind         TEXT NOT NULL,
  user_id      TEXT,
  gross_cents  INTEGER NOT NULL DEFAULT 0,
  fee_cents    INTEGER NOT NULL DEFAULT 0,
  net_cents    INTEGER NOT NULL DEFAULT 0,
  status       TEXT NOT NULL DEFAULT 'recorded',
  ref          TEXT,
  note         TEXT,
  created_at   INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ledger_time ON ledger (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ledger_user ON ledger (user_id, kind);
CREATE TABLE IF NOT EXISTS tips (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  to_user_id    TEXT NOT NULL,
  from_name     TEXT,
  message       TEXT,
  gross_cents   INTEGER NOT NULL,
  fee_cents     INTEGER NOT NULL,
  net_cents     INTEGER NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending',
  stripe_ref    TEXT,
  created_at    INTEGER NOT NULL,
  paid_at       INTEGER
);
CREATE INDEX IF NOT EXISTS idx_tips_user ON tips (to_user_id, status);
CREATE TABLE IF NOT EXISTS payouts (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  method     TEXT NOT NULL,
  ref        TEXT,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS lesson_progress (
  user_id    TEXT NOT NULL,
  lesson_id  TEXT NOT NULL,
  date       TEXT NOT NULL,
  correct    INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, lesson_id)
);
CREATE TABLE IF NOT EXISTS mentors (
  user_id    TEXT PRIMARY KEY,
  topics     TEXT NOT NULL DEFAULT '[]',
  price_cents INTEGER NOT NULL DEFAULT 500,
  bio        TEXT,
  active     INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS mentor_questions (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  mentor_id  TEXT NOT NULL,
  asker_id   TEXT NOT NULL,
  question   TEXT NOT NULL,
  answer     TEXT,
  price_cents INTEGER NOT NULL,
  fee_cents  INTEGER NOT NULL,
  status     TEXT NOT NULL DEFAULT 'open',
  created_at INTEGER NOT NULL,
  answered_at INTEGER
);
CREATE TABLE IF NOT EXISTS brackets (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  week_start TEXT NOT NULL UNIQUE,
  status     TEXT NOT NULL DEFAULT 'open',
  size       INTEGER NOT NULL DEFAULT 0,
  round      INTEGER NOT NULL DEFAULT 0,
  entry_cents INTEGER NOT NULL DEFAULT 0,
  pool_cents INTEGER NOT NULL DEFAULT 0,
  winner_id  TEXT,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS bracket_entries (
  bracket_id INTEGER NOT NULL,
  user_id    TEXT NOT NULL,
  seed       INTEGER,
  alive      INTEGER NOT NULL DEFAULT 1,
  eliminated_round INTEGER,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (bracket_id, user_id)
);
CREATE TABLE IF NOT EXISTS bracket_matches (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  bracket_id INTEGER NOT NULL,
  round      INTEGER NOT NULL,
  date       TEXT NOT NULL,
  a_id       TEXT,
  b_id       TEXT,
  a_score    INTEGER,
  b_score    INTEGER,
  winner_id  TEXT,
  settled    INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_bracket_matches ON bracket_matches (bracket_id, round);
CREATE TABLE IF NOT EXISTS challenge_days (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  slug        TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  headline    TEXT,
  date        TEXT NOT NULL,
  ends        TEXT NOT NULL,
  target_score INTEGER NOT NULL,
  target_cents INTEGER NOT NULL DEFAULT 0,
  plan_json   TEXT,
  created_at  INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS prize_pools (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  month       TEXT NOT NULL UNIQUE,
  sponsor     TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  fee_cents   INTEGER NOT NULL DEFAULT 0,
  rules       TEXT,
  status      TEXT NOT NULL DEFAULT 'open',
  winner_id   TEXT,
  created_at  INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS safety_sessions (
  token      TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL,
  task_id    INTEGER,
  place      TEXT,
  eta        TEXT,
  status     TEXT NOT NULL DEFAULT 'heading',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS ideas (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  week_end   TEXT NOT NULL,
  agent      TEXT NOT NULL,
  title      TEXT NOT NULL,
  body       TEXT NOT NULL,
  evidence   TEXT,
  status     TEXT NOT NULL DEFAULT 'new',
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS shows (
  week_end   TEXT PRIMARY KEY,
  data       TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS play_weights (
  scope      TEXT NOT NULL,
  play_key   TEXT NOT NULL,
  done_ema   REAL NOT NULL DEFAULT 0.5,
  earn_ema   REAL NOT NULL DEFAULT 1.0,
  n          INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (scope, play_key)
);
CREATE TABLE IF NOT EXISTS learning_events (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    TEXT,
  kind       TEXT NOT NULL,
  play_key   TEXT,
  value      REAL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_learning_user ON learning_events (user_id);
CREATE TABLE IF NOT EXISTS gigs (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    TEXT NOT NULL,
  date       TEXT NOT NULL,
  title      TEXT NOT NULL,
  platform   TEXT,
  url        TEXT NOT NULL,
  pay        TEXT,
  location   TEXT,
  kind       TEXT,
  difficulty INTEGER NOT NULL DEFAULT 5,
  hours      REAL NOT NULL DEFAULT 2,
  why        TEXT,
  source     TEXT NOT NULL DEFAULT 'links',
  status     TEXT NOT NULL DEFAULT 'found',
  task_id    INTEGER,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_gigs_user_date ON gigs (user_id, date);
CREATE TABLE IF NOT EXISTS gig_cache (
  cache_key  TEXT PRIMARY KEY,
  data       TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS avatars (
  user_id    TEXT PRIMARY KEY,
  mime       TEXT NOT NULL,
  data       TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS friends (
  a_id         TEXT NOT NULL,
  b_id         TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'pending',
  requested_by TEXT NOT NULL,
  created_at   INTEGER NOT NULL,
  PRIMARY KEY (a_id, b_id)
);
CREATE TABLE IF NOT EXISTS blocks (
  user_id    TEXT NOT NULL,
  blocked_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, blocked_id)
);
CREATE TABLE IF NOT EXISTS messages (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  from_id    TEXT NOT NULL,
  to_id      TEXT NOT NULL,
  body       TEXT NOT NULL,
  read       INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_messages_to ON messages (to_id, read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_pair ON messages (from_id, to_id, created_at DESC);
CREATE TABLE IF NOT EXISTS calls (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  from_id    TEXT NOT NULL,
  to_id      TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'ringing',
  started_at INTEGER NOT NULL,
  ended_at   INTEGER
);
CREATE TABLE IF NOT EXISTS live_rooms (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  host_id    TEXT NOT NULL,
  title      TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'live',
  viewers    INTEGER NOT NULL DEFAULT 0,
  peak       INTEGER NOT NULL DEFAULT 0,
  started_at INTEGER NOT NULL,
  ended_at   INTEGER
);
CREATE TABLE IF NOT EXISTS live_messages (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  room_id    INTEGER NOT NULL,
  user_id    TEXT NOT NULL,
  body       TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_live_messages ON live_messages (room_id, created_at);
CREATE TABLE IF NOT EXISTS bot_ratings (
  room_id    INTEGER NOT NULL,
  rater_id   TEXT NOT NULL,
  host_id    TEXT NOT NULL,
  rating     INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (room_id, rater_id)
);
CREATE TABLE IF NOT EXISTS phone_codes (
  user_id    TEXT PRIMARY KEY,
  phone      TEXT NOT NULL,
  code       TEXT NOT NULL,
  attempts   INTEGER NOT NULL DEFAULT 0,
  expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS devices (
  device_id  TEXT NOT NULL,
  user_id    TEXT NOT NULL,
  first_seen INTEGER NOT NULL,
  last_seen  INTEGER NOT NULL,
  PRIMARY KEY (device_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_devices_user ON devices (user_id);
CREATE TABLE IF NOT EXISTS ops_alerts (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  kind       TEXT NOT NULL,
  severity   TEXT NOT NULL DEFAULT 'warn',
  message    TEXT NOT NULL,
  data       TEXT,
  resolved   INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS ops_errors (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  source     TEXT NOT NULL,
  message    TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS reconciliations (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  day           TEXT NOT NULL,
  ledger_cents  INTEGER NOT NULL,
  stripe_cents  INTEGER,
  diff_cents    INTEGER NOT NULL DEFAULT 0,
  notes         TEXT,
  ok            INTEGER NOT NULL DEFAULT 1,
  created_at    INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS squads (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL UNIQUE,
  code       TEXT NOT NULL UNIQUE,
  captain_id TEXT NOT NULL,
  city       TEXT,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS squad_members (
  squad_id   INTEGER NOT NULL,
  user_id    TEXT NOT NULL UNIQUE,
  joined_at  INTEGER NOT NULL,
  PRIMARY KEY (squad_id, user_id)
);
CREATE TABLE IF NOT EXISTS bot_duels (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  a_id         TEXT NOT NULL,
  b_id         TEXT NOT NULL,
  date         TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'open',
  a_score      INTEGER,
  b_score      INTEGER,
  winner_id    TEXT,
  created_at   INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS bot_duel_votes (
  duel_id    INTEGER NOT NULL,
  voter_id   TEXT NOT NULL,
  pick       TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (duel_id, voter_id)
);
CREATE TABLE IF NOT EXISTS sponsor_tiles (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  sponsor      TEXT NOT NULL,
  city_key     TEXT NOT NULL,
  title        TEXT NOT NULL,
  body         TEXT,
  url          TEXT NOT NULL,
  starts       TEXT NOT NULL,
  ends         TEXT NOT NULL,
  amount_cents INTEGER NOT NULL DEFAULT 0,
  clicks       INTEGER NOT NULL DEFAULT 0,
  created_at   INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sponsor_city ON sponsor_tiles (city_key, starts, ends);
CREATE TABLE IF NOT EXISTS employers (
  user_id    TEXT PRIMARY KEY,
  org        TEXT NOT NULL,
  contact    TEXT,
  city_key   TEXT,
  verified   INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS postings (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  employer_id  TEXT NOT NULL,
  org          TEXT NOT NULL,
  title        TEXT NOT NULL,
  body         TEXT,
  city_key     TEXT NOT NULL,
  city         TEXT,
  date         TEXT NOT NULL,
  hours        REAL NOT NULL DEFAULT 4,
  pay_cents    INTEGER NOT NULL,
  slots        INTEGER NOT NULL DEFAULT 1,
  filled       INTEGER NOT NULL DEFAULT 0,
  difficulty   INTEGER NOT NULL DEFAULT 5,
  kind         TEXT NOT NULL DEFAULT 'shift',
  fee_cents    INTEGER NOT NULL DEFAULT 0,
  status       TEXT NOT NULL DEFAULT 'open',
  created_at   INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_postings_city ON postings (city_key, date, status);
CREATE TABLE IF NOT EXISTS posting_claims (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  posting_id   INTEGER NOT NULL,
  user_id      TEXT NOT NULL,
  task_id      INTEGER,
  status       TEXT NOT NULL DEFAULT 'claimed',
  paid_cents   INTEGER NOT NULL DEFAULT 0,
  fee_cents    INTEGER NOT NULL DEFAULT 0,
  created_at   INTEGER NOT NULL,
  confirmed_at INTEGER,
  UNIQUE(posting_id, user_id)
);
CREATE TABLE IF NOT EXISTS resume_views (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  employer_id TEXT NOT NULL,
  user_id     TEXT NOT NULL,
  fee_cents   INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS clips (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    TEXT NOT NULL,
  room_id    INTEGER,
  title      TEXT NOT NULL,
  file       TEXT NOT NULL,
  mime       TEXT NOT NULL,
  bytes      INTEGER NOT NULL,
  seconds    INTEGER NOT NULL DEFAULT 0,
  date       TEXT NOT NULL,
  views      INTEGER NOT NULL DEFAULT 0,
  public     INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS reports (
  key        TEXT PRIMARY KEY,
  data       TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
`;

function open(file) {
  const target = file || process.env.DB_PATH || path.join(__dirname, '..', 'data', 'legends-only.db');
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
  'ALTER TABLE users ADD COLUMN payout_balance_cents INTEGER NOT NULL DEFAULT 0',
  'ALTER TABLE users ADD COLUMN stripe_account_id TEXT',
  'ALTER TABLE users ADD COLUMN success_fee_optin INTEGER NOT NULL DEFAULT 1',
  'ALTER TABLE users ADD COLUMN public_profile INTEGER NOT NULL DEFAULT 1',
  'ALTER TABLE profiles ADD COLUMN gender TEXT',
  'ALTER TABLE profiles ADD COLUMN safety_contact TEXT',
  'ALTER TABLE profiles ADD COLUMN final_call_sent TEXT',
  'ALTER TABLE tasks ADD COLUMN category TEXT',
  'ALTER TABLE daily_scores ADD COLUMN category TEXT',
  'ALTER TABLE daily_scores ADD COLUMN lesson_points INTEGER NOT NULL DEFAULT 0',
  'ALTER TABLE tasks ADD COLUMN difficulty INTEGER NOT NULL DEFAULT 5',
  'ALTER TABLE tasks ADD COLUMN points INTEGER NOT NULL DEFAULT 0',
  'ALTER TABLE tasks ADD COLUMN graded INTEGER NOT NULL DEFAULT 0',
  'ALTER TABLE tasks ADD COLUMN gig_url TEXT',
  'ALTER TABLE daily_scores ADD COLUMN idle_streak INTEGER NOT NULL DEFAULT 0',
  'ALTER TABLE daily_scores ADD COLUMN penalty INTEGER NOT NULL DEFAULT 0',
  'ALTER TABLE daily_scores ADD COLUMN task_points INTEGER NOT NULL DEFAULT 0',
  "ALTER TABLE profiles ADD COLUMN avatar_style TEXT NOT NULL DEFAULT 'initials'",
  'ALTER TABLE profiles ADD COLUMN bio TEXT',
  'ALTER TABLE users ADD COLUMN last_seen INTEGER',
  "ALTER TABLE tasks ADD COLUMN approval TEXT NOT NULL DEFAULT 'none'",
  'ALTER TABLE tasks ADD COLUMN approval_reason TEXT',
  'ALTER TABLE tasks ADD COLUMN proof_sha TEXT',
  'ALTER TABLE users ADD COLUMN phone TEXT',
  'ALTER TABLE users ADD COLUMN phone_verified_at INTEGER',
  'ALTER TABLE users ADD COLUMN trust INTEGER NOT NULL DEFAULT 0',
  'ALTER TABLE users ADD COLUMN banned_at INTEGER',
  "ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'player'",
  'ALTER TABLE plans ADD COLUMN first_day INTEGER NOT NULL DEFAULT 0',
  'ALTER TABLE tasks ADD COLUMN posting_id INTEGER',
  'ALTER TABLE live_rooms ADD COLUMN kind TEXT NOT NULL DEFAULT \'live\'',
  'ALTER TABLE live_rooms ADD COLUMN squad_id INTEGER',
];
function migrate(db) {
  for (const sql of MIGRATIONS) { try { db.exec(sql); } catch (_) { /* already applied */ } }
}

module.exports = { open, SCHEMA };
