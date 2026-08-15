'use strict';

const sqlite3 = require('sqlite3').verbose();
const path    = require('path');
const fs      = require('fs');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '../../data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const DB_PATH = path.join(DATA_DIR, 'sml.db');

class DB {
  constructor() { this._db = null; }

  // ── Promise wrappers ────────────────────────────────────────────────────
  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this._db.run(sql, params, function (err) {
        if (err) reject(err); else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  }
  get(sql, params = []) {
    return new Promise((resolve, reject) =>
      this._db.get(sql, params, (err, row) => err ? reject(err) : resolve(row))
    );
  }
  all(sql, params = []) {
    return new Promise((resolve, reject) =>
      this._db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows || []))
    );
  }

  // ── Init ─────────────────────────────────────────────────────────────────
  async init() {
    await new Promise((resolve, reject) => {
      this._db = new sqlite3.Database(DB_PATH, err => err ? reject(err) : resolve());
    });
    await this.run('PRAGMA journal_mode=WAL');
    await this.run('PRAGMA foreign_keys=ON');
    await this._createTables();
    console.log(`✅ SQLite database ready: ${DB_PATH}`);
  }

  async _createTables() {
    const stmts = [
      // Accounts
      `CREATE TABLE IF NOT EXISTS accounts (
        email         TEXT PRIMARY KEY,
        user_id       TEXT UNIQUE NOT NULL,
        full_name     TEXT,
        password_hash TEXT,
        api_key       TEXT,
        avatar        TEXT,
        avatar_name   TEXT,
        tagline       TEXT,
        gender        TEXT,
        tier          TEXT DEFAULT 'free',
        is_creator    INTEGER DEFAULT 0,
        status        TEXT DEFAULT 'active',
        wallets       TEXT DEFAULT '[]',
        balances      TEXT DEFAULT '{"usd":1,"crypto":{},"nft":{}}',
        settings      TEXT DEFAULT '{}',
        created_at    INTEGER
      )`,

      // User stats (badge system)
      `CREATE TABLE IF NOT EXISTS user_stats (
        user_id TEXT PRIMARY KEY,
        data    TEXT NOT NULL
      )`,

      // Earned badges
      `CREATE TABLE IF NOT EXISTS user_badges (
        user_id   TEXT NOT NULL,
        badge_id  TEXT NOT NULL,
        earned_at INTEGER,
        PRIMARY KEY (user_id, badge_id)
      )`,

      // XP totals
      `CREATE TABLE IF NOT EXISTS user_xp (
        user_id  TEXT PRIMARY KEY,
        total_xp INTEGER DEFAULT 0
      )`,

      // Daily mission progress (one row per user per day)
      `CREATE TABLE IF NOT EXISTS mission_progress (
        user_id TEXT NOT NULL,
        date    TEXT NOT NULL,
        data    TEXT NOT NULL,
        PRIMARY KEY (user_id, date)
      )`,

      // Training camp progress
      `CREATE TABLE IF NOT EXISTS training_progress (
        user_id           TEXT PRIMARY KEY,
        completed_lessons TEXT DEFAULT '[]',
        quiz_scores       TEXT DEFAULT '{}',
        graduated         INTEGER DEFAULT 0,
        started_at        INTEGER
      )`,

      // Teams
      `CREATE TABLE IF NOT EXISTS teams (
        id          TEXT PRIMARY KEY,
        name        TEXT UNIQUE NOT NULL,
        description TEXT,
        code        TEXT UNIQUE NOT NULL,
        captain_id  TEXT NOT NULL,
        created_at  INTEGER
      )`,

      // Team members
      `CREATE TABLE IF NOT EXISTS team_members (
        team_id   TEXT NOT NULL,
        user_id   TEXT NOT NULL,
        joined_at INTEGER,
        PRIMARY KEY (team_id, user_id)
      )`,

      // Leaderboard portfolio scores
      `CREATE TABLE IF NOT EXISTS leaderboard_scores (
        user_id     TEXT PRIMARY KEY,
        email       TEXT,
        gain_pct    REAL DEFAULT 0,
        score       REAL DEFAULT 0,
        gains       REAL DEFAULT 0,
        trades      INTEGER DEFAULT 0,
        win_rate    REAL DEFAULT 0,
        total_value REAL DEFAULT 0,
        updated_at  INTEGER
      )`,

      // Tournament (single active tournament stored as JSON)
      `CREATE TABLE IF NOT EXISTS tournament_state (
        key   TEXT PRIMARY KEY,
        value TEXT
      )`,

      // Hall of fame entries
      `CREATE TABLE IF NOT EXISTS hall_of_fame (
        season_id  TEXT PRIMARY KEY,
        data       TEXT NOT NULL,
        closed_at  INTEGER
      )`,

      // Coach feedback (thumbs up/down on responses)
      `CREATE TABLE IF NOT EXISTS coach_feedback (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id    TEXT NOT NULL,
        query      TEXT,
        answer     TEXT,
        thumb      INTEGER NOT NULL,
        created_at INTEGER
      )`,

      // Coach per-user context (topic frequency, ask count)
      `CREATE TABLE IF NOT EXISTS coach_user_context (
        user_id      TEXT PRIMARY KEY,
        topic_counts TEXT DEFAULT '{}',
        total_asks   INTEGER DEFAULT 0,
        updated_at   INTEGER
      )`,

      // Coach learning paths — personalized 3-step agentic plans
      `CREATE TABLE IF NOT EXISTS coach_learning_paths (
        user_id      TEXT PRIMARY KEY,
        steps        TEXT NOT NULL DEFAULT '[]',
        level        TEXT,
        generated_at INTEGER,
        completed    INTEGER DEFAULT 0
      )`,
    ];
    for (const sql of stmts) await this.run(sql);
  }
}

module.exports = new DB();
