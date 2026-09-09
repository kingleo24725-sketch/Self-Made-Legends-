'use strict';

require('dotenv').config();

const path = require('path');
const express = require('express');
const { open } = require('./src/db');
const Auth = require('./src/auth');
const Engine = require('./src/engine');
const Crew = require('./src/agents');
const Push = require('./src/push');
const { RESOURCES } = require('./src/playbook');

const APP_URL = process.env.APP_URL || 'http://localhost:' + (process.env.PORT || 3000);
const TIER_PRICES = { pro: process.env.STRIPE_PRICE_PRO || '', boss: process.env.STRIPE_PRICE_BOSS || '' };

/**
 * Build the app. Everything is injectable so tests can run it against an
 * in-memory database with a frozen clock and an offline crew.
 */
function createApp(opts = {}) {
  const db = opts.db || open(opts.dbPath);
  const now = opts.now || (() => Date.now());
  const crew = opts.crew || new Crew();
  const push = opts.push || new Push(db);
  const listeners = new Set();
  const engine = new Engine(db, { crew, push, now, defaultTier: opts.defaultTier, onEvent: (userId, event, data) => { for (const l of listeners) l(userId, event, data); } });
  const auth = new Auth(db, { now });
  const requireUser = auth.middleware();
  const stripe = opts.stripe || (process.env.STRIPE_SECRET_KEY ? require('stripe')(process.env.STRIPE_SECRET_KEY) : null);

  const app = express();
  app.disable('x-powered-by');

  // Stripe verifies webhooks against the raw body, so it goes before the JSON parser.
  app.post('/api/billing/webhook', express.raw({ type: 'application/json' }), (req, res) => {
    if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) return res.status(404).json({ error: 'Billing is not configured' });
    let event;
    try { event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], process.env.STRIPE_WEBHOOK_SECRET); }
    catch (e) { return res.status(400).json({ error: `Webhook signature failed: ${e.message}` }); }
    handleBillingEvent(event);
    res.json({ received: true });
  });

  function handleBillingEvent(event) {
    const obj = event.data && event.data.object;
    if (!obj) return;
    if (event.type === 'checkout.session.completed' && obj.client_reference_id) {
      const tier = (obj.metadata && obj.metadata.tier) || 'pro';
      engine.setTier(obj.client_reference_id, Engine.constants.TIERS.includes(tier) ? tier : 'pro');
      if (obj.customer) db.prepare('UPDATE users SET stripe_customer_id = ? WHERE id = ?').run(String(obj.customer), obj.client_reference_id);
      engine.notify(obj.client_reference_id, 'billing', 'Welcome to ' + tier.charAt(0).toUpperCase() + tier.slice(1), 'Your crew just got stronger.');
    }
    if (event.type === 'customer.subscription.deleted' && obj.customer) {
      const u = db.prepare('SELECT id FROM users WHERE stripe_customer_id = ?').get(String(obj.customer));
      if (u) engine.setTier(u.id, 'free');
    }
  }

  app.use(express.json({ limit: '64kb' }));

  const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
  const fail = (res, e) => res.status(e.status || 400).json({ error: e.message });

  // ── Auth ─────────────────────────────────────────────────────────────────
  app.post('/api/auth/register', (req, res) => { try { res.json(auth.register(req.body || {})); } catch (e) { fail(res, e); } });
  app.post('/api/auth/login', (req, res) => { try { res.json(auth.login(req.body || {})); } catch (e) { res.status(401).json({ error: e.message }); } });
  app.post('/api/auth/logout', requireUser, (req, res) => { auth.logout(req.token); res.json({ ok: true }); });
  app.get('/api/me', requireUser, (req, res) => {
    const tier = engine.tierOf(req.user.id);
    res.json({
      user: { ...req.user, tier }, profile: engine.getProfile(req.user.id), stats: engine.stats(req.user.id), badges: engine.badges(req.user.id),
      crewOnline: crew.online, tier, features: Object.fromEntries(Object.keys(Engine.constants.FEATURES).map(f => [f, engine.allows(req.user.id, f)])),
      inviteUrl: `${APP_URL}/?invite=${req.user.referralCode}`, pushEnabled: push.enabled, pushDevices: push.count(req.user.id),
    });
  });

  // ── Config and profile ───────────────────────────────────────────────────
  app.get('/api/config', (req, res) => res.json({ resources: RESOURCES, crewOnline: crew.online, scoring: Engine.constants, billing: !!stripe, pushPublicKey: push.enabled ? push.publicKey : null, appUrl: APP_URL }));
  app.post('/api/profile', requireUser, (req, res) => {
    const b = req.body || {};
    const valid = new Set(RESOURCES.map(r => r.key));
    const resources = Array.isArray(b.resources) ? b.resources.filter(r => valid.has(r)) : undefined;
    try { res.json({ profile: engine.saveProfile(req.user.id, { ...b, resources }) }); } catch (e) { fail(res, e); }
  });

  // ── Today ────────────────────────────────────────────────────────────────
  const todayPayload = async (userId) => {
    const profile = engine.getProfile(userId);
    if (!profile) return { needsProfile: true };
    const date = engine.localDateKey(profile);
    const plan = await engine.ensurePlan(userId, date);
    return {
      date, plan, rank: engine.myRank(userId, date), crewOnline: crew.online, tier: engine.tierOf(userId),
      memory: { lastSummary: profile.memory.lastSummary || '', tomorrowHint: profile.memory.tomorrowHint || '', notes: profile.memory.notes || [] },
      goal: profile.goal, conditions: profile.conditions, crewLog: engine.crewLog(userId, date), chat: engine.chatHistory(userId, date),
      champion: engine.championPlan(Engine.shiftDate(date, -1)),
      canRegenerate: plan.status === 'open' && plan.progress.tasksDone === 0 && (plan.regenerations || 0) < Engine.constants.REGENERATIONS_PER_DAY,
      canChat: engine.allows(userId, 'chat') && plan.status === 'open', canVerify: engine.allows(userId, 'receipts'),
    };
  };
  app.get('/api/today', requireUser, wrap(async (req, res) => res.json(await todayPayload(req.user.id))));

  app.post('/api/today/regenerate', requireUser, wrap(async (req, res) => {
    const profile = engine.getProfile(req.user.id);
    if (!profile) return res.status(400).json({ error: 'Set up your profile first' });
    const date = engine.localDateKey(profile);
    const existing = engine.getPlan(req.user.id, date);
    if (existing && existing.status === 'closed') return res.status(400).json({ error: 'Today is already closed' });
    if (existing && existing.progress.tasksDone > 0) return res.status(400).json({ error: 'You already started today. Finish strong.' });
    if (existing && existing.regenerations >= Engine.constants.REGENERATIONS_PER_DAY) return res.status(429).json({ error: 'One rebuild per day. Tomorrow the crew starts fresh.' });
    res.json({ plan: await engine.ensurePlan(req.user.id, date, { force: true }) });
  }));

  app.post('/api/today/conditions', requireUser, (req, res) => {
    try { res.json({ profile: engine.saveProfile(req.user.id, { conditions: String((req.body || {}).conditions || '') }) }); } catch (e) { fail(res, e); }
  });

  app.post('/api/today/chat', requireUser, wrap(async (req, res) => {
    try { res.json(await engine.chat(req.user.id, (req.body || {}).message)); } catch (e) { fail(res, e); }
  }));

  app.post('/api/tasks/:taskId', requireUser, (req, res) => {
    const { status, earningsDollars, note } = req.body || {};
    try { res.json({ plan: engine.updateTask(req.user.id, parseInt(req.params.taskId, 10), { status, earningsDollars, note }) }); } catch (e) { fail(res, e); }
  });

  // Receipts carry an image, so this route gets its own larger body limit.
  app.post('/api/tasks/:taskId/receipt', requireUser, express.json({ limit: '8mb' }), wrap(async (req, res) => {
    const { image, mediaType } = req.body || {};
    try { res.json(await engine.verifyReceipt(req.user.id, parseInt(req.params.taskId, 10), String(image || '').replace(/^data:[^;]+;base64,/, ''), mediaType)); }
    catch (e) { fail(res, e); }
  }));

  app.post('/api/today/close', requireUser, wrap(async (req, res) => {
    const profile = engine.getProfile(req.user.id);
    if (!profile) return res.status(400).json({ error: 'No profile' });
    const result = await engine.closeDay(req.user.id, engine.localDateKey(profile));
    if (!result) return res.status(400).json({ error: 'Nothing open to close' });
    res.json(result);
  }));

  app.get('/api/history', requireUser, (req, res) => res.json({ history: engine.history(req.user.id, 60), stats: engine.stats(req.user.id), recaps: engine.recaps(req.user.id), badges: engine.badges(req.user.id) }));
  app.get('/api/inbox', requireUser, (req, res) => { const items = engine.inbox(req.user.id); engine.markInboxRead(req.user.id); res.json({ inbox: items }); });

  // ── Challenges ───────────────────────────────────────────────────────────
  app.get('/api/challenges', requireUser, (req, res) => res.json({ challenges: engine.challenges(req.user.id) }));
  app.post('/api/challenges', requireUser, (req, res) => {
    const profile = engine.getProfile(req.user.id);
    if (!profile) return res.status(400).json({ error: 'Set up your profile first' });
    const b = req.body || {};
    const date = /^\d{4}-\d{2}-\d{2}$/.test(b.date || '') ? b.date : engine.localDateKey(profile);
    try { res.json({ challenge: engine.createChallenge(req.user.id, b.opponent, date) }); } catch (e) { fail(res, e); }
  });
  app.post('/api/challenges/:id/respond', requireUser, (req, res) => {
    try { res.json({ challenge: engine.respondChallenge(req.user.id, parseInt(req.params.id, 10), !!(req.body || {}).accept) }); } catch (e) { fail(res, e); }
  });

  // ── Push ─────────────────────────────────────────────────────────────────
  app.post('/api/push/subscribe', requireUser, (req, res) => { try { push.subscribe(req.user.id, (req.body || {}).subscription); res.json({ ok: true, devices: push.count(req.user.id) }); } catch (e) { fail(res, e); } });
  app.post('/api/push/unsubscribe', requireUser, (req, res) => { push.unsubscribe(req.user.id, (req.body || {}).endpoint); res.json({ ok: true }); });

  // ── Billing ──────────────────────────────────────────────────────────────
  app.get('/api/billing', requireUser, (req, res) => res.json({ enabled: !!stripe, tier: engine.tierOf(req.user.id), defaultTier: engine.defaultTier, tiers: Engine.constants.TIERS, features: Engine.constants.FEATURES }));
  app.post('/api/billing/checkout', requireUser, wrap(async (req, res) => {
    if (!stripe) return res.status(404).json({ error: 'Billing is not configured yet' });
    const tier = (req.body || {}).tier;
    if (!TIER_PRICES[tier]) return res.status(400).json({ error: 'Unknown plan' });
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription', client_reference_id: req.user.id, customer_email: req.user.email, metadata: { tier },
      line_items: [{ price: TIER_PRICES[tier], quantity: 1 }],
      success_url: `${APP_URL}/?billing=success`, cancel_url: `${APP_URL}/?billing=cancel`,
    });
    res.json({ url: session.url });
  }));

  // ── World leaderboard (public) ───────────────────────────────────────────
  app.get('/api/leaderboard', (req, res) => {
    const q = String(req.query.date || '');
    const date = /^\d{4}-\d{2}-\d{2}$/.test(q) ? q : new Date(now()).toISOString().slice(0, 10);
    const scope = ['world', 'country', 'region', 'city'].includes(req.query.scope) ? req.query.scope : 'world';
    const league = Engine.constants.LEAGUES.includes(req.query.league) ? req.query.league : null;
    const mode = req.query.mode === 'verified' ? 'verified' : 'all';
    let viewer = null;
    if (scope !== 'world') {
      const user = auth.verify((req.headers.authorization || '').replace(/^Bearer /, '') || req.headers['x-session-token']);
      if (!user) return res.status(401).json({ error: 'Sign in for local boards' });
      if (!engine.allows(user.id, 'localBoards')) return res.status(402).json({ error: 'Local boards are a Boss feature' });
      viewer = engine.getProfile(user.id);
      if (!viewer) return res.status(400).json({ error: 'Set your location first' });
    }
    res.json({
      date, scope, league, mode,
      leaderboard: engine.leaderboard(date, { scope, league, mode, viewer, limit: 100 }),
      allTime: engine.allTimeLeaderboard(25),
      yesterdayPodium: engine.podium(Engine.shiftDate(date, -1)),
      champion: engine.championPlan(Engine.shiftDate(date, -1)),
      updatedAt: new Date(now()).toISOString(),
    });
  });
  app.get('/api/champion', (req, res) => {
    const q = String(req.query.date || '');
    const date = /^\d{4}-\d{2}-\d{2}$/.test(q) ? q : Engine.shiftDate(new Date(now()).toISOString().slice(0, 10), -1);
    res.json({ champion: engine.championPlan(date) });
  });

  // ── Live updates (Server-Sent Events) ────────────────────────────────────
  app.get('/api/events', (req, res) => {
    const user = auth.verify(String(req.query.token || ''));
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    res.write('event: hello\ndata: {}\n\n');
    const listener = (userId, event, data) => {
      if (userId && (!user || userId !== user.id)) return;
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };
    listeners.add(listener);
    const ping = setInterval(() => res.write(': ping\n\n'), 25_000);
    req.on('close', () => { clearInterval(ping); listeners.delete(listener); });
  });

  app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err && err.type === 'entity.too.large') return res.status(413).json({ error: 'That upload is too large' });
    console.error('[api]', err && err.stack ? err.stack : err);
    res.status(err.status || 500).json({ error: err.message || 'Something broke' });
  });

  return { app, db, engine, auth, crew, push, handleBillingEvent };
}

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  const { app, engine, crew, push } = createApp();
  const tick = () => engine.tick().catch(e => console.error('[tick]', e.message));
  setInterval(tick, 5 * 60 * 1000);
  setTimeout(tick, 3000);
  app.listen(PORT, () => {
    console.log(`BossDay listening on http://localhost:${PORT}`);
    console.log(crew.online ? 'Crew online: Claude + live web research' : 'Crew offline: playbook mode (set ANTHROPIC_API_KEY to enable the agents)');
    console.log(push.enabled ? 'Push notifications on' : 'Push off (set VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY)');
    console.log(`Default tier for new players: ${engine.defaultTier}${process.env.STRIPE_SECRET_KEY ? ' (billing on)' : ' (billing off)'}`);
  });
}

module.exports = { createApp };
