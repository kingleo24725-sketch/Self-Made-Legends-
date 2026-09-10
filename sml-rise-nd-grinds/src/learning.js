'use strict';

// How the bots get smarter, every event, every hour, every night.
//
// Three layers of memory feed every plan:
//   user   - what THIS person finishes and what they actually earn, per play
//   city   - what pays in THIS city, learned from everyone there
//   global - what works anywhere, learned from every player
// Every task outcome updates all three as an exponential moving average, so
// the next plan, for anyone, is already a little sharper. The Coach adds the
// nightly narrative memory on top of this; the Scout adds hourly gig refreshes.

const ALPHA = 0.2;        // how fast a new outcome moves the average
const MIN_N_USER = 2;     // trust a person's own history after this many outcomes
const MIN_N_CITY = 5;
const MIN_N_GLOBAL = 10;

class Learning {
  constructor(db, opts = {}) { this.db = db; this.now = opts.now || (() => Date.now()); }

  static cityKey(profile) { return `city:${String((profile && profile.location) || '').trim().toLowerCase() || 'anywhere'}`; }

  /** Record one outcome for a play: done or not, and how earnings compared to the estimate. */
  observe(userId, profile, playKey, { done, earnRatio = null }) {
    if (!playKey) return;
    const scopes = [`user:${userId}`, Learning.cityKey(profile), 'global'];
    const up = this.db.prepare(
      `INSERT INTO play_weights (scope, play_key, done_ema, earn_ema, n, updated_at) VALUES (?, ?, ?, ?, 1, ?)
       ON CONFLICT(scope, play_key) DO UPDATE SET
         done_ema = done_ema + ${ALPHA} * (excluded.done_ema - done_ema),
         earn_ema = CASE WHEN ? IS NULL THEN earn_ema ELSE earn_ema + ${ALPHA} * (excluded.earn_ema - earn_ema) END,
         n = n + 1, updated_at = excluded.updated_at`
    );
    for (const scope of scopes) up.run(scope, playKey, done ? 1 : 0, earnRatio == null ? 1 : earnRatio, this.now(), earnRatio);
    this.db.prepare('INSERT INTO learning_events (user_id, kind, play_key, value, created_at) VALUES (?, ?, ?, ?, ?)').run(userId, done ? 'done' : 'skipped', playKey, earnRatio, this.now());
  }

  /** Blended weights the planner can use: { playKey: { doneRate, earnRatio, confidence } } */
  weights(userId, profile) {
    const rows = this.db.prepare('SELECT scope, play_key, done_ema, earn_ema, n FROM play_weights WHERE scope IN (?, ?, ?)').all(`user:${userId}`, Learning.cityKey(profile), 'global');
    const out = {};
    for (const r of rows) {
      const w = out[r.play_key] || (out[r.play_key] = { user: null, city: null, global: null });
      const layer = r.scope.startsWith('user:') ? 'user' : r.scope.startsWith('city:') ? 'city' : 'global';
      w[layer] = { done: r.done_ema, earn: r.earn_ema, n: r.n };
    }
    const blended = {};
    for (const [key, w] of Object.entries(out)) {
      // The most specific layer with enough history wins; thinner layers still nudge.
      const layers = [[w.user, MIN_N_USER, 1.0], [w.city, MIN_N_CITY, 0.6], [w.global, MIN_N_GLOBAL, 0.4]];
      let done = 0, earn = 0, weight = 0, conf = 0;
      for (const [l, min, wt] of layers) {
        if (!l) continue;
        const k = wt * Math.min(1, l.n / min);
        done += l.done * k; earn += l.earn * k; weight += k; conf = Math.max(conf, Math.min(1, l.n / min) * wt);
      }
      if (weight > 0) blended[key] = { doneRate: done / weight, earnRatio: earn / weight, confidence: conf, attempts: (w.user && w.user.n) || 0 };
    }
    return blended;
  }

  /** A number the player can watch grow: how much their bot has learned, from them and from the world. */
  botIQ(userId) {
    const mine = this.db.prepare('SELECT COUNT(*) AS c FROM learning_events WHERE user_id = ?').get(userId).c;
    const world = this.db.prepare('SELECT COUNT(*) AS c FROM learning_events').get().c;
    const notes = this.db.prepare('SELECT memory FROM profiles WHERE user_id = ?').get(userId);
    let noteCount = 0; try { noteCount = (JSON.parse((notes && notes.memory) || '{}').notes || []).length; } catch (_) {}
    const iq = Math.round(100 + 12 * Math.log2(1 + mine) + 6 * Math.log2(1 + world) + 3 * noteCount);
    return { iq, outcomesFromYou: mine, outcomesFromWorld: world, notes: noteCount, lastLearnedAt: (this.db.prepare('SELECT MAX(created_at) AS t FROM learning_events').get() || {}).t || null };
  }
}

module.exports = Learning;
