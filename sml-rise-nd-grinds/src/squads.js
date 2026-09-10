'use strict';

// Squads (crews of two to five), the squad leaderboard, crew video rooms,
// and bot vs bot duels the crowd votes on.

const crypto = require('crypto');
const SQUAD_MAX = 5;

class Squads {
  constructor(db, { engine, social, now, onEvent } = {}) {
    this.db = db; this.engine = engine; this.social = social; this.now = now || (() => Date.now()); this.onEvent = onEvent || (() => {});
  }

  // ── Squads ───────────────────────────────────────────────────────────────
  create(userId, name) {
    name = String(name || '').trim().slice(0, 40);
    if (name.length < 2) throw new Error('Give your squad a name');
    if (this.db.prepare('SELECT 1 FROM squad_members WHERE user_id = ?').get(userId)) throw new Error('You are already in a squad. Leave it first.');
    if (this.db.prepare('SELECT 1 FROM squads WHERE lower(name) = lower(?)').get(name)) throw new Error('That squad name is taken');
    const code = crypto.randomBytes(3).toString('hex').toUpperCase();
    const prof = this.engine.getProfile(userId);
    const r = this.db.prepare('INSERT INTO squads (name, code, captain_id, city, created_at) VALUES (?, ?, ?, ?, ?)').run(name, code, userId, prof ? [prof.city, prof.region].filter(Boolean).join(', ') : '', this.now());
    this.db.prepare('INSERT INTO squad_members (squad_id, user_id, joined_at) VALUES (?, ?, ?)').run(r.lastInsertRowid, userId, this.now());
    return this.squad(r.lastInsertRowid);
  }
  join(userId, code) {
    const s = this.db.prepare('SELECT * FROM squads WHERE code = ?').get(String(code || '').trim().toUpperCase());
    if (!s) throw new Error('No squad with that code');
    if (this.db.prepare('SELECT 1 FROM squad_members WHERE user_id = ?').get(userId)) throw new Error('You are already in a squad. Leave it first.');
    if (this.db.prepare('SELECT COUNT(*) AS c FROM squad_members WHERE squad_id = ?').get(s.id).c >= SQUAD_MAX) throw new Error('That squad is full');
    this.db.prepare('INSERT INTO squad_members (squad_id, user_id, joined_at) VALUES (?, ?, ?)').run(s.id, userId, this.now());
    for (const m of this.members(s.id)) if (m.userId !== userId) this.engine.notify(m.userId, 'squad', `${this.social.name(userId)} joined ${s.name}`, 'Your squad just got bigger.');
    return this.squad(s.id);
  }
  leave(userId) {
    const m = this.db.prepare('SELECT squad_id FROM squad_members WHERE user_id = ?').get(userId);
    if (!m) return null;
    this.db.prepare('DELETE FROM squad_members WHERE user_id = ?').run(userId);
    const left = this.db.prepare('SELECT user_id FROM squad_members WHERE squad_id = ? ORDER BY joined_at').get(m.squad_id);
    if (!left) this.db.prepare('DELETE FROM squads WHERE id = ?').run(m.squad_id);
    else { const s = this.db.prepare('SELECT captain_id FROM squads WHERE id = ?').get(m.squad_id); if (s.captain_id === userId) this.db.prepare('UPDATE squads SET captain_id = ? WHERE id = ?').run(left.user_id, m.squad_id); }
    return { ok: true };
  }
  mine(userId) { const m = this.db.prepare('SELECT squad_id FROM squad_members WHERE user_id = ?').get(userId); return m ? this.squad(m.squad_id) : null; }
  members(squadId) { return this.db.prepare('SELECT m.user_id, m.joined_at, u.display_name FROM squad_members m JOIN users u ON u.id = m.user_id WHERE m.squad_id = ? ORDER BY m.joined_at').all(squadId).map(m => ({ userId: m.user_id, name: m.display_name, joinedAt: m.joined_at, online: this.social ? this.social.online(m.user_id) : false })); }
  squad(id) {
    const s = this.db.prepare('SELECT * FROM squads WHERE id = ?').get(id);
    if (!s) return null;
    const today = new Date(this.now()).toISOString().slice(0, 10);
    const members = this.members(id).map(m => ({ ...m, today: (this.db.prepare('SELECT score, tasks_done, tasks_total FROM daily_scores WHERE user_id = ? AND date = ?').get(m.userId, today) || { score: 0, tasks_done: 0, tasks_total: 0 }) }));
    return { id: s.id, name: s.name, code: s.code, captainId: s.captain_id, city: s.city, members, todayScore: members.reduce((t, m) => t + (m.today.score || 0), 0), weekScore: this.weekScore(id, today) };
  }
  weekScore(squadId, dateKey) {
    const since = this._shift(dateKey, -6);
    return this.db.prepare('SELECT COALESCE(SUM(s.score),0) AS t FROM daily_scores s JOIN squad_members m ON m.user_id = s.user_id WHERE m.squad_id = ? AND s.date >= ? AND s.date <= ?').get(squadId, since, dateKey).t;
  }
  board(dateKey, limit = 25) {
    const since = this._shift(dateKey, -6);
    return this.db.prepare(
      `SELECT q.id, q.name, q.city, COUNT(DISTINCT m.user_id) AS size, COALESCE(SUM(CASE WHEN s.date = ? THEN s.score ELSE 0 END),0) AS today, COALESCE(SUM(CASE WHEN s.date >= ? THEN s.score ELSE 0 END),0) AS week
       FROM squads q JOIN squad_members m ON m.squad_id = q.id LEFT JOIN daily_scores s ON s.user_id = m.user_id AND s.date >= ? AND s.date <= ?
       GROUP BY q.id ORDER BY week DESC, today DESC LIMIT ?`
    ).all(dateKey, since, since, dateKey, limit).map((r, i) => ({ rank: i + 1, id: r.id, name: r.name, city: r.city, size: r.size, todayScore: r.today, weekScore: r.week }));
  }
  _shift(d, n) { const x = new Date(d + 'T00:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); }

  // ── Crew room: group video for a squad (mesh, up to 5) ───────────────────
  openRoom(userId) {
    const s = this.mine(userId);
    if (!s) throw new Error('Join a squad first');
    let room = this.db.prepare("SELECT * FROM live_rooms WHERE squad_id = ? AND status = 'live' AND kind = 'crew'").get(s.id);
    if (!room) {
      const r = this.db.prepare("INSERT INTO live_rooms (host_id, title, status, started_at, kind, squad_id) VALUES (?, ?, 'live', ?, 'crew', ?)").run(userId, `${s.name} crew call`, this.now(), s.id);
      room = this.db.prepare('SELECT * FROM live_rooms WHERE id = ?').get(r.lastInsertRowid);
      for (const m of s.members) if (m.userId !== userId) { this.engine.notify(m.userId, 'crew_call', `${this.social.name(userId)} opened the crew call`, `${s.name} is on. Jump in from People.`); }
    }
    this.db.prepare('UPDATE live_rooms SET viewers = viewers + 1, peak = MAX(peak, viewers + 1) WHERE id = ?').run(room.id);
    const peers = this.db.prepare('SELECT user_id FROM squad_members WHERE squad_id = ? AND user_id != ?').all(s.id, userId).map(r => r.user_id).filter(id => this.social.online(id));
    this.onEvent(null, 'crew_room', { roomId: room.id, squadId: s.id, userId, name: this.social.name(userId), action: 'join' });
    return { roomId: room.id, squad: s, peers };
  }
  leaveRoom(userId, roomId) {
    const room = this.db.prepare("SELECT * FROM live_rooms WHERE id = ? AND kind = 'crew'").get(roomId);
    if (!room) return;
    this.db.prepare('UPDATE live_rooms SET viewers = MAX(0, viewers - 1) WHERE id = ?').run(roomId);
    const left = this.db.prepare('SELECT viewers FROM live_rooms WHERE id = ?').get(roomId).viewers;
    if (left <= 0) this.db.prepare("UPDATE live_rooms SET status = 'ended', ended_at = ? WHERE id = ?").run(this.now(), roomId);
    this.onEvent(null, 'crew_room', { roomId, squadId: room.squad_id, userId, action: 'leave' });
  }
  /** Relay a WebRTC signal to a squad-mate in the same crew room. */
  signal(roomId, fromId, toId, type, payload) {
    const room = this.db.prepare("SELECT * FROM live_rooms WHERE id = ? AND kind = 'crew' AND status = 'live'").get(roomId);
    if (!room) throw new Error('That crew call ended');
    const inSquad = (id) => this.db.prepare('SELECT 1 FROM squad_members WHERE squad_id = ? AND user_id = ?').get(room.squad_id, id);
    if (!inSquad(fromId) || !inSquad(toId)) throw new Error('Crew calls are for your squad');
    if (!['offer', 'answer', 'ice'].includes(type)) throw new Error('Bad signal');
    this.onEvent(toId, 'crew_signal', { roomId, type, fromId, payload: payload || null });
    return { ok: true };
  }

  // ── Bot vs bot ───────────────────────────────────────────────────────────
  /** Two players, same date: the crowd votes on whose bot built the better plan; the score decides the winner at close. */
  challenge(aId, bId, dateKey) {
    if (aId === bId) throw new Error('Pick another bot');
    if (!this.db.prepare('SELECT 1 FROM users WHERE id = ?').get(bId)) throw new Error('No such player');
    if (this.db.prepare("SELECT 1 FROM bot_duels WHERE date = ? AND status = 'open' AND ((a_id = ? AND b_id = ?) OR (a_id = ? AND b_id = ?))").get(dateKey, aId, bId, bId, aId)) throw new Error('Already on for that day');
    const r = this.db.prepare("INSERT INTO bot_duels (a_id, b_id, date, status, created_at) VALUES (?, ?, ?, 'open', ?)").run(aId, bId, dateKey, this.now());
    this.engine.notify(bId, 'bot_duel', `${this.social.name(aId)}'s bot vs yours`, `Bot vs bot on ${dateKey}. The crowd votes on the plans; the score decides.`);
    return this.duel(r.lastInsertRowid);
  }
  vote(duelId, voterId, pick) {
    const d = this.db.prepare('SELECT * FROM bot_duels WHERE id = ?').get(duelId);
    if (!d) throw new Error('No such duel');
    if (voterId === d.a_id || voterId === d.b_id) throw new Error('You are in this one');
    if (!['a', 'b'].includes(pick)) throw new Error('Pick a or b');
    this.db.prepare('INSERT INTO bot_duel_votes (duel_id, voter_id, pick, created_at) VALUES (?, ?, ?, ?) ON CONFLICT(duel_id, voter_id) DO UPDATE SET pick = excluded.pick').run(duelId, voterId, pick, this.now());
    return this.duel(duelId);
  }
  settle(dateKey) {
    for (const d of this.db.prepare("SELECT * FROM bot_duels WHERE date = ? AND status = 'open'").all(dateKey)) {
      if (this.db.prepare("SELECT 1 FROM plans WHERE date = ? AND status = 'open' AND user_id IN (?, ?)").get(dateKey, d.a_id, d.b_id)) continue;
      const sc = (u) => (this.db.prepare('SELECT score FROM daily_scores WHERE user_id = ? AND date = ?').get(u, dateKey) || {}).score || 0;
      const a = sc(d.a_id), b = sc(d.b_id);
      const winner = a === b ? null : a > b ? d.a_id : d.b_id;
      this.db.prepare("UPDATE bot_duels SET status = 'settled', a_score = ?, b_score = ?, winner_id = ? WHERE id = ?").run(a, b, winner, d.id);
      if (winner) this.engine.awardBadge(winner, 'bot_vs_bot', dateKey, 'Won a bot vs bot');
      for (const u of [d.a_id, d.b_id]) this.engine.notify(u, 'bot_duel', winner ? (winner === u ? 'Your bot won' : 'Their bot won') : 'Bot vs bot tied', `${a.toLocaleString()} vs ${b.toLocaleString()} on ${dateKey}.`);
    }
  }
  duel(id) {
    const d = this.db.prepare('SELECT d.*, a.display_name AS an, b.display_name AS bn FROM bot_duels d JOIN users a ON a.id = d.a_id JOIN users b ON b.id = d.b_id WHERE d.id = ?').get(id);
    if (!d) return null;
    const v = this.db.prepare("SELECT SUM(CASE WHEN pick = 'a' THEN 1 ELSE 0 END) AS a, SUM(CASE WHEN pick = 'b' THEN 1 ELSE 0 END) AS b FROM bot_duel_votes WHERE duel_id = ?").get(id);
    const plan = (u) => { const p = this.engine.getPlan(u, d.date); return p ? { headline: p.headline, generatedBy: p.generatedBy, tasks: p.tasks.map(t => ({ icon: t.icon, title: t.title, hours: t.hours, difficulty: t.difficulty, status: t.status, approval: t.approval, points: t.points })) } : null; };
    return { id: d.id, date: d.date, status: d.status, a: { id: d.a_id, name: d.an, score: d.a_score, votes: v.a || 0, plan: plan(d.a_id) }, b: { id: d.b_id, name: d.bn, score: d.b_score, votes: v.b || 0, plan: plan(d.b_id) }, winnerId: d.winner_id };
  }
  duels(limit = 20) { return this.db.prepare('SELECT id FROM bot_duels ORDER BY date DESC, id DESC LIMIT ?').all(limit).map(r => this.duel(r.id)); }
  mineDuels(userId) { return this.db.prepare('SELECT id FROM bot_duels WHERE a_id = ? OR b_id = ? ORDER BY date DESC LIMIT 10').all(userId, userId).map(r => this.duel(r.id)); }
}

module.exports = Squads;
module.exports.constants = { SQUAD_MAX };
