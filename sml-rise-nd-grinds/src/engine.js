'use strict';

// The engine: profiles, daily plans, task tracking, verified earnings, scoring,
// leagues, world/local leaderboards, head-to-head challenges, the nightly close,
// weekly recaps, and the overnight scheduler. Everything persists in SQLite so
// a restart never loses a player's day.

const crypto = require('crypto');
const Crew = require('./agents');
const Learning = require('./learning');
const money = (c) => '$' + (Number(c || 0) / 100).toLocaleString('en-US', { maximumFractionDigits: 0 });
const { layoutOnClock, clock, CATEGORIES } = require('./playbook');

// Scoring v2: the bot grades every play 1-10 on how hard it was. Points scale
// with difficulty and hours, verified dollars count double self-reported ones,
// a full day and a streak pay bonuses, and a day tops out at 100,000. A day
// with nothing done costs points, and it costs more each day in a row.
const POINTS_PER_DIFF_HOUR = 250;       // difficulty x hours x this: a 10/10, 4-hour job is 10,000
const VERIFIED_POINTS_PER_DOLLAR = 10;
const UNVERIFIED_POINTS_PER_DOLLAR = 5;
const EARNINGS_CAP_CENTS = 500_000;     // $5,000/day counts toward score
const FULL_DAY_BONUS = 5_000;
const STREAK_BONUS = 1_000;             // per consecutive day, capped
const STREAK_CAP = 10;
const DAILY_CAP = 100_000;
const IDLE_PENALTY = 1_000;             // per idle day in a row: -1,000, -2,000, -3,000...
const IDLE_PENALTY_CAP = 10_000;
const BENCH_DAYS = 2;                   // idle days in a row before a player is on the Bench
// Kept for anyone reading old code: the v1 names, mapped onto v2 meanings.
const UNVERIFIED_WEIGHT = UNVERIFIED_POINTS_PER_DOLLAR / VERIFIED_POINTS_PER_DOLLAR;
const POINTS_PER_TASK = 0;
const POINTS_PER_HOUR = 0;
const POINTS_PER_DOLLAR = VERIFIED_POINTS_PER_DOLLAR;
const PLAN_READY_HOUR = 4;              // the crew finishes the plan by 4am local time
const REGENERATIONS_PER_DAY = 1;
const CHECKIN_GRACE_MIN = 5;            // minutes after a block ends before the crew checks in
const INSURANCE_DAYS = 7;               // one free streak save per week
const LEAGUES = ['bronze', 'silver', 'gold', 'legend'];
// Self-Made Legends memberships, lowest to highest.
const TIERS = ['free', 'pro', 'allstar', 'veteran', 'hof'];
const TIER_NAMES = { free: 'Self-Made Legends Free', pro: 'Self-Made Legends Pro', allstar: 'Self-Made Legends All Star', veteran: 'Self-Made Legends Veteran', hof: 'Self-Made Legends Hall of Fame' };
const TIER_PRICES_CENTS = { free: 0, pro: 499, allstar: 999, veteran: 1299, hof: 1499 };
const atLeast = (t) => TIERS.slice(TIERS.indexOf(t));
const FEATURES = {
  liveCrew: atLeast('pro'), gigFinder: atLeast('pro'), push: atLeast('pro'),
  chat: atLeast('allstar'), receipts: atLeast('allstar'), localBoards: atLeast('allstar'), video: atLeast('allstar'), live: atLeast('allstar'),
  lowerFees: atLeast('veteran'), doubleInsurance: atLeast('veteran'), fastScout: atLeast('veteran'), frame: atLeast('veteran'),
  noLegendFee: ['hof'], hallOfFame: ['hof'], customBot: ['hof'],
};
const TIER_PERKS = {
  free: ['Playbook plans every day', 'World leaderboard, leagues, duels', 'Self-Made Legends University', 'Messages and the Grind Feed'],
  pro: ['Everything in Free', 'Live crew: real research every night', 'Gig Finder: real gigs found for you, refreshed hourly', 'Push notifications and Final Call'],
  allstar: ['Everything in Pro', 'Talk to your crew and rebuild the day', 'Receipt verification (double points)', 'Local boards: country, state, city', 'Video calls with friends and Go Live'],
  veteran: ['Everything in All Star', 'Lower fees: tips 10%, Legend Fee 3%', 'Two streak saves a week, two rebuilds a day', 'Scout refreshes gigs every 30 minutes', 'Veteran frame on your face and card'],
  hof: ['Everything in Veteran', 'No Legend Fee, tips fee 5%', 'Hall of Fame frame and crown likeness', 'Your name on the Self-Made Legends Hall of Fame page', 'Name your bot; top of the mentor list; three rebuilds a day'],
};
const REGENERATIONS_BY_TIER = { free: 1, pro: 1, allstar: 1, veteran: 2, hof: 3 };
const INSURANCE_BY_TIER = { free: 1, pro: 1, allstar: 1, veteran: 2, hof: 2 };

class Engine {
  /**
   * @param {import('better-sqlite3').Database} db
   * @param {object} opts { crew?, push?, now?, onEvent?(userId|null, event, data), defaultTier? }
   */
  constructor(db, opts = {}) {
    this.db = db;
    this.crew = opts.crew || new Crew();
    this.offlineCrew = this.crew.online ? new Crew({ apiKey: '' }) : this.crew;
    this.push = opts.push || null;
    this.now = opts.now || (() => Date.now());
    this.onEvent = opts.onEvent || (() => {});
    const legacy = { boss: 'allstar' };
    const dt = legacy[opts.defaultTier] || opts.defaultTier, de = legacy[process.env.DEFAULT_TIER] || process.env.DEFAULT_TIER;
    this.defaultTier = TIERS.includes(dt) ? dt : (TIERS.includes(de) ? de : 'hof');
    this._generating = new Set();
    this.community = null; // attached by the server once Community exists
    this.learning = new Learning(db, { now: this.now });
    this.gigs = null;
    this.briefCache = {
      get: (key, date) => { const r = this.db.prepare('SELECT brief FROM briefs WHERE city_key = ? AND date = ?').get(key, date); return r ? r.brief : null; },
      set: (key, date, brief) => this.db.prepare('INSERT OR REPLACE INTO briefs (city_key, date, brief, created_at) VALUES (?, ?, ?, ?)').run(key, date, brief, this.now()),
    };
  }

  // ── Time helpers ─────────────────────────────────────────────────────────
  localNow(profile) { return new Date(this.now() + (profile.tz_offset || 0) * 60_000); }
  localDateKey(profile) { return this.localNow(profile).toISOString().slice(0, 10); }
  localHour(profile) { return this.localNow(profile).getUTCHours(); }
  localMinutes(profile) { const d = this.localNow(profile); return d.getUTCHours() * 60 + d.getUTCMinutes(); }
  static shiftDate(dateKey, days) { const d = new Date(dateKey + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + days); return d.toISOString().slice(0, 10); }
  static weekday(dateKey) { return new Date(dateKey + 'T00:00:00Z').getUTCDay(); }

  // ── Tiers ────────────────────────────────────────────────────────────────
  tierOf(userId) {
    const r = this.db.prepare('SELECT tier FROM users WHERE id = ?').get(userId);
    const tier = r ? (r.tier === 'boss' ? 'allstar' : r.tier) : null;
    const t = tier && TIERS.includes(tier) && tier !== 'free' ? tier : null;
    return t || this.defaultTier;
  }
  setTier(userId, tier) {
    if (tier === 'boss') tier = 'allstar';
    if (!TIERS.includes(tier)) throw new Error('Unknown tier');
    this.db.prepare('UPDATE users SET tier = ? WHERE id = ?').run(tier, userId);
    if (tier === 'hof') this.awardBadge(userId, 'hall_of_fame', new Date(this.now()).toISOString().slice(0, 10), 'Self-Made Legends Hall of Fame');
  }
  tierInfo(userId) { const t = this.tierOf(userId); return { tier: t, name: TIER_NAMES[t], perks: TIER_PERKS[t], priceCents: TIER_PRICES_CENTS[t], regenerationsPerDay: REGENERATIONS_BY_TIER[t], insurancePerWeek: INSURANCE_BY_TIER[t] }; }
  allows(userId, feature) { return (FEATURES[feature] || []).includes(this.tierOf(userId)); }
  crewFor(userId) { return this.allows(userId, 'liveCrew') ? this.crew : this.offlineCrew; }

  // ── Inbox, push, crew log ────────────────────────────────────────────────
  notify(userId, kind, title, body, { push = true } = {}) {
    this.db.prepare('INSERT INTO inbox (user_id, kind, title, body, created_at) VALUES (?, ?, ?, ?, ?)').run(userId, kind, title, body || '', this.now());
    this.onEvent(userId, 'inbox', { kind, title, body });
    if (push && this.push) this.push.send(userId, { title, body: body || '', kind, url: '/' }).catch(() => {});
  }
  inbox(userId, limit = 20) {
    return this.db.prepare('SELECT * FROM inbox WHERE user_id = ? ORDER BY created_at DESC LIMIT ?').all(userId, limit)
      .map(r => ({ id: r.id, kind: r.kind, title: r.title, body: r.body, read: !!r.read, createdAt: r.created_at }));
  }
  markInboxRead(userId) { this.db.prepare('UPDATE inbox SET read = 1 WHERE user_id = ?').run(userId); }
  logCrew(userId, date, agent, message) {
    this.db.prepare('INSERT INTO crew_log (user_id, date, agent, message, created_at) VALUES (?, ?, ?, ?, ?)').run(userId, date, agent, message, this.now());
  }
  crewLog(userId, date) {
    return this.db.prepare('SELECT agent, message, created_at FROM crew_log WHERE user_id = ? AND date = ? ORDER BY created_at ASC, id ASC').all(userId, date)
      .map(r => ({ agent: r.agent, message: r.message, at: r.created_at }));
  }

