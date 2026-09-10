'use strict';
// Copyright (c) 2026 Self-Made Legends LLC. All rights reserved. Proprietary and confidential. See LICENSE.

// The fun layer. Everything here is about the moment after the work: the bot
// talking back, a Boss of the Day worth double, one Power Play a day the
// player picks, combos for stacking approvals, weekly quests, earned titles,
// callouts on the leaderboard, and the climb (who you just passed).
//
// Points from here go into tasks.bonus_points and daily_scores.quest_points,
// so the base grading rules never change: difficulty x hours is still the
// base, the daily cap still applies, and nothing counts before approval.

const crypto = require('crypto');

const COMBO_STEP = 0.10;        // each approved play after the first: +10% of that play's base points
const COMBO_CAP = 0.50;         // ...up to +50%
const BOSS_MULT = 1.0;          // the Boss pays its base points again (2x)
const POWER_MULT = 0.5;         // the Power Play pays +50%
const CALLOUTS_PER_DAY = 3;

const LINES = {
  approve: ['THAT is what I am talking about.', 'Approved. Told you that one was yours.', 'Clean. Next.', 'Stamped. The board just felt that.', 'Verified by me, your bot. Keep the receipts coming.', 'Money moves. Approved.'],
  boss: ['BOSS DOWN. Double points. The whole city heard that.', 'You took the hardest play on the board and made it look easy. Boss bonus paid.', 'That was the Boss of the Day. It is not the boss anymore.'],
  combo: ['Combo x{n}. You are on a heater.', 'x{n} combo. Do not stop now.', 'That is {n} in a row. The board is watching.'],
  power: ['Power Play cashed. You called it and you hit it.', 'You put your chips on that one and it paid. Power Play bonus in.'],
  reject: ['Not yet. Give me the receipt or the story and I will stamp it.', 'I want to approve this. Show me more.'],
  idle: ['Nothing logged yet. The board does not wait.', 'Still zero. One play gets you off the ground.', 'Your rivals are moving. Are you?'],
  streak: ['Day {n}. Streaks pay every day you keep them.', 'Streak at {n}. Protect it.'],
  climb: ['You just passed {names}. #{rank} in the world.', 'Up to #{rank}. {names} felt that.'],
  rankup: ['RANK UP. You are now {rank}. New tier, new rivals.', 'Welcome to {rank}. The air is thinner up here.'],
  quest: ['Quest complete: {label}. +{reward} points.', '{label}: done. +{reward} points and a badge.'],
  morning: ['Plan is on the table. Boss of the Day is marked. Go get it.', 'New day, new board. Everyone starts at zero.', 'The crew worked all night. Your move.'],
  benched: ['You are on the Bench. One approved play and you are back.'],
  leading: ['You are #1 in the world right now. Every minute you hold it is a flex.'],
  closing: ['Final hours. Log everything. Approve everything.'],
};

const TITLES = [
  ['untouchable', 'Untouchable', (s) => s.wins >= 3],
  ['boss_slayer', 'Boss Slayer', (s) => s.bosses >= 3],
  ['money_machine', 'Money Machine', (s) => s.verifiedCents >= 100_000],
  ['iron_streak', 'Iron Streak', (s) => s.bestStreak >= 7],
  ['crowd_favorite', 'Crowd Favorite', (s) => s.rating.n >= 5 && s.rating.a >= 4.5],
  ['closer', 'The Closer', (s) => s.lateApprovals >= 5],
  ['early_bird', 'Early Bird', (s) => s.earlyApprovals >= 5],
  ['combo_king', 'Combo King', (s) => s.maxCombo >= 4],
  ['grinder', 'Grinder', (s) => s.days >= 10],
];

const CALLOUT_LINES = [
  'Catch me if you can.',
  'You are on my board today.',
  'I am coming for that spot.',
  'Bring receipts, not excuses.',
  'Same city, same day, higher score. Bet.',
  'Your bot is good. Mine is better.',
];

