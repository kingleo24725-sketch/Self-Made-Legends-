'use strict';
// Copyright (c) 2026 Self-Made Legends LLC. All rights reserved. Proprietary and confidential. See LICENSE.

// Auto-clips from lives. The host's phone records the stream in short chunks
// while the server keeps chat activity per chunk; when the live ends the app
// picks the busiest minute, uploads that clip, and it gets a share page with
// the receipt card next to it. Files live on disk under DATA_DIR/clips.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const MAX_BYTES = 25 * 1024 * 1024;
const MAX_SECONDS = 90;

class Clips {
  constructor(db, { dir, now, onEvent } = {}) {
    this.db = db; this.now = now || (() => Date.now()); this.onEvent = onEvent || (() => {});
    this.dir = dir || path.join(process.env.DATA_DIR || path.join(__dirname, '..', 'data'), 'clips');
    fs.mkdirSync(this.dir, { recursive: true });
  }

  /** Chat activity per 10-second bucket since the live started: the client uses this to pick the best minute. */
  activity(roomId) {
    const room = this.db.prepare('SELECT started_at FROM live_rooms WHERE id = ?').get(roomId);
    if (!room) return [];
    const rows = this.db.prepare('SELECT created_at FROM live_messages WHERE room_id = ?').all(roomId);
    const buckets = {};
    for (const r of rows) { const b = Math.floor((r.created_at - room.started_at) / 10_000); buckets[b] = (buckets[b] || 0) + 1; }
    return Object.entries(buckets).map(([b, n]) => ({ bucket: Number(b), startSec: Number(b) * 10, messages: n })).sort((x, y) => x.bucket - y.bucket);
  }
  /** The 60-second window with the most chat. */
  bestWindow(roomId, seconds = 60) {
    const act = this.activity(roomId);
    if (!act.length) return { startSec: 0, seconds };
    const per = {}; for (const a of act) per[a.bucket] = a.messages;
    const maxB = Math.max(...act.map(a => a.bucket));
    const peak = act.reduce((m, a) => a.messages > m.messages ? a : m, act[0]).bucket;
    const want = Math.max(0, peak - 2); // the burst lands about 20 seconds into the clip
    let best = 0, bestStart = 0, bestDist = Infinity;
    for (let b = 0; b <= maxB; b++) {
      let s = 0; for (let k = 0; k < seconds / 10; k++) s += per[b + k] || 0;
      const dist = Math.abs(b - want);
      if (s > best || (s === best && s > 0 && dist < bestDist)) { best = s; bestStart = b * 10; bestDist = dist; }
    }
    return { startSec: bestStart, seconds, messages: best };
  }

  save(userId, { roomId = null, title, buffer, mime, seconds }) {
    if (!buffer || !buffer.length) throw new Error('No video');
    if (buffer.length > MAX_BYTES) throw new Error('Clip too large (25MB max)');
    if (!['video/webm', 'video/mp4'].includes(mime)) throw new Error('Clips must be WebM or MP4');
    const ext = mime === 'video/mp4' ? 'mp4' : 'webm';
    const file = `${this.now()}-${crypto.randomBytes(4).toString('hex')}.${ext}`;
    fs.writeFileSync(path.join(this.dir, file), buffer);
    const r = this.db.prepare('INSERT INTO clips (user_id, room_id, title, file, mime, bytes, seconds, date, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(userId, roomId, String(title || 'From the grind').slice(0, 100), file, mime, buffer.length, Math.min(MAX_SECONDS, Math.round(Number(seconds) || 0)), new Date(this.now()).toISOString().slice(0, 10), this.now());
    const clip = this.clip(r.lastInsertRowid);
    this.onEvent(null, 'clip', { id: clip.id, userId, title: clip.title });
    return clip;
  }
  clip(id) {
    const c = this.db.prepare('SELECT c.*, u.display_name FROM clips c JOIN users u ON u.id = c.user_id WHERE c.id = ?').get(id);
    return c && { id: c.id, userId: c.user_id, name: c.display_name, roomId: c.room_id, title: c.title, mime: c.mime, bytes: c.bytes, seconds: c.seconds, date: c.date, views: c.views, public: !!c.public, url: `/clip/${c.id}`, fileUrl: `/api/clips/${c.id}/video`, at: c.created_at };
  }
  filePath(id) { const c = this.db.prepare('SELECT file FROM clips WHERE id = ?').get(id); return c ? path.join(this.dir, c.file) : null; }
  view(id) { this.db.prepare('UPDATE clips SET views = views + 1 WHERE id = ?').run(id); }
  latest(limit = 20) { return this.db.prepare('SELECT id FROM clips WHERE public = 1 ORDER BY created_at DESC LIMIT ?').all(limit).map(r => this.clip(r.id)); }
  mine(userId) { return this.db.prepare('SELECT id FROM clips WHERE user_id = ? ORDER BY created_at DESC LIMIT 30').all(userId).map(r => this.clip(r.id)); }
  remove(userId, id) { const c = this.db.prepare('SELECT * FROM clips WHERE id = ? AND user_id = ?').get(id, userId); if (!c) throw new Error('Not found'); try { fs.unlinkSync(path.join(this.dir, c.file)); } catch (_) {} this.db.prepare('DELETE FROM clips WHERE id = ?').run(id); }
}

module.exports = Clips;
module.exports.constants = { MAX_BYTES, MAX_SECONDS };
