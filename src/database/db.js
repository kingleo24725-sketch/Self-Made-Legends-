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

      // ── Monetization tables ───────────────────────────────────────────────

      // SML Credits balance (one row per user)
      `CREATE TABLE IF NOT EXISTS sml_credits (
        user_id    TEXT PRIMARY KEY,
        balance    INTEGER DEFAULT 0,
        updated_at INTEGER
      )`,

      // Credit transaction history
      `CREATE TABLE IF NOT EXISTS credit_transactions (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id     TEXT NOT NULL,
        amount      INTEGER NOT NULL,
        type        TEXT NOT NULL,
        description TEXT,
        created_at  INTEGER
      )`,

      // Season Pass per user
      `CREATE TABLE IF NOT EXISTS season_passes (
        user_id       TEXT PRIMARY KEY,
        stripe_sub_id TEXT,
        season_id     TEXT DEFAULT '',
        active        INTEGER DEFAULT 0,
        activated_at  INTEGER
      )`,

      // Premium Coach Pro subscription
      `CREATE TABLE IF NOT EXISTS premium_coach_subs (
        user_id       TEXT PRIMARY KEY,
        stripe_sub_id TEXT,
        active        INTEGER DEFAULT 0,
        activated_at  INTEGER
      )`,

      // Paid tournament entries
      `CREATE TABLE IF NOT EXISTS tournament_entries (
        id             INTEGER PRIMARY KEY AUTOINCREMENT,
        tournament_id  TEXT NOT NULL,
        user_id        TEXT NOT NULL,
        stripe_session TEXT,
        paid           INTEGER DEFAULT 0,
        created_at     INTEGER,
        UNIQUE(tournament_id, user_id)
      )`,

      // Tournament prize pool tracking (80% of $5 entry = $4 to pool)
      `CREATE TABLE IF NOT EXISTS tournament_prize_pools (
        tournament_id TEXT PRIMARY KEY,
        entry_count   INTEGER DEFAULT 0,
        total_cents   INTEGER DEFAULT 0,
        distributed   INTEGER DEFAULT 0,
        updated_at    INTEGER
      )`,

      // Legend Status — seasonal champion (NOT purchasable)
      `CREATE TABLE IF NOT EXISTS legend_status (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id     TEXT NOT NULL,
        full_name   TEXT,
        season_id   TEXT,
        season_name TEXT,
        awarded_at  INTEGER,
        expires_at  INTEGER,
        active      INTEGER DEFAULT 1
      )`,

      // ── Manual Trading tables ─────────────────────────────────────────────

      // Per-user open positions
      `CREATE TABLE IF NOT EXISTS holdings (
        id        INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id   TEXT NOT NULL,
        symbol    TEXT NOT NULL,
        quantity  REAL NOT NULL DEFAULT 0,
        avg_price REAL NOT NULL DEFAULT 0,
        UNIQUE(user_id, symbol)
      )`,

      // Full trade log (persisted across restarts)
      `CREATE TABLE IF NOT EXISTS trades (
        id        INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id   TEXT NOT NULL,
        symbol    TEXT NOT NULL,
        type      TEXT NOT NULL,
        quantity  REAL NOT NULL,
        price     REAL NOT NULL,
        source    TEXT DEFAULT 'manual',
        timestamp INTEGER NOT NULL
      )`,

      // Per-user virtual cash + starting capital
      `CREATE TABLE IF NOT EXISTS user_portfolios (
        user_id        TEXT PRIMARY KEY,
        cash_balance   REAL NOT NULL DEFAULT 1000,
        total_invested REAL NOT NULL DEFAULT 1000,
        updated_at     INTEGER
      )`,

      // Social share claim tracking (once per 24h for broke-player recovery)
      `CREATE TABLE IF NOT EXISTS social_claims (
        user_id    TEXT PRIMARY KEY,
        claimed_at INTEGER NOT NULL
      )`,

      // ── Underworld: Heist System ──────────────────────────────────────────

      // Heist attempts (active + historical)
      `CREATE TABLE IF NOT EXISTS heist_attempts (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        robber_id     TEXT NOT NULL,
        team_id       TEXT,
        target_id     TEXT NOT NULL,
        heist_type    TEXT NOT NULL,
        amount_stolen REAL DEFAULT 0,
        status        TEXT DEFAULT 'pending',
        charges       INTEGER DEFAULT 0,
        caught        INTEGER DEFAULT 0,
        created_at    INTEGER NOT NULL,
        expires_at    INTEGER,
        resolved_at   INTEGER
      )`,

      // Players currently in jail
      `CREATE TABLE IF NOT EXISTS jail_status (
        user_id     TEXT PRIMARY KEY,
        heist_id    INTEGER,
        victim_id   TEXT,
        amount_owed REAL DEFAULT 0,
        released    INTEGER DEFAULT 0,
        jailed_at   INTEGER NOT NULL,
        released_at INTEGER
      )`,

      // Persisted heist notifications (survives offline/reload)
      `CREATE TABLE IF NOT EXISTS heist_notifications (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id    TEXT NOT NULL,
        type       TEXT NOT NULL,
        data       TEXT NOT NULL,
        read       INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL
      )`,

      // ── Underworld: PvP Challenge System ─────────────────────────────────

      // PvP challenges between players
      `CREATE TABLE IF NOT EXISTS challenges (
        id             INTEGER PRIMARY KEY AUTOINCREMENT,
        challenger_id  TEXT NOT NULL,
        opponent_id    TEXT NOT NULL,
        type           TEXT NOT NULL,
        duration_ms    INTEGER NOT NULL,
        status         TEXT DEFAULT 'pending',
        start_value_c  REAL,
        start_value_o  REAL,
        winner_id      TEXT,
        prize_amount   REAL,
        created_at     INTEGER NOT NULL,
        accepted_at    INTEGER,
        ends_at        INTEGER,
        resolved_at    INTEGER
      )`,

      // Persisted challenge notifications
      `CREATE TABLE IF NOT EXISTS challenge_notifications (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id    TEXT NOT NULL,
        type       TEXT NOT NULL,
        data       TEXT NOT NULL,
        read       INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL
      )`,

      // ── Armory: Weapons ───────────────────────────────────────────────────
      `CREATE TABLE IF NOT EXISTS player_weapons (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id      TEXT NOT NULL,
        weapon_key   TEXT NOT NULL,
        purchased_at INTEGER,
        UNIQUE(user_id, weapon_key)
      )`,

      // ── Armory: Guard Dogs ────────────────────────────────────────────────
      `CREATE TABLE IF NOT EXISTS player_guard_dogs (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id      TEXT NOT NULL,
        dog_key      TEXT NOT NULL,
        purchased_at INTEGER,
        UNIQUE(user_id, dog_key)
      )`,

      // ── Armory: Defense Shields (one active shield per player; deleted when durability hits 0)
      `CREATE TABLE IF NOT EXISTS player_shields (
        user_id      TEXT PRIMARY KEY,
        shield_key   TEXT NOT NULL,
        durability   INTEGER NOT NULL,
        purchased_at INTEGER
      )`,

      // ── Player-to-Player Transfers ────────────────────────────────────────
      `CREATE TABLE IF NOT EXISTS paper_money_gifts (
        id             INTEGER PRIMARY KEY AUTOINCREMENT,
        sender_id      TEXT NOT NULL,
        recipient_id   TEXT NOT NULL,
        amount         REAL NOT NULL,
        gift_type      TEXT DEFAULT 'paper',
        stripe_session TEXT,
        created_at     INTEGER NOT NULL
      )`,

      // Daily perk streak (free paper money rewards for logging in daily)
      `CREATE TABLE IF NOT EXISTS daily_perks (
        user_id      TEXT PRIMARY KEY,
        streak       INTEGER DEFAULT 0,
        last_claim   INTEGER,
        total_earned REAL DEFAULT 0
      )`,

      // ── Spin the Wheel ────────────────────────────────────────────────────────
      `CREATE TABLE IF NOT EXISTS spin_claims (
        user_id     TEXT PRIMARY KEY,
        last_spin   INTEGER,
        extra_spins INTEGER DEFAULT 0
      )`,

      // ── Bounty System ─────────────────────────────────────────────────────────
      `CREATE TABLE IF NOT EXISTS bounties (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        placer_id    TEXT NOT NULL,
        target_id    TEXT NOT NULL,
        amount       REAL NOT NULL,
        active       INTEGER DEFAULT 1,
        collected_by TEXT,
        resolved_at  INTEGER,
        created_at   INTEGER NOT NULL
      )`,

      // ── Witness Protection ────────────────────────────────────────────────────
      `CREATE TABLE IF NOT EXISTS witness_protection (
        user_id      TEXT PRIMARY KEY,
        active_until INTEGER NOT NULL,
        activated_at INTEGER NOT NULL
      )`,

      // ── Getaway Vehicles ──────────────────────────────────────────────────────
      `CREATE TABLE IF NOT EXISTS player_getaways (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id      TEXT NOT NULL,
        vehicle_key  TEXT NOT NULL,
        purchased_at INTEGER,
        UNIQUE(user_id, vehicle_key)
      )`,

      // ── Heist Insurance ───────────────────────────────────────────────────────
      `CREATE TABLE IF NOT EXISTS heist_insurance (
        user_id      TEXT PRIMARY KEY,
        active_until INTEGER NOT NULL,
        coverage_pct REAL NOT NULL DEFAULT 0.5,
        activated_at INTEGER NOT NULL
      )`,

      // ── Price Alerts ──────────────────────────────────────────────────────────
      `CREATE TABLE IF NOT EXISTS price_alerts (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id      TEXT NOT NULL,
        symbol       TEXT NOT NULL,
        target_price REAL NOT NULL,
        direction    TEXT NOT NULL,
        triggered    INTEGER DEFAULT 0,
        created_at   INTEGER NOT NULL,
        UNIQUE(user_id, symbol)
      )`,

      // ── Community Challenge ───────────────────────────────────────────────────
      `CREATE TABLE IF NOT EXISTS community_challenges (
        week_key     TEXT PRIMARY KEY,
        type         TEXT NOT NULL,
        target       INTEGER NOT NULL,
        progress     INTEGER DEFAULT 0,
        reward_paper REAL DEFAULT 500,
        completed    INTEGER DEFAULT 0,
        completed_at INTEGER
      )`,

      `CREATE TABLE IF NOT EXISTS challenge_participants (
        week_key TEXT NOT NULL,
        user_id  TEXT NOT NULL,
        contrib  INTEGER DEFAULT 0,
        rewarded INTEGER DEFAULT 0,
        PRIMARY KEY (week_key, user_id)
      )`,

      // ── NPC Boss Heist ────────────────────────────────────────────────────────
      `CREATE TABLE IF NOT EXISTS boss_heist (
        week_key     TEXT PRIMARY KEY,
        hp_remaining INTEGER NOT NULL DEFAULT 5000,
        max_hp       INTEGER NOT NULL DEFAULT 5000,
        loot_pool    REAL NOT NULL DEFAULT 50000,
        killed       INTEGER DEFAULT 0,
        killed_at    INTEGER
      )`,

      `CREATE TABLE IF NOT EXISTS boss_heist_attacks (
        week_key    TEXT NOT NULL,
        user_id     TEXT NOT NULL,
        total_dmg   INTEGER DEFAULT 0,
        last_attack INTEGER,
        rewarded    INTEGER DEFAULT 0,
        PRIMARY KEY (week_key, user_id)
      )`,

      // ── Feed Reactions ────────────────────────────────────────────────────────
      `CREATE TABLE IF NOT EXISTS feed_reactions (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        post_id    TEXT NOT NULL,
        user_id    TEXT NOT NULL,
        emoji      TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        UNIQUE(post_id, user_id)
      )`,

      // ── Stock Tips Marketplace ────────────────────────────────────────────────
      `CREATE TABLE IF NOT EXISTS stock_tips (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        author_id       TEXT NOT NULL,
        symbol          TEXT NOT NULL,
        direction       TEXT NOT NULL,
        note            TEXT,
        credits_cost    INTEGER NOT NULL DEFAULT 50,
        price_at_create REAL,
        active          INTEGER DEFAULT 1,
        created_at      INTEGER NOT NULL
      )`,

      `CREATE TABLE IF NOT EXISTS stock_tip_purchases (
        tip_id       INTEGER NOT NULL,
        user_id      TEXT NOT NULL,
        purchased_at INTEGER NOT NULL,
        PRIMARY KEY (tip_id, user_id)
      )`,

      // ── Virtual Real Estate ───────────────────────────────────────────────────
      `CREATE TABLE IF NOT EXISTS player_real_estate (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id      TEXT NOT NULL,
        property_key TEXT NOT NULL,
        purchased_at INTEGER,
        last_collect INTEGER,
        UNIQUE(user_id, property_key)
      )`,

      // ── Battle Pass ───────────────────────────────────────────────────────────
      `CREATE TABLE IF NOT EXISTS battle_pass (
        user_id       TEXT PRIMARY KEY,
        season_id     TEXT NOT NULL DEFAULT 'S1',
        pass_type     TEXT NOT NULL DEFAULT 'free',
        claimed_tiers TEXT NOT NULL DEFAULT '[]',
        activated_at  INTEGER
      )`,

      // ── Creator Membership (DB-backed fulfillment) ────────────────────────────
      `CREATE TABLE IF NOT EXISTS creator_memberships (
        user_id      TEXT PRIMARY KEY,
        activated_at INTEGER NOT NULL,
        active       INTEGER DEFAULT 1
      )`,

      // ── Elite Membership (top-tier VIP at $24.99/mo) ──────────────────────────
      `CREATE TABLE IF NOT EXISTS elite_memberships (
        user_id      TEXT PRIMARY KEY,
        activated_at INTEGER NOT NULL,
        active       INTEGER DEFAULT 1
      )`,

      // ── Persistent Referral Links (replaces in-memory Map) ───────────────────
      `CREATE TABLE IF NOT EXISTS referral_links (
        user_id    TEXT PRIMARY KEY,
        code       TEXT UNIQUE NOT NULL,
        clicks     INTEGER DEFAULT 0,
        signups    INTEGER DEFAULT 0,
        converted  INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL
      )`,

      `CREATE TABLE IF NOT EXISTS referral_events (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        code         TEXT NOT NULL,
        referrer_id  TEXT NOT NULL,
        referee_id   TEXT,
        event_type   TEXT NOT NULL,
        bonus_paid   REAL DEFAULT 0,
        created_at   INTEGER NOT NULL
      )`,

      // ── XP Booster (consumable 2× XP for 24h, costs 500 credits) ─────────────
      `CREATE TABLE IF NOT EXISTS xp_boosts (
        user_id      TEXT PRIMARY KEY,
        active_until INTEGER NOT NULL,
        multiplier   REAL NOT NULL DEFAULT 2.0,
        activated_at INTEGER NOT NULL
      )`,

      // ── Player Cosmetics (avatar frames + nameplate colors) ───────────────────
      `CREATE TABLE IF NOT EXISTS player_cosmetics (
        user_id         TEXT PRIMARY KEY,
        frame_style     TEXT DEFAULT 'default',
        nameplate_color TEXT DEFAULT 'default',
        updated_at      INTEGER
      )`,

      // ── Persistent Notification Inbox ─────────────────────────────────────────
      `CREATE TABLE IF NOT EXISTS notifications (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id    TEXT NOT NULL,
        type       TEXT NOT NULL,
        title      TEXT NOT NULL,
        body       TEXT NOT NULL,
        read       INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL
      )`,

      // ── Limit Orders ──────────────────────────────────────────────────────────
      `CREATE TABLE IF NOT EXISTS limit_orders (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id     TEXT NOT NULL,
        symbol      TEXT NOT NULL,
        order_type  TEXT NOT NULL,
        quantity    REAL NOT NULL,
        limit_price REAL NOT NULL,
        status      TEXT DEFAULT 'pending',
        created_at  INTEGER NOT NULL,
        filled_at   INTEGER
      )`,

      `CREATE TABLE IF NOT EXISTS creator_followers (
        creator_id  TEXT NOT NULL,
        follower_id TEXT NOT NULL,
        created_at  INTEGER NOT NULL,
        PRIMARY KEY (creator_id, follower_id)
      )`,

      `CREATE TABLE IF NOT EXISTS creator_commissions (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        creator_id      TEXT NOT NULL,
        source_user_id  TEXT NOT NULL,
        purchase_type   TEXT NOT NULL,
        credits_awarded INTEGER NOT NULL,
        created_at      INTEGER NOT NULL
      )`,
    ];
    for (const sql of stmts) await this.run(sql);
    // Add columns for existing deployments (no-op if already exists)
    try { await this.run('ALTER TABLE accounts ADD COLUMN is_bot INTEGER DEFAULT 0'); } catch (_) {}
    try { await this.run('ALTER TABLE heist_attempts ADD COLUMN charges INTEGER DEFAULT 0'); } catch (_) {}
    try { await this.run('ALTER TABLE accounts ADD COLUMN is_creator INTEGER DEFAULT 0'); } catch (_) {}
    try { await this.run('ALTER TABLE accounts ADD COLUMN is_elite INTEGER DEFAULT 0'); } catch (_) {}
  }
}

module.exports = new DB();