// Weekly quest templates. progress(userId, weekStart, weekEnd) reads the truth from the DB.
const QUESTS = [
  { key: 'approve_5', label: 'Get 5 plays approved this week', target: 5, reward: 7_500, sql: "SELECT COUNT(*) AS n FROM tasks t JOIN plans p ON p.id = t.plan_id WHERE p.user_id = ? AND p.date BETWEEN ? AND ? AND t.approval = 'approved'" },
  { key: 'verify_100', label: 'Verify $100 from receipts', target: 10_000, reward: 10_000, unit: 'cents', sql: "SELECT COALESCE(SUM(MIN(t.verified_cents, t.earnings_cents)),0) AS n FROM tasks t JOIN plans p ON p.id = t.plan_id WHERE p.user_id = ? AND p.date BETWEEN ? AND ? AND t.approval = 'approved'" },
  { key: 'boss_2', label: 'Beat 2 Bosses of the Day', target: 2, reward: 10_000, sql: "SELECT COUNT(*) AS n FROM tasks t JOIN plans p ON p.id = t.plan_id WHERE p.user_id = ? AND p.date BETWEEN ? AND ? AND t.approval = 'approved' AND t.boss = 1" },
  { key: 'combo_3', label: 'Hit a x3 combo in one day', target: 3, reward: 5_000, sql: "SELECT COALESCE(MAX(t.combo),0) AS n FROM tasks t JOIN plans p ON p.id = t.plan_id WHERE p.user_id = ? AND p.date BETWEEN ? AND ? AND t.approval = 'approved'" },
  { key: 'days_4', label: 'Show up 4 days this week', target: 4, reward: 8_000, sql: 'SELECT COUNT(*) AS n FROM daily_scores WHERE user_id = ? AND date BETWEEN ? AND ? AND tasks_done > 0' },
  { key: 'lesson_3', label: 'Pass 3 University lessons', target: 3, reward: 4_000, sql: 'SELECT COUNT(*) AS n FROM lesson_progress WHERE user_id = ? AND date BETWEEN ? AND ? AND correct = 1' },
  { key: 'hard_3', label: 'Finish 3 plays graded 7 or harder', target: 3, reward: 9_000, sql: "SELECT COUNT(*) AS n FROM tasks t JOIN plans p ON p.id = t.plan_id WHERE p.user_id = ? AND p.date BETWEEN ? AND ? AND t.approval = 'approved' AND t.difficulty >= 7" },
  { key: 'live_1', label: 'Go live once', target: 1, reward: 3_000, sql: "SELECT COUNT(*) AS n FROM live_rooms WHERE host_id = ? AND kind = 'live' AND date(started_at / 1000, 'unixepoch') BETWEEN ? AND ?" },
  { key: 'full_day', label: 'Finish every play in a day', target: 1, reward: 6_000, sql: 'SELECT COUNT(*) AS n FROM daily_scores WHERE user_id = ? AND date BETWEEN ? AND ? AND tasks_total > 0 AND tasks_done = tasks_total' },
];

class Fun {
  constructor(db, { engine, community, now, onEvent } = {}) {
    this.db = db; this.engine = engine; this.community = community || null; this.now = now || (() => Date.now()); this.onEvent = onEvent || (() => {});
    this.random = Math.random;
  }
  line(kind, ctx = {}) {
    const list = LINES[kind] || LINES.approve;
    const pick = list[Math.floor(this.random() * list.length)];
    return pick.replace(/\{(\w+)\}/g, (_, k) => ctx[k] == null ? '' : (typeof ctx[k] === 'number' ? ctx[k].toLocaleString() : String(ctx[k])));
  }
  botName(userId) { const r = this.db.prepare('SELECT bot_name FROM profiles WHERE user_id = ?').get(userId); return (r && r.bot_name) || 'Your bot'; }
  setBotName(userId, name) { name = String(name || '').trim().slice(0, 24); this.db.prepare('UPDATE profiles SET bot_name = ? WHERE user_id = ?').run(name || null, userId); return name || 'Your bot'; }

