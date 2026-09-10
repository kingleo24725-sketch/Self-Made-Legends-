'use strict';

// Fraud defenses: phone verification, one account per device, and a trust
// score the Auditor uses to decide how much proof a play needs.
//
// Phone codes go out through Twilio Verify when TWILIO_* is set. Without it
// the code is logged to the server console (dev only) so the flow still works.

const crypto = require('crypto');

const CODE_TTL_MS = 10 * 60_000;
const MAX_ATTEMPTS = 5;
const MAX_ACCOUNTS_PER_DEVICE = 1;

class Trust {
  constructor(db, { now, env, sms } = {}) {
    this.db = db; this.now = now || (() => Date.now()); this.env = env || process.env;
    this.sms = sms || null; // test hook: async (phone, text)
    this.twilio = !!(this.env.TWILIO_ACCOUNT_SID && this.env.TWILIO_AUTH_TOKEN && this.env.TWILIO_FROM);
  }

  static normalizePhone(p) {
    const d = String(p || '').replace(/[^\d+]/g, '');
    if (/^\+\d{8,15}$/.test(d)) return d;
    if (/^1?\d{10}$/.test(d)) return '+1' + d.slice(-10);
    return null;
  }

  // ── Phone verification ───────────────────────────────────────────────────
  async sendCode(userId, phone) {
    const norm = Trust.normalizePhone(phone);
    if (!norm) throw new Error('Enter a real phone number');
    const other = this.db.prepare('SELECT id FROM users WHERE phone = ? AND phone_verified_at IS NOT NULL AND id != ?').get(norm, userId);
    if (other) throw new Error('That number is already verified on another account');
    const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
    this.db.prepare('INSERT INTO phone_codes (user_id, phone, code, attempts, expires_at) VALUES (?, ?, ?, 0, ?) ON CONFLICT(user_id) DO UPDATE SET phone=excluded.phone, code=excluded.code, attempts=0, expires_at=excluded.expires_at')
      .run(userId, norm, code, this.now() + CODE_TTL_MS);
    const text = `Your Self-Made Legends code is ${code}. It expires in 10 minutes.`;
    if (this.sms) await this.sms(norm, text);
    else if (this.twilio) await this._twilioSend(norm, text);
    else console.log(`[trust] (no SMS provider) code for ${norm}: ${code}`);
    return { sent: true, phone: norm, provider: this.sms ? 'test' : this.twilio ? 'twilio' : 'console' };
  }

