'use strict';
// Copyright (c) 2026 Self-Made Legends LLC. All rights reserved. Proprietary and confidential. See LICENSE.

// The Fan Club: the audience side of Legends Only. A fan has no bot, no plan,
// and never shows on a board. Fans follow Legends and squads, pick the Legend
// of the Day before the cutoff, vote in the People's Champion race, tip, call
// Legends out against each other, and race each other on the Top Fans board.
// Fan points are earned only by watching and picking well; nothing here can
// be bought with money.

const PICK_CUTOFF_UTC_HOUR = 18;        // picks close at 18:00 UTC (2pm ET)
const PICK_WIN_POINTS = 1_000;
const PICK_PODIUM_POINTS = 300;
const VOTE_POINTS = 50;                 // per vote on the eventual People's Champion
const EARLY_VOTE_DAYS = 10;             // votes in the first ten days count double
const CLUB_PRICE_CENTS = 499;
const FAN_CALLOUTS_PER_DAY = 3;

class Fans {
  constructor(db, { engine, community, social, season, now, onEvent } = {}) {
    this.db = db; this.engine = engine; this.community = community || null; this.social = social || null; this.season = season || null;
    this.now = now || (() => Date.now()); this.onEvent = onEvent || (() => {});
  }
  todayUTC() { return new Date(this.now()).toISOString().slice(0, 10); }
  isFan(userId) { const r = this.db.prepare('SELECT role FROM users WHERE id = ?').get(userId); return !!(r && r.role === 'fan'); }
  isClub(userId) { const r = this.db.prepare('SELECT tier FROM users WHERE id = ?').get(userId); return !!(r && r.tier === 'fanclub'); }

  /** Walk in through the fan door: no profile, no bot, on the feed as a fan. */
  join(userId, { city = '' } = {}) {
    this.db.prepare("UPDATE users SET role = 'fan' WHERE id = ?").run(userId);
    this.db.prepare('INSERT INTO fans (user_id, city_key, created_at) VALUES (?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET city_key = excluded.city_key').run(userId, String(city || '').trim().toLowerCase().slice(0, 80), this.now());
    this.engine.notify(userId, 'welcome', 'Welcome to the Fan Club side', 'Follow a Legend, pick who wins today before 2pm ET, and vote for the People\'s Champion. Flip to player any time.', { push: false });
    return this.profile(userId);
  }
  /** A fan becomes a player: they start at Rookie like everyone else. Follows and fan points stay. */
  becomePlayer(userId) {
    this.db.prepare("UPDATE users SET role = 'player' WHERE id = ? AND role = 'fan'").run(userId);
    if (this.isClub(userId)) this.db.prepare("UPDATE users SET tier = 'free' WHERE id = ?").run(userId);
    return { role: 'player' };
  }
  city(userId) { const f = this.db.prepare('SELECT city_key FROM fans WHERE user_id = ?').get(userId); return f ? f.city_key || '' : ''; }

  // ── Fan Club membership ──────────────────────────────────────────────────
  setClub(userId, on) {
    if (on && !this.isFan(userId)) throw new Error('The Fan Club is for fan accounts. Players have Veteran and Hall of Fame.');
    this.db.prepare('UPDATE users SET tier = ? WHERE id = ?').run(on ? 'fanclub' : 'free', userId);
    if (on) { this.engine.awardBadge(userId, 'fan_club', this.todayUTC(), 'Fan Club member'); if (this.season) this.season.grantClubCredits(userId); this.engine.notify(userId, 'billing', 'Welcome to the Fan Club', 'Ten votes a month, front row in every live, the early ballot, and the nightly recap of your Legends.'); }
    return { club: on };
  }
  clubInfo(userId) { return { member: this.isClub(userId), priceCents: CLUB_PRICE_CENTS, perks: ['Ten People\'s Champion votes every month', 'Front row in lives: gold name in chat and a shout-out when you enter', 'The ballot a day before everyone else', 'Nightly recap of the Legends you follow', 'A push when one of your Legends goes live or passes someone', 'Fan Club badge on your profile, tips and callouts'] }; }