  // ── Boss of the Day ──────────────────────────────────────────────────────
  /** The hardest play on a fresh plan is the Boss: double points when approved. Ties go to the longer play. */
  markBoss(planId) {
    this.db.prepare('UPDATE tasks SET boss = 0 WHERE plan_id = ?').run(planId);
    const t = this.db.prepare('SELECT id FROM tasks WHERE plan_id = ? ORDER BY difficulty DESC, hours DESC, order_num ASC LIMIT 1').get(planId);
    if (t) this.db.prepare('UPDATE tasks SET boss = 1 WHERE id = ?').run(t.id);
    return t ? t.id : null;
  }

  // ── Power Play ───────────────────────────────────────────────────────────
  /** Once a day, before it is done, the player powers one play for +50%. Moving it to another pending play is allowed until either is done. */
  power(userId, taskId) {
    const row = this.engine._taskRow(userId, taskId);
    if (row.status !== 'pending') throw new Error('Power a play before you finish it');
    const current = this.db.prepare('SELECT id, status FROM tasks WHERE plan_id = ? AND power = 1').get(row.plan_id);
    if (current && current.id !== row.id && current.status !== 'pending') throw new Error('Your Power Play for today is already locked in');
    this.db.prepare('UPDATE tasks SET power = 0 WHERE plan_id = ?').run(row.plan_id);
    this.db.prepare('UPDATE tasks SET power = 1 WHERE id = ?').run(row.id);
    this.engine.logCrew(userId, row.date, 'Coach', `Power Play: "${row.title}". +50% if it gets approved. You called it.`);
    return this.engine.getPlan(userId, row.date);
  }

  // ── On approval: boss, power, combo ──────────────────────────────────────
  /** Called by the engine right after a play is approved with base points already written. Returns what was added. */
  onApproval(userId, row, basePoints) {
    const approvedToday = this.db.prepare("SELECT COUNT(*) AS n FROM tasks WHERE plan_id = ? AND approval = 'approved'").get(row.plan_id).n; // includes this one
    const combo = approvedToday;
    let bonus = 0; const parts = [];
    if (row.boss) { bonus += Math.round(basePoints * BOSS_MULT); parts.push('boss'); }
    if (row.power) { bonus += Math.round(basePoints * POWER_MULT); parts.push('power'); }
    if (combo > 1) { bonus += Math.round(basePoints * Math.min(COMBO_CAP, COMBO_STEP * (combo - 1))); parts.push('combo'); }
    this.db.prepare('UPDATE tasks SET bonus_points = ?, combo = ? WHERE id = ?').run(bonus, combo, row.id);
    const name = this.botName(userId);
    const lines = [];
    if (row.boss) lines.push(this.line('boss'));
    if (row.power) lines.push(this.line('power'));
    if (combo > 1) lines.push(this.line('combo', { n: combo }));
    if (!lines.length) lines.push(this.line('approve'));
    if (bonus) this.engine.logCrew(userId, row.date, name, `${lines.join(' ')} +${bonus.toLocaleString()} bonus points.`);
    else this.engine.logCrew(userId, row.date, name, lines[0]);
    if (row.boss) {
      this.engine.awardBadge(userId, 'boss_slayer', row.date, 'Took down a Boss of the Day');
      if (this.community) { const w = this.community._who(userId); if (w && w.pub) this.community.post(userId, 'boss', `${w.name}${w.city ? ' in ' + w.city : ''} took down the Boss of the Day: ${row.title}.`, { city: w.city }); }
    }
    return { bonus, combo, boss: !!row.boss, power: !!row.power, parts, line: lines.join(' '), botName: name };
  }