  async _twilioSend(to, body) {
    const sid = this.env.TWILIO_ACCOUNT_SID, token = this.env.TWILIO_AUTH_TOKEN;
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST', headers: { Authorization: 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'), 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ To: to, From: this.env.TWILIO_FROM, Body: body }),
    });
    if (!res.ok) throw new Error('Could not send the code right now');
  }

  verifyCode(userId, code) {
    const row = this.db.prepare('SELECT * FROM phone_codes WHERE user_id = ?').get(userId);
    if (!row) throw new Error('Ask for a code first');
    if (row.expires_at < this.now()) throw new Error('That code expired. Ask for a new one.');
    if (row.attempts >= MAX_ATTEMPTS) throw new Error('Too many tries. Ask for a new code.');
    if (String(code || '').trim() !== row.code) { this.db.prepare('UPDATE phone_codes SET attempts = attempts + 1 WHERE user_id = ?').run(userId); throw new Error('Wrong code'); }
    this.db.prepare('UPDATE users SET phone = ?, phone_verified_at = ? WHERE id = ?').run(row.phone, this.now(), userId);
    this.db.prepare('DELETE FROM phone_codes WHERE user_id = ?').run(userId);
    this.recompute(userId);
    return { verified: true, phone: row.phone };
  }
  phoneVerified(userId) { const u = this.db.prepare('SELECT phone_verified_at FROM users WHERE id = ?').get(userId); return !!(u && u.phone_verified_at); }

  // ── Devices: one account per phone ───────────────────────────────────────
  /** Record a device for a user. Throws if this device already carries the maximum number of accounts. */
  registerDevice(userId, deviceId, { enforce = true } = {}) {
    deviceId = String(deviceId || '').trim().slice(0, 80);
    if (!deviceId) return { ok: true, skipped: true };
    const others = this.db.prepare('SELECT user_id FROM devices WHERE device_id = ? AND user_id != ?').all(deviceId, userId);
    if (enforce && others.length >= MAX_ACCOUNTS_PER_DEVICE) throw Object.assign(new Error('This phone already has an account. Sign in to it, or contact us.'), { status: 409 });
    this.db.prepare('INSERT INTO devices (device_id, user_id, first_seen, last_seen) VALUES (?, ?, ?, ?) ON CONFLICT(device_id, user_id) DO UPDATE SET last_seen = excluded.last_seen').run(deviceId, userId, this.now(), this.now());
    return { ok: true, sharedWith: others.length };
  }
  devicesFor(userId) { return this.db.prepare('SELECT device_id, first_seen, last_seen FROM devices WHERE user_id = ?').all(userId); }

  // ── Trust score: 0-100 ───────────────────────────────────────────────────
  /**
   * New accounts need receipts; proven players need less. The score moves with
   * verified phone, approved days, receipt-verified dollars, crowd bot ratings,
   * and against shared devices and rejected approvals.
   */
  recompute(userId) {
    const u = this.db.prepare('SELECT phone_verified_at, created_at FROM users WHERE id = ?').get(userId) || {};
    const days = this.db.prepare('SELECT COUNT(*) AS c FROM daily_scores WHERE user_id = ? AND closed = 1 AND tasks_done > 0').get(userId).c;
    const receipts = this.db.prepare('SELECT COUNT(*) AS c FROM receipts WHERE user_id = ?').get(userId).c;
    const rejected = this.db.prepare("SELECT COUNT(*) AS c FROM tasks t JOIN plans p ON p.id = t.plan_id WHERE p.user_id = ? AND t.approval = 'rejected'").get(userId).c;
    const approved = this.db.prepare("SELECT COUNT(*) AS c FROM tasks t JOIN plans p ON p.id = t.plan_id WHERE p.user_id = ? AND t.approval = 'approved'").get(userId).c;
    const shared = this.db.prepare('SELECT COUNT(DISTINCT d2.user_id) AS c FROM devices d JOIN devices d2 ON d2.device_id = d.device_id AND d2.user_id != d.user_id WHERE d.user_id = ?').get(userId).c;
    const rating = this.db.prepare('SELECT AVG(rating) AS a, COUNT(*) AS n FROM bot_ratings WHERE host_id = ?').get(userId);
    let score = 10;
    if (u.phone_verified_at) score += 20;
    score += Math.min(25, days * 2);
    score += Math.min(25, receipts * 5);
    score += Math.min(10, approved);
    if (rating.n >= 3) score += Math.round((rating.a - 3) * 5);
    score -= Math.min(30, rejected * 5);
    score -= shared * 20;
    score = Math.max(0, Math.min(100, score));
    this.db.prepare('UPDATE users SET trust = ? WHERE id = ?').run(score, userId);
    return score;
  }
  score(userId) { const u = this.db.prepare('SELECT trust FROM users WHERE id = ?').get(userId); return u ? u.trust : 0; }
  /** What the Auditor demands before approving, by trust. */
  proofRequired(userId) {
    const t = this.score(userId);
    if (t < 30) return { level: 'strict', needs: 'a receipt screenshot or a photo of the work', minNote: 25 };
    if (t < 60) return { level: 'normal', needs: 'a clear account of the work', minNote: 25 };
    return { level: 'trusted', needs: 'a short note', minNote: 12 };
  }

  ban(userId, reason) { this.db.prepare('UPDATE users SET banned_at = ?, public_profile = 0 WHERE id = ?').run(this.now(), userId); this.db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId); this.db.prepare('INSERT INTO ops_alerts (kind, severity, message, data, created_at) VALUES (?, ?, ?, ?, ?)').run('ban', 'info', `Banned ${userId}: ${reason || ''}`, null, this.now()); }
  banned(userId) { const u = this.db.prepare('SELECT banned_at FROM users WHERE id = ?').get(userId); return !!(u && u.banned_at); }
}

module.exports = Trust;
module.exports.constants = { CODE_TTL_MS, MAX_ATTEMPTS, MAX_ACCOUNTS_PER_DEVICE };
