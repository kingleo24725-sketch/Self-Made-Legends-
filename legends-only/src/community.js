'use strict';
// Copyright (c) 2026 Self-Made Legends LLC. All rights reserved. Proprietary and confidential. See LICENSE.

// Everything that makes Self-Made Legends a public thing rather than a private
// planner: the live Grind Feed, shareable receipt cards, streak stories, the
// 8pm Final Call, the Monday Money Bracket, City vs City, Challenge Days,
// sponsored prize pools, the weekly Legend of the Week show, mentors,
// Self-Made Legends University, safety check-ins, and the crew's weekly ideas
// report to the owner.

const crypto = require('crypto');
const University = require('./university');
const { CATEGORIES } = require('./playbook');

const STORY_STREAKS = [7, 30, 100];
const FINAL_CALL_HOUR = 20;
const BRACKET_MAX = 64;
const FEED_LIMIT = 200;

class Community {
  constructor(db, { engine, money, crew, push, now, onEvent } = {}) {
    this.db = db; this.engine = engine; this.money = money; this.crew = crew; this.push = push || null;
    this.now = now || (() => Date.now());
    this.onEvent = onEvent || (() => {});
  }

  static firstName(name) { return String(name || 'A Legend').trim().split(/\s+/)[0]; }
  static weekStart(dateKey) { const d = new Date(dateKey + 'T00:00:00Z'); const dow = (d.getUTCDay() + 6) % 7; d.setUTCDate(d.getUTCDate() - dow); return d.toISOString().slice(0, 10); }
  static shift(dateKey, n) { const d = new Date(dateKey + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
  todayUTC() { return new Date(this.now()).toISOString().slice(0, 10); }

  // ── Grind Feed ───────────────────────────────────────────────────────────
  post(userId, kind, text, { city = '', amountCents = 0 } = {}) {
    this.db.prepare('INSERT INTO feed (user_id, kind, text, city, amount_cents, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(userId, kind, text, city, amountCents, this.now());
    this.db.prepare(`DELETE FROM feed WHERE id NOT IN (SELECT id FROM feed ORDER BY created_at DESC LIMIT ${FEED_LIMIT})`).run();
    this.onEvent(null, 'feed', { kind, text, city, amountCents });
  }
  feed(limit = 40) {
    return this.db.prepare('SELECT kind, text, city, amount_cents, created_at FROM feed ORDER BY created_at DESC, id DESC LIMIT ?').all(limit)
      .map(r => ({ kind: r.kind, text: r.text, city: r.city, amountCents: r.amount_cents, at: r.created_at }));
  }
  _who(userId) {
    const r = this.db.prepare('SELECT u.display_name, u.public_profile, p.city, p.region FROM users u LEFT JOIN profiles p ON p.user_id = u.id WHERE u.id = ?').get(userId);
    if (!r) return null;
    return { name: Community.firstName(r.display_name), city: [r.city, r.region].filter(Boolean).join(', '), pub: !!r.public_profile };
  }
  onTaskDone(userId, task) {
    const w = this._who(userId); if (!w || !w.pub) return;
    this.post(userId, 'done', `${w.name}${w.city ? ' in ' + w.city : ''} just finished ${task.title.toLowerCase()}${task.earningsCents ? ' and logged $' + (task.earningsCents / 100).toFixed(0) : ''}.`, { city: w.city, amountCents: task.earningsCents || 0 });
  }
  onVerified(userId, task, cents, source) {
    const w = this._who(userId); if (!w || !w.pub) return;
    this.post(userId, 'verified', `${w.name}${w.city ? ' in ' + w.city : ''} just verified $${(cents / 100).toFixed(0)}${source ? ' from ' + source : ''} for ${task.title.toLowerCase()}.`, { city: w.city, amountCents: cents });
  }
  onChampion(userId, dateKey, score) {
    const w = this._who(userId); if (!w) return;
    this.post(userId, 'champion', `${w.name}${w.city ? ' in ' + w.city : ''} is Legend of the Day for ${dateKey} with ${score} points.`, { city: w.city });
  }

  // ── Receipt cards (shareable proof of a day) ─────────────────────────────
  card(userId, dateKey) {
    const s = this.db.prepare('SELECT s.*, u.display_name, u.public_profile, p.city, p.region FROM daily_scores s JOIN users u ON u.id = s.user_id LEFT JOIN profiles p ON p.user_id = s.user_id WHERE s.user_id = ? AND s.date = ?').get(userId, dateKey);
    if (!s) return null;
    return {
      userId, date: dateKey, name: s.display_name, city: [s.city, s.region].filter(Boolean).join(', '), public: !!s.public_profile,
      score: s.score, tasksDone: s.tasks_done, tasksTotal: s.tasks_total, hoursDone: s.hours_done,
      earningsCents: s.earnings_cents, verifiedCents: s.verified_cents, rank: s.rank, streak: s.streak, league: s.league, closed: !!s.closed,
      url: `/card/${userId}/${dateKey}`,
    };
  }
  cardSVG(card) {
    const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const money = (c) => '$' + (c / 100).toLocaleString('en-US', { maximumFractionDigits: 0 });
    const line = (x, y, label, value, color = '#eef0f5') => `<text x="${x}" y="${y}" font-size="22" fill="#8d95a8" font-family="Helvetica,Arial,sans-serif">${esc(label)}</text><text x="${x}" y="${y + 44}" font-size="44" font-weight="800" fill="${color}" font-family="Helvetica,Arial,sans-serif">${esc(value)}</text>`;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 1080 1080">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1b1a12"/><stop offset="1" stop-color="#0b0d12"/></linearGradient></defs>
<rect width="1080" height="1080" fill="url(#g)"/><rect x="40" y="40" width="1000" height="1000" rx="48" fill="none" stroke="#f5b942" stroke-width="4" opacity=".6"/>
<text x="80" y="140" font-size="40" font-weight="900" fill="#eef0f5" font-family="Helvetica,Arial,sans-serif">RISE <tspan fill="#f5b942">N</tspan> GRIND</text>
<text x="1000" y="140" font-size="26" fill="#8d95a8" text-anchor="end" font-family="Helvetica,Arial,sans-serif">${esc(card.date)}</text>
<text x="80" y="260" font-size="64" font-weight="800" fill="#eef0f5" font-family="Helvetica,Arial,sans-serif">${esc(card.name)}</text>
<text x="80" y="310" font-size="28" fill="#8d95a8" font-family="Helvetica,Arial,sans-serif">${esc(card.city || 'Somewhere on the grind')} · ${esc(String(card.league || '').toUpperCase())} LEAGUE${card.streak ? ' · ' + card.streak + '-DAY STREAK' : ''}</text>
${line(80, 420, 'SCORE', String(card.score), '#f5b942')}
${line(560, 420, 'WORLD RANK', card.rank ? '#' + card.rank : 'live')}
${line(80, 580, 'PLAYS DONE', `${card.tasksDone} of ${card.tasksTotal}`)}
${line(560, 580, 'HOURS', String(card.hoursDone))}
${line(80, 740, 'LOGGED', money(card.earningsCents), '#3ddc84')}
${line(560, 740, 'VERIFIED', money(card.verifiedCents), '#5aa9ff')}
<text x="80" y="920" font-size="30" fill="#eef0f5" font-family="Helvetica,Arial,sans-serif">${card.tasksDone === card.tasksTotal && card.tasksTotal ? 'Every play done. Full day.' : 'Another day on the grind.'}</text>
<text x="80" y="980" font-size="24" fill="#8d95a8" font-family="Helvetica,Arial,sans-serif">Think you can beat this? Self-Made Legends by SML · earnings self-reported unless marked verified</text>
</svg>`;
  }

  // ── Streak stories ───────────────────────────────────────────────────────
  async maybeStory(userId, streak, dateKey) {
    if (!STORY_STREAKS.includes(streak)) return null;
    if (this.db.prepare('SELECT 1 FROM stories WHERE user_id = ? AND kind = ?').get(userId, `streak_${streak}`)) return null;
    const u = this.db.prepare('SELECT u.display_name, p.location, p.memory FROM users u LEFT JOIN profiles p ON p.user_id = u.id WHERE u.id = ?').get(userId);
    const since = Community.shift(dateKey, -(streak - 1));
    const agg = this.db.prepare('SELECT COALESCE(SUM(earnings_cents),0) AS e, COALESCE(SUM(verified_cents),0) AS v, COALESCE(SUM(tasks_done),0) AS d, COALESCE(MAX(earnings_cents),0) AS best, MIN(rank) AS r FROM daily_scores WHERE user_id = ? AND date >= ? AND date <= ?').get(userId, since, dateKey);
    const top = this.db.prepare(`SELECT t.title, COUNT(*) AS n FROM tasks t JOIN plans p ON p.id = t.plan_id WHERE p.user_id = ? AND p.date >= ? AND t.status = 'done' GROUP BY t.title ORDER BY n DESC LIMIT 1`).get(userId, since);
    let note = ''; try { note = (JSON.parse(u.memory || '{}').notes || [])[0] || ''; } catch (_) {}
    const facts = { name: u.display_name, location: u.location || '', days: streak, earnedCents: agg.e, verifiedCents: agg.v, playsDone: agg.d, bestDayCents: agg.best, bestRank: agg.r, topPlay: top ? top.title : '', note };
    const story = await this.crew.story(null, facts);
    const r = this.db.prepare('INSERT INTO stories (user_id, kind, title, body, data, public, created_at) VALUES (?, ?, ?, ?, ?, 1, ?)').run(userId, `streak_${streak}`, story.title, story.body, JSON.stringify(facts), this.now());
    this.engine.notify(userId, 'story', `Your ${streak}-day story is written`, 'Share it from your profile. Local news runs stories like this.');
    this.engine.awardBadge(userId, `streak_${streak}`, dateKey, `${streak} days straight`);
    return this.story(r.lastInsertRowid);
  }
  story(id) {
    const r = this.db.prepare('SELECT s.*, u.display_name FROM stories s JOIN users u ON u.id = s.user_id WHERE s.id = ?').get(id);
    return r && { id: r.id, userId: r.user_id, name: r.display_name, kind: r.kind, title: r.title, body: r.body, facts: JSON.parse(r.data || '{}'), at: r.created_at, url: `/story/${r.id}` };
  }
  stories(userId) { return this.db.prepare('SELECT id FROM stories WHERE user_id = ? ORDER BY created_at DESC').all(userId).map(r => this.story(r.id)); }
  latestStories(limit = 10) { return this.db.prepare('SELECT id FROM stories WHERE public = 1 ORDER BY created_at DESC LIMIT ?').all(limit).map(r => this.story(r.id)); }

  // ── Public profile ───────────────────────────────────────────────────────
  publicProfile(name) {
    const u = this.db.prepare('SELECT u.id, u.display_name, u.public_profile, u.stripe_account_id, p.city, p.region, p.goals FROM users u LEFT JOIN profiles p ON p.user_id = u.id WHERE lower(u.display_name) = lower(?)').get(String(name || ''));
    if (!u || !u.public_profile) return null;
    const stats = this.engine.stats(u.id);
    const badges = this.engine.badges(u.id);
    const last = this.engine.history(u.id, 7);
    const mentor = this.db.prepare('SELECT topics, price_cents, bio FROM mentors WHERE user_id = ? AND active = 1').get(u.id);
    return {
      id: u.id, displayName: u.display_name, city: [u.city, u.region].filter(Boolean).join(', '), goals: u.goals || '',
      stats, badges, lastDays: last, stories: this.stories(u.id), tips: this.money.tipsFor(u.id, 5),
      mentor: mentor ? { topics: JSON.parse(mentor.topics || '[]'), priceCents: mentor.price_cents, bio: mentor.bio || '' } : null,
      url: `/u/${encodeURIComponent(u.display_name)}`,
    };
  }

  // ── Final Call (8pm local) ───────────────────────────────────────────────
  finalCall(profile, today) {
    if (this.engine.localHour(profile) < FINAL_CALL_HOUR) return false;
    const row = this.db.prepare('SELECT final_call_sent FROM profiles WHERE user_id = ?').get(profile.userId);
    if (row && row.final_call_sent === today) return false;
    const plan = this.db.prepare("SELECT 1 FROM plans WHERE user_id = ? AND date = ? AND status = 'open'").get(profile.userId, today);
    if (!plan) return false;
    const rank = this.engine.myRank(profile.userId, today);
    const leader = this.db.prepare('SELECT score FROM daily_scores WHERE date = ? ORDER BY score DESC LIMIT 1').get(today);
    const gap = leader && rank ? Math.max(0, leader.score - rank.score) : 0;
    this.db.prepare('UPDATE profiles SET final_call_sent = ? WHERE user_id = ?').run(today, profile.userId);
    const body = rank ? `You are #${rank.rank} of ${rank.of}${gap ? `, ${gap} points behind the leader` : ', and you are leading'}. The day closes at midnight.` : 'The day closes at midnight. Log what you did.';
    this.engine.notify(profile.userId, 'final_call', 'Final Call: 4 hours left', body);
    return true;
  }

  // ── Self-Made Legends University ──────────────────────────────────────────────
  lessonFor(userId, dateKey) {
    const passed = this.db.prepare('SELECT lesson_id FROM lesson_progress WHERE user_id = ? AND correct = 1').all(userId).map(r => r.lesson_id);
    const l = University.lessonFor(userId, dateKey, passed);
    const done = this.db.prepare('SELECT correct FROM lesson_progress WHERE user_id = ? AND lesson_id = ?').get(userId, l.id);
    return { ...l, answered: !!done, correct: done ? !!done.correct : null, passedCount: passed.length, total: University.LESSONS.length };
  }
  answerLesson(userId, dateKey, lessonId, answerIndex) {
    const res = University.check(lessonId, answerIndex);
    if (!res) throw new Error('Unknown lesson');
    if (this.db.prepare('SELECT 1 FROM lesson_progress WHERE user_id = ? AND lesson_id = ?').get(userId, lessonId)) throw new Error('You already answered that one');
    this.db.prepare('INSERT INTO lesson_progress (user_id, lesson_id, date, correct, created_at) VALUES (?, ?, ?, ?, ?)').run(userId, lessonId, dateKey, res.correct ? 1 : 0, this.now());
    if (res.correct) {
      this.db.prepare('INSERT INTO daily_scores (user_id, date, lesson_points, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(user_id, date) DO UPDATE SET lesson_points = lesson_points + excluded.lesson_points').run(userId, dateKey, University.POINTS_PER_CORRECT, this.now());
      const plan = this.engine.getPlan(userId, dateKey);
      if (plan) this.engine._upsertScore(userId, dateKey, plan);
      const passed = this.db.prepare('SELECT COUNT(*) AS c FROM lesson_progress WHERE user_id = ? AND correct = 1').get(userId).c;
      if (passed === University.LESSONS.length) this.engine.awardBadge(userId, 'graduate', dateKey, 'Finished Self-Made Legends University');
    }
    return { ...res, points: res.correct ? University.POINTS_PER_CORRECT : 0 };
  }

  // ── Safety check-ins for in-person plays ─────────────────────────────────
  startSafety(userId, { taskId = null, place = '', eta = '' } = {}) {
    const token = crypto.randomBytes(9).toString('base64url');
    this.db.prepare('INSERT INTO safety_sessions (token, user_id, task_id, place, eta, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(token, userId, taskId, String(place).slice(0, 160), String(eta).slice(0, 40), 'heading', this.now(), this.now());
    return this.safety(token);
  }
  updateSafety(userId, token, status) {
    if (!['heading', 'arrived', 'done', 'help'].includes(status)) throw new Error('Unknown status');
    const r = this.db.prepare('UPDATE safety_sessions SET status = ?, updated_at = ? WHERE token = ? AND user_id = ?').run(status, this.now(), token, userId);
    if (!r.changes) throw new Error('Not found');
    return this.safety(token);
  }
  safety(token) {
    const s = this.db.prepare('SELECT s.*, u.display_name, p.safety_contact FROM safety_sessions s JOIN users u ON u.id = s.user_id LEFT JOIN profiles p ON p.user_id = s.user_id WHERE s.token = ?').get(token);
    if (!s) return null;
    const task = s.task_id ? this.db.prepare('SELECT title FROM tasks WHERE id = ?').get(s.task_id) : null;
    return { token, name: s.display_name, task: task ? task.title : '', place: s.place, eta: s.eta, status: s.status, contact: s.safety_contact || '', startedAt: s.created_at, updatedAt: s.updated_at, url: `/safe/${token}` };
  }
  activeSafety(userId) { return this.db.prepare("SELECT token FROM safety_sessions WHERE user_id = ? AND status IN ('heading','arrived','help') ORDER BY created_at DESC LIMIT 1").get(userId); }

  // ── Mentors ──────────────────────────────────────────────────────────────
  becomeMentor(userId, { topics = [], priceDollars = 5, bio = '' } = {}) {
    const stats = this.engine.stats(userId);
    if (stats.days < 7 && !stats.wins) throw new Error('Mentors need 7 closed days or a world win first');
    const price = Math.max(200, Math.min(20_000, Math.round(Number(priceDollars) * 100) || 500));
    this.db.prepare('INSERT INTO mentors (user_id, topics, price_cents, bio, active, created_at) VALUES (?, ?, ?, ?, 1, ?) ON CONFLICT(user_id) DO UPDATE SET topics=excluded.topics, price_cents=excluded.price_cents, bio=excluded.bio, active=1')
      .run(userId, JSON.stringify((Array.isArray(topics) ? topics : []).map(t => String(t).slice(0, 40)).slice(0, 6)), price, String(bio).slice(0, 300), this.now());
    return this.mentors().find(m => m.userId === userId);
  }
  stopMentoring(userId) { this.db.prepare('UPDATE mentors SET active = 0 WHERE user_id = ?').run(userId); }
  mentors(limit = 30) {
    return this.db.prepare('SELECT m.*, u.display_name, p.city, p.region FROM mentors m JOIN users u ON u.id = m.user_id LEFT JOIN profiles p ON p.user_id = m.user_id WHERE m.active = 1 ORDER BY m.created_at DESC LIMIT ?').all(limit)
      .map(m => ({ userId: m.user_id, name: m.display_name, city: [m.city, m.region].filter(Boolean).join(', '), topics: JSON.parse(m.topics || '[]'), priceCents: m.price_cents, bio: m.bio || '', stats: this.engine.stats(m.user_id) }));
  }
  /** Ask a mentor. The price is recorded now; with Stripe the asker pays through Checkout and the webhook confirms. */
  ask(askerId, mentorId, question) {
    if (askerId === mentorId) throw new Error('Ask someone else');
    const m = this.db.prepare('SELECT * FROM mentors WHERE user_id = ? AND active = 1').get(mentorId);
    if (!m) throw new Error('That mentor is not taking questions');
    question = String(question || '').trim().slice(0, 600);
    if (question.length < 10) throw new Error('Ask a real question');
    const { fee } = this.money.mentorSplit(m.price_cents);
    const r = this.db.prepare('INSERT INTO mentor_questions (mentor_id, asker_id, question, price_cents, fee_cents, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(mentorId, askerId, question, m.price_cents, fee, 'open', this.now());
    this.engine.notify(mentorId, 'mentor', 'New question for you', question.slice(0, 120));
    return this.question(r.lastInsertRowid);
  }
  answer(mentorId, id, answer) {
    const q = this.db.prepare('SELECT * FROM mentor_questions WHERE id = ?').get(id);
    if (!q || q.mentor_id !== mentorId) throw new Error('Not found');
    if (q.status !== 'open') throw new Error('Already answered');
    answer = String(answer || '').trim().slice(0, 2000);
    if (answer.length < 10) throw new Error('Give a real answer');
    const net = q.price_cents - q.fee_cents;
    const tx = this.db.transaction(() => {
      this.db.prepare('UPDATE mentor_questions SET answer = ?, status = ?, answered_at = ? WHERE id = ?').run(answer, 'answered', this.now(), id);
      this.db.prepare('UPDATE users SET payout_balance_cents = payout_balance_cents + ? WHERE id = ?').run(net, mentorId);
      this.money.record('mentor', { userId: mentorId, gross: q.price_cents, fee: q.fee_cents, net, status: 'paid', ref: `q:${id}` });
    });
    tx();
    this.engine.notify(q.asker_id, 'mentor', 'Your mentor answered', answer.slice(0, 120));
    return this.question(id);
  }
  question(id) {
    const q = this.db.prepare('SELECT q.*, a.display_name AS asker, m.display_name AS mentor FROM mentor_questions q JOIN users a ON a.id = q.asker_id JOIN users m ON m.id = q.mentor_id WHERE q.id = ?').get(id);
    return q && { id: q.id, mentorId: q.mentor_id, mentor: q.mentor, askerId: q.asker_id, asker: q.asker, question: q.question, answer: q.answer, priceCents: q.price_cents, status: q.status, at: q.created_at };
  }
  questionsFor(userId) { return this.db.prepare('SELECT id FROM mentor_questions WHERE mentor_id = ? OR asker_id = ? ORDER BY created_at DESC LIMIT 30').all(userId, userId).map(r => this.question(r.id)); }

  // ── City vs City ─────────────────────────────────────────────────────────
  cityBoard(weekStart, limit = 20) {
    const end = Community.shift(weekStart, 6);
    return this.db.prepare(
      `SELECT city, region, country, COUNT(DISTINCT user_id) AS players, SUM(verified_cents) AS verified, SUM(earnings_cents) AS logged, SUM(score) AS score
       FROM daily_scores WHERE date >= ? AND date <= ? AND city != '' GROUP BY country, region, city ORDER BY verified DESC, score DESC LIMIT ?`
    ).all(weekStart, end, limit).map((r, i) => ({ rank: i + 1, city: [r.city, r.region].filter(Boolean).join(', '), country: r.country, players: r.players, verifiedCents: r.verified, loggedCents: r.logged, score: r.score }));
  }
  cityMatchup(weekStart) {
    const top = this.cityBoard(weekStart, 2);
    if (top.length < 2) return null;
    const [a, b] = top;
    const total = (a.verifiedCents + b.verifiedCents) || 1;
    return { weekStart, a, b, aPct: Math.round(a.verifiedCents / total * 100), leader: a.city };
  }

  // ── Monday Money Bracket ─────────────────────────────────────────────────
  /** Open (or fetch) this week's bracket. Seeds by last week's verified earnings, score as tiebreak. */
  ensureBracket(weekStart, { entryCents = 0 } = {}) {
    let b = this.db.prepare('SELECT * FROM brackets WHERE week_start = ?').get(weekStart);
    if (b) return this.bracket(b.id);
    const r = this.db.prepare('INSERT INTO brackets (week_start, status, entry_cents, created_at) VALUES (?, ?, ?, ?)').run(weekStart, 'open', entryCents, this.now());
    return this.bracket(r.lastInsertRowid);
  }
  enterBracket(userId, weekStart) {
    const b = this.ensureBracket(weekStart);
    if (b.status !== 'open') throw new Error('This week\'s bracket is already running');
    if (this.db.prepare('SELECT 1 FROM bracket_entries WHERE bracket_id = ? AND user_id = ?').get(b.id, userId)) return this.bracket(b.id);
    if (b.entries.length >= BRACKET_MAX) throw new Error('Bracket is full');
    const tx = this.db.transaction(() => {
      this.db.prepare('INSERT INTO bracket_entries (bracket_id, user_id, created_at) VALUES (?, ?, ?)').run(b.id, userId, this.now());
      if (b.entryCents > 0) {
        const { fee, net } = this.money.poolSplit(b.entryCents);
        this.db.prepare('UPDATE brackets SET pool_cents = pool_cents + ? WHERE id = ?').run(net, b.id);
        this.money.record('bracket_entry', { userId, gross: b.entryCents, fee, net, status: 'paid', ref: `bracket:${b.id}` });
      }
    });
    tx();
    return this.bracket(b.id);
  }
  /** Lock entries and build round one. Runs Monday. */
  startBracket(weekStart) {
    const b = this.db.prepare('SELECT * FROM brackets WHERE week_start = ?').get(weekStart);
    if (!b || b.status !== 'open') return null;
    const prevStart = Community.shift(weekStart, -7), prevEnd = Community.shift(weekStart, -1);
    const entries = this.db.prepare('SELECT user_id FROM bracket_entries WHERE bracket_id = ?').all(b.id).map(e => {
      const s = this.db.prepare('SELECT COALESCE(SUM(verified_cents),0) AS v, COALESCE(SUM(score),0) AS sc FROM daily_scores WHERE user_id = ? AND date >= ? AND date <= ?').get(e.user_id, prevStart, prevEnd);
      return { userId: e.user_id, v: s.v, sc: s.sc };
    }).sort((x, y) => y.v - x.v || y.sc - x.sc);
    if (entries.length < 2) { this.db.prepare("UPDATE brackets SET status = 'cancelled' WHERE id = ?").run(b.id); return this.bracket(b.id); }
    let size = 2; while (size * 2 <= entries.length && size < BRACKET_MAX) size *= 2;
    const seeded = entries.slice(0, size);
    const tx = this.db.transaction(() => {
      seeded.forEach((e, i) => this.db.prepare('UPDATE bracket_entries SET seed = ? WHERE bracket_id = ? AND user_id = ?').run(i + 1, b.id, e.userId));
      for (const e of entries.slice(size)) this.db.prepare('UPDATE bracket_entries SET alive = 0, eliminated_round = 0 WHERE bracket_id = ? AND user_id = ?').run(b.id, e.userId);
      for (let i = 0; i < size / 2; i++) {
        this.db.prepare('INSERT INTO bracket_matches (bracket_id, round, date, a_id, b_id) VALUES (?, 1, ?, ?, ?)').run(b.id, weekStart, seeded[i].userId, seeded[size - 1 - i].userId);
      }
      this.db.prepare("UPDATE brackets SET status = 'running', size = ?, round = 1 WHERE id = ?").run(size, b.id);
    });
    tx();
    for (const e of seeded) this.engine.notify(e.userId, 'bracket', 'Monday Money Bracket is on', `You are seed #${seeded.indexOf(e) + 1} of ${size}. Round one is today. Higher score wins.`);
    return this.bracket(b.id);
  }
  /** Settle the current round once its date has passed for everyone, then build the next. */
  advanceBracket(weekStart, todayKey) {
    const b = this.db.prepare('SELECT * FROM brackets WHERE week_start = ?').get(weekStart);
    if (!b || b.status !== 'running') return null;
    const matches = this.db.prepare('SELECT * FROM bracket_matches WHERE bracket_id = ? AND round = ? AND settled = 0').all(b.id, b.round);
    if (!matches.length) return this.bracket(b.id);
    if (matches[0].date >= todayKey) return this.bracket(b.id);
    if (this.db.prepare("SELECT 1 FROM plans WHERE date = ? AND status = 'open' AND user_id IN (SELECT user_id FROM bracket_entries WHERE bracket_id = ? AND alive = 1)").get(matches[0].date, b.id)) return this.bracket(b.id);
    const sc = (uid, d) => (this.db.prepare('SELECT score FROM daily_scores WHERE user_id = ? AND date = ?').get(uid, d) || {}).score || 0;
    const winners = [];
    const tx = this.db.transaction(() => {
      for (const m of matches) {
        const a = sc(m.a_id, m.date), bs = m.b_id ? sc(m.b_id, m.date) : -1;
        const seedOf = (uid) => (this.db.prepare('SELECT seed FROM bracket_entries WHERE bracket_id = ? AND user_id = ?').get(b.id, uid) || {}).seed || 99;
        const winner = a > bs ? m.a_id : bs > a ? m.b_id : (seedOf(m.a_id) <= seedOf(m.b_id) ? m.a_id : m.b_id); // tie: higher seed
        const loser = winner === m.a_id ? m.b_id : m.a_id;
        this.db.prepare('UPDATE bracket_matches SET a_score = ?, b_score = ?, winner_id = ?, settled = 1 WHERE id = ?').run(a, Math.max(bs, 0), winner, m.id);
        if (loser) this.db.prepare('UPDATE bracket_entries SET alive = 0, eliminated_round = ? WHERE bracket_id = ? AND user_id = ?').run(b.round, b.id, loser);
        winners.push(winner);
      }
      if (winners.length === 1) {
        this.db.prepare("UPDATE brackets SET status = 'done', winner_id = ? WHERE id = ?").run(winners[0], b.id);
        if (b.pool_cents > 0) {
          this.db.prepare('UPDATE users SET payout_balance_cents = payout_balance_cents + ? WHERE id = ?').run(b.pool_cents, winners[0]);
          this.money.record('bracket_prize', { userId: winners[0], gross: -b.pool_cents, fee: 0, net: -b.pool_cents, status: 'paid', ref: `bracket:${b.id}` });
        }
      } else {
        const nextDate = Community.shift(matches[0].date, 1);
        for (let i = 0; i < winners.length; i += 2) this.db.prepare('INSERT INTO bracket_matches (bracket_id, round, date, a_id, b_id) VALUES (?, ?, ?, ?, ?)').run(b.id, b.round + 1, nextDate, winners[i], winners[i + 1] || null);
        this.db.prepare('UPDATE brackets SET round = round + 1 WHERE id = ?').run(b.id);
      }
    });
    tx();
    if (winners.length === 1) {
      this.engine.awardBadge(winners[0], 'bracket_legend', matches[0].date, 'Won the Monday Money Bracket');
      this.engine.notify(winners[0], 'bracket', 'You won the Monday Money Bracket', b.pool_cents ? `$${(b.pool_cents / 100).toFixed(2)} is in your payout balance.` : 'Bracket Legend. Wear it.');
      const w = this._who(winners[0]); if (w) this.post(winners[0], 'bracket', `${w.name}${w.city ? ' in ' + w.city : ''} won this week's Monday Money Bracket.`, { city: w.city });
    } else for (const w of winners) this.engine.notify(w, 'bracket', `You advanced to round ${b.round + 1}`, 'Next match is tomorrow. Higher score wins.');
    return this.bracket(b.id);
  }
  bracket(id) {
    const b = this.db.prepare('SELECT * FROM brackets WHERE id = ?').get(id);
    if (!b) return null;
    const name = (uid) => uid ? (this.db.prepare('SELECT display_name FROM users WHERE id = ?').get(uid) || {}).display_name || 'Legend' : 'bye';
    return {
      id: b.id, weekStart: b.week_start, status: b.status, size: b.size, round: b.round, entryCents: b.entry_cents, poolCents: b.pool_cents, winnerId: b.winner_id, winnerName: b.winner_id ? name(b.winner_id) : null,
      entries: this.db.prepare('SELECT user_id, seed, alive, eliminated_round FROM bracket_entries WHERE bracket_id = ? ORDER BY seed ASC').all(b.id).map(e => ({ userId: e.user_id, name: name(e.user_id), seed: e.seed, alive: !!e.alive, eliminatedRound: e.eliminated_round })),
      matches: this.db.prepare('SELECT * FROM bracket_matches WHERE bracket_id = ? ORDER BY round, id').all(b.id).map(m => ({ id: m.id, round: m.round, date: m.date, aId: m.a_id, a: name(m.a_id), bId: m.b_id, b: name(m.b_id), aScore: m.a_score, bScore: m.b_score, winnerId: m.winner_id, settled: !!m.settled })),
    };
  }
  currentBracket(todayKey) {
    const ws = Community.weekStart(todayKey);
    const b = this.db.prepare('SELECT id FROM brackets WHERE week_start = ?').get(ws);
    return b ? this.bracket(b.id) : this.ensureBracket(Community.shift(ws, 7));
  }

  // ── Challenge Days (celebrity or brand) ──────────────────────────────────
  createChallengeDay({ name, slug, headline, date, ends, targetScore, targetDollars, plan }) {
    slug = String(slug || name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
    if (!slug || !name) throw new Error('Name and slug required');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) throw new Error('Date required');
    ends = /^\d{4}-\d{2}-\d{2}$/.test(ends || '') ? ends : Community.shift(date, 7);
    this.db.prepare('INSERT INTO challenge_days (slug, name, headline, date, ends, target_score, target_cents, plan_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(slug) DO UPDATE SET name=excluded.name, headline=excluded.headline, date=excluded.date, ends=excluded.ends, target_score=excluded.target_score, target_cents=excluded.target_cents, plan_json=excluded.plan_json')
      .run(slug, String(name).slice(0, 80), String(headline || '').slice(0, 200), date, ends, Math.max(0, parseInt(targetScore, 10) || 0), Math.round((Number(targetDollars) || 0) * 100), plan ? JSON.stringify(plan) : null, this.now());
    return this.challengeDay(slug);
  }
  challengeDay(slug) {
    const c = this.db.prepare('SELECT * FROM challenge_days WHERE slug = ?').get(slug);
    if (!c) return null;
    const beaters = this.db.prepare('SELECT s.user_id, s.score, s.verified_cents, u.display_name FROM daily_scores s JOIN users u ON u.id = s.user_id WHERE s.date >= ? AND s.date <= ? AND s.score > ? ORDER BY s.score DESC LIMIT 50').all(c.date, c.ends, c.target_score);
    const attempts = this.db.prepare('SELECT COUNT(DISTINCT user_id) AS n FROM daily_scores WHERE date >= ? AND date <= ?').get(c.date, c.ends).n;
    return { slug: c.slug, name: c.name, headline: c.headline, date: c.date, ends: c.ends, targetScore: c.target_score, targetCents: c.target_cents, plan: c.plan_json ? JSON.parse(c.plan_json) : null, attempts, beaters: beaters.map((b, i) => ({ rank: i + 1, userId: b.user_id, name: b.display_name, score: b.score, verifiedCents: b.verified_cents })), url: `/challenge/${c.slug}` };
  }
  activeChallenges(todayKey) { return this.db.prepare('SELECT slug FROM challenge_days WHERE date <= ? AND ends >= ? ORDER BY date DESC').all(todayKey, todayKey).map(r => this.challengeDay(r.slug)); }
  awardChallengeBadges(dateKey) {
    for (const c of this.db.prepare('SELECT * FROM challenge_days WHERE date <= ? AND ends >= ?').all(dateKey, dateKey)) {
      for (const s of this.db.prepare('SELECT user_id FROM daily_scores WHERE date = ? AND score > ? AND closed = 1').all(dateKey, c.target_score)) {
        if (this.engine.awardBadge(s.user_id, `beat_${c.slug}`, dateKey, `Beat ${c.name}'s challenge`)) this.engine.notify(s.user_id, 'challenge_day', `You beat ${c.name}`, `Your ${dateKey} score topped the ${c.name} challenge.`);
      }
    }
  }

  // ── Sponsored prize pools ────────────────────────────────────────────────
  createPrizePool({ month, sponsor, amountDollars, rules }) {
    if (!/^\d{4}-\d{2}$/.test(month || '')) throw new Error('Month as YYYY-MM');
    const amount = Math.round((Number(amountDollars) || 0) * 100);
    if (amount < 100) throw new Error('Amount required');
    const { fee, net } = this.money.poolSplit(amount);
    this.db.prepare('INSERT INTO prize_pools (month, sponsor, amount_cents, fee_cents, rules, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(month) DO UPDATE SET sponsor=excluded.sponsor, amount_cents=excluded.amount_cents, fee_cents=excluded.fee_cents, rules=excluded.rules')
      .run(month, String(sponsor).slice(0, 80), net, fee, String(rules || 'Top receipt-verified earner of the month wins. Skill contest: earnings are work, not chance. Void where prohibited.').slice(0, 1000), 'open', this.now());
    this.money.record('sponsorship', { gross: amount, fee, net, status: 'paid', ref: `pool:${month}`, note: sponsor });
    return this.prizePool(month);
  }
  prizePool(month) {
    const p = this.db.prepare('SELECT * FROM prize_pools WHERE month = ?').get(month);
    if (!p) return null;
    const standings = this.db.prepare('SELECT s.user_id, SUM(s.verified_cents) AS v, SUM(s.score) AS sc, u.display_name FROM daily_scores s JOIN users u ON u.id = s.user_id WHERE substr(s.date, 1, 7) = ? AND s.closed = 1 GROUP BY s.user_id ORDER BY v DESC, sc DESC LIMIT 10').all(month);
    return { month: p.month, sponsor: p.sponsor, amountCents: p.amount_cents, rules: p.rules, status: p.status, winnerId: p.winner_id, standings: standings.map((s, i) => ({ rank: i + 1, userId: s.user_id, name: s.display_name, verifiedCents: s.v, score: s.sc })) };
  }
  settlePrizePool(month) {
    const p = this.prizePool(month);
    if (!p || p.status !== 'open' || !p.standings.length || p.standings[0].verifiedCents <= 0) return null;
    const w = p.standings[0];
    const tx = this.db.transaction(() => {
      this.db.prepare("UPDATE prize_pools SET status = 'paid', winner_id = ? WHERE month = ?").run(w.userId, month);
      this.db.prepare('UPDATE users SET payout_balance_cents = payout_balance_cents + ? WHERE id = ?').run(p.amountCents, w.userId);
      this.money.record('prize', { userId: w.userId, gross: -p.amountCents, fee: 0, net: -p.amountCents, status: 'paid', ref: `pool:${month}` });
    });
    tx();
    this.engine.awardBadge(w.userId, 'monthly_legend', month + '-01', `${p.sponsor} prize, ${month}`);
    this.engine.notify(w.userId, 'prize', `You won the ${p.sponsor} prize`, `$${(p.amountCents / 100).toFixed(2)} for ${month} is in your payout balance.`);
    const who = this._who(w.userId); if (who) this.post(w.userId, 'prize', `${who.name} won the ${p.sponsor} ${month} prize with $${(w.verifiedCents / 100).toFixed(0)} verified.`, { city: who.city, amountCents: p.amountCents });
    return this.prizePool(month);
  }

  // ── Legend of the Week show ──────────────────────────────────────────────
  weekData(weekEnd) {
    const start = Community.shift(weekEnd, -6);
    const totals = this.db.prepare('SELECT COUNT(DISTINCT user_id) AS players, COALESCE(SUM(tasks_done),0) AS d, COALESCE(SUM(earnings_cents),0) AS e, COALESCE(SUM(verified_cents),0) AS v FROM daily_scores WHERE date >= ? AND date <= ?').get(start, weekEnd);
    const champ = this.db.prepare('SELECT s.user_id, SUM(s.score) AS sc, SUM(s.earnings_cents) AS e, COUNT(*) AS days, u.display_name, p.location FROM daily_scores s JOIN users u ON u.id = s.user_id LEFT JOIN profiles p ON p.user_id = s.user_id WHERE s.date >= ? AND s.date <= ? AND s.closed = 1 GROUP BY s.user_id ORDER BY sc DESC LIMIT 1').get(start, weekEnd);
    let champion = null;
    if (champ) {
      const bestDay = this.db.prepare('SELECT date FROM daily_scores WHERE user_id = ? AND date >= ? AND date <= ? ORDER BY score DESC LIMIT 1').get(champ.user_id, start, weekEnd);
      const plan = bestDay ? this.engine.getPlan(champ.user_id, bestDay.date) : null;
      champion = { userId: champ.user_id, displayName: champ.display_name, location: champ.location || '', totalScore: champ.sc, earnedCents: champ.e, days: champ.days, bestDay: plan ? { date: bestDay.date, tasks: plan.tasks.map(t => ({ title: t.title, status: t.status, earningsCents: t.earningsCents })) } : null };
    }
    const city = this.cityBoard(start, 1)[0];
    return { weekEnd, start, players: totals.players, playsDone: totals.d, earnedCents: totals.e, verifiedCents: totals.v, champion, topCity: city ? { city: city.city, cents: city.verifiedCents } : null };
  }
  async writeShow(weekEnd) {
    if (this.db.prepare('SELECT 1 FROM shows WHERE week_end = ?').get(weekEnd)) return this.show(weekEnd);
    const data = this.weekData(weekEnd);
    const script = await this.crew.show(data);
    this.db.prepare('INSERT INTO shows (week_end, data, created_at) VALUES (?, ?, ?)').run(weekEnd, JSON.stringify({ ...script, week: data }), this.now());
    if (data.champion) { this.engine.awardBadge(data.champion.userId, 'legend_of_week', weekEnd, 'Legend of the Week'); this.engine.notify(data.champion.userId, 'show', 'You are Legend of the Week', 'Your week is this week\'s show. Share it.'); }
    return this.show(weekEnd);
  }
  show(weekEnd) { const r = this.db.prepare('SELECT * FROM shows WHERE week_end = ?').get(weekEnd); return r && { weekEnd, ...JSON.parse(r.data), url: `/show/${weekEnd}` }; }
  shows(limit = 8) { return this.db.prepare('SELECT week_end FROM shows ORDER BY week_end DESC LIMIT ?').all(limit).map(r => this.show(r.week_end)); }

  // ── The crew's ideas for the owner ───────────────────────────────────────
  appStats(weekEnd) {
    const start = Community.shift(weekEnd, -6);
    const tasks = this.db.prepare(`SELECT COALESCE(t.play_id, t.title) AS key, t.title, t.status, t.earnings_cents, p.plan_json FROM tasks t JOIN plans p ON p.id = t.plan_id WHERE p.date >= ? AND p.date <= ? AND p.status = 'closed'`).all(start, weekEnd);
    const byKey = {};
    for (const t of tasks) {
      const s = byKey[t.key] || (byKey[t.key] = { title: t.title, n: 0, skipped: 0, done: 0, earned: 0, est: 0 });
      s.n++; if (t.status === 'skipped') s.skipped++;
      if (t.status === 'done') { s.done++; s.earned += t.earnings_cents; try { const est = (JSON.parse(t.plan_json).tasks.find(x => (x.playId || x.title) === t.key) || {}).estimatedEarnings; if (est) s.est += Math.round((est.low + est.high) / 2 * 100); } catch (_) {} }
    }
    const skipRate = Object.values(byKey).filter(s => s.n >= 3).map(s => ({ title: s.title, rate: s.skipped / s.n, n: s.n })).sort((a, b) => b.rate - a.rate).slice(0, 5);
    const earnRatio = Object.values(byKey).filter(s => s.done >= 3 && s.est > 0).map(s => ({ title: s.title, ratio: s.earned / s.est, n: s.done })).sort((a, b) => b.ratio - a.ratio);
    const money = this.db.prepare('SELECT COALESCE(SUM(earnings_cents),0) AS e, COALESCE(SUM(verified_cents),0) AS v, COUNT(DISTINCT user_id) AS active FROM daily_scores WHERE date >= ? AND date <= ?').get(start, weekEnd);
    const first = this.db.prepare('SELECT user_id, MIN(date) AS d FROM daily_scores WHERE tasks_done > 0 GROUP BY user_id HAVING d >= ? AND d <= ?').all(Community.shift(start, -7), Community.shift(weekEnd, -1));
    const returned = first.filter(f => this.db.prepare('SELECT 1 FROM daily_scores WHERE user_id = ? AND date > ? AND tasks_done > 0').get(f.user_id, f.d)).length;
    const women = this.db.prepare("SELECT COUNT(*) AS c FROM profiles WHERE gender = 'woman' AND user_id IN (SELECT DISTINCT user_id FROM daily_scores WHERE date >= ? AND date <= ?)").get(start, weekEnd).c;
    const rev = this.money.revenue({ months: 1 }).months[0];
    return { weekEnd, activePlayers: money.active, loggedCents: money.e, verifiedCents: money.v, verifiedShare: money.e ? money.v / money.e : null, retention: first.length ? returned / first.length : null, womenShare: money.active ? women / money.active : null, skipRate, earnRatio, revenue: rev ? { platformCents: rev.platformCents, grossCents: rev.grossCents } : null, tipsThisWeek: this.db.prepare("SELECT COUNT(*) AS c, COALESCE(SUM(gross_cents),0) AS g FROM tips WHERE status = 'paid' AND created_at >= ?").get(this.now() - 7 * 86_400_000) };
  }
  async writeIdeas(weekEnd) {
    if (this.db.prepare('SELECT 1 FROM ideas WHERE week_end = ?').get(weekEnd)) return this.ideas();
    const stats = this.appStats(weekEnd);
    const list = await this.crew.ideas(stats);
    const ins = this.db.prepare('INSERT INTO ideas (week_end, agent, title, body, evidence, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)');
    for (const i of list) ins.run(weekEnd, i.agent, String(i.title).slice(0, 120), String(i.body).slice(0, 1000), String(i.evidence || '').slice(0, 500), 'new', this.now());
    return this.ideas();
  }
  ideas(limit = 30) { return this.db.prepare('SELECT * FROM ideas ORDER BY created_at DESC, id DESC LIMIT ?').all(limit).map(i => ({ id: i.id, weekEnd: i.week_end, agent: i.agent, title: i.title, body: i.body, evidence: i.evidence, status: i.status, at: i.created_at })); }
  setIdeaStatus(id, status) { if (!['new', 'doing', 'done', 'no'].includes(status)) throw new Error('Bad status'); this.db.prepare('UPDATE ideas SET status = ? WHERE id = ?').run(status, id); }

  // ── Weekly and monthly scheduler hooks ───────────────────────────────────
  async weeklyTick(todayKey) {
    const ws = Community.weekStart(todayKey);
    this.ensureBracket(Community.shift(ws, 7));             // next week's bracket is always open for entries
    const cur = this.db.prepare('SELECT * FROM brackets WHERE week_start = ?').get(ws);
    if (cur && cur.status === 'open' && todayKey >= ws) this.startBracket(ws);
    if (cur && cur.status === 'running') this.advanceBracket(ws, todayKey);
    const lastSunday = Community.shift(ws, -1);
    if (todayKey > lastSunday) { await this.writeShow(lastSunday); await this.writeIdeas(lastSunday); }
    const prevMonth = new Date(Date.UTC(Number(todayKey.slice(0, 4)), Number(todayKey.slice(5, 7)) - 2, 1)).toISOString().slice(0, 7);
    if (todayKey.slice(8, 10) >= '02') { this.settlePrizePool(prevMonth); await this.money.closeMonth(prevMonth); }
  }
}

module.exports = Community;
module.exports.constants = { STORY_STREAKS, FINAL_CALL_HOUR, BRACKET_MAX, CATEGORIES };
