'use strict';
// Copyright (c) 2026 Self-Made Legends LLC. All rights reserved. Proprietary and confidential. See LICENSE.

// The social layer: faces, friends, messages, video calls, and going live.
//
// Video calls and live rooms are WebRTC, peer to peer, with this server only
// relaying the signaling (offers, answers, ICE candidates) over the existing
// server-sent-events channel. No video ever touches the server. Calls need a
// friendship; messages can go to anyone who has not blocked you; live rooms
// are public and let the crowd rate the host's bot.

const MSG_MAX = 1000;
const MSG_RATE = { windowMs: 60_000, max: 30 };
const LIVE_MAX_VIEWERS = 25;   // peer-to-peer fan-out from one phone tops out around here

class Social {
  constructor(db, { now, onEvent } = {}) {
    this.db = db; this.now = now || (() => Date.now()); this.onEvent = onEvent || (() => {});
  }

  // ── Faces ────────────────────────────────────────────────────────────────
  setAvatar(userId, dataUrl) {
    const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl || ''));
    if (!m) throw new Error('Send a JPEG, PNG or WebP image');
    if (m[2].length > 400_000) throw new Error('Image too large. The app resizes photos; try again.');
    this.db.prepare('INSERT INTO avatars (user_id, mime, data, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET mime=excluded.mime, data=excluded.data, updated_at=excluded.updated_at').run(userId, m[1], m[2], this.now());
    this.db.prepare("UPDATE profiles SET avatar_style = 'photo' WHERE user_id = ?").run(userId);
    return { ok: true };
  }
  clearAvatar(userId, style = 'initials') {
    this.db.prepare('DELETE FROM avatars WHERE user_id = ?').run(userId);
    this.db.prepare('UPDATE profiles SET avatar_style = ? WHERE user_id = ?').run(['initials', 'legend'].includes(style) ? style : 'initials', userId);
  }
  avatar(userId) {
    const a = this.db.prepare('SELECT mime, data FROM avatars WHERE user_id = ?').get(userId);
    if (a) return { mime: a.mime, buffer: Buffer.from(a.data, 'base64') };
    const u = this.db.prepare('SELECT u.display_name, p.avatar_style FROM users u LEFT JOIN profiles p ON p.user_id = u.id WHERE u.id = ?').get(userId);
    return { mime: 'image/svg+xml', buffer: Buffer.from(Social.likenessSVG(u ? u.display_name : '?', userId, u && u.avatar_style)) };
  }
  /** A likeness for people who do not want a photo: initials on a colour that is theirs alone. */
  static likenessSVG(name, seed, style) {
    let h = 0; for (const c of String(seed)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    const hue = h % 360, hue2 = (hue + 40) % 360;
    const initials = String(name || '?').split(/\s+/).map(s => s[0] || '').join('').slice(0, 2).toUpperCase();
    const crown = style === 'legend' ? '<text x="64" y="40" font-size="26" text-anchor="middle">👑</text>' : '';
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hue},70%,45%)"/><stop offset="1" stop-color="hsl(${hue2},70%,30%)"/></linearGradient></defs><rect width="128" height="128" rx="64" fill="url(#g)"/>${crown}<text x="64" y="${style === 'legend' ? 88 : 80}" font-size="48" font-weight="800" text-anchor="middle" fill="#fff" font-family="Helvetica,Arial,sans-serif">${initials}</text></svg>`;
  }

  // ── Presence ─────────────────────────────────────────────────────────────
  seen(userId) { this.db.prepare('UPDATE users SET last_seen = ? WHERE id = ?').run(this.now(), userId); }
  online(userId) { const u = this.db.prepare('SELECT last_seen FROM users WHERE id = ?').get(userId); return !!(u && u.last_seen && this.now() - u.last_seen < 3 * 60_000); }

  // ── People ───────────────────────────────────────────────────────────────
  search(query, limit = 10) {
    const like = `%${String(query || '').trim().toLowerCase()}%`;
    return this.db.prepare('SELECT u.id, u.display_name, p.city, p.region FROM users u LEFT JOIN profiles p ON p.user_id = u.id WHERE u.public_profile = 1 AND lower(u.display_name) LIKE ? ORDER BY u.display_name LIMIT ?').all(like, limit)
      .map(r => ({ id: r.id, name: r.display_name, city: [r.city, r.region].filter(Boolean).join(', '), online: this.online(r.id) }));
  }
  _pair(a, b) { return a < b ? [a, b] : [b, a]; }
  friendship(a, b) { const [x, y] = this._pair(a, b); return this.db.prepare('SELECT * FROM friends WHERE a_id = ? AND b_id = ?').get(x, y) || null; }
  areFriends(a, b) { const f = this.friendship(a, b); return !!(f && f.status === 'accepted'); }
  requestFriend(fromId, toId) {
    if (fromId === toId) throw new Error('That is you');
    if (!this.db.prepare('SELECT 1 FROM users WHERE id = ?').get(toId)) throw new Error('No such player');
    if (this.isBlocked(toId, fromId)) throw new Error('You cannot add this player');
    const f = this.friendship(fromId, toId);
    if (f && f.status === 'accepted') return this.friendView(fromId, toId);
    if (f && f.requested_by !== fromId) return this.acceptFriend(fromId, toId);   // they asked first: this accepts
    const [a, b] = this._pair(fromId, toId);
    this.db.prepare("INSERT INTO friends (a_id, b_id, status, requested_by, created_at) VALUES (?, ?, 'pending', ?, ?) ON CONFLICT(a_id, b_id) DO NOTHING").run(a, b, fromId, this.now());
    this.onEvent(toId, 'friend_request', { fromId, name: this.name(fromId) });
    return this.friendView(fromId, toId);
  }
  acceptFriend(userId, otherId) {
    const f = this.friendship(userId, otherId);
    if (!f || f.requested_by === userId) throw new Error('No request to accept');
    const [a, b] = this._pair(userId, otherId);
    this.db.prepare("UPDATE friends SET status = 'accepted' WHERE a_id = ? AND b_id = ?").run(a, b);
    this.onEvent(otherId, 'friend_accepted', { userId, name: this.name(userId) });
    return this.friendView(userId, otherId);
  }
  removeFriend(userId, otherId) { const [a, b] = this._pair(userId, otherId); this.db.prepare('DELETE FROM friends WHERE a_id = ? AND b_id = ?').run(a, b); }
  friendView(userId, otherId) { const f = this.friendship(userId, otherId); return { userId: otherId, name: this.name(otherId), status: f ? (f.status === 'accepted' ? 'friends' : f.requested_by === userId ? 'requested' : 'incoming') : 'none', online: this.online(otherId) }; }
  friends(userId) {
    return this.db.prepare('SELECT * FROM friends WHERE a_id = ? OR b_id = ?').all(userId, userId)
      .map(f => this.friendView(userId, f.a_id === userId ? f.b_id : f.a_id)).sort((x, y) => (y.online - x.online) || x.name.localeCompare(y.name));
  }
  name(id) { return (this.db.prepare('SELECT display_name FROM users WHERE id = ?').get(id) || {}).display_name || 'Legend'; }

  block(userId, otherId) { this.db.prepare('INSERT OR IGNORE INTO blocks (user_id, blocked_id, created_at) VALUES (?, ?, ?)').run(userId, otherId, this.now()); this.removeFriend(userId, otherId); }
  unblock(userId, otherId) { this.db.prepare('DELETE FROM blocks WHERE user_id = ? AND blocked_id = ?').run(userId, otherId); }
  isBlocked(byId, userId) { return !!this.db.prepare('SELECT 1 FROM blocks WHERE user_id = ? AND blocked_id = ?').get(byId, userId); }

  // ── Messages: anyone can message anyone ──────────────────────────────────
  send(fromId, toId, body) {
    body = String(body || '').trim().slice(0, MSG_MAX);
    if (!body) throw new Error('Say something');
    if (fromId === toId) throw new Error('That is you');
    if (!this.db.prepare('SELECT 1 FROM users WHERE id = ?').get(toId)) throw new Error('No such player');
    if (this.isBlocked(toId, fromId)) throw new Error('You cannot message this player');
    const recent = this.db.prepare('SELECT COUNT(*) AS c FROM messages WHERE from_id = ? AND created_at > ?').get(fromId, this.now() - MSG_RATE.windowMs).c;
    if (recent >= MSG_RATE.max) throw new Error('Slow down. Try again in a minute.');
    const r = this.db.prepare('INSERT INTO messages (from_id, to_id, body, created_at) VALUES (?, ?, ?, ?)').run(fromId, toId, body, this.now());
    const msg = { id: r.lastInsertRowid, fromId, toId, body, at: this.now(), fromName: this.name(fromId) };
    this.onEvent(toId, 'message', msg);
    return msg;
  }
  thread(userId, otherId, limit = 60) {
    const rows = this.db.prepare('SELECT * FROM messages WHERE (from_id = ? AND to_id = ?) OR (from_id = ? AND to_id = ?) ORDER BY created_at DESC, id DESC LIMIT ?').all(userId, otherId, otherId, userId, limit).reverse();
    this.db.prepare('UPDATE messages SET read = 1 WHERE to_id = ? AND from_id = ? AND read = 0').run(userId, otherId);
    return rows.map(m => ({ id: m.id, fromId: m.from_id, toId: m.to_id, body: m.body, at: m.created_at, mine: m.from_id === userId }));
  }
  inbox(userId) {
    const rows = this.db.prepare(
      `SELECT other, MAX(created_at) AS last, SUM(CASE WHEN to_id = ? AND read = 0 THEN 1 ELSE 0 END) AS unread FROM (
         SELECT CASE WHEN from_id = ? THEN to_id ELSE from_id END AS other, to_id, read, created_at FROM messages WHERE from_id = ? OR to_id = ?
       ) GROUP BY other ORDER BY last DESC LIMIT 50`
    ).all(userId, userId, userId, userId);
    return rows.map(r => {
      const last = this.db.prepare('SELECT body, from_id FROM messages WHERE (from_id = ? AND to_id = ?) OR (from_id = ? AND to_id = ?) ORDER BY created_at DESC, id DESC LIMIT 1').get(userId, r.other, r.other, userId);
      return { userId: r.other, name: this.name(r.other), last: last ? last.body.slice(0, 80) : '', lastMine: last ? last.from_id === userId : false, at: r.last, unread: r.unread, online: this.online(r.other), friend: this.areFriends(userId, r.other) };
    });
  }
  unreadCount(userId) { return this.db.prepare('SELECT COUNT(*) AS c FROM messages WHERE to_id = ? AND read = 0').get(userId).c; }

  // ── Video calls (friends only): signaling relay ──────────────────────────
  signal(fromId, toId, type, payload) {
    if (!['offer', 'answer', 'ice', 'end', 'ring', 'decline'].includes(type)) throw new Error('Bad signal');
    if (!this.areFriends(fromId, toId)) throw new Error('Video calls are for friends. Add them first.');
    if (type === 'ring') this.db.prepare("INSERT INTO calls (from_id, to_id, status, started_at) VALUES (?, ?, 'ringing', ?)").run(fromId, toId, this.now());
    if (type === 'answer') this.db.prepare("UPDATE calls SET status = 'connected' WHERE ((from_id = ? AND to_id = ?) OR (from_id = ? AND to_id = ?)) AND status = 'ringing'").run(fromId, toId, toId, fromId);
    if (type === 'end' || type === 'decline') this.db.prepare("UPDATE calls SET status = ?, ended_at = ? WHERE ((from_id = ? AND to_id = ?) OR (from_id = ? AND to_id = ?)) AND ended_at IS NULL").run(type === 'end' ? 'ended' : 'declined', this.now(), fromId, toId, toId, fromId);
    this.onEvent(toId, 'call', { type, fromId, fromName: this.name(fromId), payload: payload || null });
    return { ok: true };
  }
  recentCalls(userId) {
    return this.db.prepare('SELECT * FROM calls WHERE from_id = ? OR to_id = ? ORDER BY started_at DESC LIMIT 20').all(userId, userId)
      .map(c => ({ id: c.id, withId: c.from_id === userId ? c.to_id : c.from_id, withName: this.name(c.from_id === userId ? c.to_id : c.from_id), outgoing: c.from_id === userId, status: c.status, at: c.started_at, seconds: c.ended_at && c.status === 'ended' ? Math.round((c.ended_at - c.started_at) / 1000) : 0 }));
  }

  // ── Going live ───────────────────────────────────────────────────────────
  goLive(hostId, title) {
    this.endLive(hostId);
    const r = this.db.prepare("INSERT INTO live_rooms (host_id, title, status, started_at) VALUES (?, ?, 'live', ?)").run(hostId, String(title || 'Live from the grind').slice(0, 80), this.now());
    const room = this.room(r.lastInsertRowid);
    this.onEvent(null, 'live', { action: 'start', room });
    return room;
  }
  endLive(hostId) {
    const rows = this.db.prepare("SELECT id FROM live_rooms WHERE host_id = ? AND status = 'live'").all(hostId);
    for (const r of rows) { this.db.prepare("UPDATE live_rooms SET status = 'ended', ended_at = ? WHERE id = ?").run(this.now(), r.id); this.onEvent(null, 'live', { action: 'end', roomId: r.id }); }
    return rows.length;
  }
  room(id) {
    const r = this.db.prepare('SELECT * FROM live_rooms WHERE id = ?').get(id);
    if (!r) return null;
    const rating = this.db.prepare('SELECT AVG(rating) AS avg, COUNT(*) AS n FROM bot_ratings WHERE room_id = ?').get(id);
    return { id: r.id, hostId: r.host_id, hostName: this.name(r.host_id), title: r.title, status: r.status, viewers: r.viewers, peak: r.peak, startedAt: r.started_at, endedAt: r.ended_at, botRating: rating.n ? Math.round(rating.avg * 10) / 10 : null, ratings: rating.n };
  }
  liveNow() { return this.db.prepare("SELECT id FROM live_rooms WHERE status = 'live' ORDER BY viewers DESC, started_at DESC LIMIT 20").all().map(r => this.room(r.id)); }
  join(roomId, viewerId) {
    const r = this.db.prepare("SELECT * FROM live_rooms WHERE id = ? AND status = 'live'").get(roomId);
    if (!r) throw new Error('That live has ended');
    if (r.host_id === viewerId) throw new Error('You are the host');
    if (r.viewers >= LIVE_MAX_VIEWERS) throw new Error('This live is full right now');
    this.db.prepare('UPDATE live_rooms SET viewers = viewers + 1, peak = MAX(peak, viewers + 1) WHERE id = ?').run(roomId);
    this.onEvent(r.host_id, 'live_join', { roomId, viewerId, viewerName: this.name(viewerId) });
    return this.room(roomId);
  }
  leave(roomId, viewerId) {
    const r = this.db.prepare('SELECT host_id FROM live_rooms WHERE id = ?').get(roomId);
    if (!r) return;
    this.db.prepare('UPDATE live_rooms SET viewers = MAX(0, viewers - 1) WHERE id = ?').run(roomId);
    this.onEvent(r.host_id, 'live_leave', { roomId, viewerId });
  }
  /** Host <-> viewer WebRTC signaling inside a room. */
  liveSignal(roomId, fromId, toId, type, payload) {
    const r = this.db.prepare("SELECT host_id FROM live_rooms WHERE id = ? AND status = 'live'").get(roomId);
    if (!r) throw new Error('That live has ended');
    if (fromId !== r.host_id && toId !== r.host_id) throw new Error('Signals go through the host');
    if (!['offer', 'answer', 'ice'].includes(type)) throw new Error('Bad signal');
    this.onEvent(toId, 'live_signal', { roomId, type, fromId, payload: payload || null });
    return { ok: true };
  }
  liveChat(roomId, userId, body) {
    body = String(body || '').trim().slice(0, 300);
    if (!body) throw new Error('Say something');
    if (!this.db.prepare("SELECT 1 FROM live_rooms WHERE id = ? AND status = 'live'").get(roomId)) throw new Error('That live has ended');
    this.db.prepare('INSERT INTO live_messages (room_id, user_id, body, created_at) VALUES (?, ?, ?, ?)').run(roomId, userId, body, this.now());
    const tier = (this.db.prepare('SELECT tier FROM users WHERE id = ?').get(userId) || {}).tier;
    const msg = { roomId, userId, name: this.name(userId), body, at: this.now(), club: tier === 'fanclub' };
    this.onEvent(null, 'live_chat', msg);
    return msg;
  }
  liveMessages(roomId, limit = 50) { return this.db.prepare('SELECT m.*, u.display_name, u.tier FROM live_messages m JOIN users u ON u.id = m.user_id WHERE m.room_id = ? ORDER BY m.created_at DESC LIMIT ?').all(roomId, limit).reverse().map(m => ({ userId: m.user_id, name: m.display_name, body: m.body, at: m.created_at, club: m.tier === 'fanclub' })); }
  /** The crowd grades the host's bot: 1 (garbage) to 5 (amazing). */
  rateBot(roomId, raterId, rating) {
    const r = this.db.prepare('SELECT host_id FROM live_rooms WHERE id = ?').get(roomId);
    if (!r) throw new Error('No such live');
    if (r.host_id === raterId) throw new Error('You cannot rate your own bot');
    rating = Math.max(1, Math.min(5, Math.round(Number(rating) || 0)));
    this.db.prepare('INSERT INTO bot_ratings (room_id, rater_id, host_id, rating, created_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(room_id, rater_id) DO UPDATE SET rating = excluded.rating').run(roomId, raterId, r.host_id, rating, this.now());
    return this.botRating(r.host_id);
  }
  botRating(hostId) { const r = this.db.prepare('SELECT AVG(rating) AS avg, COUNT(*) AS n FROM bot_ratings WHERE host_id = ?').get(hostId); return { average: r.n ? Math.round(r.avg * 10) / 10 : null, count: r.n }; }
}

module.exports = Social;
module.exports.constants = { MSG_MAX, MSG_RATE, LIVE_MAX_VIEWERS };
