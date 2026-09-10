'use strict';

// Seasons: the month-long races and what they pay.
//
// Three crowns a month, kept apart on purpose so money never decides merit:
//   Legend of the Month   most approved points in the month (skill, published rules)
//   Crew of the Month     squad with the most combined points
//   People's Champion     most fan votes; votes are bought in packs and are 100% platform revenue
// Rewards are earned only: the chain, Hall of Fame for life, a numbered jacket, a month
// of being the face of the app, and any cash the owner announces in advance.

const PACKS = [
  { id: 'v5', votes: 5, cents: 250, label: '5 votes · $2.50' },
  { id: 'v20', votes: 20, cents: 1000, label: '20 votes · $10' },
  { id: 'v100', votes: 100, cents: 5000, label: '100 votes · $50' },
];
const VOTE_CENTS = 50;
const BALLOT_SIZE = 50;
const EARLY_BALLOT_DAYS = 1;          // Fan Club members vote on day 1; everyone else from day 2
const CLUB_VOTES_PER_MONTH = 10;
const DEFAULT_PRIZES = {
  legend: { title: 'The Legends Only Chain', description: 'Gold chain with the SML crown seal, engraved with your name and the month. Hall of Fame for life. Numbered Legends Only jacket. The app is yours for the next month: your face on the landing page, gold frame on your cards, first episode of the show.' },
  fans: { title: 'The Legends Only Chain and the fan-funded check', description: 'The chain, engraved. A cash prize funded by the month\'s fan votes, announced up front. Your face on the landing page next to the Legend of the Month.' },
  crew: { title: 'The Squad Belt', description: 'The belt passes to your squad for the month. Your squad\'s name sits under the leaderboard title until the next crew takes it.' },
  fan: { title: 'Fan of the Month', description: 'On the show, a Legends Only fan jacket, and the Fan of the Month badge for good.' },
};