  // ── Weekly quests ────────────────────────────────────────────────────────
  static weekStart(dateKey) { const d = new Date(dateKey + 'T00:00:00Z'); const dow = (d.getUTCDay() + 6) % 7; d.setUTCDate(d.getUTCDate() - dow); return d.toISOString().slice(0, 10); }
  static shift(dateKey, n) { const d = new Date(dateKey + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
  /** Three quests a week, picked by a hash of user and week so they differ per player and never repeat within a week. */
  assign(userId, weekStart) {
    const have = this.db.prepare('SELECT key FROM quests WHERE user_id = ? AND week_start = ?').all(userId, weekStart);
    if (have.length) return;
    const h = crypto.createHash('sha1').update(userId + weekStart).digest();
    const order = QUESTS.map((q, i) => ({ q, r: h[i % h.length] })).sort((a, b) => a.r - b.r).slice(0, 3);
    const ins = this.db.prepare('INSERT OR IGNORE INTO quests (user_id, week_start, key, label, target, reward, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)');
    for (const { q } of order) ins.run(userId, weekStart, q.key, q.label, q.target, q.reward, this.now());
  }
  quests(userId, dateKey) {
    const ws = Fun.weekStart(dateKey), we = Fun.shift(ws, 6);
    this.assign(userId, ws);
    return this.db.prepare('SELECT * FROM quests WHERE user_id = ? AND week_start = ? ORDER BY id').all(userId, ws).map(r => {
      const tpl = QUESTS.find(q => q.key === r.key);
      const progress = r.done_at ? r.target : Math.min(r.target, (tpl ? this.db.prepare(tpl.sql).get(userId, ws, we).n : 0) || 0);
      return { id: r.id, key: r.key, label: r.label, target: r.target, progress, reward: r.reward, done: !!r.done_at, doneOn: r.done_on || null, unit: tpl && tpl.unit || 'count', weekStart: ws, weekEnd: we };
    });
  }
  /** Settle any quest that just crossed its target: reward goes to the day it happened on. */
  checkQuests(userId, dateKey) {
    const completed = [];
    for (const q of this.quests(userId, dateKey)) {
      if (q.done || q.progress < q.target) continue;
      this.db.prepare('UPDATE quests SET done_at = ?, done_on = ? WHERE id = ?').run(this.now(), dateKey, q.id);
      this.db.prepare('INSERT INTO daily_scores (user_id, date, score, updated_at, quest_points) VALUES (?, ?, 0, ?, ?) ON CONFLICT(user_id, date) DO UPDATE SET quest_points = quest_points + excluded.quest_points').run(userId, dateKey, this.now(), q.reward);
      this.engine.awardBadge(userId, 'quest_' + q.key, dateKey, q.label);
      const line = this.line('quest', { label: q.label, reward: q.reward });
      this.engine.notify(userId, 'quest', 'Quest complete', line, { push: false });
      this.engine.logCrew(userId, dateKey, this.botName(userId), line);
      this.onEvent(userId, 'quest', { key: q.key, label: q.label, reward: q.reward });
      completed.push(q);
    }
    return completed;
  }

  // ── Titles ───────────────────────────────────────────────────────────────
  titleStats(userId) {
    const s = this.engine.stats(userId);
    const bosses = this.db.prepare("SELECT COUNT(*) AS n FROM tasks t JOIN plans p ON p.id = t.plan_id WHERE p.user_id = ? AND t.approval = 'approved' AND t.boss = 1").get(userId).n;
    const maxCombo = this.db.prepare("SELECT COALESCE(MAX(t.combo),0) AS n FROM tasks t JOIN plans p ON p.id = t.plan_id WHERE p.user_id = ? AND t.approval = 'approved'").get(userId).n;
    const rating = this.db.prepare('SELECT AVG(rating) AS a, COUNT(*) AS n FROM bot_ratings WHERE host_id = ?').get(userId);
    const prof = this.engine.getProfile(userId) || { tz_offset: 0 };
    const hours = this.db.prepare("SELECT t.completed_at FROM tasks t JOIN plans p ON p.id = t.plan_id WHERE p.user_id = ? AND t.approval = 'approved' AND t.completed_at IS NOT NULL").all(userId).map(r => new Date(r.completed_at + (prof.tz_offset || 0) * 60_000).getUTCHours());
    return { ...s, bosses, maxCombo, rating: { a: rating.a || 0, n: rating.n || 0 }, earlyApprovals: hours.filter(h => h < 9).length, lateApprovals: hours.filter(h => h >= 20).length };
  }
  titleFor(userId) {
    const st = this.titleStats(userId);
    const hit = TITLES.find(([, , test]) => test(st));
    const title = hit ? hit[1] : null;
    this.db.prepare('UPDATE users SET title = ? WHERE id = ?').run(title, userId);
    return title;
  }
  title(userId) { const r = this.db.prepare('SELECT title FROM users WHERE id = ?').get(userId); return r ? r.title : null; }

  // ── The climb ────────────────────────────────────────────────────────────
  worldRank(userId, dateKey) {
    const me = this.db.prepare('SELECT score FROM daily_scores WHERE user_id = ? AND date = ?').get(userId, dateKey);
    if (!me) return null;
    return this.db.prepare('SELECT COUNT(*) AS n FROM daily_scores WHERE date = ? AND score > ?').get(dateKey, me.score).n + 1;
  }
  /** Names of the players now behind you who were ahead of you at `before`. */
  climb(userId, dateKey, before, after) {
    if (before == null || after == null || after >= before) return null;
    const me = this.db.prepare('SELECT score FROM daily_scores WHERE user_id = ? AND date = ?').get(userId, dateKey);
    const passed = this.db.prepare('SELECT u.display_name FROM daily_scores s JOIN users u ON u.id = s.user_id WHERE s.date = ? AND s.user_id != ? AND s.score < ? ORDER BY s.score DESC LIMIT ?').all(dateKey, userId, me.score, before - after).map(r => r.display_name);
    const out = { from: before, to: after, passed, line: this.line('climb', { names: passed.slice(0, 2).join(' and ') || 'the field', rank: after }) };
    this.onEvent(userId, 'climb', out);
    return out;
  }

  // ── Callouts ─────────────────────────────────────────────────────────────
  callout(fromId, toId, lineIndex, dateKey) {
    if (fromId === toId) throw new Error('Call out somebody else');
    if (!this.db.prepare('SELECT 1 FROM users WHERE id = ?').get(toId)) throw new Error('No such player');
    if (this.db.prepare('SELECT 1 FROM blocks WHERE user_id = ? AND blocked_id = ?').get(toId, fromId)) throw new Error('You cannot call out this player');
    const today = this.db.prepare('SELECT COUNT(*) AS n FROM callouts WHERE from_id = ? AND date = ?').get(fromId, dateKey).n;
    if (today >= CALLOUTS_PER_DAY) throw new Error(`${CALLOUTS_PER_DAY} callouts a day. Back it up on the board.`);
    const line = CALLOUT_LINES[Number(lineIndex)] || CALLOUT_LINES[0];
    const r = this.db.prepare('INSERT INTO callouts (from_id, to_id, line, date, created_at) VALUES (?, ?, ?, ?, ?)').run(fromId, toId, line, dateKey, this.now());
    const from = this.db.prepare('SELECT display_name FROM users WHERE id = ?').get(fromId).display_name;
    this.engine.notify(toId, 'callout', `${from} called you out`, `"${line}" Answer it on the board, or accept the head-to-head.`);
    if (this.community) { const w = this.community._who(fromId); const v = this.community._who(toId); if (w && v && w.pub && v.pub) this.community.post(fromId, 'callout', `${w.name} called out ${v.name}: "${line}"`, { city: w.city }); }
    this.onEvent(toId, 'callout', { id: r.lastInsertRowid, fromId, fromName: from, line });
    return { id: r.lastInsertRowid, fromId, toId, line, date: dateKey };
  }
  /** The called-out player accepts: a head-to-head for tomorrow, auto-accepted on both sides. */
  /** The called-out player accepts. For a fan's callout ("Ava, go get Ben") it is Ava, the Legend named, who accepts. */
  accept(userId, calloutId) {
    const c = this.db.prepare('SELECT * FROM callouts WHERE id = ?').get(calloutId);
    if (!c || (c.fan_id ? c.from_id !== userId : c.to_id !== userId)) throw new Error('No such callout');
    if (c.challenge_id) return this.engine.challenge(c.challenge_id);
    const other = this.db.prepare('SELECT email FROM users WHERE id = ?').get(c.fan_id ? c.to_id : c.from_id);
    const ch = this.engine.createChallenge(userId, other.email, Fun.shift(c.date, 1), { autoAccept: true });
    this.db.prepare('UPDATE callouts SET challenge_id = ? WHERE id = ?').run(ch.id, calloutId);
    this.engine.notify(c.fan_id ? c.to_id : c.from_id, 'callout', c.fan_id ? `${this.db.prepare('SELECT display_name FROM users WHERE id = ?').get(userId).display_name} is coming for you` : 'They accepted', 'Head-to-head tomorrow. Bring it.');
    if (c.fan_id) this.engine.notify(c.fan_id, 'fan', 'Your callout landed', 'They accepted. Head-to-head tomorrow.', { push: false });
    return ch;
  }
  callouts(userId, limit = 10) {
    return this.db.prepare('SELECT c.*, a.display_name AS from_name, b.display_name AS to_name, f.display_name AS fan_name FROM callouts c JOIN users a ON a.id = c.from_id JOIN users b ON b.id = c.to_id LEFT JOIN users f ON f.id = c.fan_id WHERE c.from_id = ? OR c.to_id = ? ORDER BY c.created_at DESC LIMIT ?').all(userId, userId, limit)
      .map(c => ({ id: c.id, fromId: c.from_id, toId: c.to_id, fromName: c.fan_id ? c.fan_name : c.from_name, toName: c.to_name, legendName: c.from_name, line: c.line, date: c.date, challengeId: c.challenge_id, fan: !!c.fan_id, mine: c.fan_id ? c.from_id !== userId : c.from_id === userId }));
  }

  /** What the bot says on the Today screen right now. */
  mood(userId, plan, rank, localHour) {
    const p = plan.progress;
    const ctx = { name: this.botName(userId) };
    if (plan.status === 'closed') return { name: ctx.name, line: 'Day closed. I am already on tomorrow.' };
    if (rank && rank.benched) return { name: ctx.name, line: this.line('benched') };
    if (rank && rank.rank === 1 && p.score > 0) return { name: ctx.name, line: this.line('leading') };
    if (p.tasksDone === 0 && localHour >= 12) return { name: ctx.name, line: this.line('idle') };
    if (localHour >= 20) return { name: ctx.name, line: this.line('closing') };
    if (p.tasksDone > 0) { const c = Math.max(0, ...plan.tasks.map(t => t.combo || 0)); return { name: ctx.name, line: c > 1 ? this.line('combo', { n: c }) : this.line('approve') }; }
    return { name: ctx.name, line: this.line('morning') };
  }
}

module.exports = Fun;
module.exports.constants = { COMBO_STEP, COMBO_CAP, BOSS_MULT, POWER_MULT, CALLOUTS_PER_DAY, CALLOUT_LINES, TITLES: TITLES.map(([k, n]) => ({ key: k, name: n })), QUESTS: QUESTS.map(q => ({ key: q.key, label: q.label, target: q.target, reward: q.reward })) };
