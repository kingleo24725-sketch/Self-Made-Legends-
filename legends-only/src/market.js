'use strict';
// Copyright (c) 2026 Self-Made Legends LLC. All rights reserved. Proprietary and confidential. See LICENSE.

// The marketplace side: employers post shifts straight into the Gig Finder,
// local sponsors buy the featured tile in a city, players carry a verified
// track record employers can search, and the city data report.

const crypto = require('crypto');

const POSTING_FEE_CENTS = 500;        // to publish a shift
const RESUME_VIEW_CENTS = 200;        // employer opens a full verified résumé

class Market {
  constructor(db, { engine, money, gigs, now, onEvent } = {}) {
    this.db = db; this.engine = engine; this.money = money; this.gigs = gigs; this.now = now || (() => Date.now()); this.onEvent = onEvent || (() => {});
  }
  static cityKey(location) { return String(location || '').trim().toLowerCase(); }

  // ── Sponsor tiles ────────────────────────────────────────────────────────
  createTile({ sponsor, city, title, body, url, starts, ends, amountDollars }) {
    if (!sponsor || !city || !title || !/^https?:\/\//.test(url || '')) throw new Error('Sponsor, city, title and a real URL are required');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(starts || '') || !/^\d{4}-\d{2}-\d{2}$/.test(ends || '')) throw new Error('Start and end dates required');
    const amount = Math.round((Number(amountDollars) || 0) * 100);
    const r = this.db.prepare('INSERT INTO sponsor_tiles (sponsor, city_key, title, body, url, starts, ends, amount_cents, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(String(sponsor).slice(0, 80), Market.cityKey(city), String(title).slice(0, 100), String(body || '').slice(0, 300), String(url).slice(0, 500), starts, ends, amount, this.now());
    if (amount > 0) this.money.record('sponsor_tile', { gross: amount, fee: amount, net: 0, status: 'paid', ref: `tile:${r.lastInsertRowid}`, note: `${sponsor} · ${city}` });
    return this.tile(r.lastInsertRowid);
  }
  tile(id) { const t = this.db.prepare('SELECT * FROM sponsor_tiles WHERE id = ?').get(id); return t && { id: t.id, sponsor: t.sponsor, city: t.city_key, title: t.title, body: t.body, url: t.url, starts: t.starts, ends: t.ends, amountCents: t.amount_cents, clicks: t.clicks }; }
  tilesFor(location, dateKey) { return this.db.prepare('SELECT id FROM sponsor_tiles WHERE city_key = ? AND starts <= ? AND ends >= ? ORDER BY amount_cents DESC LIMIT 2').all(Market.cityKey(location), dateKey, dateKey).map(r => this.tile(r.id)); }
  click(id) { this.db.prepare('UPDATE sponsor_tiles SET clicks = clicks + 1 WHERE id = ?').run(id); const t = this.tile(id); return t ? t.url : null; }
  tiles(limit = 50) { return this.db.prepare('SELECT id FROM sponsor_tiles ORDER BY created_at DESC LIMIT ?').all(limit).map(r => this.tile(r.id)); }

  // ── Employers and postings ───────────────────────────────────────────────
  registerEmployer(userId, { org, contact, city }) {
    org = String(org || '').trim().slice(0, 80);
    if (org.length < 2) throw new Error('Business name required');
    this.db.prepare('INSERT INTO employers (user_id, org, contact, city_key, created_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET org = excluded.org, contact = excluded.contact, city_key = excluded.city_key')
      .run(userId, org, String(contact || '').slice(0, 120), Market.cityKey(city), this.now());
    this.db.prepare("UPDATE users SET role = 'employer' WHERE id = ?").run(userId);
    return this.employer(userId);
  }
  employer(userId) { const e = this.db.prepare('SELECT * FROM employers WHERE user_id = ?').get(userId); return e && { userId: e.user_id, org: e.org, contact: e.contact, city: e.city_key, verified: !!e.verified }; }

  post(userId, { title, body, city, date, hours, payDollars, slots, difficulty, kind }) {
    const emp = this.employer(userId);
    if (!emp) throw new Error('Register as an employer first');
    title = String(title || '').trim().slice(0, 100);
    if (title.length < 3) throw new Error('Title required');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) throw new Error('Date required');
    const pay = Math.round((Number(payDollars) || 0) * 100);
    if (pay < 1000) throw new Error('Pay must be at least $10');
    const { fee } = this.money.split(pay, this.money.fees.POOL_FEE_PCT);
    const r = this.db.prepare('INSERT INTO postings (employer_id, org, title, body, city_key, city, date, hours, pay_cents, slots, difficulty, kind, fee_cents, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(userId, emp.org, title, String(body || '').slice(0, 600), Market.cityKey(city || emp.city), String(city || emp.city).slice(0, 80), date, Math.max(0.5, Math.min(12, Number(hours) || 4)), pay, Math.max(1, Math.min(50, parseInt(slots, 10) || 1)), Math.max(1, Math.min(10, parseInt(difficulty, 10) || 5)), ['shift', 'gig', 'delivery', 'care', 'online', 'beauty', 'other'].includes(kind) ? kind : 'shift', fee, 'open', this.now());
    this.money.record('posting', { userId, gross: POSTING_FEE_CENTS, fee: POSTING_FEE_CENTS, net: 0, status: 'paid', ref: `posting:${r.lastInsertRowid}`, note: `${emp.org}: ${title}` });
    this.onEvent(null, 'posting', { id: r.lastInsertRowid, city: city || emp.city });
    return this.posting(r.lastInsertRowid);
  }
  posting(id) {
    const p = this.db.prepare('SELECT * FROM postings WHERE id = ?').get(id);
    if (!p) return null;
    const claims = this.db.prepare('SELECT c.*, u.display_name FROM posting_claims c JOIN users u ON u.id = c.user_id WHERE c.posting_id = ?').all(id);
    return { id: p.id, employerId: p.employer_id, org: p.org, title: p.title, body: p.body, city: p.city, date: p.date, hours: p.hours, payCents: p.pay_cents, slots: p.slots, filled: p.filled, difficulty: p.difficulty, kind: p.kind, feeCents: p.fee_cents, status: p.status, points: this.engine.taskPoints(p.difficulty, p.hours), claims: claims.map(c => ({ id: c.id, userId: c.user_id, name: c.display_name, status: c.status, paidCents: c.paid_cents, at: c.created_at })) };
  }
  postingsFor(location, dateKey, limit = 10) { return this.db.prepare("SELECT id FROM postings WHERE city_key = ? AND date >= ? AND status = 'open' AND filled < slots ORDER BY date ASC, pay_cents DESC LIMIT ?").all(Market.cityKey(location), dateKey, limit).map(r => this.posting(r.id)); }
  myPostings(userId) { return this.db.prepare('SELECT id FROM postings WHERE employer_id = ? ORDER BY created_at DESC LIMIT 50').all(userId).map(r => this.posting(r.id)); }

  /** A player claims a posted shift: it becomes a graded play on their plan for that date. */
  claim(userId, postingId) {
    const p = this.posting(postingId);
    if (!p || p.status !== 'open') throw new Error('That posting is closed');
    if (p.filled >= p.slots) throw new Error('All slots are taken');
    if (p.employerId === userId) throw new Error('That is your own posting');
    if (this.db.prepare('SELECT 1 FROM posting_claims WHERE posting_id = ? AND user_id = ?').get(postingId, userId)) throw new Error('You already claimed this');
    const profile = this.engine.getProfile(userId);
    if (!profile) throw new Error('Set up your profile first');
    const dateKey = p.date < this.engine.localDateKey(profile) ? this.engine.localDateKey(profile) : p.date;
    if (!this.engine.getPlan(userId, dateKey)) throw new Error(dateKey === this.engine.localDateKey(profile) ? 'Open today first' : 'You can claim once that day\'s plan exists; the crew builds it by 4am');
    const task = this.engine.addTask(userId, dateKey, { title: `${p.org}: ${p.title}`, icon: '🏢', category: p.kind === 'online' ? 'online' : 'gig', hours: p.hours, difficulty: p.difficulty, steps: [String(p.body || 'Show up on time.'), 'Confirm the details with the employer in messages', 'Do the work; the employer confirms it here and your bot approves it', `Pay: $${(p.payCents / 100).toFixed(2)} for the shift`], why: `Posted directly by ${p.org} for ${p.city}.`, sources: [], estimatedEarnings: { low: p.payCents / 100, high: p.payCents / 100 } });
    this.db.prepare('UPDATE tasks SET posting_id = ? WHERE id = ?').run(postingId, task.taskId);
    const tx = this.db.transaction(() => {
      this.db.prepare('INSERT INTO posting_claims (posting_id, user_id, task_id, status, created_at) VALUES (?, ?, ?, ?, ?)').run(postingId, userId, task.taskId, 'claimed', this.now());
      this.db.prepare("UPDATE postings SET filled = filled + 1, status = CASE WHEN filled + 1 >= slots THEN 'filled' ELSE status END WHERE id = ?").run(postingId);
    });
    tx();
    this.engine.notify(p.employerId, 'posting', `${this.engine.db.prepare('SELECT display_name FROM users WHERE id = ?').get(userId).display_name} claimed "${p.title}"`, 'Message them to confirm. Confirm the work here when it is done.');
    return { task, posting: this.posting(postingId) };
  }

  /** The employer confirms the work: the player's bot approves, the platform cut is recorded, pay lands in the payout balance. */
  confirm(employerId, claimId) {
    const c = this.db.prepare('SELECT c.*, p.employer_id, p.pay_cents, p.fee_cents, p.title, p.org, p.date FROM posting_claims c JOIN postings p ON p.id = c.posting_id WHERE c.id = ?').get(claimId);
    if (!c || c.employer_id !== employerId) throw new Error('Not your claim');
    if (c.status === 'confirmed') return this.posting(c.posting_id);
    const net = c.pay_cents - c.fee_cents;
    const tx = this.db.transaction(() => {
      this.db.prepare("UPDATE posting_claims SET status = 'confirmed', paid_cents = ?, fee_cents = ?, confirmed_at = ? WHERE id = ?").run(c.pay_cents, c.fee_cents, this.now(), claimId);
      this.db.prepare('UPDATE users SET payout_balance_cents = payout_balance_cents + ? WHERE id = ?').run(net, c.user_id);
      this.money.record('posting_pay', { userId: c.user_id, gross: c.pay_cents, fee: c.fee_cents, net, status: 'paid', ref: `claim:${claimId}`, note: `${c.org}: ${c.title}` });
    });
    tx();
    // Employer confirmation is proof enough: the bot approves and the pay is verified.
    if (c.task_id) {
      const row = this.db.prepare('SELECT t.*, p.date FROM tasks t JOIN plans p ON p.id = t.plan_id WHERE t.id = ?').get(c.task_id);
      if (row && row.status !== 'done') this.engine.updateTask(c.user_id, c.task_id, { status: 'done', earningsDollars: c.pay_cents / 100 });
      const fresh = this.db.prepare('SELECT t.*, p.date FROM tasks t JOIN plans p ON p.id = t.plan_id WHERE t.id = ?').get(c.task_id);
      this.db.prepare('UPDATE tasks SET verified_cents = ?, earnings_cents = MAX(earnings_cents, ?) WHERE id = ?').run(c.pay_cents, c.pay_cents, c.task_id);
      if (fresh.approval !== 'approved') this.engine._applyApproval(c.user_id, { ...fresh, verified_cents: c.pay_cents, earnings_cents: c.pay_cents }, { approved: true, difficulty: fresh.difficulty, reason: `Confirmed by ${c.org}.` }, null, { quiet: false });
    }
    this.engine.notify(c.user_id, 'posting', `${c.org} confirmed your work`, `$${(net / 100).toFixed(2)} is in your payout balance after the platform cut. Your bot approved the play.`);
    return this.posting(c.posting_id);
  }

  // ── Verified résumé ──────────────────────────────────────────────────────
  resume(userId, { full = false } = {}) {
    const u = this.db.prepare('SELECT u.id, u.display_name, u.phone_verified_at, u.trust, u.created_at, p.city, p.region, p.skills, p.resources FROM users u LEFT JOIN profiles p ON p.user_id = u.id WHERE u.id = ?').get(userId);
    if (!u) return null;
    const stats = this.engine.stats(userId);
    const rank = this.engine.rankInfo(userId);
    const cats = this.db.prepare(`SELECT t.category, COUNT(*) AS n, SUM(t.hours) AS h, SUM(t.verified_cents) AS v FROM tasks t JOIN plans p ON p.id = t.plan_id WHERE p.user_id = ? AND t.approval = 'approved' GROUP BY t.category ORDER BY n DESC`).all(userId);
    const employers = this.db.prepare("SELECT p.org, p.title, p.date, c.paid_cents FROM posting_claims c JOIN postings p ON p.id = c.posting_id WHERE c.user_id = ? AND c.status = 'confirmed' ORDER BY p.date DESC LIMIT 20").all(userId);
    const rating = this.db.prepare('SELECT AVG(rating) AS a, COUNT(*) AS n FROM bot_ratings WHERE host_id = ?').get(userId);
    const base = { id: u.id, name: u.display_name, city: [u.city, u.region].filter(Boolean).join(', '), memberSince: u.created_at, phoneVerified: !!u.phone_verified_at, trust: u.trust, rank: rank.name, days: stats.days, bestStreak: stats.bestStreak, worldWins: stats.wins, verifiedCents: cats.reduce((s, c) => s + (c.v || 0), 0), approvedPlays: cats.reduce((s, c) => s + c.n, 0), categories: cats.map(c => ({ category: c.category, plays: c.n, hours: Math.round(c.h * 10) / 10, verifiedCents: c.v })), employerConfirmations: employers.length, skills: JSON.parse(u.skills || '[]'), badges: this.engine.badges(userId).slice(0, 12) };
    if (!full) return base;
    return { ...base, employers: employers.map(e => ({ org: e.org, title: e.title, date: e.date, paidCents: e.paid_cents })), lastDays: this.engine.history(userId, 30), crowdRating: rating.n ? { average: Math.round(rating.a * 10) / 10, count: rating.n } : null };
  }
  /** Employers search verified track records. Opening a full résumé costs a fee, recorded to the ledger. */
  search({ city, category, minDays = 0, limit = 20 } = {}) {
    const rows = this.db.prepare(
      `SELECT u.id FROM users u LEFT JOIN profiles p ON p.user_id = u.id WHERE u.public_profile = 1 AND u.banned_at IS NULL ${city ? 'AND lower(p.location) LIKE ?' : ''} ORDER BY u.trust DESC LIMIT ?`
    ).all(...(city ? [`%${String(city).toLowerCase()}%`] : []), limit * 3);
    return rows.map(r => this.resume(r.id)).filter(r => r && r.days >= minDays && (!category || r.categories.some(c => c.category === category && c.plays > 0))).slice(0, limit);
  }
  viewResume(employerId, userId) {
    if (!this.employer(employerId)) throw new Error('Register as an employer first');
    const already = this.db.prepare('SELECT 1 FROM resume_views WHERE employer_id = ? AND user_id = ? AND created_at > ?').get(employerId, userId, this.now() - 30 * 86_400_000);
    if (!already) { this.db.prepare('INSERT INTO resume_views (employer_id, user_id, fee_cents, created_at) VALUES (?, ?, ?, ?)').run(employerId, userId, RESUME_VIEW_CENTS, this.now()); this.money.record('resume_view', { userId: employerId, gross: RESUME_VIEW_CENTS, fee: RESUME_VIEW_CENTS, net: 0, status: 'paid', ref: `resume:${employerId}:${userId}:${this.now()}` }); }
    return this.resume(userId, { full: true });
  }

  // ── City data report ─────────────────────────────────────────────────────
  cityReport(city, month) {
    const key = Market.cityKey(city);
    const like = `%${key}%`;
    const rows = this.db.prepare(
      `SELECT t.category, COALESCE(t.play_id, t.title) AS play, t.title, COUNT(*) AS planned, SUM(CASE WHEN t.approval = 'approved' THEN 1 ELSE 0 END) AS done, SUM(CASE WHEN t.status = 'skipped' THEN 1 ELSE 0 END) AS skipped,
              SUM(CASE WHEN t.approval = 'approved' THEN t.earnings_cents ELSE 0 END) AS earned, SUM(CASE WHEN t.approval = 'approved' THEN t.verified_cents ELSE 0 END) AS verified, SUM(CASE WHEN t.approval = 'approved' THEN t.hours ELSE 0 END) AS hours, AVG(t.difficulty) AS diff
       FROM tasks t JOIN plans p ON p.id = t.plan_id JOIN profiles pr ON pr.user_id = p.user_id
       WHERE lower(pr.location) LIKE ? AND substr(p.date, 1, 7) = ? AND p.status = 'closed' GROUP BY t.category, play HAVING planned >= 3 ORDER BY earned DESC`
    ).all(like, month);
    const players = this.db.prepare('SELECT COUNT(DISTINCT p.user_id) AS c FROM plans p JOIN profiles pr ON pr.user_id = p.user_id WHERE lower(pr.location) LIKE ? AND substr(p.date, 1, 7) = ?').get(like, month).c;
    // Totals cover every approved play on a closed day; the per-play table only lists plays with three or more plans.
    const t = this.db.prepare(
      `SELECT COALESCE(SUM(t.earnings_cents),0) AS earned, COALESCE(SUM(t.verified_cents),0) AS verified, COALESCE(SUM(t.hours),0) AS hours, COUNT(*) AS done
       FROM tasks t JOIN plans p ON p.id = t.plan_id JOIN profiles pr ON pr.user_id = p.user_id
       WHERE lower(pr.location) LIKE ? AND substr(p.date, 1, 7) = ? AND p.status = 'closed' AND t.approval = 'approved'`
    ).get(like, month);
    const totals = { earned: t.earned, verified: t.verified, hours: t.hours, done: t.done };
    const report = {
      city: city, month, players, generatedAt: this.now(),
      totals: { earnedCents: totals.earned, verifiedCents: totals.verified, hours: Math.round(totals.hours * 10) / 10, playsDone: totals.done, perHourCents: totals.hours ? Math.round(totals.earned / totals.hours) : 0 },
      plays: rows.map(r => ({ category: r.category, title: r.title, planned: r.planned, done: r.done, skipped: r.skipped, doneRate: Math.round(r.done / r.planned * 100), earnedCents: r.earned, verifiedCents: r.verified, hours: Math.round(r.hours * 10) / 10, perHourCents: r.hours ? Math.round(r.earned / r.hours) : 0, difficulty: Math.round(r.diff * 10) / 10 })),
      note: 'Anonymized. Earnings are player-logged; "verified" means receipt-verified or employer-confirmed. Minimum three plans per play to appear.',
    };
    this.db.prepare('INSERT OR REPLACE INTO reports (key, data, created_at) VALUES (?, ?, ?)').run(`city:${key}:${month}`, JSON.stringify(report), this.now());
    return report;
  }
  reports(limit = 30) { return this.db.prepare('SELECT key, created_at FROM reports ORDER BY created_at DESC LIMIT ?').all(limit); }
}

module.exports = Market;
module.exports.constants = { POSTING_FEE_CENTS, RESUME_VIEW_CENTS };
