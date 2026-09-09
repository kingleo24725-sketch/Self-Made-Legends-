'use strict';

// The engine: profiles, daily plans, task tracking, scoring, the world
// leaderboard, and the overnight scheduler. Everything persists in SQLite so a
// restart never loses a player's day.

const Crew = require('./agents');

const EARNINGS_CAP_CENTS = 100_000;     // $1,000/day counts toward score (self-reported, unverified)
const POINTS_PER_TASK = 100;
const POINTS_PER_HOUR = 50;
const POINTS_PER_DOLLAR = 1;
const FULL_DAY_BONUS = 250;
const STREAK_BONUS = 25;                // per consecutive day, capped
const STREAK_CAP = 10;
const PLAN_READY_HOUR = 4;              // the crew finishes the plan by 4am local time
const REGENERATIONS_PER_DAY = 1;

class Engine {
  /**
   * @param {import('better-sqlite3').Database} db
   * @param {object} opts { crew?, now?, onEvent?(userId|null, event, data) }
   */
  constructor(db, opts = {}) {
    this.db = db;
    this.crew = opts.crew || new Crew();
    this.now = opts.now || (() => Date.now());
    this.onEvent = opts.onEvent || (() => {});
    this._generating = new Set();
  }

  // ── Time helpers ─────────────────────────────────────────────────────────
  // tz_offset is minutes to ADD to UTC to get local time (negative of JS getTimezoneOffset()).
  localNow(profile) { return new Date(this.now() + (profile.tz_offset || 0) * 60_000); }
  localDateKey(profile) { return this.localNow(profile).toISOString().slice(0, 10); }
  localHour(profile) { return this.localNow(profile).getUTCHours(); }
  static shiftDate(dateKey, days) {
    const d = new Date(dateKey + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
  }

  // ── Inbox ────────────────────────────────────────────────────────────────
  notify(userId, kind, title, body) {
    this.db.prepare('INSERT INTO inbox (user_id, kind, title, body, created_at) VALUES (?, ?, ?, ?, ?)').run(userId, kind, title, body || '', this.now());
    this.onEvent(userId, 'inbox', { kind, title, body });
  }
  inbox(userId, limit = 20) {
    return this.db.prepare('SELECT * FROM inbox WHERE user_id = ? ORDER BY created_at DESC LIMIT ?').all(userId, limit)
      .map(r => ({ id: r.id, kind: r.kind, title: r.title, body: r.body, read: !!r.read, createdAt: r.created_at }));
  }
  markInboxRead(userId) { this.db.prepare('UPDATE inbox SET read = 1 WHERE user_id = ?').run(userId); }

  // ── Profiles ─────────────────────────────────────────────────────────────
  getProfile(userId) {
    const row = this.db.prepare('SELECT * FROM profiles WHERE user_id = ?').get(userId);
    return row ? this._rowToProfile(row) : null;
  }

  _rowToProfile(row) {
    const parse = (s, d) => { try { return s ? JSON.parse(s) : d; } catch (_) { return d; } };
    return {
      userId: row.user_id,
      location: row.location || '',
      resources: parse(row.resources, []),
      skills: parse(row.skills, []),
      goals: row.goals || '',
      comfort: row.comfort || '',
      targetHours: row.target_hours || 8,
      startHour: row.start_hour == null ? 8 : row.start_hour,
      tz_offset: row.tz_offset || 0,
      memory: parse(row.memory, { notes: [], favorites: [], avoid: [] }),
      active: !!row.active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  saveProfile(userId, input = {}) {
    const existing = this.getProfile(userId);
    const clean = (arr) => Array.isArray(arr) ? [...new Set(arr.map(s => String(s).trim().slice(0, 60)).filter(Boolean))].slice(0, 20) : [];
    const p = {
      location: String(input.location ?? existing?.location ?? '').slice(0, 120),
      resources: input.resources !== undefined ? clean(input.resources) : (existing?.resources || []),
      skills: input.skills !== undefined ? clean(input.skills) : (existing?.skills || []),
      goals: String(input.goals ?? existing?.goals ?? '').slice(0, 500),
      comfort: String(input.comfort ?? existing?.comfort ?? '').slice(0, 200),
      targetHours: Math.min(12, Math.max(2, Number(input.targetHours ?? existing?.targetHours ?? 8) || 8)),
      startHour: Math.min(23, Math.max(0, parseInt(input.startHour ?? existing?.startHour ?? 8, 10) || 0)),
      tz_offset: Math.min(840, Math.max(-720, parseInt(input.tzOffset ?? existing?.tz_offset ?? 0, 10) || 0)),
      memory: existing?.memory || { notes: [], favorites: [], avoid: [] },
      active: input.active === undefined ? (existing ? existing.active : true) : !!input.active,
    };
    const now = this.now();
    this.db.prepare(
      `INSERT INTO profiles (user_id, location, resources, skills, goals, comfort, target_hours, start_hour, tz_offset, memory, active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET location=excluded.location, resources=excluded.resources, skills=excluded.skills,
         goals=excluded.goals, comfort=excluded.comfort, target_hours=excluded.target_hours, start_hour=excluded.start_hour,
         tz_offset=excluded.tz_offset, active=excluded.active, updated_at=excluded.updated_at`
    ).run(userId, p.location, JSON.stringify(p.resources), JSON.stringify(p.skills), p.goals, p.comfort, p.targetHours, p.startHour,
      p.tz_offset, JSON.stringify(p.memory), p.active ? 1 : 0, existing?.createdAt || now, now);
    return this.getProfile(userId);
  }

  _saveMemory(userId, memory) {
    this.db.prepare('UPDATE profiles SET memory = ?, updated_at = ? WHERE user_id = ?').run(JSON.stringify(memory), this.now(), userId);
  }

  // ── Plans ────────────────────────────────────────────────────────────────
  getPlan(userId, dateKey) {
    const row = this.db.prepare('SELECT * FROM plans WHERE user_id = ? AND date = ?').get(userId, dateKey);
    return row ? this._hydrate(row) : null;
  }

  _hydrate(row) {
    const plan = JSON.parse(row.plan_json);
    const tasks = this.db.prepare('SELECT * FROM tasks WHERE plan_id = ? ORDER BY order_num ASC').all(row.id);
    plan.id = row.id;
    plan.status = row.status;
    plan.generatedAt = row.generated_at;
    plan.closedAt = row.closed_at;
    plan.regenerations = row.regenerations;
    plan.tasks = plan.tasks.map((t, i) => {
      const s = tasks[i] || {};
      return { ...t, taskId: s.id, status: s.status || 'pending', earningsCents: s.earnings_cents || 0, note: s.note || '', completedAt: s.completed_at || null };
    });
    plan.progress = this._progress(plan);
    return plan;
  }

  _progress(plan) {
    const done = plan.tasks.filter(t => t.status === 'done');
    const hoursDone = done.reduce((s, t) => s + (t.hours || 0), 0);
    const earningsCents = plan.tasks.reduce((s, t) => s + (t.earningsCents || 0), 0);
    return {
      tasksDone: done.length,
      tasksTotal: plan.tasks.length,
      hoursDone: Math.round(hoursDone * 100) / 100,
      hoursTotal: Math.round(plan.tasks.reduce((s, t) => s + (t.hours || 0), 0) * 100) / 100,
      earningsCents,
      score: this.scoreFor({ tasksDone: done.length, tasksTotal: plan.tasks.length, hoursDone, earningsCents, streak: plan.streak || 0 }),
    };
  }

  recentPlayIds(userId, days = 3) {
    const rows = this.db.prepare(
      `SELECT DISTINCT t.play_id FROM tasks t JOIN plans p ON p.id = t.plan_id
       WHERE p.user_id = ? AND p.generated_at >= ? AND t.play_id IS NOT NULL`
    ).all(userId, this.now() - days * 86_400_000);
    return rows.map(r => r.play_id);
  }

  /** Generate (or return) the plan for a player's local date. */
  async ensurePlan(userId, dateKey, { force = false } = {}) {
    const profile = this.getProfile(userId);
    if (!profile) throw new Error('Set up your profile first');
    dateKey = dateKey || this.localDateKey(profile);
    const existing = this.getPlan(userId, dateKey);
    if (existing && (!force || existing.status === 'closed')) return existing;
    if (this._generating.has(userId)) return existing; // another request is already building it
    this._generating.add(userId);
    try {
      const plan = await this.crew.buildPlan(profile, dateKey, { recentPlayIds: this.recentPlayIds(userId) });
      plan.streak = this._currentStreak(userId, dateKey);
      const now = this.now();
      const write = this.db.transaction(() => {
        let planId;
        if (existing) {
          this.db.prepare('DELETE FROM tasks WHERE plan_id = ?').run(existing.id);
          this.db.prepare('UPDATE plans SET plan_json = ?, generated_by = ?, generated_at = ?, regenerations = regenerations + 1 WHERE id = ?')
            .run(JSON.stringify(plan), plan.generatedBy, now, existing.id);
          planId = existing.id;
        } else {
          planId = this.db.prepare('INSERT INTO plans (user_id, date, status, plan_json, generated_by, generated_at) VALUES (?, ?, ?, ?, ?, ?)')
            .run(userId, dateKey, 'open', JSON.stringify(plan), plan.generatedBy, now).lastInsertRowid;
        }
        const ins = this.db.prepare('INSERT INTO tasks (plan_id, order_num, play_id, title, hours, status, earnings_cents) VALUES (?, ?, ?, ?, ?, ?, 0)');
        for (const t of plan.tasks) ins.run(planId, t.order, t.playId || null, t.title, t.hours, 'pending');
      });
      write();
      const hydrated = this.getPlan(userId, dateKey);
      this._upsertScore(userId, dateKey, hydrated);
      if (!existing) this.notify(userId, 'plan', 'Your crew finished today\'s plan', plan.headline);
      this.onEvent(userId, 'plan_ready', { date: dateKey, headline: plan.headline });
      return hydrated;
    } finally {
      this._generating.delete(userId);
    }
  }

  // ── Task updates ─────────────────────────────────────────────────────────
  updateTask(userId, taskId, { status, earningsDollars, note } = {}) {
    const row = this.db.prepare(
      'SELECT t.*, p.user_id, p.date, p.status AS plan_status FROM tasks t JOIN plans p ON p.id = t.plan_id WHERE t.id = ?'
    ).get(taskId);
    if (!row || row.user_id !== userId) throw new Error('Task not found');
    if (row.plan_status === 'closed') throw new Error('That day is already closed');
    const next = {
      status: ['pending', 'done', 'skipped'].includes(status) ? status : row.status,
      earnings_cents: earningsDollars === undefined ? row.earnings_cents
        : Math.max(0, Math.min(10_000_000, Math.round(Number(earningsDollars) * 100) || 0)),
      note: note === undefined ? row.note : String(note).slice(0, 280),
    };
    const completedAt = next.status === 'done' ? (row.completed_at || this.now()) : null;
    this.db.prepare('UPDATE tasks SET status = ?, earnings_cents = ?, note = ?, completed_at = ? WHERE id = ?')
      .run(next.status, next.earnings_cents, next.note, completedAt, taskId);
    const plan = this.getPlan(userId, row.date);
    this._upsertScore(userId, row.date, plan);
    this.onEvent(null, 'leaderboard', { date: row.date });
    return plan;
  }

  // ── Scoring ──────────────────────────────────────────────────────────────
  scoreFor({ tasksDone = 0, tasksTotal = 0, hoursDone = 0, earningsCents = 0, streak = 0 }) {
    let score = tasksDone * POINTS_PER_TASK + Math.round(hoursDone * POINTS_PER_HOUR);
    score += Math.round(Math.min(earningsCents, EARNINGS_CAP_CENTS) / 100) * POINTS_PER_DOLLAR;
    if (tasksTotal > 0 && tasksDone === tasksTotal) score += FULL_DAY_BONUS;
    score += Math.min(streak, STREAK_CAP) * STREAK_BONUS;
    return score;
  }

  _currentStreak(userId, dateKey) {
    // Consecutive closed days before dateKey where the player finished at least one play.
    let streak = 0;
    let cursor = Engine.shiftDate(dateKey, -1);
    const q = this.db.prepare('SELECT tasks_done FROM daily_scores WHERE user_id = ? AND date = ? AND closed = 1');
    for (let i = 0; i < 365; i++) {
      const row = q.get(userId, cursor);
      if (!row || !row.tasks_done) break;
      streak++;
      cursor = Engine.shiftDate(cursor, -1);
    }
    return streak;
  }

  _upsertScore(userId, dateKey, plan) {
    const p = plan.progress;
    this.db.prepare(
      `INSERT INTO daily_scores (user_id, date, score, earnings_cents, tasks_done, tasks_total, hours_done, streak, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id, date) DO UPDATE SET score=excluded.score, earnings_cents=excluded.earnings_cents, tasks_done=excluded.tasks_done,
         tasks_total=excluded.tasks_total, hours_done=excluded.hours_done, streak=excluded.streak, updated_at=excluded.updated_at`
    ).run(userId, dateKey, p.score, p.earningsCents, p.tasksDone, p.tasksTotal, p.hoursDone, plan.streak || 0, this.now());
  }

  // ── Day close ────────────────────────────────────────────────────────────
  async closeDay(userId, dateKey) {
    const row = this.db.prepare('SELECT * FROM plans WHERE user_id = ? AND date = ? AND status = ?').get(userId, dateKey, 'open');
    if (!row) return null;
    const profile = this.getProfile(userId);
    const plan = this._hydrate(row);
    const p = plan.progress;
    const finished = p.tasksTotal > 0 && p.tasksDone === p.tasksTotal;
    const streak = p.tasksDone > 0 ? (plan.streak || 0) + 1 : 0;

    this.db.prepare('UPDATE plans SET status = ?, closed_at = ? WHERE id = ?').run('closed', this.now(), row.id);
    this.db.prepare('UPDATE daily_scores SET streak = ?, closed = 1 WHERE user_id = ? AND date = ?').run(streak, userId, dateKey);

    // The Coach learns from the day.
    const debrief = await this.crew.debrief(profile, plan, { tasks: plan.tasks, earningsCents: p.earningsCents, hoursWorked: p.hoursDone });
    const memory = profile.memory || { notes: [], favorites: [], avoid: [] };
    const merge = (a, b, cap) => [...new Set([...(b || []), ...(a || [])])].slice(0, cap);
    const updated = {
      notes: merge(memory.notes, debrief.notes, 12),
      favorites: merge(memory.favorites, debrief.favorites, 8),
      avoid: (debrief.avoid || []).slice(0, 6),   // short-lived so plays rotate back in
      tomorrowHint: debrief.tomorrowHint || '',
      lastSummary: debrief.summary || '',
    };
    this._saveMemory(userId, updated);
    this.db.prepare('INSERT INTO debriefs (user_id, date, summary, data, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(userId, dateKey, debrief.summary || '', JSON.stringify(debrief), this.now());
    this.notify(userId, 'close', finished ? 'Full day. Every play done.' : 'Day closed', debrief.summary || `Score ${p.score}. Tomorrow's plan is on the way.`);
    return { plan, debrief, streak, finished };
  }

  /** Crown the podium for a date once every player on that date has closed. Idempotent. */
  crownDay(dateKey) {
    if (this.db.prepare('SELECT 1 FROM champions WHERE date = ?').get(dateKey)) return null;
    if (this.db.prepare('SELECT 1 FROM plans WHERE date = ? AND status = ?').get(dateKey, 'open')) return null;
    const top = this.db.prepare('SELECT user_id, score FROM daily_scores WHERE date = ? AND score > 0 ORDER BY score DESC, earnings_cents DESC, hours_done DESC LIMIT 3').all(dateKey);
    if (!top.length) return null;
    const tx = this.db.transaction(() => {
      top.forEach((t, i) => {
        this.db.prepare('INSERT OR IGNORE INTO champions (date, rank, user_id, score, created_at) VALUES (?, ?, ?, ?, ?)').run(dateKey, i + 1, t.user_id, t.score, this.now());
        this.db.prepare('UPDATE daily_scores SET rank = ? WHERE user_id = ? AND date = ?').run(i + 1, t.user_id, dateKey);
      });
    });
    tx();
    top.forEach((t, i) => this.notify(t.user_id, 'podium', i === 0 ? 'World champion of the day' : `World #${i + 1} today`, `You placed #${i + 1} in the world on ${dateKey}.`));
    this.onEvent(null, 'champion', { date: dateKey, podium: top.map((t, i) => ({ userId: t.user_id, rank: i + 1, score: t.score })) });
    return top;
  }

  // ── Leaderboards ─────────────────────────────────────────────────────────
  leaderboard(dateKey, limit = 100) {
    return this.db.prepare(
      `SELECT s.*, u.display_name, p.location FROM daily_scores s
       LEFT JOIN users u ON u.id = s.user_id LEFT JOIN profiles p ON p.user_id = s.user_id
       WHERE s.date = ? ORDER BY s.score DESC, s.earnings_cents DESC, s.hours_done DESC LIMIT ?`
    ).all(dateKey, limit).map((r, i) => ({
      rank: i + 1, userId: r.user_id, displayName: r.display_name || 'Legend', location: r.location || '',
      score: r.score, earningsCents: r.earnings_cents, earningsVerified: false,
      tasksDone: r.tasks_done, tasksTotal: r.tasks_total, hoursDone: r.hours_done, streak: r.streak, closed: !!r.closed,
    }));
  }

  allTimeLeaderboard(limit = 50) {
    return this.db.prepare(
      `SELECT s.user_id, SUM(s.score) AS total_score, SUM(s.earnings_cents) AS total_earnings, COUNT(*) AS days,
              MAX(s.streak) AS best_streak, SUM(CASE WHEN s.rank = 1 THEN 1 ELSE 0 END) AS wins, u.display_name
       FROM daily_scores s LEFT JOIN users u ON u.id = s.user_id GROUP BY s.user_id ORDER BY total_score DESC LIMIT ?`
    ).all(limit).map((r, i) => ({
      rank: i + 1, userId: r.user_id, displayName: r.display_name || 'Legend',
      totalScore: r.total_score, totalEarningsCents: r.total_earnings, days: r.days, bestStreak: r.best_streak, wins: r.wins,
    }));
  }

  podium(dateKey) {
    return this.db.prepare('SELECT c.rank, c.user_id, c.score, u.display_name FROM champions c LEFT JOIN users u ON u.id = c.user_id WHERE c.date = ? ORDER BY c.rank').all(dateKey)
      .map(p => ({ rank: p.rank, userId: p.user_id, score: p.score, displayName: p.display_name || 'Legend' }));
  }

  myRank(userId, dateKey) {
    const me = this.db.prepare('SELECT score FROM daily_scores WHERE user_id = ? AND date = ?').get(userId, dateKey);
    if (!me) return null;
    const ahead = this.db.prepare('SELECT COUNT(*) AS c FROM daily_scores WHERE date = ? AND score > ?').get(dateKey, me.score).c;
    const total = this.db.prepare('SELECT COUNT(*) AS c FROM daily_scores WHERE date = ?').get(dateKey).c;
    return { rank: ahead + 1, of: total, score: me.score };
  }

  history(userId, limit = 30) {
    const rows = this.db.prepare('SELECT * FROM daily_scores WHERE user_id = ? ORDER BY date DESC LIMIT ?').all(userId, limit);
    const byDate = new Map(this.db.prepare('SELECT date, summary FROM debriefs WHERE user_id = ?').all(userId).map(d => [d.date, d.summary]));
    return rows.map(r => ({ date: r.date, score: r.score, earningsCents: r.earnings_cents, tasksDone: r.tasks_done, tasksTotal: r.tasks_total, hoursDone: r.hours_done, streak: r.streak, rank: r.rank, closed: !!r.closed, summary: byDate.get(r.date) || '' }));
  }

  stats(userId) {
    const r = this.db.prepare('SELECT COUNT(*) AS days, COALESCE(SUM(earnings_cents),0) AS earned, COALESCE(SUM(score),0) AS score, COALESCE(MAX(streak),0) AS best_streak, SUM(CASE WHEN rank = 1 THEN 1 ELSE 0 END) AS wins FROM daily_scores WHERE user_id = ? AND closed = 1').get(userId);
    return { days: r.days, earnedCents: r.earned, totalScore: r.score, bestStreak: r.best_streak, wins: r.wins || 0 };
  }

  // ── Scheduler ────────────────────────────────────────────────────────────
  /** Runs every few minutes: closes finished days, then makes sure today's plan is waiting by wake-up. */
  async tick() {
    const rows = this.db.prepare('SELECT * FROM profiles WHERE active = 1').all();
    const touched = new Set();
    for (const row of rows) {
      const profile = this._rowToProfile(row);
      const today = this.localDateKey(profile);
      try {
        const stale = this.db.prepare('SELECT date FROM plans WHERE user_id = ? AND status = ? AND date < ?').all(profile.userId, 'open', today);
        for (const s of stale) { await this.closeDay(profile.userId, s.date); touched.add(s.date); }
        if (this.localHour(profile) >= PLAN_READY_HOUR && !this.getPlan(profile.userId, today)) await this.ensurePlan(profile.userId, today);
      } catch (e) { console.error('[tick]', profile.userId, e.message); }
    }
    for (const d of touched) { try { this.crownDay(d); } catch (e) { console.error('[crown]', d, e.message); } }
    const pending = this.db.prepare(
      `SELECT DISTINCT s.date FROM daily_scores s LEFT JOIN champions c ON c.date = s.date
       WHERE c.date IS NULL AND s.date < ? AND NOT EXISTS (SELECT 1 FROM plans p WHERE p.date = s.date AND p.status = 'open')`
    ).all(new Date(this.now()).toISOString().slice(0, 10));
    for (const p of pending) { try { this.crownDay(p.date); } catch (e) { console.error('[crown]', p.date, e.message); } }
  }
}

module.exports = Engine;
module.exports.constants = { EARNINGS_CAP_CENTS, POINTS_PER_TASK, POINTS_PER_HOUR, POINTS_PER_DOLLAR, FULL_DAY_BONUS, STREAK_BONUS, STREAK_CAP, PLAN_READY_HOUR, REGENERATIONS_PER_DAY };