  // ── Profiles ─────────────────────────────────────────────────────────────
  getProfile(userId) {
    const row = this.db.prepare('SELECT * FROM profiles WHERE user_id = ?').get(userId);
    return row ? this._rowToProfile(row) : null;
  }

  _rowToProfile(row) {
    const parse = (s, d) => { try { return s ? JSON.parse(s) : d; } catch (_) { return d; } };
    const goal = parse(row.goal_json, null);
    if (goal) goal.progressCents = this._goalProgress(row.user_id, goal);
    return {
      userId: row.user_id,
      location: row.location || '',
      country: row.country || 'US', region: row.region || '', city: row.city || '',
      resources: parse(row.resources, []),
      skills: parse(row.skills, []),
      goals: row.goals || '',
      comfort: row.comfort || '',
      targetHours: row.target_hours || 8,
      startHour: row.start_hour == null ? 8 : row.start_hour,
      tz_offset: row.tz_offset || 0,
      blockedHours: parse(row.blocked_hours, []),
      goal,
      conditions: row.conditions || '',
      gender: row.gender || '',
      safetyContact: row.safety_contact || '',
      insuranceUsedOn: row.insurance_used_on || null,
      memory: parse(row.memory, { notes: [], favorites: [], avoid: [] }),
      active: !!row.active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  static parseLocation(location) {
    const parts = String(location || '').split(',').map(s => s.trim()).filter(Boolean);
    return { city: parts[0] || '', region: parts[1] || '' };
  }

  saveProfile(userId, input = {}) {
    const existing = this.getProfile(userId);
    const clean = (arr) => Array.isArray(arr) ? [...new Set(arr.map(s => String(s).trim().slice(0, 60)).filter(Boolean))].slice(0, 20) : [];
    const location = String(input.location ?? existing?.location ?? '').slice(0, 120);
    const loc = Engine.parseLocation(location);
    const blocked = input.blockedHours !== undefined
      ? (Array.isArray(input.blockedHours) ? input.blockedHours.map(b => ({ start: Math.min(24, Math.max(0, Number(b.start) || 0)), end: Math.min(24, Math.max(0, Number(b.end) || 0)) })).filter(b => b.end > b.start).slice(0, 6) : [])
      : (existing?.blockedHours || []);
    let goal = existing?.goal ? { title: existing.goal.title, targetCents: existing.goal.targetCents, byDate: existing.goal.byDate, setOn: existing.goal.setOn } : null;
    if (input.goal !== undefined) {
      const g = input.goal;
      goal = g && g.title ? {
        title: String(g.title).slice(0, 120),
        targetCents: Math.max(100, Math.min(100_000_000, Math.round(Number(g.targetDollars) * 100) || 0)),
        byDate: /^\d{4}-\d{2}-\d{2}$/.test(g.byDate || '') ? g.byDate : Engine.shiftDate(new Date(this.now()).toISOString().slice(0, 10), 30),
        setOn: (existing?.goal && existing.goal.title === g.title) ? existing.goal.setOn : new Date(this.now()).toISOString().slice(0, 10),
      } : null;
    }
    const p = {
      location, city: loc.city, region: loc.region,
      country: String(input.country ?? existing?.country ?? 'US').toUpperCase().slice(0, 2) || 'US',
      resources: input.resources !== undefined ? clean(input.resources) : (existing?.resources || []),
      skills: input.skills !== undefined ? clean(input.skills) : (existing?.skills || []),
      goals: String(input.goals ?? existing?.goals ?? '').slice(0, 500),
      comfort: String(input.comfort ?? existing?.comfort ?? '').slice(0, 200),
      targetHours: Math.min(12, Math.max(2, Number(input.targetHours ?? existing?.targetHours ?? 8) || 8)),
      startHour: Math.min(23, Math.max(0, parseInt(input.startHour ?? existing?.startHour ?? 8, 10) || 0)),
      tz_offset: Math.min(840, Math.max(-720, parseInt(input.tzOffset ?? existing?.tz_offset ?? 0, 10) || 0)),
      blocked, goal,
      conditions: String(input.conditions ?? existing?.conditions ?? '').slice(0, 300),
      gender: ['woman', 'man', 'other', ''].includes(input.gender) ? input.gender : (existing?.gender || ''),
      safetyContact: String(input.safetyContact ?? existing?.safetyContact ?? '').slice(0, 120),
      memory: existing?.memory || { notes: [], favorites: [], avoid: [] },
      active: input.active === undefined ? (existing ? existing.active : true) : !!input.active,
    };
    const now = this.now();
    this.db.prepare(
      `INSERT INTO profiles (user_id, location, country, region, city, resources, skills, goals, comfort, target_hours, start_hour, tz_offset, blocked_hours, goal_json, conditions, gender, safety_contact, memory, active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET location=excluded.location, country=excluded.country, region=excluded.region, city=excluded.city,
         resources=excluded.resources, skills=excluded.skills, goals=excluded.goals, comfort=excluded.comfort, target_hours=excluded.target_hours,
         start_hour=excluded.start_hour, tz_offset=excluded.tz_offset, blocked_hours=excluded.blocked_hours, goal_json=excluded.goal_json,
         conditions=excluded.conditions, gender=excluded.gender, safety_contact=excluded.safety_contact, active=excluded.active, updated_at=excluded.updated_at`
    ).run(userId, p.location, p.country, p.region, p.city, JSON.stringify(p.resources), JSON.stringify(p.skills), p.goals, p.comfort, p.targetHours, p.startHour,
      p.tz_offset, JSON.stringify(p.blocked), p.goal ? JSON.stringify(p.goal) : null, p.conditions, p.gender, p.safetyContact, JSON.stringify(p.memory), p.active ? 1 : 0, existing?.createdAt || now, now);
    return this.getProfile(userId);
  }

  _saveMemory(userId, memory) { this.db.prepare('UPDATE profiles SET memory = ?, updated_at = ? WHERE user_id = ?').run(JSON.stringify(memory), this.now(), userId); }

  _goalProgress(userId, goal) {
    const r = this.db.prepare('SELECT COALESCE(SUM(earnings_cents), 0) AS c FROM daily_scores WHERE user_id = ? AND date >= ? AND date <= ?').get(userId, goal.setOn || '0000', goal.byDate || '9999');
    return r.c;
  }

  // ── Learning: what this person actually does and earns, per play ────────
  playStats(userId) {
    const rows = this.db.prepare(
      `SELECT COALESCE(t.play_id, t.title) AS key, t.title, t.status, t.earnings_cents, p.plan_json
       FROM tasks t JOIN plans p ON p.id = t.plan_id WHERE p.user_id = ? AND p.status = 'closed'`
    ).all(userId);
    const stats = {};
    for (const r of rows) {
      const s = stats[r.key] || (stats[r.key] = { title: r.title, attempts: 0, done: 0, earnedCents: 0, estCents: 0 });
      s.attempts++;
      if (r.status === 'done') {
        s.done++;
        s.earnedCents += r.earnings_cents;
        try {
          const est = (JSON.parse(r.plan_json).tasks.find(t => (t.playId || t.title) === r.key) || {}).estimatedEarnings;
          if (est) s.estCents += Math.round(((est.low + est.high) / 2) * 100);
        } catch (_) {}
      }
    }
    for (const s of Object.values(stats)) {
      s.doneRate = s.attempts ? s.done / s.attempts : 0;
      s.earnRatio = s.estCents > 0 ? s.earnedCents / s.estCents : null;
    }
    // Blend in what the city and the world have learned, so a first-day player
    // already benefits from every outcome anyone has logged.
    const learned = this.learning.weights(userId, this.getProfile(userId) || {});
    for (const [key, w] of Object.entries(learned)) {
      if (!stats[key]) stats[key] = { title: key, attempts: w.attempts, done: 0, earnedCents: 0, estCents: 0, doneRate: w.doneRate, earnRatio: w.earnRatio, confidence: w.confidence };
      else stats[key].confidence = 1;
    }
    return stats;
  }

  // ── Points ───────────────────────────────────────────────────────────────
  taskPoints(difficulty, hours) { return Math.round(Math.max(1, Math.min(10, Number(difficulty) || 5)) * Math.max(0.25, Number(hours) || 1) * POINTS_PER_DIFF_HOUR); }

  // ── Leagues ──────────────────────────────────────────────────────────────
  leagueFor(userId, profile, dateKey) {
    const have = new Set(profile.resources || []);
    const big = ['vehicle', 'laptop', 'bike', 'handy', 'academic', 'rideshare_approved'].filter(k => have.has(k)).length;
    let league = big === 0 ? 'bronze' : big === 1 ? 'silver' : 'gold';
    const since = Engine.shiftDate(dateKey, -14);
    const r = this.db.prepare('SELECT SUM(CASE WHEN rank IS NOT NULL AND rank <= 3 THEN 1 ELSE 0 END) AS podiums, MAX(streak) AS best FROM daily_scores WHERE user_id = ? AND date >= ? AND date < ? AND closed = 1').get(userId, since, dateKey);
    if (r && ((r.podiums || 0) >= 2 || (r.best || 0) >= 7)) league = 'legend';
    return league;
  }

  // ── Plans ────────────────────────────────────────────────────────────────
  getPlan(userId, dateKey) {
    const row = this.db.prepare('SELECT * FROM plans WHERE user_id = ? AND date = ?').get(userId, dateKey);
    return row ? this._hydrate(row) : null;
  }

  _hydrate(row) {
    const plan = JSON.parse(row.plan_json);
    const tasks = this.db.prepare('SELECT * FROM tasks WHERE plan_id = ? ORDER BY order_num ASC').all(row.id);
    plan.id = row.id; plan.status = row.status; plan.generatedAt = row.generated_at; plan.closedAt = row.closed_at; plan.regenerations = row.regenerations;
    plan.tasks = tasks.map((s, i) => {
      const t = plan.tasks[i] || { title: s.title, icon: '✅', hours: s.hours, steps: [], why: '', sources: [], estimatedEarnings: { low: 0, high: 0 } };
      const difficulty = s.difficulty || t.difficulty || 5;
      const potential = s.points && s.graded ? s.points : this.taskPoints(difficulty, s.hours);
      return { ...t, order: s.order_num, taskId: s.id, playId: s.play_id, title: s.title, hours: s.hours, endsMin: s.ends_min, category: s.category || t.category || 'other', status: s.status, earningsCents: s.earnings_cents, verifiedCents: s.verified_cents || 0, note: s.note || '', completedAt: s.completed_at || null,
        difficulty, graded: !!s.graded, gigUrl: s.gig_url || null, approval: s.approval || 'none', approvalReason: s.approval_reason || '',
        points: s.status !== 'done' ? potential : (s.approval === 'approved' ? (s.points || potential) : 0), potentialPoints: potential };
    });
    const ds = this.db.prepare('SELECT lesson_points, penalty, idle_streak FROM daily_scores WHERE user_id = ? AND date = ?').get(row.user_id, row.date);
    plan.lessonPoints = ds ? ds.lesson_points || 0 : 0;
    plan.penalty = ds ? ds.penalty || 0 : 0;
    plan.idleStreak = ds ? ds.idle_streak || 0 : 0;
    plan.progress = this._progress(plan);
    return plan;
  }

  _progress(plan) {
    // Only what the player's own bot has approved counts. Everything else waits.
    const done = plan.tasks.filter(t => t.status === 'done' && t.approval === 'approved');
    const awaiting = plan.tasks.filter(t => t.status === 'done' && t.approval !== 'approved');
    const hoursDone = done.reduce((s, t) => s + (t.hours || 0), 0);
    const earningsCents = done.reduce((s, t) => s + (t.earningsCents || 0), 0);
    const verifiedCents = done.reduce((s, t) => s + Math.min(t.verifiedCents || 0, t.earningsCents || 0), 0);
    const taskPoints = done.reduce((s, t) => s + (t.points || 0), 0);
    const pendingPoints = awaiting.reduce((s, t) => s + (t.potentialPoints || 0), 0);
    const base = { tasksDone: done.length, tasksTotal: plan.tasks.length, hoursDone, streak: plan.streak || 0, taskPoints, lessonPoints: plan.lessonPoints || 0, penalty: plan.penalty || 0 };
    const lessonPoints = plan.lessonPoints || 0;
    const cats = {};
    for (const t of plan.tasks) cats[t.category || 'other'] = (cats[t.category || 'other'] || 0) + (t.hours || 0);
    const category = Object.entries(cats).filter(([k]) => k !== 'career').sort((a, b) => b[1] - a[1])[0];
    return {
      ...base,
      hoursDone: Math.round(hoursDone * 100) / 100,
      hoursTotal: Math.round(plan.tasks.reduce((s, t) => s + (t.hours || 0), 0) * 100) / 100,
      earningsCents, verifiedCents, lessonPoints, taskPoints, penalty: plan.penalty || 0,
      awaitingApproval: awaiting.length, pendingPoints, loggedCents: plan.tasks.reduce((s, t) => s + (t.earningsCents || 0), 0),
      category: category ? category[0] : 'other',
      score: this.scoreFor({ ...base, earningsCents, verifiedCents }),
      verifiedScore: this.scoreFor({ ...base, earningsCents: verifiedCents, verifiedCents }),
    };
  }

  recentPlayIds(userId, days = 3) {
    return this.db.prepare(`SELECT DISTINCT t.play_id FROM tasks t JOIN plans p ON p.id = t.plan_id WHERE p.user_id = ? AND p.generated_at >= ? AND t.play_id IS NOT NULL`)
      .all(userId, this.now() - days * 86_400_000).map(r => r.play_id);
  }

  /** Generate (or return) the plan for a player's local date. */
  async ensurePlan(userId, dateKey, { force = false } = {}) {
    const profile = this.getProfile(userId);
    if (!profile) throw new Error('Set up your profile first');
    dateKey = dateKey || this.localDateKey(profile);
    const existing = this.getPlan(userId, dateKey);
    if (existing && (!force || existing.status === 'closed')) return existing;
    if (this._generating.has(userId)) return existing;
    this._generating.add(userId);
    try {
      const crew = this.crewFor(userId);
      const log = (agent, message) => this.logCrew(userId, dateKey, agent, message);
      if (force) log('Crew', 'Rebuilding the day at your request.');
      else log('Coach', profile.memory.tomorrowHint ? `Briefed the crew: ${profile.memory.tomorrowHint}` : 'First day. The crew is starting from what you told us.');
      const plan = await crew.buildPlan(profile, dateKey, { recentPlayIds: this.recentPlayIds(userId), playStats: this.playStats(userId), briefCache: this.briefCache, log });
      plan.streak = this._currentStreak(userId, dateKey);
      plan.league = this.leagueFor(userId, profile, dateKey);
      const now = this.now();
      const write = this.db.transaction(() => {
        let planId;
        if (existing) {
          this.db.prepare('DELETE FROM tasks WHERE plan_id = ?').run(existing.id);
          this.db.prepare('UPDATE plans SET plan_json = ?, generated_by = ?, generated_at = ?, regenerations = regenerations + 1 WHERE id = ?').run(JSON.stringify(plan), plan.generatedBy, now, existing.id);
          planId = existing.id;
        } else {
          planId = this.db.prepare('INSERT INTO plans (user_id, date, status, plan_json, generated_by, generated_at) VALUES (?, ?, ?, ?, ?, ?)').run(userId, dateKey, 'open', JSON.stringify(plan), plan.generatedBy, now).lastInsertRowid;
        }
        this._insertTasks(planId, plan.tasks);
      });
      write();
      const hydrated = this.getPlan(userId, dateKey);
      this._upsertScore(userId, dateKey, hydrated, profile);
      if (!existing) {
        this.notify(userId, 'plan', 'Your crew finished today\'s plan', plan.headline);
        this._linkReferralDuel(userId, dateKey);
      }
      this.onEvent(userId, 'plan_ready', { date: dateKey, headline: plan.headline });
      return hydrated;
    } finally { this._generating.delete(userId); }
  }

  _insertTasks(planId, tasks, startOrder = 1) {
    const ins = this.db.prepare('INSERT INTO tasks (plan_id, order_num, play_id, title, hours, status, earnings_cents, ends_min, category, difficulty, points, gig_url) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?)');
    tasks.forEach((t, i) => { const d = Math.max(1, Math.min(10, Math.round(Number(t.difficulty) || 5))); ins.run(planId, startOrder + i, t.playId || null, t.title, t.hours, 'pending', Number.isFinite(t.endsMin) ? t.endsMin : null, t.category || 'other', d, this.taskPoints(d, t.hours), t.gigUrl || null); });
  }

  /** Append one play to an open plan (a claimed gig), laid out after the last block or now, whichever is later. */
  addTask(userId, dateKey, task) {
    const profile = this.getProfile(userId);
    const row = this.db.prepare('SELECT * FROM plans WHERE user_id = ? AND date = ?').get(userId, dateKey);
    if (!row) throw new Error('No plan for that day yet');
    if (row.status === 'closed') throw new Error('That day is already closed');
    const plan = this._hydrate(row);
    const lastEnd = Math.max(0, ...plan.tasks.map(t => t.endsMin || 0));
    const startMin = Math.max(lastEnd, this.localMinutes(profile));
    const [laid] = layoutOnClock([{ ...task, hours: Math.max(0.25, Number(task.hours) || 1) }], startMin / 60, profile.blockedHours);
    const json = JSON.parse(row.plan_json);
    json.tasks = [...json.tasks, { ...laid, order: json.tasks.length + 1 }];
    const tx = this.db.transaction(() => {
      this.db.prepare('UPDATE plans SET plan_json = ? WHERE id = ?').run(JSON.stringify(json), row.id);
      this._insertTasks(row.id, [laid], plan.tasks.length + 1);
    });
    tx();
    const fresh = this.getPlan(userId, dateKey);
    this._upsertScore(userId, dateKey, fresh, profile);
    this.logCrew(userId, dateKey, 'Scout', `Added to your day: ${laid.title} (grade ${laid.difficulty || 5}/10, ${this.taskPoints(laid.difficulty || 5, laid.hours).toLocaleString()} points if you finish it).`);
    return fresh.tasks[fresh.tasks.length - 1];
  }

  // ── Chat with the crew (mid-day replans) ─────────────────────────────────
  chatHistory(userId, dateKey, limit = 30) {
    return this.db.prepare('SELECT role, content, created_at FROM crew_messages WHERE user_id = ? AND date = ? ORDER BY created_at ASC, id ASC LIMIT ?').all(userId, dateKey, limit)
      .map(r => ({ role: r.role, content: r.content, at: r.created_at }));
  }

  async chat(userId, message) {
    if (!this.allows(userId, 'chat')) throw Object.assign(new Error('Chat with your crew is a Boss feature'), { status: 402 });
    const profile = this.getProfile(userId);
    if (!profile) throw new Error('Set up your profile first');
    message = String(message || '').trim().slice(0, 600);
    if (!message) throw new Error('Say something to your crew');
    const dateKey = this.localDateKey(profile);
    const plan = await this.ensurePlan(userId, dateKey);
    if (plan.status === 'closed') throw new Error('Today is closed. The crew is already on tomorrow.');
    const nowMin = this.localMinutes(profile);
    const dayEnd = profile.startHour * 60 + profile.targetHours * 60;
    const pendingHours = plan.tasks.filter(t => t.status === 'pending').reduce((s, t) => s + t.hours, 0);
    const remainingHours = nowMin < dayEnd ? Math.min(pendingHours || (dayEnd - nowMin) / 60, (dayEnd - nowMin) / 60) : pendingHours;
    const history = this.chatHistory(userId, dateKey);
    const ins = this.db.prepare('INSERT INTO crew_messages (user_id, date, role, content, created_at) VALUES (?, ?, ?, ?, ?)');
    ins.run(userId, dateKey, 'user', message, this.now());
    const out = await this.crewFor(userId).chat(profile, plan, history, message, Math.max(0, remainingHours));
    let replaced = 0;
    if (out.action === 'replace_remaining' && out.newTasks.length) {
      const startMin = Math.max(nowMin, Math.min(...plan.tasks.filter(t => t.status === 'pending').map(t => t.endsMin || nowMin)));
      const laid = layoutOnClock(out.newTasks.map(t => ({ ...t, startsAt: undefined, endsAt: undefined })), startMin / 60, profile.blockedHours);
      const keep = plan.tasks.filter(t => t.status !== 'pending');
      const json = JSON.parse(this.db.prepare('SELECT plan_json FROM plans WHERE id = ?').get(plan.id).plan_json);
      json.tasks = [...keep.map(t => ({ ...t, taskId: undefined, status: undefined, earningsCents: undefined, verifiedCents: undefined, note: undefined, completedAt: undefined })), ...laid].map((t, i) => ({ ...t, order: i + 1 }));
      const low = json.tasks.reduce((s, t) => s + ((t.estimatedEarnings || {}).low || 0), 0);
      const high = json.tasks.reduce((s, t) => s + ((t.estimatedEarnings || {}).high || 0), 0);
      const hours = json.tasks.reduce((s, t) => s + (t.hours || 0), 0);
      json.estimatedEarnings = { low, high };
      json.headline = `${json.tasks.length} plays, ${hours.toFixed(1)} hours, $${low}-$${high} realistic range (rebuilt mid-day)`;
      const tx = this.db.transaction(() => {
        this.db.prepare("DELETE FROM tasks WHERE plan_id = ? AND status = 'pending'").run(plan.id);
        this.db.prepare('UPDATE plans SET plan_json = ? WHERE id = ?').run(JSON.stringify(json), plan.id);
        this.db.prepare('UPDATE tasks SET order_num = order_num WHERE plan_id = ?').run(plan.id);
        this._insertTasks(plan.id, laid, keep.length + 1);
      });
      tx();
      replaced = laid.length;
      this.logCrew(userId, dateKey, 'Strategist', `Rebuilt the rest of the day: ${laid.map(t => t.title).join(', ')}.`);
    }
    ins.run(userId, dateKey, 'crew', out.reply, this.now());
    const fresh = this.getPlan(userId, dateKey);
    this._upsertScore(userId, dateKey, fresh, profile);
    return { reply: out.reply, replaced, plan: fresh };
  }

  // ── Task updates ─────────────────────────────────────────────────────────
  _taskRow(userId, taskId) {
    const row = this.db.prepare('SELECT t.*, p.user_id, p.date, p.status AS plan_status FROM tasks t JOIN plans p ON p.id = t.plan_id WHERE t.id = ?').get(taskId);
    if (!row || row.user_id !== userId) throw new Error('Task not found');
    if (row.plan_status === 'closed') throw new Error('That day is already closed');
    return row;
  }

  updateTask(userId, taskId, { status, earningsDollars, note } = {}) {
    const row = this._taskRow(userId, taskId);
    const next = {
      status: ['pending', 'done', 'skipped'].includes(status) ? status : row.status,
      earnings_cents: earningsDollars === undefined ? row.earnings_cents : Math.max(0, Math.min(10_000_000, Math.round(Number(earningsDollars) * 100) || 0)),
      note: note === undefined ? row.note : String(note).slice(0, 280),
    };
    const completedAt = next.status === 'done' ? (row.completed_at || this.now()) : null;
    const points = next.status === 'done' ? (row.graded ? row.points : this.taskPoints(row.difficulty, row.hours)) : 0;
    const approval = next.status !== 'done' ? 'none' : (row.approval === 'approved' ? 'approved' : 'pending');
    this.db.prepare('UPDATE tasks SET status = ?, earnings_cents = ?, note = ?, completed_at = ?, checkin_sent = 1, points = ?, approval = ?, approval_reason = CASE WHEN ? = \'none\' THEN NULL ELSE approval_reason END WHERE id = ?').run(next.status, next.earnings_cents, next.note, completedAt, points, approval, approval, taskId);
    if (next.status !== row.status && (next.status === 'done' || next.status === 'skipped')) {
      const profile = this.getProfile(userId);
      let earnRatio = null;
      try { const est = (JSON.parse(this.db.prepare('SELECT plan_json FROM plans WHERE id = ?').get(row.plan_id).plan_json).tasks.find(t => (t.playId || t.title) === (row.play_id || row.title)) || {}).estimatedEarnings; if (est && est.high > 0 && next.status === 'done') earnRatio = next.earnings_cents / Math.round((est.low + est.high) / 2 * 100); } catch (_) {}
      this.learning.observe(userId, profile, row.play_id || row.title, { done: next.status === 'done', earnRatio });
    }
    if (next.status === 'done' && row.status !== 'done' && approval === 'pending') this.notify(userId, 'approval', 'Your bot needs to verify that', `Tell it what you did on "${row.title}" or add a receipt. No points until it approves.`, { push: false });
    return this._afterTaskChange(userId, row.date);
  }

  /** The player asks their own bot to verify a finished play. Points only exist after approval. */
  async requestApproval(userId, taskId, { note, imageBase64 = null, mediaType = 'image/jpeg' } = {}) {
    const row = this._taskRow(userId, taskId);
    if (row.status !== 'done') throw new Error('Mark it done first');
    if (row.approval === 'approved') return { approved: true, reason: row.approval_reason || 'Already approved', plan: this.getPlan(userId, row.date) };
    if (note !== undefined) this.db.prepare('UPDATE tasks SET note = ? WHERE id = ?').run(String(note).slice(0, 600), taskId);
    const fresh = this._taskRow(userId, taskId); // carries the plan date the Auditor logs against
    let sha = null;
    if (imageBase64) {
      if (!['image/png', 'image/jpeg', 'image/webp'].includes(mediaType)) throw new Error('Use a PNG, JPEG or WebP photo');
      if (imageBase64.length > 7_000_000) throw new Error('Photo too large');
      sha = crypto.createHash('sha256').update(imageBase64).digest('hex');
      if (this.db.prepare('SELECT 1 FROM tasks WHERE proof_sha = ? AND id != ?').get(sha, taskId)) throw new Error('That photo was already used for another play');
    }
    const verdict = await this.crewFor(userId).approveTask({ title: fresh.title, hours: fresh.hours, difficulty: fresh.difficulty, category: fresh.category }, { note: fresh.note, earningsCents: fresh.earnings_cents, verifiedCents: fresh.verified_cents, imageBase64, mediaType });
    return this._applyApproval(userId, fresh, verdict, sha);
  }

  _applyApproval(userId, row, verdict, sha = null, { quiet = false } = {}) {
    if (verdict.approved) {
      const d = Math.max(1, Math.min(10, verdict.difficulty || row.difficulty || 5));
      const points = this.taskPoints(d, row.hours);
      this.db.prepare("UPDATE tasks SET approval = 'approved', approval_reason = ?, difficulty = ?, points = ?, graded = 1, proof_sha = COALESCE(?, proof_sha) WHERE id = ?").run(verdict.reason || 'Approved', d, points, sha, row.id);
      this.logCrew(userId, row.date, 'Auditor', `Approved "${row.title}" (${d}/10, ${points.toLocaleString()} points): ${verdict.reason}`);
      if (this.community && !quiet) this.community.onTaskDone(userId, { title: row.title, earningsCents: row.earnings_cents, points });
      this.onEvent(userId, 'approved', { taskId: row.id, points, difficulty: d });
    } else {
      this.db.prepare("UPDATE tasks SET approval = 'rejected', approval_reason = ? WHERE id = ?").run(verdict.reason || 'Not approved', row.id);
      this.logCrew(userId, row.date, 'Auditor', `Not yet approved "${row.title}": ${verdict.reason}`);
    }
    const plan = this._afterTaskChange(userId, row.date);
    return { approved: !!verdict.approved, reason: verdict.reason, difficulty: verdict.difficulty, plan };
  }

  /** The Auditor grades a finished play on how hard it really was; points follow the grade. */
  async _grade(userId, taskId) {
    const row = this.db.prepare('SELECT t.*, p.date FROM tasks t JOIN plans p ON p.id = t.plan_id WHERE t.id = ?').get(taskId);
    if (!row || row.status !== 'done' || row.graded || row.approval !== 'approved') return null;
    const g = await this.crewFor(userId).gradeTask({ title: row.title, hours: row.hours, difficulty: row.difficulty }, { note: row.note, earningsCents: row.earnings_cents, verifiedCents: row.verified_cents });
    const points = this.taskPoints(g.difficulty, row.hours);
    this.db.prepare('UPDATE tasks SET difficulty = ?, points = ?, graded = 1 WHERE id = ?').run(g.difficulty, points, taskId);
    this.logCrew(userId, row.date, 'Auditor', `Graded "${row.title}" ${g.difficulty}/10: ${g.reason} ${points.toLocaleString()} points.`);
    this._afterTaskChange(userId, row.date);
    this.onEvent(userId, 'graded', { taskId, difficulty: g.difficulty, points });
    return g;
  }

  _afterTaskChange(userId, dateKey) {
    const plan = this.getPlan(userId, dateKey);
    this._upsertScore(userId, dateKey, plan, this.getProfile(userId));
    this.onEvent(null, 'leaderboard', { date: dateKey });
    return plan;
  }

  /** Verify a task's earnings from a payout screenshot. */
  async verifyReceipt(userId, taskId, imageBase64, mediaType) {
    if (!this.allows(userId, 'receipts')) throw Object.assign(new Error('Receipt verification is a Boss feature'), { status: 402 });
    const row = this._taskRow(userId, taskId);
    if (!/^data:|^[A-Za-z0-9+/=]+$/.test(String(imageBase64 || '').slice(0, 64))) throw new Error('Send the image as base64');
    if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(mediaType)) throw new Error('Use a PNG, JPEG or WebP screenshot');
    if (imageBase64.length > 7_000_000) throw new Error('Image too large (5MB max)');
    const sha = crypto.createHash('sha256').update(imageBase64).digest('hex');
    if (this.db.prepare('SELECT 1 FROM receipts WHERE image_sha = ?').get(sha)) throw new Error('That screenshot was already used');
    const result = await this.crewFor(userId).readReceipt(imageBase64, mediaType, { title: row.title });
    if (!result.verified) return { verified: false, reason: result.reason || 'Could not confirm a payout in that image', plan: this.getPlan(userId, row.date) };
    const cents = Math.round(result.amountDollars * 100);
    const tx = this.db.transaction(() => {
      this.db.prepare('INSERT INTO receipts (user_id, task_id, amount_cents, source, confidence, image_sha, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(userId, taskId, cents, result.source, result.confidence, sha, this.now());
      this.db.prepare('UPDATE tasks SET verified_cents = verified_cents + ?, earnings_cents = MAX(earnings_cents, verified_cents + ?), status = CASE WHEN status = \'pending\' THEN \'done\' ELSE status END, completed_at = COALESCE(completed_at, ?), points = CASE WHEN points = 0 THEN ? ELSE points END WHERE id = ?').run(cents, cents, this.now(), this.taskPoints(row.difficulty, row.hours), taskId);
    });
    tx();
    this.logCrew(userId, row.date, 'Auditor', `Verified $${(cents / 100).toFixed(2)} from ${result.source || 'a receipt'} for ${row.title}.`);
    if (this.community) this.community.onVerified(userId, { title: row.title }, cents, result.source);
    // A receipt is the strongest proof there is: the bot approves on the spot.
    const fresh = { ...this.db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId), date: row.date };
    if (fresh.approval !== 'approved') this._applyApproval(userId, fresh, { approved: true, difficulty: fresh.difficulty, reason: `Verified by receipt from ${result.source || 'a payout'}.` }, sha, { quiet: true });
    return { verified: true, amountCents: cents, source: result.source, plan: this.getPlan(userId, row.date) };
  }

  // ── Scoring ──────────────────────────────────────────────────────────────
  scoreFor({ tasksDone = 0, tasksTotal = 0, taskPoints = 0, earningsCents = 0, verifiedCents = 0, streak = 0, lessonPoints = 0, penalty = 0 }) {
    let score = taskPoints;
    const verified = Math.min(verifiedCents, earningsCents, EARNINGS_CAP_CENTS);
    const unverified = Math.max(0, Math.min(earningsCents, EARNINGS_CAP_CENTS) - verified);
    score += Math.round(verified / 100 * VERIFIED_POINTS_PER_DOLLAR + unverified / 100 * UNVERIFIED_POINTS_PER_DOLLAR);
    if (tasksTotal > 0 && tasksDone === tasksTotal) score += FULL_DAY_BONUS;
    if (tasksDone > 0) score += Math.min(streak, STREAK_CAP) * STREAK_BONUS;
    score += lessonPoints;
    return Math.min(DAILY_CAP, score) - penalty;
  }

  _currentStreak(userId, dateKey) {
    let streak = 0;
    let cursor = Engine.shiftDate(dateKey, -1);
    const q = this.db.prepare('SELECT streak FROM daily_scores WHERE user_id = ? AND date = ? AND closed = 1');
    const row = q.get(userId, cursor);
    // The closed row already carries the streak as of that day (insurance included).
    if (row) streak = row.streak || 0;
    return streak;
  }

  _upsertScore(userId, dateKey, plan, profile) {
    const p = plan.progress;
    profile = profile || this.getProfile(userId) || {};
    this.db.prepare(
      `INSERT INTO daily_scores (user_id, date, score, verified_score, earnings_cents, verified_cents, league, country, region, city, category, tasks_done, tasks_total, hours_done, streak, task_points, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id, date) DO UPDATE SET score=excluded.score, verified_score=excluded.verified_score, earnings_cents=excluded.earnings_cents, verified_cents=excluded.verified_cents,
         league=excluded.league, country=excluded.country, region=excluded.region, city=excluded.city, category=excluded.category, tasks_done=excluded.tasks_done, tasks_total=excluded.tasks_total,
         hours_done=excluded.hours_done, streak=excluded.streak, task_points=excluded.task_points, updated_at=excluded.updated_at`
    ).run(userId, dateKey, p.score, p.verifiedScore, p.earningsCents, p.verifiedCents, plan.league || 'bronze', profile.country || 'US', profile.region || '', profile.city || '', p.category || 'other',
      p.tasksDone, p.tasksTotal, p.hoursDone, plan.streak || 0, p.taskPoints || 0, this.now());
  }

  // ── Day close ────────────────────────────────────────────────────────────
  async closeDay(userId, dateKey) {
    const row = this.db.prepare('SELECT * FROM plans WHERE user_id = ? AND date = ? AND status = ?').get(userId, dateKey, 'open');
    if (!row) return null;
    const profile = this.getProfile(userId);
    const plan = this._hydrate(row);
    const p = plan.progress;
    const finished = p.tasksTotal > 0 && p.tasksDone === p.tasksTotal;

    // Streak, with one free save per week so a sick day does not erase the work.
    let streak = plan.streak || 0;
    let insured = false;
    if (p.tasksDone > 0) streak += 1;
    else if (streak > 0 && p.awaitingApproval > 0) { /* worked, unverified: streak holds, no bonus, no penalty */ }
    else if (streak > 0 && this._insuranceLeft(userId, profile, dateKey) > 0) {
      insured = true;
      this.db.prepare('UPDATE profiles SET insurance_used_on = ? WHERE user_id = ?').run(dateKey, userId);
      this.db.prepare("INSERT INTO learning_events (user_id, kind, play_key, value, created_at) VALUES (?, 'insurance', ?, 1, ?)").run(userId, dateKey, this.now());
    } else streak = 0;

    // Nothing done and no insurance: the day costs points, more for every idle day in a row.
    const prevIdle = (this.db.prepare('SELECT idle_streak FROM daily_scores WHERE user_id = ? AND date = ? AND closed = 1').get(userId, Engine.shiftDate(dateKey, -1)) || {}).idle_streak || 0;
    const worked = p.tasksDone > 0 || p.awaitingApproval > 0;
    const idleStreak = worked || insured ? 0 : prevIdle + 1;
    const penalty = idleStreak ? Math.min(IDLE_PENALTY_CAP, IDLE_PENALTY * idleStreak) : 0;
    const tx = this.db.transaction(() => {
      this.db.prepare('UPDATE plans SET status = ?, closed_at = ? WHERE id = ?').run('closed', this.now(), row.id);
      this.db.prepare('UPDATE daily_scores SET streak = ?, closed = 1, idle_streak = ?, penalty = ? WHERE user_id = ? AND date = ?').run(streak, idleStreak, penalty, userId, dateKey);
      this.db.prepare("UPDATE profiles SET conditions = '' WHERE user_id = ?").run(userId);
    });
    tx();
    if (penalty) { const re = this._hydrate(row); this._upsertScore(userId, dateKey, re, profile); this.db.prepare('UPDATE daily_scores SET idle_streak = ?, penalty = ?, closed = 1, streak = ? WHERE user_id = ? AND date = ?').run(idleStreak, penalty, streak, userId, dateKey); }

    const debrief = await this.crewFor(userId).debrief(profile, plan, { tasks: plan.tasks, earningsCents: p.earningsCents, hoursWorked: p.hoursDone });
    const memory = profile.memory || { notes: [], favorites: [], avoid: [] };
    const merge = (a, b, cap) => [...new Set([...(b || []), ...(a || [])])].slice(0, cap);
    this._saveMemory(userId, {
      notes: merge(memory.notes, debrief.notes, 12),
      favorites: merge(memory.favorites, debrief.favorites, 8),
      avoid: (debrief.avoid || []).slice(0, 6),
      tomorrowHint: debrief.tomorrowHint || '',
      lastSummary: debrief.summary || '',
    });
    this.db.prepare('INSERT INTO debriefs (user_id, date, summary, data, created_at) VALUES (?, ?, ?, ?, ?)').run(userId, dateKey, debrief.summary || '', JSON.stringify(debrief), this.now());
    this.logCrew(userId, dateKey, 'Coach', debrief.summary || 'Day closed.');

    if (finished) this.awardBadge(userId, 'full_day', dateKey, 'Every play done');
    if (streak === 7) this.awardBadge(userId, 'streak_7', dateKey, 'Seven days straight');
    if (this.community) { try { await this.community.maybeStory(userId, streak, dateKey); } catch (e) { console.error('[story]', e.message); } }
    if (p.tasksDone > 0) this.notify(userId, 'card', 'Your receipt card is ready', `Score ${p.score}, ${money(p.earningsCents)} logged. Share it from Past days.`, { push: false });
    if (insured) this.notify(userId, 'insurance', 'Streak insurance used', `Nothing logged on ${dateKey}, so your ${streak}-day streak was saved. One save per week.`);
    if (penalty) this.notify(userId, 'penalty', idleStreak >= BENCH_DAYS ? 'You are on the Bench' : `Idle day: -${penalty.toLocaleString()} points`, idleStreak >= BENCH_DAYS ? `${idleStreak} days with nothing done. -${penalty.toLocaleString()} today and it grows every idle day. One finished play gets you off the Bench.` : 'A day with nothing done costs points. Tomorrow, finish one play and the penalty resets.');
    this.notify(userId, 'close', finished ? 'Full day. Every play done.' : 'Day closed', debrief.summary || `Score ${p.score}. Tomorrow's plan is on the way.`);

    let recap = null;
    if (Engine.weekday(dateKey) === 0) recap = await this.writeRecap(userId, dateKey);
    return { plan, debrief, streak, finished, insured, recap };
  }

  _insuranceLeft(userId, profile, dateKey) {
    const allowed = INSURANCE_BY_TIER[this.tierOf(userId)] || 1;
    const since = Engine.shiftDate(dateKey, -(INSURANCE_DAYS - 1));
    const used = this.db.prepare("SELECT COUNT(*) AS c FROM learning_events WHERE user_id = ? AND kind = 'insurance' AND play_key >= ? AND play_key <= ?").get(userId, since, dateKey).c;
    return Math.max(0, allowed - used);
  }
  regenerationsAllowed(userId) { return REGENERATIONS_BY_TIER[this.tierOf(userId)] || 1; }

  // ── Weekly recap ─────────────────────────────────────────────────────────
  weekSummary(userId, weekEnd) {
    const start = Engine.shiftDate(weekEnd, -6);
    const days = this.db.prepare('SELECT * FROM daily_scores WHERE user_id = ? AND date >= ? AND date <= ? ORDER BY date').all(userId, start, weekEnd);
    const tasks = this.db.prepare(`SELECT t.title, t.status, t.earnings_cents FROM tasks t JOIN plans p ON p.id = t.plan_id WHERE p.user_id = ? AND p.date >= ? AND p.date <= ?`).all(userId, start, weekEnd);
    const skips = {};
    for (const t of tasks) if (t.status === 'skipped') skips[t.title] = (skips[t.title] || 0) + 1;
    const skippedMost = Object.entries(skips).sort((a, b) => b[1] - a[1])[0];
    const best = tasks.filter(t => t.status === 'done').sort((a, b) => b.earnings_cents - a.earnings_cents)[0];
    const ranked = days.filter(d => d.rank);
    const half = Math.floor(ranked.length / 2);
    const avg = (arr) => arr.length ? (arr.reduce((s, d) => s + d.rank, 0) / arr.length).toFixed(1) : null;
    return {
      weekEnd, start,
      daysActive: days.filter(d => d.tasks_done > 0).length,
      playsDone: days.reduce((s, d) => s + d.tasks_done, 0),
      playsTotal: days.reduce((s, d) => s + d.tasks_total, 0),
      hours: Math.round(days.reduce((s, d) => s + d.hours_done, 0) * 10) / 10,
      earnedCents: days.reduce((s, d) => s + d.earnings_cents, 0),
      verifiedCents: days.reduce((s, d) => s + (d.verified_cents || 0), 0),
      bestRank: ranked.length ? Math.min(...ranked.map(d => d.rank)) : null,
      rankTrend: half ? `${avg(ranked.slice(0, half))} -> ${avg(ranked.slice(half))}` : null,
      bestPlay: best ? { title: best.title, earningsCents: best.earnings_cents } : null,
      skippedMost: skippedMost ? skippedMost[0] : null,
      skippedMostCount: skippedMost ? skippedMost[1] : 0,
      days: days.map(d => ({ date: d.date, tasksDone: d.tasks_done, tasksTotal: d.tasks_total, earningsCents: d.earnings_cents, rank: d.rank })),
    };
  }

  async writeRecap(userId, weekEnd) {
    const week = this.weekSummary(userId, weekEnd);
    if (!week.days.length) return null;
    const recap = { ...(await this.crewFor(userId).recap(this.getProfile(userId), week)), week };
    this.db.prepare('INSERT OR REPLACE INTO recaps (user_id, week_end, data, created_at) VALUES (?, ?, ?, ?)').run(userId, weekEnd, JSON.stringify(recap), this.now());
    this.notify(userId, 'recap', 'Your week, from the Coach', recap.headline);
    return recap;
  }

  recaps(userId, limit = 8) {
    return this.db.prepare('SELECT week_end, data FROM recaps WHERE user_id = ? ORDER BY week_end DESC LIMIT ?').all(userId, limit).map(r => ({ weekEnd: r.week_end, ...JSON.parse(r.data) }));
  }

  // ── Badges ───────────────────────────────────────────────────────────────
  awardBadge(userId, badge, dateKey, detail) {
    const r = this.db.prepare('INSERT OR IGNORE INTO badges (user_id, badge, date, detail, created_at) VALUES (?, ?, ?, ?, ?)').run(userId, badge, dateKey, detail || '', this.now());
    if (r.changes) this.onEvent(userId, 'badge', { badge, date: dateKey });
    return !!r.changes;
  }
  badges(userId) { return this.db.prepare('SELECT badge, date, detail FROM badges WHERE user_id = ? ORDER BY created_at DESC').all(userId); }

  /** Crown the podium for a date once every player on that date has closed. Idempotent. */
  crownDay(dateKey) {
    if (this.db.prepare('SELECT 1 FROM plans WHERE date = ? AND status = ?').get(dateKey, 'open')) return null;
    this.settleChallenges(dateKey);
    if (this.db.prepare('SELECT 1 FROM champions WHERE date = ?').get(dateKey)) return null;
    const all = this.db.prepare('SELECT user_id, score FROM daily_scores WHERE date = ? AND score > 0 ORDER BY score DESC, verified_cents DESC, earnings_cents DESC, hours_done DESC').all(dateKey);
    if (!all.length) return null;
    const tx = this.db.transaction(() => {
      all.forEach((t, i) => {
        this.db.prepare('UPDATE daily_scores SET rank = ? WHERE user_id = ? AND date = ?').run(i + 1, t.user_id, dateKey);
        if (i < 3) this.db.prepare('INSERT OR IGNORE INTO champions (date, rank, user_id, score, created_at) VALUES (?, ?, ?, ?, ?)').run(dateKey, i + 1, t.user_id, t.score, this.now());
      });
    });
    tx();
    all.slice(0, 3).forEach((t, i) => {
      this.awardBadge(t.user_id, i === 0 ? 'world_champion' : 'podium', dateKey, `World #${i + 1}`);
      this.notify(t.user_id, 'podium', i === 0 ? 'Legend of the Day' : `World #${i + 1} today`, `You placed #${i + 1} in the world on ${dateKey}.`);
    });
    if (this.community) {
      this.community.onChampion(all[0].user_id, dateKey, all[0].score);
      try { this.community.awardChallengeBadges(dateKey); } catch (e) { console.error('[challenge-day]', e.message); }
      // Women's Grind: the top woman of the day, crowned alongside the world podium.
      const w = this.db.prepare("SELECT s.user_id FROM daily_scores s JOIN profiles p ON p.user_id = s.user_id WHERE s.date = ? AND s.score > 0 AND p.gender = 'woman' ORDER BY s.score DESC LIMIT 1").get(dateKey);
      if (w) { this.awardBadge(w.user_id, 'womens_grind', dateKey, "Women's Grind Legend of the Day"); this.notify(w.user_id, 'podium', "Women's Grind Legend of the Day", `Top woman in the world on ${dateKey}.`); }
    }
    this.onEvent(null, 'champion', { date: dateKey, podium: all.slice(0, 3).map((t, i) => ({ userId: t.user_id, rank: i + 1, score: t.score })) });
    return all.slice(0, 3);
  }

  // ── Head-to-head challenges ──────────────────────────────────────────────
  findUser(nameOrEmail) {
    const q = String(nameOrEmail || '').trim();
    if (!q) return null;
    return this.db.prepare('SELECT id, display_name, email FROM users WHERE lower(email) = lower(?) OR lower(display_name) = lower(?) LIMIT 1').get(q, q) || null;
  }

  createChallenge(challengerId, opponentQuery, dateKey, { autoAccept = false } = {}) {
    const opp = this.findUser(opponentQuery);
    if (!opp) throw new Error('No player by that name or email');
    if (opp.id === challengerId) throw new Error('You cannot challenge yourself');
    const dup = this.db.prepare("SELECT id FROM challenges WHERE date = ? AND status IN ('pending','accepted') AND ((challenger_id = ? AND opponent_id = ?) OR (challenger_id = ? AND opponent_id = ?))").get(dateKey, challengerId, opp.id, opp.id, challengerId);
    if (dup) throw new Error('You already have a challenge with them that day');
    const r = this.db.prepare('INSERT INTO challenges (challenger_id, opponent_id, date, status, created_at) VALUES (?, ?, ?, ?, ?)').run(challengerId, opp.id, dateKey, autoAccept ? 'accepted' : 'pending', this.now());
    const me = this.db.prepare('SELECT display_name FROM users WHERE id = ?').get(challengerId);
    this.notify(opp.id, 'challenge', autoAccept ? `${me.display_name} is your rival today` : `${me.display_name} challenged you`, autoAccept ? `Head-to-head on ${dateKey}. Higher score wins.` : `Head-to-head on ${dateKey}. Accept in the World tab.`);
    return this.challenge(r.lastInsertRowid);
  }

  respondChallenge(userId, id, accept) {
    const c = this.db.prepare('SELECT * FROM challenges WHERE id = ?').get(id);
    if (!c || c.opponent_id !== userId) throw new Error('Challenge not found');
    if (c.status !== 'pending') throw new Error('Already answered');
    this.db.prepare('UPDATE challenges SET status = ? WHERE id = ?').run(accept ? 'accepted' : 'declined', id);
    if (accept) this.notify(c.challenger_id, 'challenge', 'Challenge accepted', `It is on for ${c.date}.`);
    return this.challenge(id);
  }

  challenge(id) {
    const c = this.db.prepare(`SELECT c.*, a.display_name AS challenger_name, b.display_name AS opponent_name FROM challenges c
      LEFT JOIN users a ON a.id = c.challenger_id LEFT JOIN users b ON b.id = c.opponent_id WHERE c.id = ?`).get(id);
    return c && { id: c.id, date: c.date, status: c.status, challengerId: c.challenger_id, challengerName: c.challenger_name, opponentId: c.opponent_id, opponentName: c.opponent_name, winnerId: c.winner_id, challengerScore: c.challenger_score, opponentScore: c.opponent_score };
  }

  challenges(userId, limit = 20) {
    return this.db.prepare('SELECT id FROM challenges WHERE challenger_id = ? OR opponent_id = ? ORDER BY date DESC, id DESC LIMIT ?').all(userId, userId, limit).map(r => this.challenge(r.id));
  }

  settleChallenges(dateKey) {
    const rows = this.db.prepare("SELECT * FROM challenges WHERE date = ? AND status = 'accepted'").all(dateKey);
    for (const c of rows) {
      const open = this.db.prepare("SELECT 1 FROM plans WHERE date = ? AND status = 'open' AND user_id IN (?, ?)").get(dateKey, c.challenger_id, c.opponent_id);
      if (open) continue;
      const sc = (uid) => (this.db.prepare('SELECT score FROM daily_scores WHERE user_id = ? AND date = ?').get(uid, dateKey) || {}).score || 0;
      const a = sc(c.challenger_id), b = sc(c.opponent_id);
      const winner = a === b ? null : (a > b ? c.challenger_id : c.opponent_id);
      this.db.prepare('UPDATE challenges SET status = ?, winner_id = ?, challenger_score = ?, opponent_score = ?, settled_at = ? WHERE id = ?').run('settled', winner, a, b, this.now(), c.id);
      for (const uid of [c.challenger_id, c.opponent_id]) {
        const won = winner === uid;
        if (won) this.awardBadge(uid, 'duel_win', dateKey, 'Won a head-to-head');
        this.notify(uid, 'challenge', winner ? (won ? 'You won the head-to-head' : 'You lost the head-to-head') : 'Head-to-head tied', `${a} vs ${b} on ${dateKey}.`);
      }
    }
    // Anything still pending after the day is gone expires.
    this.db.prepare("UPDATE challenges SET status = 'expired' WHERE date = ? AND status = 'pending'").run(dateKey);
  }

  _linkReferralDuel(userId, dateKey) {
    const u = this.db.prepare('SELECT referred_by FROM users WHERE id = ?').get(userId);
    if (!u || !u.referred_by) return;
    const referrer = this.db.prepare('SELECT id, display_name FROM users WHERE referral_code = ?').get(u.referred_by);
    if (!referrer || referrer.id === userId) return;
    try { this.createChallenge(referrer.id, referrer.id && this.db.prepare('SELECT email FROM users WHERE id = ?').get(userId).email, dateKey, { autoAccept: true }); } catch (_) {}
    this.db.prepare('UPDATE users SET referred_by = NULL WHERE id = ?').run(userId); // one duel per invite
    this.awardBadge(referrer.id, 'recruiter', dateKey, 'Brought a rival in');
  }

  // ── Leaderboards ─────────────────────────────────────────────────────────
  /**
   * opts: { scope: 'world'|'country'|'region'|'city', league?, mode: 'all'|'verified', viewer?: profile }
   */
  leaderboard(dateKey, { scope = 'world', league = null, mode = 'all', category = null, viewer = null, limit = 100 } = {}) {
    const where = ['s.date = ?'];
    const args = [dateKey];
    if (scope === 'women') where.push("p.gender = 'woman'");
    if (category && CATEGORIES[category]) { where.push('s.category = ?'); args.push(category); }
    if (scope !== 'world' && viewer) {
      if (scope === 'country') { where.push('s.country = ?'); args.push(viewer.country); }
      if (scope === 'region') { where.push('s.country = ? AND s.region = ?'); args.push(viewer.country, viewer.region); }
      if (scope === 'city') { where.push('s.country = ? AND s.region = ? AND s.city = ?'); args.push(viewer.country, viewer.region, viewer.city); }
    }
    if (league && LEAGUES.includes(league)) { where.push('s.league = ?'); args.push(league); }
    const scoreCol = mode === 'verified' ? 's.verified_score' : 's.score';
    return this.db.prepare(
      `SELECT s.*, u.display_name, p.location FROM daily_scores s LEFT JOIN users u ON u.id = s.user_id LEFT JOIN profiles p ON p.user_id = s.user_id
       WHERE ${where.join(' AND ')} ORDER BY ${scoreCol} DESC, s.verified_cents DESC, s.earnings_cents DESC, s.hours_done DESC LIMIT ?`
    ).all(...args, limit).map((r, i) => ({
      rank: i + 1, userId: r.user_id, displayName: r.display_name || 'Legend', location: r.location || '', league: r.league, category: r.category || 'other',
      score: mode === 'verified' ? r.verified_score : r.score, verifiedScore: r.verified_score,
      earningsCents: r.earnings_cents, verifiedCents: r.verified_cents, earningsVerified: r.verified_cents > 0 && r.verified_cents >= r.earnings_cents,
      tasksDone: r.tasks_done, tasksTotal: r.tasks_total, hoursDone: r.hours_done, streak: r.streak, closed: !!r.closed,
    }));
  }

  allTimeLeaderboard(limit = 50) {
    return this.db.prepare(
      `SELECT s.user_id, SUM(s.score) AS total_score, SUM(s.earnings_cents) AS total_earnings, SUM(s.verified_cents) AS total_verified, COUNT(*) AS days,
              MAX(s.streak) AS best_streak, SUM(CASE WHEN s.rank = 1 THEN 1 ELSE 0 END) AS wins, u.display_name
       FROM daily_scores s LEFT JOIN users u ON u.id = s.user_id GROUP BY s.user_id ORDER BY total_score DESC LIMIT ?`
    ).all(limit).map((r, i) => ({ rank: i + 1, userId: r.user_id, displayName: r.display_name || 'Legend', totalScore: r.total_score, totalEarningsCents: r.total_earnings, totalVerifiedCents: r.total_verified, days: r.days, bestStreak: r.best_streak, wins: r.wins }));
  }

  /** The Bench: players whose last week added up to less than nothing. Named without cruelty, ranked without mercy. */
  bench(dateKey, limit = 25) {
    const since = Engine.shiftDate(dateKey, -6);
    return this.db.prepare(`SELECT s.user_id, SUM(s.score) AS week, MAX(s.idle_streak) AS idle, u.display_name FROM daily_scores s JOIN users u ON u.id = s.user_id WHERE s.date >= ? AND s.date <= ? GROUP BY s.user_id HAVING week < 0 ORDER BY week ASC LIMIT ?`).all(since, dateKey, limit)
      .map((r, i) => ({ rank: i + 1, userId: r.user_id, displayName: r.display_name || 'Legend', weekScore: r.week, idleStreak: r.idle }));
  }

  podium(dateKey) {
    return this.db.prepare('SELECT c.rank, c.user_id, c.score, u.display_name FROM champions c LEFT JOIN users u ON u.id = c.user_id WHERE c.date = ? ORDER BY c.rank').all(dateKey)
      .map(p => ({ rank: p.rank, userId: p.user_id, score: p.score, displayName: p.display_name || 'Legend' }));
  }

  /** Yesterday's world champion and what they actually did. Public, by design: it is the best onboarding there is. */
  championPlan(dateKey) {
    const c = this.db.prepare('SELECT c.user_id, c.score, u.display_name, p.location FROM champions c LEFT JOIN users u ON u.id = c.user_id LEFT JOIN profiles p ON p.user_id = c.user_id WHERE c.date = ? AND c.rank = 1').get(dateKey);
    if (!c) return null;
    const plan = this.getPlan(c.user_id, dateKey);
    if (!plan) return null;
    return {
      date: dateKey, displayName: c.display_name || 'Legend', location: c.location || '', score: c.score, headline: plan.headline,
      earningsCents: plan.progress.earningsCents, verifiedCents: plan.progress.verifiedCents,
      tasks: plan.tasks.map(t => ({ icon: t.icon, title: t.title, hours: t.hours, status: t.status, earningsCents: t.earningsCents, verified: t.verifiedCents > 0 })),
    };
  }

  myRank(userId, dateKey) {
    const me = this.db.prepare('SELECT score, league FROM daily_scores WHERE user_id = ? AND date = ?').get(userId, dateKey);
    if (!me) return null;
    const ahead = this.db.prepare('SELECT COUNT(*) AS c FROM daily_scores WHERE date = ? AND score > ?').get(dateKey, me.score).c;
    const total = this.db.prepare('SELECT COUNT(*) AS c FROM daily_scores WHERE date = ?').get(dateKey).c;
    const leagueAhead = this.db.prepare('SELECT COUNT(*) AS c FROM daily_scores WHERE date = ? AND league = ? AND score > ?').get(dateKey, me.league, me.score).c;
    const leagueTotal = this.db.prepare('SELECT COUNT(*) AS c FROM daily_scores WHERE date = ? AND league = ?').get(dateKey, me.league).c;
    const prev = this.db.prepare('SELECT idle_streak FROM daily_scores WHERE user_id = ? AND date = ? AND closed = 1').get(userId, Engine.shiftDate(dateKey, -1));
    return { rank: ahead + 1, of: total, score: me.score, league: me.league, leagueRank: leagueAhead + 1, leagueOf: leagueTotal, benched: !!(prev && prev.idle_streak >= BENCH_DAYS), idleStreak: prev ? prev.idle_streak : 0 };
  }

  history(userId, limit = 30) {
    const rows = this.db.prepare('SELECT * FROM daily_scores WHERE user_id = ? ORDER BY date DESC LIMIT ?').all(userId, limit);
    const byDate = new Map(this.db.prepare('SELECT date, summary FROM debriefs WHERE user_id = ?').all(userId).map(d => [d.date, d.summary]));
    return rows.map(r => ({ date: r.date, score: r.score, verifiedScore: r.verified_score, earningsCents: r.earnings_cents, verifiedCents: r.verified_cents, tasksDone: r.tasks_done, tasksTotal: r.tasks_total, hoursDone: r.hours_done, streak: r.streak, rank: r.rank, league: r.league, closed: !!r.closed, summary: byDate.get(r.date) || '' }));
  }

  stats(userId) {
    const r = this.db.prepare('SELECT COUNT(*) AS days, COALESCE(SUM(earnings_cents),0) AS earned, COALESCE(SUM(verified_cents),0) AS verified, COALESCE(SUM(score),0) AS score, COALESCE(MAX(streak),0) AS best_streak, SUM(CASE WHEN rank = 1 THEN 1 ELSE 0 END) AS wins FROM daily_scores WHERE user_id = ? AND closed = 1').get(userId);
    const duels = this.db.prepare("SELECT SUM(CASE WHEN winner_id = ? THEN 1 ELSE 0 END) AS won, COUNT(*) AS played FROM challenges WHERE status = 'settled' AND (challenger_id = ? OR opponent_id = ?)").get(userId, userId, userId);
    const tips = this.db.prepare("SELECT COUNT(*) AS n, COALESCE(SUM(net_cents),0) AS net FROM tips WHERE to_user_id = ? AND status = 'paid'").get(userId);
    const bal = this.db.prepare('SELECT payout_balance_cents AS b FROM users WHERE id = ?').get(userId);
    const last = this.db.prepare('SELECT idle_streak FROM daily_scores WHERE user_id = ? AND closed = 1 ORDER BY date DESC LIMIT 1').get(userId);
    const week = this.db.prepare('SELECT COALESCE(SUM(score),0) AS s FROM daily_scores WHERE user_id = ? AND date >= ?').get(userId, Engine.shiftDate(new Date(this.now()).toISOString().slice(0, 10), -6)).s;
    return { days: r.days, earnedCents: r.earned, verifiedCents: r.verified, totalScore: r.score, weekScore: week, bestStreak: r.best_streak, wins: r.wins || 0, duelsWon: duels.won || 0, duelsPlayed: duels.played || 0, tier: this.tierOf(userId), tipsCount: tips.n, tipsCents: tips.net, payoutBalanceCents: bal ? bal.b : 0, idleStreak: last ? last.idle_streak : 0, benched: !!(last && last.idle_streak >= BENCH_DAYS), botIQ: this.learning.botIQ(userId) };
  }

  // ── Check-ins after each time block ──────────────────────────────────────
  sendCheckins(profile, today) {
    const plan = this.db.prepare("SELECT id FROM plans WHERE user_id = ? AND date = ? AND status = 'open'").get(profile.userId, today);
    if (!plan) return 0;
    const nowMin = this.localMinutes(profile);
    const due = this.db.prepare("SELECT id, title, ends_min FROM tasks WHERE plan_id = ? AND status = 'pending' AND checkin_sent = 0 AND ends_min IS NOT NULL AND ends_min + ? <= ?").all(plan.id, CHECKIN_GRACE_MIN, nowMin);
    for (const t of due) {
      this.db.prepare('UPDATE tasks SET checkin_sent = 1 WHERE id = ?').run(t.id);
      this.onEvent(profile.userId, 'checkin', { taskId: t.id, title: t.title });
      if (this.push) this.push.send(profile.userId, { title: `How did "${t.title}" go?`, body: 'Tap to mark it done and log what you earned.', kind: 'checkin', url: '/', taskId: t.id }).catch(() => {});
    }
    return due.length;
  }

  // ── Scheduler ────────────────────────────────────────────────────────────
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
        this.sendCheckins(profile, today);
        if (this.community) this.community.finalCall(profile, today);
      } catch (e) { console.error('[tick]', profile.userId, e.message); }
    }
    for (const d of touched) { try { this.crownDay(d); } catch (e) { console.error('[crown]', d, e.message); } }
    const pending = this.db.prepare(
      `SELECT DISTINCT s.date FROM daily_scores s LEFT JOIN champions c ON c.date = s.date
       WHERE c.date IS NULL AND s.date < ? AND NOT EXISTS (SELECT 1 FROM plans p WHERE p.date = s.date AND p.status = 'open')`
    ).all(new Date(this.now()).toISOString().slice(0, 10));
    for (const p of pending) { try { this.crownDay(p.date); } catch (e) { console.error('[crown]', p.date, e.message); } }
    // Challenges older than two days settle with whatever scores exist.
    const twoDaysAgo = Engine.shiftDate(new Date(this.now()).toISOString().slice(0, 10), -2);
    for (const c of this.db.prepare("SELECT DISTINCT date FROM challenges WHERE status IN ('accepted','pending') AND date <= ?").all(twoDaysAgo)) {
      try { this.settleChallenges(c.date); } catch (e) { console.error('[duel]', c.date, e.message); }
    }
    if (this.community) { try { await this.community.weeklyTick(new Date(this.now()).toISOString().slice(0, 10)); } catch (e) { console.error('[weekly]', e.message); } }
  }
}

module.exports = Engine;
module.exports.constants = { CATEGORIES, TIER_NAMES, TIER_PRICES_CENTS, TIER_PERKS, REGENERATIONS_BY_TIER, INSURANCE_BY_TIER, DAILY_CAP, POINTS_PER_DIFF_HOUR, VERIFIED_POINTS_PER_DOLLAR, UNVERIFIED_POINTS_PER_DOLLAR, IDLE_PENALTY, IDLE_PENALTY_CAP, BENCH_DAYS, EARNINGS_CAP_CENTS, UNVERIFIED_WEIGHT, POINTS_PER_TASK, POINTS_PER_HOUR, POINTS_PER_DOLLAR, FULL_DAY_BONUS, STREAK_BONUS, STREAK_CAP, PLAN_READY_HOUR, REGENERATIONS_PER_DAY, CHECKIN_GRACE_MIN, INSURANCE_DAYS, LEAGUES, TIERS, FEATURES };