class Season {
  constructor(db, { engine, money, community, social, squads, fans, stripe, now, onEvent, env } = {}) {
    this.db = db; this.engine = engine; this.money = money; this.community = community || null; this.social = social || null; this.squads = squads || null; this.fans = fans || null;
    this.stripe = stripe || null; this.now = now || (() => Date.now()); this.onEvent = onEvent || (() => {}); this.env = env || process.env;
  }
  static month(dateKey) { return String(dateKey).slice(0, 7); }
  static range(month) { const [y, m] = month.split('-').map(Number); const end = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10); return [month + '-01', end]; }
  static prev(month) { const [y, m] = month.split('-').map(Number); const d = new Date(Date.UTC(y, m - 2, 1)); return d.toISOString().slice(0, 7); }
  static next(month) { const [y, m] = month.split('-').map(Number); const d = new Date(Date.UTC(y, m, 1)); return d.toISOString().slice(0, 7); }
  todayUTC() { return new Date(this.now()).toISOString().slice(0, 10); }
  current() { return Season.month(this.todayUTC()); }
  daysLeft(month = this.current()) { const [, end] = Season.range(month); return Math.max(0, Math.round((Date.parse(end + 'T23:59:59Z') - this.now()) / 86_400_000)); }

  // ── Races ────────────────────────────────────────────────────────────────
  race(month = this.current(), limit = BALLOT_SIZE) {
    const [a, b] = Season.range(month);
    return this.db.prepare(
      `SELECT s.user_id, SUM(s.score) AS pts, COUNT(*) AS days, COALESCE(SUM(s.verified_cents),0) AS v, SUM(CASE WHEN s.rank = 1 THEN 1 ELSE 0 END) AS wins, u.display_name, u.title, p.location
       FROM daily_scores s JOIN users u ON u.id = s.user_id LEFT JOIN profiles p ON p.user_id = s.user_id
       WHERE s.date BETWEEN ? AND ? AND u.role != 'fan' AND u.banned_at IS NULL GROUP BY s.user_id ORDER BY pts DESC, v DESC, days DESC LIMIT ?`
    ).all(a, b, limit).map((r, i) => ({ rank: i + 1, userId: r.user_id, name: r.display_name, title: r.title || null, location: r.location || '', points: r.pts, days: r.days, verifiedCents: r.v, wins: r.wins }));
  }
  crewRace(month = this.current(), limit = 25) {
    const [a, b] = Season.range(month);
    return this.db.prepare(
      `SELECT q.id, q.name, q.city, COUNT(DISTINCT m.user_id) AS size, COALESCE(SUM(s.score),0) AS pts
       FROM squads q JOIN squad_members m ON m.squad_id = q.id LEFT JOIN daily_scores s ON s.user_id = m.user_id AND s.date BETWEEN ? AND ?
       GROUP BY q.id ORDER BY pts DESC LIMIT ?`
    ).all(a, b, limit).map((r, i) => ({ rank: i + 1, squadId: r.id, name: r.name, city: r.city, size: r.size, points: r.pts }));
  }

  // ── Votes ────────────────────────────────────────────────────────────────
  credits(userId) { const r = this.db.prepare('SELECT vote_credits FROM users WHERE id = ?').get(userId); return r ? r.vote_credits : 0; }
  grantCredits(userId, n) { this.db.prepare('UPDATE users SET vote_credits = vote_credits + ? WHERE id = ?').run(n, userId); return this.credits(userId); }
  isClub(userId) { const r = this.db.prepare('SELECT tier FROM users WHERE id = ?').get(userId); return !!(r && r.tier === 'fanclub'); }
  ballotOpen(userId, dateKey = this.todayUTC()) { const day = Number(dateKey.slice(8, 10)); return day > EARLY_BALLOT_DAYS || (userId ? this.isClub(userId) : false); }
  voteCounts(month) { const m = {}; for (const r of this.db.prepare('SELECT to_id, SUM(n) AS n FROM votes WHERE month = ? GROUP BY to_id').all(month)) m[r.to_id] = r.n; return m; }
  ballot(month = this.current(), viewerId = null) {
    const counts = this.voteCounts(month);
    const rows = this.race(month, BALLOT_SIZE).map(r => ({ ...r, votes: counts[r.userId] || 0, mine: viewerId ? this.db.prepare('SELECT COALESCE(SUM(n),0) AS n FROM votes WHERE month = ? AND from_id = ? AND to_id = ?').get(month, viewerId, r.userId).n : 0 }));
    rows.sort((x, y) => y.votes - x.votes || y.points - x.points);
    return { month, open: this.ballotOpen(viewerId), opensForAll: `${month}-0${EARLY_BALLOT_DAYS + 1}`, daysLeft: this.daysLeft(month), voteCents: VOTE_CENTS, packs: PACKS, credits: viewerId ? this.credits(viewerId) : 0, club: viewerId ? this.isClub(viewerId) : false, candidates: rows.map((r, i) => ({ ...r, voteRank: i + 1 })) };
  }
  vote(fromId, toId, n = 1, month = this.current()) {
    n = Math.max(1, Math.min(100, parseInt(n, 10) || 1));
    if (fromId === toId) throw new Error('You cannot vote for yourself');
    if (!this.ballotOpen(fromId)) throw new Error(`The ballot opens to everyone on the ${EARLY_BALLOT_DAYS + 1}nd. Fan Club members vote from day one.`);
    if (this.db.prepare('SELECT 1 FROM blocks WHERE user_id = ? AND blocked_id = ?').get(toId, fromId)) throw new Error('You cannot vote for this player');
    if (!this.race(month, BALLOT_SIZE).some(r => r.userId === toId)) throw new Error(`Only the top ${BALLOT_SIZE} of the month are on the ballot`);
    if (this.credits(fromId) < n) throw new Error(`You have ${this.credits(fromId)} vote${this.credits(fromId) === 1 ? '' : 's'}. Get a pack to keep going.`);
    const dateKey = this.todayUTC();
    const tx = this.db.transaction(() => {
      this.db.prepare('UPDATE users SET vote_credits = vote_credits - ? WHERE id = ?').run(n, fromId);
      this.db.prepare('INSERT INTO votes (month, from_id, to_id, n, date, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(month, fromId, toId, n, dateKey, this.now());
    });
    tx();
    const total = this.voteCounts(month)[toId] || 0;
    this.onEvent(null, 'season_vote', { month, toId, total });
    if (this.fans) { try { this.fans.onVote(fromId, toId, month, n, dateKey); } catch (_) {} }
    const from = this.social ? this.social.name(fromId) : 'A fan';
    if (n >= 5) this.engine.notify(toId, 'vote', `${from} dropped ${n} votes on you`, `You have ${total.toLocaleString()} People's Champion votes this month.`, { push: false });
    return { month, toId, n, total, credits: this.credits(fromId) };
  }
  async buyPack(userId, packId, { successUrl, cancelUrl } = {}) {
    const pack = PACKS.find(p => p.id === packId);
    if (!pack) throw new Error('Pick a vote pack');
    if (this.stripe) {
      const u = this.db.prepare('SELECT email FROM users WHERE id = ?').get(userId);
      const session = await this.stripe.checkout.sessions.create({ mode: 'payment', customer_email: u.email, client_reference_id: userId, metadata: { kind: 'votes', userId, packId },
        line_items: [{ price_data: { currency: 'usd', unit_amount: pack.cents, product_data: { name: `Legends Only · ${pack.votes} People's Champion votes` } }, quantity: 1 }], success_url: successUrl, cancel_url: cancelUrl });
      return { url: session.url, pack };
    }
    return { pack, ...this.creditPack(userId, packId, `votes:test:${userId}:${this.now()}`) };
  }
  /** Idempotent by ref: the webhook and the test path both land here. */
  creditPack(userId, packId, ref) {
    const pack = PACKS.find(p => p.id === packId);
    if (!pack) throw new Error('Unknown pack');
    if (this.db.prepare('SELECT 1 FROM ledger WHERE ref = ?').get(ref)) return { credited: 0, credits: this.credits(userId) };
    const tx = this.db.transaction(() => {
      this.money.record('votes', { userId, gross: pack.cents, fee: pack.cents, net: 0, status: 'paid', ref, note: `${pack.votes} votes` });
      this.db.prepare('UPDATE users SET vote_credits = vote_credits + ? WHERE id = ?').run(pack.votes, userId);
    });
    tx();
    return { credited: pack.votes, credits: this.credits(userId) };
  }
  voteRevenue(month) { const [a, b] = Season.range(month); return this.db.prepare("SELECT COALESCE(SUM(gross_cents),0) AS g FROM ledger WHERE kind = 'votes' AND status = 'paid' AND created_at >= ? AND created_at < ?").get(Date.parse(a + 'T00:00:00Z'), Date.parse(b + 'T00:00:00Z') + 86_400_000).g; }
  /** Fan Club members get their monthly votes the first time they show up each month. */
  grantClubCredits(userId) {
    if (!this.isClub(userId)) return 0;
    const m = this.current();
    const u = this.db.prepare('SELECT club_credit_month FROM users WHERE id = ?').get(userId);
    if (u.club_credit_month === m) return 0;
    this.db.prepare('UPDATE users SET club_credit_month = ?, vote_credits = vote_credits + ? WHERE id = ?').run(m, CLUB_VOTES_PER_MONTH, userId);
    return CLUB_VOTES_PER_MONTH;
  }

  // ── Prizes ───────────────────────────────────────────────────────────────
  prizes(month = this.current()) {
    const rows = {}; for (const r of this.db.prepare('SELECT * FROM season_prizes WHERE month = ?').all(month)) rows[r.kind] = r;
    const fanPct = rows.fans ? rows.fans.fan_pct : Number(this.env.FAN_PRIZE_PCT || 20);
    const out = {};
    for (const kind of ['legend', 'fans', 'crew', 'fan']) {
      const r = rows[kind]; const d = DEFAULT_PRIZES[kind];
      out[kind] = { kind, title: r ? r.title : d.title, description: r && r.description != null ? r.description : d.description, cashCents: r ? r.cash_cents : 0, fanPct: kind === 'fans' ? fanPct : 0 };
    }
    out.fans.fanFundedCents = Math.round(this.voteRevenue(month) * out.fans.fanPct / 100);
    return out;
  }
  setPrize(month, kind, { title, description, cashDollars, fanPct } = {}) {
    if (!/^\d{4}-\d{2}$/.test(month || '')) throw new Error('Month as YYYY-MM');
    if (!DEFAULT_PRIZES[kind]) throw new Error('Kind: legend, fans, crew, fan');
    const cur = this.prizes(month)[kind];
    this.db.prepare('INSERT INTO season_prizes (month, kind, title, description, cash_cents, fan_pct) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(month, kind) DO UPDATE SET title = excluded.title, description = excluded.description, cash_cents = excluded.cash_cents, fan_pct = excluded.fan_pct')
      .run(month, kind, String(title || cur.title).slice(0, 120), String(description ?? cur.description).slice(0, 600), Math.max(0, Math.round((Number(cashDollars) || cur.cashCents / 100) * 100)), Math.max(0, Math.min(100, fanPct == null ? cur.fanPct : parseInt(fanPct, 10) || 0)));
    return this.prizes(month)[kind];
  }

  // ── Settle ───────────────────────────────────────────────────────────────
  settled(month) { return this.db.prepare('SELECT 1 FROM season_winners WHERE month = ? AND kind = ?').get(month, 'legend'); }
  canSettle(month) {
    const [, end] = Season.range(month);
    if (this.todayUTC() <= end) return false;
    return !this.db.prepare("SELECT 1 FROM plans WHERE date BETWEEN ? AND ? AND status = 'open'").get(...Season.range(month));
  }
  settle(month, { force = false } = {}) {
    if (this.settled(month)) return this.winners(month);
    if (!force && !this.canSettle(month)) throw new Error('The month is still open');
    const prizes = this.prizes(month);
    const legend = this.race(month, 1)[0] || null;
    const crew = this.crewRace(month, 1)[0] || null;
    const ballot = this.ballot(month).candidates.filter(c => c.votes > 0)[0] || null;
    const nextMonth = Season.next(month);
    const tx = this.db.transaction(() => {
      if (legend) {
        const jacket = (this.db.prepare("SELECT COALESCE(MAX(jacket_number),0) AS n FROM season_winners WHERE kind = 'legend'").get().n || 0) + 1;
        this.db.prepare("INSERT INTO season_winners (month, kind, user_id, score, cash_cents, jacket_number, created_at) VALUES (?, 'legend', ?, ?, ?, ?, ?)").run(month, legend.userId, legend.points, prizes.legend.cashCents, jacket, this.now());
        this.db.prepare("UPDATE users SET tier = 'hof', hof_life = 1, frame_until = ? WHERE id = ?").run(nextMonth, legend.userId);
        if (prizes.legend.cashCents) this._pay(legend.userId, prizes.legend.cashCents, `prize:legend:${month}`, `Legend of the Month ${month}`);
      }
      if (crew) {
        this.db.prepare("INSERT INTO season_winners (month, kind, squad_id, score, cash_cents, created_at) VALUES (?, 'crew', ?, ?, ?, ?)").run(month, crew.squadId, crew.points, prizes.crew.cashCents, this.now());
      }
      if (ballot) {
        const cash = prizes.fans.cashCents + prizes.fans.fanFundedCents;
        this.db.prepare("INSERT INTO season_winners (month, kind, user_id, score, votes, cash_cents, created_at) VALUES (?, 'fans', ?, ?, ?, ?, ?)").run(month, ballot.userId, ballot.points, ballot.votes, cash, this.now());
        this.db.prepare('UPDATE users SET frame_until = ? WHERE id = ?').run(nextMonth, ballot.userId);
        if (cash) this._pay(ballot.userId, cash, `prize:fans:${month}`, `People's Champion ${month}`);
      }
    });
    tx();
    const [, end] = Season.range(month);
    if (legend) {
      this.engine.awardBadge(legend.userId, 'legend_of_month', end, `Legend of the Month, ${month}`);
      this.engine.setTier(legend.userId, 'hof');
      this.engine.notify(legend.userId, 'season', `LEGEND OF THE MONTH: ${month}`, `${legend.points.toLocaleString()} points. The chain is yours, Hall of Fame for life, jacket #${String(this.winners(month).legend.jacketNumber).padStart(3, '0')}. The app is yours next month.`);
      this._story(legend, month, prizes.legend);
      if (this.community) { const w = this.community._who(legend.userId); if (w) this.community.post(legend.userId, 'season', `${w.name}${w.city ? ' in ' + w.city : ''} is Legend of the Month for ${month} with ${legend.points.toLocaleString()} points.`, { city: w.city }); }
    }
    if (ballot) {
      this.engine.awardBadge(ballot.userId, 'peoples_champion', end, `People's Champion, ${month}`);
      const cash = prizes.fans.cashCents + prizes.fans.fanFundedCents;
      this.engine.notify(ballot.userId, 'season', `PEOPLE'S CHAMPION: ${month}`, `${ballot.votes.toLocaleString()} fan votes.${cash ? ` $${(cash / 100).toFixed(2)} is in your balance.` : ''} The crowd picked you.`);
      if (this.community) { const w = this.community._who(ballot.userId); if (w) this.community.post(ballot.userId, 'season', `The crowd spoke: ${w.name} is People's Champion for ${month} with ${ballot.votes.toLocaleString()} votes.`, { city: w.city }); }
      if (this.fans) { try { this.fans.awardVotePoints(month, ballot.userId); } catch (e) { console.error('[season]', e.message); } }
    }
    if (crew && this.squads) {
      for (const m of this.squads.members(crew.squadId)) { this.engine.awardBadge(m.userId, 'crew_of_month', end, `Crew of the Month with ${crew.name}, ${month}`); this.engine.notify(m.userId, 'season', `CREW OF THE MONTH: ${crew.name}`, `${crew.points.toLocaleString()} combined points. The belt is yours for ${nextMonth}.`); }
      if (this.community) this.community.post(null, 'season', `${crew.name} took the Squad Belt for ${month}.`, { city: crew.city || '' });
    }
    if (this.fans) { try { this.fans.settleMonth(month); } catch (e) { console.error('[fans]', e.message); } }
    const w = this.winners(month);
    this.onEvent(null, 'season', { month, winners: w });
    return w;
  }
  _pay(userId, cents, ref, note) {
    if (this.db.prepare('SELECT 1 FROM ledger WHERE ref = ?').get(ref)) return;
    this.db.prepare('UPDATE users SET payout_balance_cents = payout_balance_cents + ? WHERE id = ?').run(cents, userId);
    this.money.record('prize', { userId, gross: cents, fee: 0, net: cents, status: 'paid', ref, note });
  }
  _story(legend, month, prize) {
    const [a, b] = Season.range(month);
    const agg = this.db.prepare('SELECT COALESCE(SUM(earnings_cents),0) AS e, COALESCE(SUM(verified_cents),0) AS v, COALESCE(SUM(tasks_done),0) AS d, COUNT(*) AS days FROM daily_scores WHERE user_id = ? AND date BETWEEN ? AND ?').get(legend.userId, a, b);
    const title = `${legend.name}: Legend of the Month, ${month}`;
    const body = `${legend.name}${legend.location ? ' of ' + legend.location : ''} finished ${month} on top of the world with ${legend.points.toLocaleString()} approved points across ${agg.days} days, ${agg.d} plays approved by their own bot, $${(agg.e / 100).toFixed(0)} logged and $${(agg.v / 100).toFixed(0)} verified. ${legend.wins ? `${legend.wins} Legend of the Day crown${legend.wins === 1 ? '' : 's'}. ` : ''}The prize: ${prize.title}. Every point was earned; none of it could be bought.`;
    this.db.prepare('INSERT INTO stories (user_id, kind, title, body, data, public, created_at) VALUES (?, ?, ?, ?, ?, 1, ?)').run(legend.userId, `legend_of_month_${month}`, title, body, JSON.stringify({ month, points: legend.points }), this.now());
  }
  winners(month) {
    const rows = this.db.prepare('SELECT w.*, u.display_name, q.name AS squad_name FROM season_winners w LEFT JOIN users u ON u.id = w.user_id LEFT JOIN squads q ON q.id = w.squad_id WHERE w.month = ?').all(month);
    if (!rows.length) return null;
    const out = { month };
    for (const r of rows) out[r.kind] = { userId: r.user_id, name: r.display_name || null, squadId: r.squad_id, squadName: r.squad_name || null, score: r.score, votes: r.votes, cashCents: r.cash_cents, jacketNumber: r.jacket_number };
    return out;
  }
  /** Last month's winners: the faces on the landing page and the name under the leaderboard. */
  presentedBy() { return this.winners(Season.prev(this.current())); }
  frameFor(userId) { const u = this.db.prepare('SELECT frame_until FROM users WHERE id = ?').get(userId); return u && u.frame_until && u.frame_until >= this.current() ? 'gold' : null; }
  wall() {
    return {
      legends: this.db.prepare("SELECT w.month, w.user_id, w.score, w.jacket_number, u.display_name FROM season_winners w JOIN users u ON u.id = w.user_id WHERE w.kind = 'legend' ORDER BY w.month DESC").all().map(r => ({ month: r.month, userId: r.user_id, name: r.display_name, points: r.score, jacketNumber: r.jacket_number })),
      champions: this.db.prepare("SELECT w.month, w.user_id, w.votes, u.display_name FROM season_winners w JOIN users u ON u.id = w.user_id WHERE w.kind = 'fans' ORDER BY w.month DESC").all().map(r => ({ month: r.month, userId: r.user_id, name: r.display_name, votes: r.votes })),
      crews: this.db.prepare("SELECT w.month, w.squad_id, w.score, q.name FROM season_winners w LEFT JOIN squads q ON q.id = w.squad_id WHERE w.kind = 'crew' ORDER BY w.month DESC").all().map(r => ({ month: r.month, squadId: r.squad_id, name: r.name || 'A squad', points: r.score })),
      fansOfMonth: this.db.prepare("SELECT w.month, w.user_id, w.score, u.display_name FROM season_winners w JOIN users u ON u.id = w.user_id WHERE w.kind = 'fan' ORDER BY w.month DESC").all().map(r => ({ month: r.month, userId: r.user_id, name: r.display_name, fanPoints: r.score })),
    };
  }
  /** Everything a screen needs about the season in one call. */
  summary(viewerId = null) {
    const month = this.current();
    return { month, daysLeft: this.daysLeft(month), race: this.race(month, 10), crewRace: this.crewRace(month, 10), ballot: this.ballot(month, viewerId), prizes: this.prizes(month), presentedBy: this.presentedBy(), rules: 'Legend of the Month: most approved points, no purchase necessary. People\'s Champion: most fan votes among the top 50; you cannot vote for yourself. Crew of the Month: most combined squad points. Prizes are announced before the month starts and never change mid-month.' };
  }
  /** Runs with the scheduler: settle last month once every day of it has closed. */
  tick() {
    const prev = Season.prev(this.current());
    if (!this.settled(prev) && this.canSettle(prev) && this.db.prepare('SELECT 1 FROM daily_scores WHERE date BETWEEN ? AND ?').get(...Season.range(prev))) {
      try { this.settle(prev); } catch (e) { console.error('[season]', e.message); }
    }
  }
}

module.exports = Season;
module.exports.constants = { PACKS, VOTE_CENTS, BALLOT_SIZE, EARLY_BALLOT_DAYS, CLUB_VOTES_PER_MONTH, DEFAULT_PRIZES };