  // ── Follows ──────────────────────────────────────────────────────────────
  follow(fanId, type, id) {
    if (!['user', 'squad'].includes(type)) throw new Error('Follow a Legend or a squad');
    if (type === 'user') { if (id === fanId) throw new Error('Follow somebody else'); if (!this.db.prepare("SELECT 1 FROM users WHERE id = ? AND role != 'fan'").get(id)) throw new Error('No such Legend'); }
    else if (!this.db.prepare('SELECT 1 FROM squads WHERE id = ?').get(Number(id))) throw new Error('No such squad');
    this.db.prepare('INSERT OR IGNORE INTO follows (fan_id, target_type, target_id, created_at) VALUES (?, ?, ?, ?)').run(fanId, type, String(id), this.now());
    if (type === 'user') this.engine.notify(id, 'fan', `${this.social ? this.social.name(fanId) : 'A fan'} is following you`, `${this.followerCount(id)} fan${this.followerCount(id) === 1 ? '' : 's'} watching your grind.`, { push: false });
    return this.following(fanId);
  }
  unfollow(fanId, type, id) { this.db.prepare('DELETE FROM follows WHERE fan_id = ? AND target_type = ? AND target_id = ?').run(fanId, type, String(id)); return this.following(fanId); }
  followerCount(userId) { return this.db.prepare("SELECT COUNT(*) AS c FROM follows WHERE target_type = 'user' AND target_id = ?").get(userId).c; }
  followersOf(userId) { return this.db.prepare("SELECT fan_id FROM follows WHERE target_type = 'user' AND target_id = ?").all(userId).map(r => r.fan_id); }
  /** My Legends: what each followed Legend and squad is doing right now. */
  following(fanId) {
    const today = this.todayUTC();
    const users = this.db.prepare("SELECT f.target_id AS id, u.display_name, u.title, p.location, p.tz_offset FROM follows f JOIN users u ON u.id = f.target_id LEFT JOIN profiles p ON p.user_id = u.id WHERE f.fan_id = ? AND f.target_type = 'user' ORDER BY f.created_at").all(fanId).map(u => {
      const local = new Date(this.now() + (u.tz_offset || 0) * 60_000).toISOString().slice(0, 10);
      const s = this.db.prepare('SELECT score, tasks_done, tasks_total, streak FROM daily_scores WHERE user_id = ? AND date = ?').get(u.id, local) || { score: 0, tasks_done: 0, tasks_total: 0, streak: 0 };
      const rank = this.db.prepare('SELECT COUNT(*) AS n FROM daily_scores WHERE date = ? AND score > ?').get(local, s.score).n + 1;
      const boss = this.db.prepare("SELECT 1 FROM tasks t JOIN plans p ON p.id = t.plan_id WHERE p.user_id = ? AND p.date = ? AND t.boss = 1 AND t.approval = 'approved'").get(u.id, local);
      const live = this.db.prepare("SELECT id, title FROM live_rooms WHERE host_id = ? AND status = 'live' AND kind = 'live'").get(u.id);
      const month = this.season ? (this.season.race(this.season.current(), 50).find(r => r.userId === u.id) || null) : null;
      return { type: 'user', id: u.id, name: u.display_name, title: u.title || null, location: u.location || '', online: this.social ? this.social.online(u.id) : false, today: { date: local, score: s.score, tasksDone: s.tasks_done, tasksTotal: s.tasks_total, streak: s.streak, rank, bossDown: !!boss }, live: live ? { roomId: live.id, title: live.title } : null, monthRank: month ? month.rank : null, monthPoints: month ? month.points : 0 };
    });
    const squads = this.db.prepare("SELECT f.target_id AS id, q.name, q.city FROM follows f JOIN squads q ON q.id = CAST(f.target_id AS INTEGER) WHERE f.fan_id = ? AND f.target_type = 'squad'").all(fanId).map(q => {
      const pts = this.db.prepare('SELECT COALESCE(SUM(s.score),0) AS t FROM daily_scores s JOIN squad_members m ON m.user_id = s.user_id WHERE m.squad_id = ? AND s.date = ?').get(Number(q.id), today).t;
      return { type: 'squad', id: Number(q.id), name: q.name, city: q.city, todayScore: pts };
    });
    return { users, squads };
  }
  /** Fan-out to followers: a Legend went live, passed someone, or took down the Boss. */
  notifyFollowers(userId, kind, title, body) {
    const ids = this.followersOf(userId);
    for (const fanId of ids) this.engine.notify(fanId, kind, title, body);
    return ids.length;
  }

