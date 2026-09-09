'use strict';

require('dotenv').config();

const path = require('path');
const express = require('express');
const { open } = require('./src/db');
const Auth = require('./src/auth');
const Engine = require('./src/engine');
const Crew = require('./src/agents');
const { RESOURCES } = require('./src/playbook');

/**
 * Build the app. Everything is injectable so tests can run it against an
 * in-memory database with a frozen clock and an offline crew.
 */
function createApp(opts = {}) {
  const db = opts.db || open(opts.dbPath);
  const now = opts.now || (() => Date.now());
  const crew = opts.crew || new Crew();
  const listeners = new Set();
  const engine = new Engine(db, { crew, now, onEvent: (userId, event, data) => { for (const l of listeners) l(userId, event, data); } });
  const auth = new Auth(db, { now });
  const requireUser = auth.middleware();

  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '64kb' }));

  // Async handlers: a thrown error becomes a JSON 400/500 instead of a hung request.
  const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

  // ── Auth ─────────────────────────────────────────────────────────────────
  app.post('/api/auth/register', (req, res) => {
    try { res.json(auth.register(req.body || {})); }
    catch (e) { res.status(400).json({ error: e.message }); }
  });
  app.post('/api/auth/login', (req, res) => {
    try { res.json(auth.login(req.body || {})); }
    catch (e) { res.status(401).json({ error: e.message }); }
  });
  app.post('/api/auth/logout', requireUser, (req, res) => { auth.logout(req.token); res.json({ ok: true }); });
  app.get('/api/me', requireUser, (req, res) => {
    res.json({ user: req.user, profile: engine.getProfile(req.user.id), stats: engine.stats(req.user.id), crewOnline: crew.online });
  });

  // ── Profile (what the crew knows) ────────────────────────────────────────
  app.get('/api/config', (req, res) => res.json({ resources: RESOURCES, crewOnline: crew.online, scoring: Engine.constants }));
  app.post('/api/profile', (req, res, next) => {
    // Sign-up flow saves the profile right after registering, so accept either auth style.
    requireUser(req, res, () => {
      const b = req.body || {};
      const valid = new Set(RESOURCES.map(r => r.key));
      const resources = Array.isArray(b.resources) ? b.resources.filter(r => valid.has(r)) : undefined;
      res.json({ profile: engine.saveProfile(req.user.id, { ...b, resources }) });
    });
  });

  // ── Today ────────────────────────────────────────────────────────────────
  app.get('/api/today', requireUser, wrap(async (req, res) => {
    const profile = engine.getProfile(req.user.id);
    if (!profile) return res.json({ needsProfile: true });
    const date = engine.localDateKey(profile);
    const plan = await engine.ensurePlan(req.user.id, date);
    res.json({
      date, plan, rank: engine.myRank(req.user.id, date), crewOnline: crew.online,
      memory: { lastSummary: profile.memory.lastSummary || '', tomorrowHint: profile.memory.tomorrowHint || '', notes: profile.memory.notes || [] },
      canRegenerate: plan.status === 'open' && plan.progress.tasksDone === 0 && (plan.regenerations || 0) < Engine.constants.REGENERATIONS_PER_DAY,
    });
  }));

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

  app.post('/api/tasks/:taskId', requireUser, (req, res) => {
    const { status, earningsDollars, note } = req.body || {};
    try { res.json({ plan: engine.updateTask(req.user.id, parseInt(req.params.taskId, 10), { status, earningsDollars, note }) }); }
    catch (e) { res.status(400).json({ error: e.message }); }
  });

  app.post('/api/today/close', requireUser, wrap(async (req, res) => {
    const profile = engine.getProfile(req.user.id);
    if (!profile) return res.status(400).json({ error: 'No profile' });
    const result = await engine.closeDay(req.user.id, engine.localDateKey(profile));
    if (!result) return res.status(400).json({ error: 'Nothing open to close' });
    res.json(result);
  }));

  app.get('/api/history', requireUser, (req, res) => res.json({ history: engine.history(req.user.id, 60), stats: engine.stats(req.user.id) }));
  app.get('/api/inbox', requireUser, (req, res) => { const items = engine.inbox(req.user.id); engine.markInboxRead(req.user.id); res.json({ inbox: items }); });

  // ── World leaderboard (public) ───────────────────────────────────────────
  app.get('/api/leaderboard', (req, res) => {
    const q = String(req.query.date || '');
    const date = /^\d{4}-\d{2}-\d{2}$/.test(q) ? q : new Date(now()).toISOString().slice(0, 10);
    res.json({
      date,
      leaderboard: engine.leaderboard(date, 100),
      allTime: engine.allTimeLeaderboard(25),
      yesterdayPodium: engine.podium(Engine.shiftDate(date, -1)),
      updatedAt: new Date(now()).toISOString(),
    });
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
    console.error('[api]', err && err.stack ? err.stack : err);
    res.status(err.status || 500).json({ error: err.message || 'Something broke' });
  });

  return { app, db, engine, auth, crew };
}

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  const { app, engine, crew } = createApp();
  const tick = () => engine.tick().catch(e => console.error('[tick]', e.message));
  setInterval(tick, 5 * 60 * 1000);
  setTimeout(tick, 3000);
  app.listen(PORT, () => {
    console.log(`BossDay listening on http://localhost:${PORT}`);
    console.log(crew.online ? 'Crew online: Claude + live web research' : 'Crew offline: playbook mode (set ANTHROPIC_API_KEY to enable the agents)');
  });
}

module.exports = { createApp };
