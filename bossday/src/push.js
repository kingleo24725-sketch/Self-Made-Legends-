'use strict';

// Web push. Turned on by VAPID keys in the environment; silently off otherwise.
// Generate keys once with:  npx web-push generate-vapid-keys

let webpush = null;
try { webpush = require('web-push'); } catch (_) { /* optional */ }

class Push {
  constructor(db, opts = {}) {
    this.db = db;
    this.publicKey = opts.publicKey ?? process.env.VAPID_PUBLIC_KEY ?? '';
    this.privateKey = opts.privateKey ?? process.env.VAPID_PRIVATE_KEY ?? '';
    this.subject = opts.subject ?? process.env.VAPID_SUBJECT ?? 'mailto:hello@example.com';
    this.enabled = !!(webpush && this.publicKey && this.privateKey);
    this.sender = opts.sender || null; // test hook: (subscription, payload) => Promise
    if (this.enabled) webpush.setVapidDetails(this.subject, this.publicKey, this.privateKey);
  }

  subscribe(userId, subscription) {
    if (!subscription || typeof subscription.endpoint !== 'string' || !subscription.endpoint.startsWith('https://')) throw new Error('Invalid subscription');
    this.db.prepare('INSERT INTO push_subscriptions (endpoint, user_id, data, created_at) VALUES (?, ?, ?, ?) ON CONFLICT(endpoint) DO UPDATE SET user_id=excluded.user_id, data=excluded.data')
      .run(subscription.endpoint, userId, JSON.stringify(subscription), Date.now());
  }
  unsubscribe(userId, endpoint) { this.db.prepare('DELETE FROM push_subscriptions WHERE user_id = ? AND endpoint = ?').run(userId, String(endpoint || '')); }
  count(userId) { return this.db.prepare('SELECT COUNT(*) AS c FROM push_subscriptions WHERE user_id = ?').get(userId).c; }

  /** Send to every device the user registered. Dead subscriptions are pruned. */
  async send(userId, payload) {
    const rows = this.db.prepare('SELECT endpoint, data FROM push_subscriptions WHERE user_id = ?').all(userId);
    if (!rows.length || (!this.enabled && !this.sender)) return 0;
    let sent = 0;
    for (const r of rows) {
      const sub = JSON.parse(r.data);
      try {
        if (this.sender) await this.sender(sub, payload);
        else await webpush.sendNotification(sub, JSON.stringify(payload), { TTL: 3600 });
        sent++;
      } catch (e) {
        if (e && (e.statusCode === 404 || e.statusCode === 410)) this.db.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?').run(r.endpoint);
      }
    }
    return sent;
  }
}

module.exports = Push;