  // ── Picks: call the Legend of the Day ────────────────────────────────────
  picksOpen(dateKey = this.todayUTC()) { return dateKey === this.todayUTC() && new Date(this.now()).getUTCHours() < PICK_CUTOFF_UTC_HOUR; }
  pick(fanId, userId) {
    const today = this.todayUTC();
    if (!this.picksOpen(today)) throw new Error('Picks close at 2pm ET. Tomorrow\'s board opens at midnight UTC.');
    if (userId === fanId) throw new Error('Pick a Legend, not yourself');
    if (!this.db.prepare('SELECT 1 FROM daily_scores WHERE user_id = ? AND date = ?').get(userId, today)) throw new Error('That Legend has not opened today yet');
    this.db.prepare('INSERT INTO picks (fan_id, date, user_id, created_at) VALUES (?, ?, ?, ?) ON CONFLICT(fan_id, date) DO UPDATE SET user_id = excluded.user_id, created_at = excluded.created_at').run(fanId, today, userId, this.now());
    return this.myPick(fanId, today);
  }
  myPick(fanId, dateKey = this.todayUTC()) { const p = this.db.prepare('SELECT p.*, u.display_name FROM picks p JOIN users u ON u.id = p.user_id WHERE p.fan_id = ? AND p.date = ?').get(fanId, dateKey); return p ? { date: p.date, userId: p.user_id, name: p.display_name, settled: !!p.settled, points: p.points } : null; }
  /** After the crown: pay the fans who called it. */
  settlePicks(dateKey) {
    const podium = this.db.prepare('SELECT user_id, rank FROM champions WHERE date = ?').all(dateKey);
    if (!podium.length) return 0;
    const byUser = Object.fromEntries(podium.map(c => [c.user_id, c.rank]));
    let n = 0;
    for (const p of this.db.prepare('SELECT * FROM picks WHERE date = ? AND settled = 0').all(dateKey)) {
      const rank = byUser[p.user_id];
      const points = rank === 1 ? PICK_WIN_POINTS : rank ? PICK_PODIUM_POINTS : 0;
      this.db.prepare('UPDATE picks SET settled = 1, points = ? WHERE fan_id = ? AND date = ?').run(points, p.fan_id, p.date);
      if (points) { this._award(p.fan_id, dateKey.slice(0, 7), points, rank === 1 ? `Called the Legend of the Day, ${dateKey}` : `Called the podium, ${dateKey}`); this.engine.notify(p.fan_id, 'fan', rank === 1 ? `You called it. +${points.toLocaleString()} fan points` : `Podium pick. +${points} fan points`, `Your pick finished #${rank} in the world on ${dateKey}.`, { push: false }); }
      n++;
    }
    return n;
  }
  _award(fanId, month, points, reason) { this.db.prepare('INSERT INTO fan_points (fan_id, month, points, reason, created_at) VALUES (?, ?, ?, ?, ?)').run(fanId, month, points, reason, this.now()); this.onEvent(fanId, 'fan_points', { points, reason }); }
  onVote() { /* votes pay fan points at settle, once the People's Champion is known */ }
  /** Votes on the eventual People's Champion pay fan points; the first ten days count double. */
  awardVotePoints(month, winnerId) {
    const early = `${month}-${String(EARLY_VOTE_DAYS).padStart(2, '0')}`;
    for (const v of this.db.prepare('SELECT from_id, SUM(CASE WHEN date <= ? THEN n * 2 ELSE n END) AS w FROM votes WHERE month = ? AND to_id = ? GROUP BY from_id').all(early, month, winnerId)) {
      this._award(v.from_id, month, v.w * VOTE_POINTS, `Backed the People's Champion, ${month}`);
    }
  }
  fanPoints(fanId, month) { return this.db.prepare('SELECT COALESCE(SUM(points),0) AS p FROM fan_points WHERE fan_id = ? AND month = ?').get(fanId, month).p; }
  topFans(month, limit = 25) {
    return this.db.prepare('SELECT f.fan_id, SUM(f.points) AS p, u.display_name, u.tier FROM fan_points f JOIN users u ON u.id = f.fan_id WHERE f.month = ? GROUP BY f.fan_id ORDER BY p DESC LIMIT ?').all(month, limit)
      .map((r, i) => ({ rank: i + 1, userId: r.fan_id, name: r.display_name, club: r.tier === 'fanclub', points: r.p, picks: this.db.prepare('SELECT COUNT(*) AS c FROM picks WHERE fan_id = ? AND date LIKE ? AND points > 0').get(r.fan_id, month + '%').c }));
  }
  /** Fan of the Month: on the show and a fan jacket. No dinner. */
  settleMonth(month) {
    if (this.db.prepare("SELECT 1 FROM season_winners WHERE month = ? AND kind = 'fan'").get(month)) return null;
    const top = this.topFans(month, 1)[0];
    if (!top) return null;
    this.db.prepare("INSERT INTO season_winners (month, kind, user_id, score, created_at) VALUES (?, 'fan', ?, ?, ?)").run(month, top.userId, top.points, this.now());
    this.engine.awardBadge(top.userId, 'fan_of_month', `${month}-01`, `Fan of the Month, ${month}`);
    this.engine.notify(top.userId, 'season', `FAN OF THE MONTH: ${month}`, `${top.points.toLocaleString()} fan points. You are on the show, and the fan jacket is yours.`);
    if (this.community) this.community.post(top.userId, 'season', `${top.name} is Fan of the Month for ${month}: ${top.points.toLocaleString()} fan points from calling it right.`);
    return top;
  }

  // ── Fan callouts: "Ava, go get Ben." ─────────────────────────────────────
  callout(fanId, legendId, targetId) {
    if (legendId === targetId) throw new Error('Pick two different Legends');
    for (const id of [legendId, targetId]) if (!this.db.prepare("SELECT 1 FROM users WHERE id = ? AND role != 'fan'").get(id)) throw new Error('No such Legend');
    const today = this.todayUTC();
    if (this.db.prepare('SELECT COUNT(*) AS n FROM callouts WHERE fan_id = ? AND date = ?').get(fanId, today).n >= FAN_CALLOUTS_PER_DAY) throw new Error(`${FAN_CALLOUTS_PER_DAY} callouts a day`);
    const fan = this.social ? this.social.name(fanId) : 'A fan', target = this.social ? this.social.name(targetId) : 'them';
    const line = `${fan} says: go get ${target}.`;
    const r = this.db.prepare('INSERT INTO callouts (from_id, to_id, line, date, fan_id, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(legendId, targetId, line, today, fanId, this.now());
    this.engine.notify(legendId, 'callout', `A fan wants you to take ${target}`, `${line} Accept it and it is a head-to-head tomorrow.`);
    if (this.community) { const w = this.community._who(legendId); const v = this.community._who(targetId); if (w && v && w.pub && v.pub) this.community.post(legendId, 'callout', `${fan} wants ${w.name} to take ${v.name}.`, { city: w.city }); }
    this.onEvent(legendId, 'callout', { id: r.lastInsertRowid, fromId: fanId, fromName: fan, line, fan: true, targetId });
    return { id: r.lastInsertRowid, legendId, targetId, line, date: today };
  }

  // ── Nightly recap of your Legends ────────────────────────────────────────
  nightlyRecap(dateKey = this.todayUTC()) {
    if (new Date(this.now()).getUTCHours() < 21) return 0;
    let n = 0;
    for (const f of this.db.prepare("SELECT f.user_id FROM fans f JOIN users u ON u.id = f.user_id WHERE u.tier = 'fanclub' AND (f.last_recap IS NULL OR f.last_recap < ?) AND EXISTS (SELECT 1 FROM follows w WHERE w.fan_id = f.user_id AND w.target_type = 'user')").all(dateKey)) {
      const rows = this.following(f.user_id).users.slice(0, 5).map(u => `${u.name}: ${u.today.score.toLocaleString()} pts, #${u.today.rank}${u.today.bossDown ? ', Boss down' : ''}`);
      this.engine.notify(f.user_id, 'recap', 'Your Legends tonight', rows.join(' · ') || 'Quiet day.');
      this.db.prepare('UPDATE fans SET last_recap = ? WHERE user_id = ?').run(dateKey, f.user_id);
      n++;
    }
    return n;
  }

  // ── Fan profile and home ─────────────────────────────────────────────────
  profile(userId) {
    const u = this.db.prepare('SELECT id, display_name, tier, created_at, public_profile FROM users WHERE id = ?').get(userId);
    if (!u) return null;
    const month = this.season ? this.season.current() : this.todayUTC().slice(0, 7);
    const votes = this.db.prepare('SELECT COALESCE(SUM(n),0) AS n FROM votes WHERE from_id = ?').get(userId).n;
    const fol = this.following(userId);
    return { id: u.id, name: u.display_name, fan: true, club: u.tier === 'fanclub', since: u.created_at, city: this.city(userId), follows: fol.users.length + fol.squads.length, backing: fol.users.slice(0, 5).map(x => x.name), votesCast: votes, fanPoints: this.fanPoints(userId, month), topFanRank: (this.topFans(month, 100).find(t => t.userId === userId) || {}).rank || null, badges: this.engine.badges(userId), public: !!u.public_profile };
  }
  home(userId) {
    const today = this.todayUTC(); const month = today.slice(0, 7);
    if (this.season) this.season.grantClubCredits(userId);
    const board = this.engine.leaderboard(today, { limit: 25 });
    return { fan: true, date: today, month, club: this.clubInfo(userId), profile: this.profile(userId), following: this.following(userId), pick: this.myPick(userId, today), picksOpen: this.picksOpen(today), pickCutoff: `${PICK_CUTOFF_UTC_HOUR}:00 UTC`, board, season: this.season ? this.season.summary(userId) : null, topFans: this.topFans(month, 10), lives: this.social ? this.social.liveNow() : [], callouts: this.db.prepare('SELECT c.*, a.display_name AS legend, b.display_name AS target FROM callouts c JOIN users a ON a.id = c.from_id JOIN users b ON b.id = c.to_id WHERE c.fan_id = ? ORDER BY c.created_at DESC LIMIT 5').all(userId).map(c => ({ id: c.id, legend: c.legend, target: c.target, date: c.date, accepted: !!c.challenge_id })) };
  }
}

module.exports = Fans;
module.exports.constants = { PICK_CUTOFF_UTC_HOUR, PICK_WIN_POINTS, PICK_PODIUM_POINTS, VOTE_POINTS, EARLY_VOTE_DAYS, CLUB_PRICE_CENTS, FAN_CALLOUTS_PER_DAY };
