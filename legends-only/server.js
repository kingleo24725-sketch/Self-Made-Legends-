'use strict';

require('dotenv').config();

const path = require('path');
const express = require('express');
const { open } = require('./src/db');
const Auth = require('./src/auth');
const Engine = require('./src/engine');
const Crew = require('./src/agents');
const Push = require('./src/push');
const Money = require('./src/money');
const Community = require('./src/community');
const Social = require('./src/social');
const Gigs = require('./src/gigs');
const Trust = require('./src/trust');
const Ops = require('./src/ops');
const Squads = require('./src/squads');
const Market = require('./src/market');
const Clips = require('./src/clips');
const Fun = require('./src/fun');
const Season = require('./src/season');
const Fans = require('./src/fans');
const { RESOURCES, CATEGORIES } = require('./src/playbook');

const APP_URL = process.env.APP_URL || 'http://localhost:' + (process.env.PORT || 3000);
const TIER_PRICES = { veteran: process.env.STRIPE_PRICE_VETERAN || '', hof: process.env.STRIPE_PRICE_HOF || '', fanclub: process.env.STRIPE_PRICE_FANCLUB || '' };
// WebRTC: public STUN by default; add a TURN server for calls that cross strict networks.
const ICE_SERVERS = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }]
  .concat(process.env.TURN_URL ? [{ urls: process.env.TURN_URL, username: process.env.TURN_USER || '', credential: process.env.TURN_PASS || '' }] : []);
const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = (c) => '$' + (Number(c || 0) / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

/** Small server-rendered page with Open Graph tags, for links people share. */
function page({ title, description, image, body, url }) {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} · Legends Only</title><meta name="description" content="${esc(description)}">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}"><meta property="og:type" content="website">${url ? `<meta property="og:url" content="${esc(url)}">` : ''}${image ? `<meta property="og:image" content="${esc(image)}"><meta name="twitter:card" content="summary_large_image">` : ''}
<link rel="icon" href="/icon.svg" type="image/svg+xml">
<style>body{background:#0b0d12 url('/logo.svg') no-repeat center 120px;background-size:520px;color:#eef0f5;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;margin:0;padding:20px 16px 60px;line-height:1.5}main{max-width:560px;margin:0 auto}h1{font-size:1.5em;margin:8px 0}h2{font-size:1em;color:#f5b942;text-transform:uppercase;letter-spacing:.08em;margin:22px 0 8px}.muted{color:#8d95a8}.card{background:#141824;border:1px solid #262c3d;border-radius:16px;padding:16px;margin:12px 0}.btn{display:inline-block;background:#f5b942;color:#1a1200;font-weight:700;padding:12px 18px;border-radius:12px;text-decoration:none;margin-top:8px}.ghost{background:#1b2030;color:#eef0f5;border:1px solid #262c3d}img.card-img{width:100%;border-radius:16px;border:1px solid #262c3d}.row{display:flex;justify-content:space-between;gap:8px;padding:6px 0;border-bottom:1px dashed #262c3d}a{color:#5aa9ff}.brand{font-weight:900;letter-spacing:.02em;display:flex;align-items:center;gap:10px}.brand span{color:#f5b942}.brand img{width:34px;height:34px}main{position:relative}main::before{content:"";position:fixed;inset:0;background:rgba(11,13,18,.86);z-index:-1}input,textarea{width:100%;background:#1b2030;border:1px solid #262c3d;border-radius:12px;padding:12px;color:#eef0f5;font:inherit;margin:6px 0;box-sizing:border-box}</style></head>
<body><main><div class="brand"><img src="/icon.svg" alt=""><a href="/" style="color:inherit;text-decoration:none">LEGENDS <span>ONLY</span></a></div>${body}
<p class="muted" style="font-size:.78em;margin-top:30px">Earnings are self-reported unless marked verified. Plans are suggestions. <a href="/terms">Terms</a> · <a href="/privacy">Privacy</a></p></main></body></html>`;
}

function createApp(opts = {}) {
  const db = opts.db || open(opts.dbPath);
  const now = opts.now || (() => Date.now());
  const crew = opts.crew || new Crew();
  const push = opts.push || new Push(db);
  const stripe = opts.stripe !== undefined ? opts.stripe : (process.env.STRIPE_SECRET_KEY ? require('stripe')(process.env.STRIPE_SECRET_KEY) : null);
  const listeners = new Set();
  const onEvent = (userId, event, data) => { for (const l of listeners) l(userId, event, data); };
  const engine = new Engine(db, { crew, push, now, defaultTier: opts.defaultTier, onEvent });
  const money$ = new Money(db, { now, stripe, env: opts.env });
  Object.defineProperty(money$, 'defaultTier', { get: () => engine.defaultTier });
  const community = new Community(db, { engine, money: money$, crew, push, now, onEvent });
  engine.community = community;
  const social = new Social(db, { now, onEvent });
  const gigs = new Gigs(db, { crew, engine, learning: engine.learning, now, onEvent });
  engine.gigs = gigs;
  const trust = new Trust(db, { now, env: opts.env, sms: opts.sms });
  engine.trust = trust;
  const ops = new Ops(db, { engine, money: money$, stripe, now, env: opts.env });
  engine.ops = ops;
  const squads = new Squads(db, { engine, social, now, onEvent });
  engine.squads = squads;
  const market = new Market(db, { engine, money: money$, gigs, now, onEvent });
  const clips = new Clips(db, { now, onEvent, dir: opts.clipsDir });
  const fun = new Fun(db, { engine, community, now, onEvent });
  engine.fun = fun;
  const fans = new Fans(db, { engine, community, social, now, onEvent });
  const season = new Season(db, { engine, money: money$, community, social, squads, fans, stripe, now, onEvent, env: opts.env });
  fans.season = season; engine.season = season; engine.fans = fans;
  // Fans hear about their Legends: a live starting, a climb, a Boss going down.
  listeners.add((userId, event, data) => {
    try {
      if (event === 'live' && data.action === 'start' && data.room) fans.notifyFollowers(data.room.hostId, 'live', `🔴 ${data.room.hostName} is live`, data.room.title || 'Jump in from People.');
      if (event === 'climb' && userId) fans.notifyFollowers(userId, 'fan', `${social.name(userId)} is climbing`, data.line);
      if (event === 'approved' && userId && data.boss) fans.notifyFollowers(userId, 'fan', `${social.name(userId)} took down the Boss`, `${data.title}: +${(data.points + data.bonus).toLocaleString()} points.`);
    } catch (_) {}
  });
  const auth = new Auth(db, { now });
  const requireUserOnly = auth.middleware();
  const requireUser = (req, res, next) => requireUserOnly(req, res, () => { if (trust.banned(req.user.id)) return res.status(403).json({ error: 'This account is closed. Contact support@selfmadelegends.app.' }); social.seen(req.user.id); next(); });
  const adminKey = opts.adminKey !== undefined ? opts.adminKey : process.env.ADMIN_KEY;
  const requireAdmin = (req, res, next) => { if (!adminKey || req.headers['x-admin-key'] !== adminKey) return res.status(401).json({ error: 'Admin key required' }); next(); };
  const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
  const fail = (res, e) => res.status(e.status || 400).json({ error: e.message });
  const todayUTC = () => new Date(now()).toISOString().slice(0, 10);
  const tokenOf = (req) => (req.headers.authorization || '').replace(/^Bearer /, '') || req.headers['x-session-token'];

  const app = express();
  app.disable('x-powered-by');

  // ── Stripe webhook (raw body) ────────────────────────────────────────────
  app.post('/api/billing/webhook', express.raw({ type: 'application/json' }), (req, res) => {
    if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) return res.status(404).json({ error: 'Billing is not configured' });
    let event;
    try { event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], process.env.STRIPE_WEBHOOK_SECRET); }
    catch (e) { return res.status(400).json({ error: `Webhook signature failed: ${e.message}` }); }
    handleBillingEvent(event);
    res.json({ received: true });
  });
  function handleBillingEvent(event) {
    const obj = event.data && event.data.object; if (!obj) return;
    const meta = obj.metadata || {};
    if (event.type === 'checkout.session.completed' && meta.kind === 'tip' && meta.tipId) {
      const t = money$.markTipPaid(Number(meta.tipId), obj.payment_intent || obj.id);
      if (t) { engine.notify(t.to_user_id, 'tip', `${t.from_name} tipped you ${money(t.gross_cents)}`, t.message || 'Keep grinding.'); const w = community._who(t.to_user_id); if (w) community.post(t.to_user_id, 'tip', `A fan tipped ${w.name} ${money(t.gross_cents)}.`, { city: w.city, amountCents: t.gross_cents }); }
      return;
    }
    if (event.type === 'checkout.session.completed' && meta.kind === 'votes' && meta.userId) {
      const r = season.creditPack(meta.userId, meta.packId, obj.payment_intent || obj.id);
      if (r.credited) engine.notify(meta.userId, 'vote', `${r.credited} votes are in your pocket`, 'Spend them on the People\'s Champion ballot.', { push: false });
      return;
    }
    if (event.type === 'checkout.session.completed' && obj.client_reference_id && meta.tier === 'fanclub') {
      try { fans.setClub(obj.client_reference_id, true); } catch (e) { console.error('[fanclub]', e.message); }
      if (obj.customer) db.prepare('UPDATE users SET stripe_customer_id = ? WHERE id = ?').run(String(obj.customer), obj.client_reference_id);
      money$.record('subscription', { userId: obj.client_reference_id, gross: obj.amount_total || 0, fee: obj.amount_total || 0, net: 0, status: 'paid', ref: obj.id, note: 'fanclub' });
      return;
    }
    if (event.type === 'checkout.session.completed' && obj.client_reference_id) {
      const tier = meta.tier;
      engine.setTier(obj.client_reference_id, Engine.constants.TIERS.includes(tier) ? tier : 'veteran');
      if (obj.customer) db.prepare('UPDATE users SET stripe_customer_id = ? WHERE id = ?').run(String(obj.customer), obj.client_reference_id);
      money$.record('subscription', { userId: obj.client_reference_id, gross: obj.amount_total || 0, fee: obj.amount_total || 0, net: 0, status: 'paid', ref: obj.id, note: tier });
      engine.notify(obj.client_reference_id, 'billing', 'Welcome to ' + (Engine.constants.TIER_NAMES[tier] || tier), tier === 'hof' ? 'Your name is on the Hall of Fame. Your crew just got stronger.' : 'Your crew just got stronger.');
    }
    if (event.type === 'invoice.paid' && obj.customer && obj.subscription) {
      const u = db.prepare('SELECT id FROM users WHERE stripe_customer_id = ?').get(String(obj.customer));
      if (u && !db.prepare('SELECT 1 FROM ledger WHERE ref = ?').get(obj.id)) money$.record('subscription', { userId: u.id, gross: obj.amount_paid || 0, fee: obj.amount_paid || 0, net: 0, status: 'paid', ref: obj.id, note: 'renewal' });
    }
    if (event.type === 'customer.subscription.deleted' && obj.customer) {
      const u = db.prepare('SELECT id, role FROM users WHERE stripe_customer_id = ?').get(String(obj.customer));
      if (u && u.role === 'fan') db.prepare("UPDATE users SET tier = 'free' WHERE id = ?").run(u.id);
      else if (u) engine.setTier(u.id, 'free');
    }
  }

  app.use(express.json({ limit: '64kb' }));

  // ── Auth ─────────────────────────────────────────────────────────────────
  // One account per phone: the app sends a device id; a device that already carries an account cannot register another.
  app.post('/api/auth/register', (req, res) => {
    const b = req.body || {};
    try {
      if (b.deviceId) { const others = db.prepare('SELECT COUNT(*) AS c FROM devices WHERE device_id = ?').get(String(b.deviceId).slice(0, 80)).c; if (others >= Trust.constants.MAX_ACCOUNTS_PER_DEVICE) return res.status(409).json({ error: 'This phone already has a Self-Made Legends account. Sign in to it instead.' }); }
      const r = auth.register(b);
      trust.registerDevice(r.user.id, b.deviceId, { enforce: false });
      if (b.role === 'fan') fans.join(r.user.id, { city: b.city });
      res.json(r);
    } catch (e) { fail(res, e); }
  });
  app.post('/api/auth/login', (req, res) => { const b = req.body || {}; try { const r = auth.login(b); if (trust.banned(r.user.id)) return res.status(403).json({ error: 'This account is closed.' }); trust.registerDevice(r.user.id, b.deviceId, { enforce: false }); res.json(r); } catch (e) { res.status(401).json({ error: e.message }); } });
  app.post('/api/phone/send', requireUser, wrap(async (req, res) => { try { res.json(await trust.sendCode(req.user.id, (req.body || {}).phone)); } catch (e) { fail(res, e); } }));
  app.post('/api/phone/verify', requireUser, (req, res) => { try { res.json(trust.verifyCode(req.user.id, (req.body || {}).code)); } catch (e) { fail(res, e); } });
  app.get('/api/trust', requireUser, (req, res) => res.json({ trust: trust.score(req.user.id), phoneVerified: trust.phoneVerified(req.user.id), proof: trust.proofRequired(req.user.id), devices: trust.devicesFor(req.user.id).length }));
  app.post('/api/auth/logout', requireUser, (req, res) => { auth.logout(req.token); res.json({ ok: true }); });
  app.get('/api/me', requireUser, (req, res) => {
    const tier = engine.tierOf(req.user.id);
    const u = db.prepare('SELECT public_profile, stripe_account_id, success_fee_optin FROM users WHERE id = ?').get(req.user.id);
    res.json({
      user: { ...req.user, tier, publicProfile: !!u.public_profile, payoutsConnected: !!u.stripe_account_id, successFeeOptIn: !!u.success_fee_optin },
      profile: engine.getProfile(req.user.id), stats: engine.stats(req.user.id), badges: engine.badges(req.user.id),
      crewOnline: crew.online, tier, features: Object.fromEntries(Object.keys(Engine.constants.FEATURES).map(f => [f, engine.allows(req.user.id, f)])),
      rank: engine.rankInfo(req.user.id), inviteUrl: `${APP_URL}/?invite=${req.user.referralCode}`, profileUrl: `${APP_URL}/u/${encodeURIComponent(req.user.displayName)}`,
      pushEnabled: push.enabled, pushDevices: push.count(req.user.id),
      tips: money$.tipsFor(req.user.id, 10), payoutBalanceCents: money$.balance(req.user.id), fees: money$.fees,
      stories: community.stories(req.user.id), questions: community.questionsFor(req.user.id),
      mentor: community.mentors().find(m => m.userId === req.user.id) || null,
      avatarUrl: `/api/avatar/${req.user.id}?v=${(db.prepare('SELECT updated_at FROM avatars WHERE user_id = ?').get(req.user.id) || {}).updated_at || 0}`,
      unreadMessages: social.unreadCount(req.user.id), friends: social.friends(req.user.id), botRating: social.botRating(req.user.id),
      trust: trust.score(req.user.id), phoneVerified: trust.phoneVerified(req.user.id), proof: trust.proofRequired(req.user.id),
      squad: squads.mine(req.user.id), employer: market.employer(req.user.id), clips: clips.mine(req.user.id).slice(0, 6), resumeUrl: `${APP_URL}/u/${encodeURIComponent(req.user.displayName)}/resume`,
      fan: req.user.role === 'fan' ? fans.profile(req.user.id) : null, club: fans.clubInfo(req.user.id), votes: season.credits(req.user.id), frame: season.frameFor(req.user.id), followers: fans.followerCount(req.user.id),
      title: fun.title(req.user.id), botName: fun.botName(req.user.id), quests: (() => { const pr = engine.getProfile(req.user.id); return pr ? fun.quests(req.user.id, engine.localDateKey(pr)) : []; })(), callouts: fun.callouts(req.user.id),
    });
  });
  app.post('/api/me/bot-name', requireUser, (req, res) => { if (!engine.getProfile(req.user.id)) return res.status(400).json({ error: 'Set up your profile first' }); res.json({ botName: fun.setBotName(req.user.id, (req.body || {}).name) }); });
  app.post('/api/tasks/:taskId/power', requireUser, (req, res) => { try { res.json({ plan: fun.power(req.user.id, parseInt(req.params.taskId, 10)) }); } catch (e) { fail(res, e); } });
  app.get('/api/callouts', requireUser, (req, res) => res.json({ callouts: fun.callouts(req.user.id), lines: Fun.constants.CALLOUT_LINES }));
  app.post('/api/callouts/:userId', requireUser, (req, res) => { const pr = engine.getProfile(req.user.id); if (!pr) return res.status(400).json({ error: 'Set up your profile first' }); try { res.json({ callout: fun.callout(req.user.id, req.params.userId, (req.body || {}).line, engine.localDateKey(pr)) }); } catch (e) { fail(res, e); } });
  app.post('/api/callouts/:id/accept', requireUser, (req, res) => { try { res.json({ challenge: fun.accept(req.user.id, Number(req.params.id)) }); } catch (e) { fail(res, e); } });
  app.get('/api/quests', requireUser, (req, res) => { const pr = engine.getProfile(req.user.id); res.json({ quests: pr ? fun.quests(req.user.id, engine.localDateKey(pr)) : [] });
  });
  app.post('/api/me/avatar', requireUser, express.json({ limit: '2mb' }), (req, res) => { try { res.json(social.setAvatar(req.user.id, (req.body || {}).image)); } catch (e) { fail(res, e); } });
  app.delete('/api/me/avatar', requireUser, (req, res) => { social.clearAvatar(req.user.id, (req.query || {}).style); res.json({ ok: true }); });
  app.get('/api/avatar/:userId', (req, res) => { const a = social.avatar(req.params.userId); res.set('Cache-Control', 'public, max-age=300').type(a.mime).send(a.buffer); });

  // ── Gig Finder ───────────────────────────────────────────────────────────
  app.post('/api/gigs/refresh', requireUser, wrap(async (req, res) => {
    const profile = engine.getProfile(req.user.id);
    if (!profile) return res.status(400).json({ error: 'Set up your profile first' });
    res.json({ gigs: await gigs.find(req.user.id, profile, engine.localDateKey(profile), { force: true }) });
  }));
  app.post('/api/gigs/:id/claim', requireUser, (req, res) => { try { res.json({ task: gigs.claim(req.user.id, Number(req.params.id)) }); } catch (e) { fail(res, e); } });
  app.post('/api/gigs/:id/dismiss', requireUser, (req, res) => { gigs.dismiss(req.user.id, Number(req.params.id)); res.json({ ok: true }); });
  app.get('/api/bot', requireUser, (req, res) => res.json({ bot: { ...engine.learning.botIQ(req.user.id), rating: social.botRating(req.user.id) } }));

  // ── People, friends, messages, calls, live ───────────────────────────────
  app.get('/api/people', requireUser, (req, res) => res.json({ people: social.search(req.query.q || '') }));
  app.get('/api/friends', requireUser, (req, res) => res.json({ friends: social.friends(req.user.id), calls: social.recentCalls(req.user.id) }));
  app.post('/api/friends/:id', requireUser, (req, res) => { try { res.json({ friend: social.requestFriend(req.user.id, req.params.id) }); } catch (e) { fail(res, e); } });
  app.delete('/api/friends/:id', requireUser, (req, res) => { social.removeFriend(req.user.id, req.params.id); res.json({ ok: true }); });
  app.post('/api/block/:id', requireUser, (req, res) => { social.block(req.user.id, req.params.id); res.json({ ok: true }); });
  app.delete('/api/block/:id', requireUser, (req, res) => { social.unblock(req.user.id, req.params.id); res.json({ ok: true }); });
  app.get('/api/messages', requireUser, (req, res) => res.json({ inbox: social.inbox(req.user.id), unread: social.unreadCount(req.user.id) }));
  app.get('/api/messages/:id', requireUser, (req, res) => res.json({ thread: social.thread(req.user.id, req.params.id), with: social.friendView(req.user.id, req.params.id) }));
  app.post('/api/messages/:id', requireUser, (req, res) => { try { res.json({ message: social.send(req.user.id, req.params.id, (req.body || {}).body) }); } catch (e) { fail(res, e); } });
  app.post('/api/calls/:id/signal', requireUser, express.json({ limit: '256kb' }), (req, res) => { try { res.json(social.signal(req.user.id, req.params.id, (req.body || {}).type, (req.body || {}).payload)); } catch (e) { fail(res, e); } });
  app.get('/api/live', (req, res) => res.json({ live: social.liveNow(), iceServers: ICE_SERVERS }));
  app.post('/api/live', requireUser, (req, res) => { res.json({ room: social.goLive(req.user.id, (req.body || {}).title) }); });
  app.delete('/api/live', requireUser, (req, res) => res.json({ ended: social.endLive(req.user.id) }));
  app.post('/api/live/:id/join', requireUser, (req, res) => { try { res.json({ room: social.join(Number(req.params.id), req.user.id), messages: social.liveMessages(Number(req.params.id)) }); } catch (e) { fail(res, e); } });
  app.post('/api/live/:id/leave', requireUser, (req, res) => { social.leave(Number(req.params.id), req.user.id); res.json({ ok: true }); });
  app.post('/api/live/:id/signal', requireUser, express.json({ limit: '256kb' }), (req, res) => { const b = req.body || {}; try { res.json(social.liveSignal(Number(req.params.id), req.user.id, b.to, b.type, b.payload)); } catch (e) { fail(res, e); } });
  app.get('/api/live/:id/chat', (req, res) => res.json({ room: social.room(Number(req.params.id)), messages: social.liveMessages(Number(req.params.id)) }));
  app.post('/api/live/:id/chat', requireUser, (req, res) => { try { res.json({ message: social.liveChat(Number(req.params.id), req.user.id, (req.body || {}).body) }); } catch (e) { fail(res, e); } });
  app.post('/api/live/:id/rate', requireUser, (req, res) => { try { res.json({ rating: social.rateBot(Number(req.params.id), req.user.id, (req.body || {}).rating) }); } catch (e) { fail(res, e); } });
  app.post('/api/me/settings', requireUser, (req, res) => {
    const b = req.body || {};
    if (b.publicProfile !== undefined) db.prepare('UPDATE users SET public_profile = ? WHERE id = ?').run(b.publicProfile ? 1 : 0, req.user.id);
    res.json({ ok: true });
  });

  // ── Config and profile ───────────────────────────────────────────────────
  app.get('/api/config', (req, res) => res.json({ resources: RESOURCES, categories: CATEGORIES, crewOnline: crew.online, scoring: Engine.constants, fun: Fun.constants, season: { month: season.current(), daysLeft: season.daysLeft(), packs: Season.constants.PACKS, voteCents: Season.constants.VOTE_CENTS, presentedBy: season.presentedBy(), prizes: season.prizes() }, fans: Fans.constants, billing: !!stripe, pushPublicKey: push.enabled ? push.publicKey : null, appUrl: APP_URL, fees: money$.fees }));
  app.post('/api/profile', requireUser, (req, res) => {
    const b = req.body || {};
    const valid = new Set(RESOURCES.map(r => r.key));
    const resources = Array.isArray(b.resources) ? b.resources.filter(r => valid.has(r)) : undefined;
    try { res.json({ profile: engine.saveProfile(req.user.id, { ...b, resources }) }); } catch (e) { fail(res, e); }
  });

  // ── Today ────────────────────────────────────────────────────────────────
  const todayPayload = async (userId) => {
    if (fans.isFan(userId)) return fans.home(userId);
    const profile = engine.getProfile(userId);
    if (!profile) return { needsProfile: true };
    const date = engine.localDateKey(profile);
    const plan = await engine.ensurePlan(userId, date);
    const safe = community.activeSafety(userId);
    return {
      date, plan, rank: engine.myRank(userId, date), crewOnline: crew.online, tier: engine.tierOf(userId),
      memory: { lastSummary: profile.memory.lastSummary || '', tomorrowHint: profile.memory.tomorrowHint || '', notes: profile.memory.notes || [] },
      goal: profile.goal, conditions: profile.conditions, crewLog: engine.crewLog(userId, date), chat: engine.chatHistory(userId, date),
      champion: engine.championPlan(Engine.shiftDate(date, -1)),
      lesson: community.lessonFor(userId, date),
      gigs: await gigs.find(userId, profile, date),
      sponsors: market.tilesFor(profile.location, date), postings: market.postingsFor(profile.location, date),
      squad: squads.mine(userId),
      quests: fun.quests(userId, date), mood: fun.mood(userId, plan, engine.myRank(userId, date), engine.localHour(profile)), botName: fun.botName(userId), title: fun.title(userId),
      callouts: fun.callouts(userId, 5), calloutLines: Fun.constants.CALLOUT_LINES,
      season: { month: season.current(), daysLeft: season.daysLeft(), myRank: (season.race(season.current(), 500).find(r => r.userId === userId) || {}).rank || null, presentedBy: season.presentedBy() },
      bot: { ...engine.learning.botIQ(userId), rating: social.botRating(userId) },
      safety: safe ? community.safety(safe.token) : null,
      challengeDays: community.activeChallenges(date),
      bracket: (() => { const b = community.currentBracket(date); return b && { id: b.id, weekStart: b.weekStart, status: b.status, round: b.round, entered: b.entries.some(e => e.userId === userId), alive: b.entries.some(e => e.userId === userId && e.alive), size: b.size, poolCents: b.poolCents }; })(),
      localHour: engine.localHour(profile), localMinutes: engine.localMinutes(profile),
      canRegenerate: plan.status === 'open' && plan.progress.tasksDone === 0 && (plan.regenerations || 0) < engine.regenerationsAllowed(userId),
      tierInfo: engine.tierInfo(userId),
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
    if (existing && existing.regenerations >= engine.regenerationsAllowed(req.user.id)) return res.status(429).json({ error: `${engine.regenerationsAllowed(req.user.id)} rebuild${engine.regenerationsAllowed(req.user.id) === 1 ? '' : 's'} per day on your membership. Tomorrow the crew starts fresh.` });
    res.json({ plan: await engine.ensurePlan(req.user.id, date, { force: true }) });
  }));
  app.post('/api/today/conditions', requireUser, (req, res) => { try { res.json({ profile: engine.saveProfile(req.user.id, { conditions: String((req.body || {}).conditions || '') }) }); } catch (e) { fail(res, e); } });
  app.post('/api/today/chat', requireUser, wrap(async (req, res) => { try { res.json(await engine.chat(req.user.id, (req.body || {}).message)); } catch (e) { fail(res, e); } }));
  app.post('/api/tasks/:taskId', requireUser, (req, res) => {
    const { status, earningsDollars, note } = req.body || {};
    try { res.json({ plan: engine.updateTask(req.user.id, parseInt(req.params.taskId, 10), { status, earningsDollars, note }) }); } catch (e) { fail(res, e); }
  });
  app.post('/api/tasks/:taskId/approve', requireUser, express.json({ limit: '8mb' }), wrap(async (req, res) => {
    const { note, image, mediaType } = req.body || {};
    try { res.json(await engine.requestApproval(req.user.id, parseInt(req.params.taskId, 10), { note, imageBase64: image ? String(image).replace(/^data:[^;]+;base64,/, '') : null, mediaType: mediaType || 'image/jpeg' })); } catch (e) { fail(res, e); }
  }));
  app.post('/api/tasks/:taskId/receipt', requireUser, express.json({ limit: '8mb' }), wrap(async (req, res) => {
    const { image, mediaType } = req.body || {};
    try { res.json(await engine.verifyReceipt(req.user.id, parseInt(req.params.taskId, 10), String(image || '').replace(/^data:[^;]+;base64,/, ''), mediaType)); } catch (e) { fail(res, e); }
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

  // ── University ───────────────────────────────────────────────────────────
  app.post('/api/lesson/answer', requireUser, (req, res) => {
    const profile = engine.getProfile(req.user.id);
    if (!profile) return res.status(400).json({ error: 'Set up your profile first' });
    const { lessonId, answer } = req.body || {};
    try { res.json(community.answerLesson(req.user.id, engine.localDateKey(profile), lessonId, answer)); } catch (e) { fail(res, e); }
  });

  // ── Safety ───────────────────────────────────────────────────────────────
  app.post('/api/safety/start', requireUser, (req, res) => { const b = req.body || {}; res.json({ session: community.startSafety(req.user.id, { taskId: b.taskId ? Number(b.taskId) : null, place: b.place, eta: b.eta }), shareUrl: `${APP_URL}/safe/` }); });
  app.post('/api/safety/:token', requireUser, (req, res) => { try { res.json({ session: community.updateSafety(req.user.id, req.params.token, (req.body || {}).status) }); } catch (e) { fail(res, e); } });
  app.get('/api/safety/:token', (req, res) => { const s = community.safety(req.params.token); if (!s) return res.status(404).json({ error: 'Not found' }); res.json({ session: { ...s, contact: undefined } }); });
  app.get('/safe/:token', (req, res) => {
    const s = community.safety(req.params.token);
    if (!s) return res.status(404).send(page({ title: 'Not found', description: '', body: '<h1>That link has expired.</h1>' }));
    const label = { heading: 'On the way', arrived: 'Arrived, working', done: 'Done and safe', help: 'NEEDS HELP' }[s.status] || s.status;
    res.send(page({ title: `${s.name} · ${label}`, description: `Live safety status from Legends Only`, url: `${APP_URL}/safe/${s.token}`,
      body: `<h1>${esc(s.name)} · <span style="color:${s.status === 'help' ? '#ff6b6b' : s.status === 'done' ? '#3ddc84' : '#f5b942'}">${esc(label)}</span></h1><div class="card">${s.task ? `<div class="row"><span class="muted">Job</span><span>${esc(s.task)}</span></div>` : ''}${s.place ? `<div class="row"><span class="muted">Where</span><span>${esc(s.place)}</span></div>` : ''}${s.eta ? `<div class="row"><span class="muted">Expected done</span><span>${esc(s.eta)}</span></div>` : ''}<div class="row"><span class="muted">Last update</span><span>${new Date(s.updatedAt).toLocaleString()}</span></div></div><p class="muted">This page updates when ${esc(s.name)} checks in. If it says NEEDS HELP or goes quiet past the expected time, call them.</p><script>setTimeout(()=>location.reload(),60000)</script>` }));
  });

  // ── Tips, payouts, public profiles ───────────────────────────────────────
  app.get('/api/u/:name', (req, res) => { const p = community.publicProfile(req.params.name); if (!p) return res.status(404).json({ error: 'No public Legend by that name' }); res.json({ profile: p }); });
  app.post('/api/tips/:name', wrap(async (req, res) => {
    const u = db.prepare('SELECT id, display_name, email, stripe_account_id, public_profile FROM users WHERE lower(display_name) = lower(?)').get(String(req.params.name || ''));
    if (!u || !u.public_profile) return res.status(404).json({ error: 'No public Legend by that name' });
    const b = req.body || {};
    try {
      const r = await money$.createTip({ id: u.id, displayName: u.display_name, stripeAccountId: u.stripe_account_id }, { amountCents: b.amountCents, fromName: b.fromName, message: b.message, successUrl: `${APP_URL}/u/${encodeURIComponent(u.display_name)}?tipped=1`, cancelUrl: `${APP_URL}/u/${encodeURIComponent(u.display_name)}` });
      if (!stripe) { money$.markTipPaid(r.tipId, 'test:no-stripe'); engine.notify(u.id, 'tip', `${b.fromName || 'A fan'} tipped you ${money(b.amountCents)}`, b.message || 'Keep grinding.'); }
      res.json({ ...r, billing: !!stripe });
    } catch (e) { fail(res, e); }
  }));
  app.post('/api/payouts/connect', requireUser, wrap(async (req, res) => {
    const u = db.prepare('SELECT stripe_account_id FROM users WHERE id = ?').get(req.user.id);
    try { res.json(await money$.connectAccount({ ...req.user, stripeAccountId: u.stripe_account_id }, { refreshUrl: `${APP_URL}/?payouts=refresh`, returnUrl: `${APP_URL}/?payouts=done` })); } catch (e) { fail(res, e); }
  }));
  app.get('/api/payouts', requireUser, (req, res) => res.json({ balanceCents: money$.balance(req.user.id), tips: money$.tipsFor(req.user.id, 30), history: db.prepare('SELECT amount_cents, method, ref, created_at FROM payouts WHERE user_id = ? ORDER BY created_at DESC LIMIT 20').all(req.user.id) }));
  app.post('/api/payouts/request', requireUser, wrap(async (req, res) => {
    const u = db.prepare('SELECT stripe_account_id FROM users WHERE id = ?').get(req.user.id);
    if (!(stripe && u.stripe_account_id)) return res.status(400).json({ error: 'Connect a payout account first. Until then the owner pays balances out by hand.' });
    try { res.json(await money$.payout(req.user.id, { method: 'stripe' })); } catch (e) { fail(res, e); }
  }));
  app.post('/api/me/success-fee', requireUser, (req, res) => { db.prepare('UPDATE users SET success_fee_optin = ? WHERE id = ?').run((req.body || {}).optIn === false ? 0 : 1, req.user.id); res.json({ ok: true }); });
  app.get('/u/:name', (req, res) => {
    const p = community.publicProfile(req.params.name);
    if (!p) return res.status(404).send(page({ title: 'No such Legend', description: '', body: '<h1>No public Legend by that name.</h1><a class="btn" href="/">Open Legends Only</a>' }));
    const tipped = req.query.tipped === '1';
    res.send(page({ title: `${p.displayName} on Legends Only`, description: `${p.stats.days} days, ${money(p.stats.earnedCents)} logged, ${p.stats.wins} world wins. Tip the grind.`, url: `${APP_URL}${p.url}`, image: p.lastDays[0] ? `${APP_URL}/api/cards/${p.id}/${p.lastDays[0].date}.svg` : undefined,
      body: `<div style="display:flex;gap:14px;align-items:center;margin-top:12px"><img src="/api/avatar/${esc(p.id)}" alt="" style="width:84px;height:84px;border-radius:50%;object-fit:cover;border:2px solid #C9A227"><div><h1 style="margin:0">${esc(p.displayName)}${(() => { const t = fun.title(p.id); return t ? ` <span style="font-size:.55em;color:#f5b942;vertical-align:middle">${esc(t)}</span>` : ''; })()}</h1><div class="muted">${esc(p.city)}${p.city ? ' · ' : ''}${esc(p.goals)}</div>${(() => { const b = social.botRating(p.id); return b.count ? `<div class="muted">Bot rated ${b.average}/5 by ${b.count} viewer${b.count === 1 ? '' : 's'}</div>` : ''; })()}</div></div>
<div class="card"><div class="row"><span class="muted">Days on the grind</span><b>${p.stats.days}</b></div><div class="row"><span class="muted">Logged</span><b>${money(p.stats.earnedCents)}${p.stats.verifiedCents ? ` <span class="muted">(${money(p.stats.verifiedCents)} verified)</span>` : ''}</b></div><div class="row"><span class="muted">World wins</span><b>${p.stats.wins}</b></div><div class="row"><span class="muted">Best streak</span><b>${p.stats.bestStreak}</b></div>${p.badges.length ? `<div class="row"><span class="muted">Badges</span><span>${p.badges.slice(0, 6).map(b => esc(b.badge.replace(/_/g, ' '))).join(' · ')}</span></div>` : ''}</div>
${tipped ? '<div class="card" style="border-color:#3ddc84"><b>Thank you.</b> Your tip is on its way.</div>' : ''}
<h2>Tip the grind</h2><div class="card"><form method="post" onsubmit="return tip(event)"><div style="display:flex;gap:8px">${[300, 500, 1000, 2000].map(c => `<button type="button" class="btn ghost" onclick="pick(${c})" style="flex:1;text-align:center">${money(c)}</button>`).join('')}</div><input type="number" id="amt" min="1" step="1" placeholder="Other amount ($)"><input type="text" id="from" placeholder="Your name" maxlength="40"><input type="text" id="msg" placeholder="Say something (optional)" maxlength="200"><button class="btn" type="submit" style="width:100%">Send tip</button><p class="muted" style="font-size:.8em">Self-Made Legends keeps ${money$.fees.TIP_FEE_PCT}% to run the crew. The rest goes to ${esc(p.displayName)}.</p><div id="err" style="color:#ff6b6b"></div></form></div>
${p.mentor ? `<h2>Ask ${esc(p.displayName)}</h2><div class="card">${esc(p.mentor.bio || 'Taking questions.')}<div class="muted">${p.mentor.topics.map(esc).join(' · ')} · ${money(p.mentor.priceCents)} per question</div><a class="btn" href="/?ask=${encodeURIComponent(p.displayName)}">Ask in the app</a></div>` : ''}
${p.stories.length ? `<h2>Stories</h2>${p.stories.map(s => `<div class="card"><b>${esc(s.title)}</b><p>${esc(s.body)}</p><a href="${s.url}">Share this story</a></div>`).join('')}` : ''}
${p.lastDays.length ? `<h2>Last days</h2><div class="card">${p.lastDays.map(d => `<div class="row"><a href="/card/${p.id}/${d.date}">${esc(d.date)}</a><span>${d.tasksDone}/${d.tasksTotal} · ${money(d.earningsCents)}${d.verifiedCents ? ' ✓' : ''}</span><b style="color:#f5b942">${d.score}</b></div>`).join('')}</div>` : ''}
<a class="btn" href="/?invite=">Think you can beat ${esc(p.displayName.split(' ')[0])}? Join Legends Only</a>
<script>let amt=0;function pick(c){amt=c;document.getElementById('amt').value=c/100}async function tip(e){e.preventDefault();const v=Number(document.getElementById('amt').value||0)*100||amt;const r=await fetch('/api/tips/${encodeURIComponent(p.displayName)}',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({amountCents:v,fromName:document.getElementById('from').value,message:document.getElementById('msg').value})});const d=await r.json();if(!r.ok){document.getElementById('err').textContent=d.error;return false}if(d.url)location.href=d.url;else location.href='?tipped=1';return false}</script>` }));
  });

  // ── Cards and stories ────────────────────────────────────────────────────
  app.get('/api/cards/:userId/:date.svg', (req, res) => { const c = community.card(req.params.userId, req.params.date); if (!c || !c.public) return res.status(404).send('Not found'); res.type('image/svg+xml').send(community.cardSVG(c)); });
  app.get('/api/cards/:userId/:date', (req, res) => { const c = community.card(req.params.userId, req.params.date); if (!c || !c.public) return res.status(404).json({ error: 'Not found' }); res.json({ card: c, imageUrl: `${APP_URL}/api/cards/${c.userId}/${c.date}.svg`, shareUrl: `${APP_URL}${c.url}` }); });
  app.get('/card/:userId/:date', (req, res) => {
    const c = community.card(req.params.userId, req.params.date);
    if (!c || !c.public) return res.status(404).send(page({ title: 'Not found', description: '', body: '<h1>No card here.</h1>' }));
    const img = `${APP_URL}/api/cards/${c.userId}/${c.date}.svg`;
    res.send(page({ title: `${c.name}: ${c.score} points on ${c.date}`, description: `${c.tasksDone}/${c.tasksTotal} plays, ${money(c.earningsCents)} logged${c.verifiedCents ? `, ${money(c.verifiedCents)} verified` : ''}${c.rank ? `, world #${c.rank}` : ''}. Think you can beat it?`, image: img, url: `${APP_URL}${c.url}`,
      body: `<img class="card-img" src="${img}" alt="Receipt card"><a class="btn" href="/u/${encodeURIComponent(c.name)}">See ${esc(c.name)}'s profile and tip the grind</a> <a class="btn ghost" href="/">Play Legends Only</a>` }));
  });
  app.get('/api/stories/latest', (req, res) => res.json({ stories: community.latestStories(10) }));
  app.get('/story/:id', (req, res) => {
    const s = community.story(Number(req.params.id));
    if (!s) return res.status(404).send(page({ title: 'Not found', description: '', body: '<h1>No story here.</h1>' }));
    res.send(page({ title: s.title, description: s.body.slice(0, 160), url: `${APP_URL}${s.url}`, body: `<h1>${esc(s.title)}</h1><div class="muted">${esc(s.name)} · Self-Made Legends</div><div class="card"><p>${esc(s.body)}</p></div><a class="btn" href="/u/${encodeURIComponent(s.name)}">Tip ${esc(s.name.split(' ')[0])}</a> <a class="btn ghost" href="/">Start your own streak</a>` }));
  });

  // ── Feed, cities, brackets, challenge days, prizes, shows, mentors ───────
  app.get('/api/feed', (req, res) => res.json({ feed: community.feed(40) }));
  const hallOfFame = () => ({
    wall: season.wall(),
    members: db.prepare("SELECT u.id, u.display_name, p.city, p.region, u.created_at FROM users u LEFT JOIN profiles p ON p.user_id = u.id WHERE u.tier = 'hof' AND u.public_profile = 1 ORDER BY u.display_name").all().map(m => ({ id: m.id, name: m.display_name, city: [m.city, m.region].filter(Boolean).join(', ') })),
    legends: engine.allTimeLeaderboard(10),
    champions: db.prepare('SELECT c.date, c.user_id, c.score, u.display_name FROM champions c JOIN users u ON u.id = c.user_id WHERE c.rank = 1 ORDER BY c.date DESC LIMIT 30').all().map(c => ({ date: c.date, userId: c.user_id, name: c.display_name, score: c.score })),
  });
  app.get('/api/hall-of-fame', (req, res) => res.json(hallOfFame()));
  app.get('/hall-of-fame', (req, res) => {
    const h = hallOfFame();
    res.send(page({ title: 'Self-Made Legends Hall of Fame', description: 'The members, the all-time Legends, and every Legend of the Day.', url: `${APP_URL}/hall-of-fame`, body: `<h1>Self-Made Legends Hall of Fame</h1>
<h2>Members</h2><div class="card">${h.members.length ? h.members.map(m => `<div class="row"><span><img src="/api/avatar/${esc(m.id)}" alt="" style="width:28px;height:28px;border-radius:50%;vertical-align:middle;border:2px solid #C9A227;margin-right:8px"><a href="/u/${encodeURIComponent(m.name)}">${esc(m.name)}</a></span><span class="muted">${esc(m.city)}</span></div>`).join('') : '<span class="muted">The first seat is open.</span>'}</div>
<h2>Legends of the Month</h2><div class="card">${h.wall.legends.length ? h.wall.legends.map(l => `<div class="row"><span>${esc(l.month)} · <a href="/u/${encodeURIComponent(l.name)}">${esc(l.name)}</a> <span class="muted">jacket #${String(l.jacketNumber).padStart(3, '0')}</span></span><b style="color:#f5b942">${l.points.toLocaleString()}</b></div>`).join('') : '<span class="muted">The first month has not closed yet. The chain is waiting.</span>'}</div>
${h.wall.champions.length ? `<h2>People's Champions</h2><div class="card">${h.wall.champions.map(c => `<div class="row"><span>${esc(c.month)} · <a href="/u/${encodeURIComponent(c.name)}">${esc(c.name)}</a></span><b>${c.votes.toLocaleString()} votes</b></div>`).join('')}</div>` : ''}
${h.wall.crews.length ? `<h2>Squad Belt</h2><div class="card">${h.wall.crews.map(c => `<div class="row"><span>${esc(c.month)} · ${esc(c.name)}</span><b>${c.points.toLocaleString()}</b></div>`).join('')}</div>` : ''}
${h.wall.fansOfMonth.length ? `<h2>Fans of the Month</h2><div class="card">${h.wall.fansOfMonth.map(c => `<div class="row"><span>${esc(c.month)} · ${esc(c.name)}</span><b>${c.fanPoints.toLocaleString()} fan pts</b></div>`).join('')}</div>` : ''}
<h2>All-time Legends</h2><div class="card">${h.legends.map(l => `<div class="row"><span>${l.rank}. <a href="/u/${encodeURIComponent(l.displayName)}">${esc(l.displayName)}</a></span><b style="color:#f5b942">${l.totalScore.toLocaleString()}</b></div>`).join('') || '<span class="muted">Nobody yet.</span>'}</div>
<h2>Legends of the Day</h2><div class="card">${h.champions.map(c => `<div class="row"><span>${esc(c.date)} · <a href="/u/${encodeURIComponent(c.name)}">${esc(c.name)}</a></span><b>${c.score.toLocaleString()}</b></div>`).join('') || '<span class="muted">The first day has not closed yet.</span>'}</div>
<a class="btn" href="/">Earn your seat</a>` }));
  });
  app.get('/api/cities', (req, res) => { const ws = Community.weekStart(/^\d{4}-\d{2}-\d{2}$/.test(req.query.week || '') ? req.query.week : todayUTC()); res.json({ weekStart: ws, cities: community.cityBoard(ws), matchup: community.cityMatchup(ws) }); });
  app.get('/api/bracket', (req, res) => res.json({ bracket: community.currentBracket(todayUTC()) }));
  app.post('/api/bracket/enter', requireUser, (req, res) => {
    const profile = engine.getProfile(req.user.id);
    if (!profile) return res.status(400).json({ error: 'Set up your profile first' });
    const today = engine.localDateKey(profile);
    const ws = Community.weekStart(today);
    const current = db.prepare('SELECT status FROM brackets WHERE week_start = ?').get(ws);
    const target = current && current.status === 'open' && today < ws ? ws : Community.shift(ws, 7);
    try { res.json({ bracket: community.enterBracket(req.user.id, target) }); } catch (e) { fail(res, e); }
  });
  app.get('/api/challenge-days', (req, res) => res.json({ challenges: community.activeChallenges(todayUTC()) }));
  app.get('/api/challenge-days/:slug', (req, res) => { const c = community.challengeDay(req.params.slug); if (!c) return res.status(404).json({ error: 'Not found' }); res.json({ challenge: c }); });
  app.get('/challenge/:slug', (req, res) => {
    const c = community.challengeDay(req.params.slug);
    if (!c) return res.status(404).send(page({ title: 'Not found', description: '', body: '<h1>No challenge here.</h1>' }));
    res.send(page({ title: `Beat ${c.name}`, description: c.headline || `${c.name} scored ${c.targetScore} in one day on Legends Only. ${c.beaters.length} people have beaten it.`, url: `${APP_URL}${c.url}`,
      body: `<h1>Beat ${esc(c.name)}</h1><p>${esc(c.headline || '')}</p><div class="card"><div class="row"><span class="muted">Score to beat</span><b style="color:#f5b942">${c.targetScore}</b></div>${c.targetCents ? `<div class="row"><span class="muted">${esc(c.name)} logged</span><b>${money(c.targetCents)}</b></div>` : ''}<div class="row"><span class="muted">Window</span><span>${esc(c.date)} to ${esc(c.ends)}</span></div><div class="row"><span class="muted">Players who tried</span><span>${c.attempts}</span></div><div class="row"><span class="muted">Beat it</span><b>${c.beaters.length}</b></div></div>
${c.plan ? `<h2>${esc(c.name)}'s plan</h2><div class="card">${(c.plan.tasks || []).map(t => `<div class="row"><span>${esc(t.icon || '')} ${esc(t.title)}</span><span class="muted">${t.hours ? t.hours + 'h' : ''}</span></div>`).join('')}</div>` : ''}
${c.beaters.length ? `<h2>Beat it</h2><div class="card">${c.beaters.slice(0, 10).map(b => `<div class="row"><span>${b.rank}. <a href="/u/${encodeURIComponent(b.name)}">${esc(b.name)}</a></span><b>${b.score}</b></div>`).join('')}</div>` : ''}
<a class="btn" href="/">Take the challenge</a>` }));
  });
  app.get('/api/prize', (req, res) => { const m = /^\d{4}-\d{2}$/.test(req.query.month || '') ? req.query.month : todayUTC().slice(0, 7); res.json({ prize: community.prizePool(m) }); });
  app.get('/api/shows', (req, res) => res.json({ shows: community.shows(8) }));
  app.get('/show/:week', (req, res) => {
    const s = community.show(req.params.week);
    if (!s) return res.status(404).send(page({ title: 'Not found', description: '', body: '<h1>No show for that week yet.</h1>' }));
    res.send(page({ title: s.title, description: s.opening.slice(0, 160), url: `${APP_URL}${s.url}`, body: `<h1>${esc(s.title)}</h1><div class="muted">Week ending ${esc(s.weekEnd)} · Self-Made Legends Weekly</div><div class="card"><p>${esc(s.opening)}</p></div>${(s.segments || []).map(g => `<h2>${esc(g.heading)}</h2><div class="card"><p>${esc(g.body)}</p></div>`).join('')}<div class="card"><p>${esc(s.closing)}</p></div>${s.week && s.week.champion ? `<a class="btn" href="/u/${encodeURIComponent(s.week.champion.displayName)}">Tip ${esc(s.week.champion.displayName)}</a>` : ''}` }));
  });
  app.get('/api/mentors', (req, res) => res.json({ mentors: community.mentors() }));
  app.post('/api/mentors', requireUser, (req, res) => { try { res.json({ mentor: community.becomeMentor(req.user.id, req.body || {}) }); } catch (e) { fail(res, e); } });
  app.delete('/api/mentors', requireUser, (req, res) => { community.stopMentoring(req.user.id); res.json({ ok: true }); });
  app.post('/api/mentors/:userId/ask', requireUser, (req, res) => { try { res.json({ question: community.ask(req.user.id, req.params.userId, (req.body || {}).question) }); } catch (e) { fail(res, e); } });
  app.post('/api/mentors/questions/:id/answer', requireUser, (req, res) => { try { res.json({ question: community.answer(req.user.id, Number(req.params.id), (req.body || {}).answer) }); } catch (e) { fail(res, e); } });

  // ── Challenges (duels), push, billing ────────────────────────────────────
  app.get('/api/challenges', requireUser, (req, res) => res.json({ challenges: engine.challenges(req.user.id) }));
  app.post('/api/challenges', requireUser, (req, res) => {
    const profile = engine.getProfile(req.user.id);
    if (!profile) return res.status(400).json({ error: 'Set up your profile first' });
    const b = req.body || {};
    const date = /^\d{4}-\d{2}-\d{2}$/.test(b.date || '') ? b.date : engine.localDateKey(profile);
    try { res.json({ challenge: engine.createChallenge(req.user.id, b.opponent, date) }); } catch (e) { fail(res, e); }
  });
  app.post('/api/challenges/:id/respond', requireUser, (req, res) => { try { res.json({ challenge: engine.respondChallenge(req.user.id, parseInt(req.params.id, 10), !!(req.body || {}).accept) }); } catch (e) { fail(res, e); } });
  app.post('/api/push/subscribe', requireUser, (req, res) => { try { push.subscribe(req.user.id, (req.body || {}).subscription); res.json({ ok: true, devices: push.count(req.user.id) }); } catch (e) { fail(res, e); } });
  app.post('/api/push/unsubscribe', requireUser, (req, res) => { push.unsubscribe(req.user.id, (req.body || {}).endpoint); res.json({ ok: true }); });
  app.get('/api/billing', requireUser, (req, res) => res.json({ enabled: !!stripe, tier: engine.tierOf(req.user.id), tierInfo: engine.tierInfo(req.user.id), defaultTier: engine.defaultTier, tiers: Engine.constants.TIERS, tierNames: Engine.constants.TIER_NAMES, tierPrices: Engine.constants.TIER_PRICES_CENTS, tierPerks: Engine.constants.TIER_PERKS, ranks: Engine.constants.RANKS, rankNames: Engine.constants.RANK_NAMES, rankRules: Engine.constants.RANK_RULES, rankInfo: engine.rankInfo(req.user.id), features: Engine.constants.FEATURES, fees: money$.fees, myFees: money$.tierFees(engine.tierOf(req.user.id)), successFee: money$.successFeeFor(req.user.id, todayUTC().slice(0, 7)) }));
  app.post('/api/billing/checkout', requireUser, wrap(async (req, res) => {
    if (!stripe) return res.status(404).json({ error: 'Billing is not configured yet' });
    const tier = (req.body || {}).tier;
    if (!TIER_PRICES[tier]) return res.status(400).json({ error: 'Unknown plan' });
    const session = await stripe.checkout.sessions.create({ mode: 'subscription', client_reference_id: req.user.id, customer_email: req.user.email, metadata: { tier }, line_items: [{ price: TIER_PRICES[tier], quantity: 1 }], success_url: `${APP_URL}/?billing=success`, cancel_url: `${APP_URL}/?billing=cancel` });
    res.json({ url: session.url });
  }));

  // ── Squads, crew calls, bot vs bot ───────────────────────────────────────
  app.get('/api/squads', requireUser, (req, res) => res.json({ mine: squads.mine(req.user.id), board: squads.board(todayUTC()), duels: squads.duels(12), myDuels: squads.mineDuels(req.user.id) }));
  app.get('/api/squads/board', (req, res) => res.json({ board: squads.board(todayUTC()) }));
  app.post('/api/squads', requireUser, (req, res) => { try { res.json({ squad: squads.create(req.user.id, (req.body || {}).name) }); } catch (e) { fail(res, e); } });
  app.post('/api/squads/join', requireUser, (req, res) => { try { res.json({ squad: squads.join(req.user.id, (req.body || {}).code) }); } catch (e) { fail(res, e); } });
  app.delete('/api/squads', requireUser, (req, res) => res.json(squads.leave(req.user.id) || { ok: true }));
  app.post('/api/squads/room', requireUser, (req, res) => { try { res.json({ ...squads.openRoom(req.user.id), iceServers: ICE_SERVERS }); } catch (e) { fail(res, e); } });
  app.post('/api/squads/room/:id/leave', requireUser, (req, res) => { squads.leaveRoom(req.user.id, Number(req.params.id)); res.json({ ok: true }); });
  app.post('/api/squads/room/:id/signal', requireUser, express.json({ limit: '256kb' }), (req, res) => { const b = req.body || {}; try { res.json(squads.signal(Number(req.params.id), req.user.id, b.to, b.type, b.payload)); } catch (e) { fail(res, e); } });
  app.get('/api/bot-duels', (req, res) => res.json({ duels: squads.duels(20) }));
  app.post('/api/bot-duels', requireUser, (req, res) => {
    const profile = engine.getProfile(req.user.id);
    if (!profile) return res.status(400).json({ error: 'Set up your profile first' });
    const b = req.body || {};
    const other = engine.findUser(b.opponent);
    if (!other) return res.status(404).json({ error: 'No player by that name' });
    const date = /^\d{4}-\d{2}-\d{2}$/.test(b.date || '') ? b.date : engine.localDateKey(profile);
    try { res.json({ duel: squads.challenge(req.user.id, other.id, date) }); } catch (e) { fail(res, e); }
  });
  app.post('/api/bot-duels/:id/vote', requireUser, (req, res) => { try { res.json({ duel: squads.vote(Number(req.params.id), req.user.id, (req.body || {}).pick) }); } catch (e) { fail(res, e); } });

  // ── Marketplace: sponsors, employers, postings, résumés, city reports ────
  app.get('/api/sponsor/:id/click', (req, res) => { const url = market.click(Number(req.params.id)); if (!url) return res.status(404).json({ error: 'Not found' }); res.redirect(url); });
  app.get('/api/postings', requireUser, (req, res) => { const profile = engine.getProfile(req.user.id); res.json({ postings: profile ? market.postingsFor(profile.location, engine.localDateKey(profile), 30) : [] }); });
  app.get('/api/postings/:id', requireUser, (req, res) => { const p = market.posting(Number(req.params.id)); if (!p) return res.status(404).json({ error: 'Not found' }); res.json({ posting: p }); });
  app.post('/api/postings/:id/claim', requireUser, (req, res) => { try { res.json(market.claim(req.user.id, Number(req.params.id))); } catch (e) { fail(res, e); } });
  app.get('/api/employer', requireUser, (req, res) => res.json({ employer: market.employer(req.user.id), postings: market.myPostings(req.user.id), feeCents: Market.constants.POSTING_FEE_CENTS, resumeViewCents: Market.constants.RESUME_VIEW_CENTS, cutPct: money$.fees.POOL_FEE_PCT }));
  app.post('/api/employer', requireUser, (req, res) => { try { res.json({ employer: market.registerEmployer(req.user.id, req.body || {}) }); } catch (e) { fail(res, e); } });
  app.post('/api/employer/postings', requireUser, (req, res) => { try { res.json({ posting: market.post(req.user.id, req.body || {}) }); } catch (e) { fail(res, e); } });
  app.post('/api/employer/claims/:id/confirm', requireUser, (req, res) => { try { res.json({ posting: market.confirm(req.user.id, Number(req.params.id)) }); } catch (e) { fail(res, e); } });
  app.get('/api/employer/search', requireUser, (req, res) => { if (!market.employer(req.user.id)) return res.status(403).json({ error: 'Register as an employer first' }); res.json({ results: market.search({ city: req.query.city, category: CATEGORIES[req.query.category] ? req.query.category : null, minDays: parseInt(req.query.minDays, 10) || 0 }) }); });
  app.get('/api/employer/resume/:userId', requireUser, (req, res) => { try { res.json({ resume: market.viewResume(req.user.id, req.params.userId) }); } catch (e) { fail(res, e); } });
  app.get('/api/u/:name/resume', (req, res) => { const p = community.publicProfile(req.params.name); if (!p) return res.status(404).json({ error: 'No public Legend by that name' }); res.json({ resume: market.resume(p.id) }); });
  app.get('/u/:name/resume', (req, res) => {
    const p = community.publicProfile(req.params.name);
    const r = p && market.resume(p.id);
    if (!r) return res.status(404).send(page({ title: 'No such Legend', description: '', body: '<h1>No public Legend by that name.</h1>' }));
    res.send(page({ title: `${r.name} · Verified track record`, description: `${r.days} days on the grind, ${r.approvedPlays} plays approved, ${money(r.verifiedCents)} verified. ${r.rank}.`, url: `${APP_URL}/u/${encodeURIComponent(r.name)}/resume`,
      body: `<h1>${esc(r.name)}</h1><div class="muted">${esc(r.city)} · ${esc(r.rank)} · member since ${new Date(r.memberSince).toLocaleDateString()}${r.phoneVerified ? ' · phone verified' : ''}</div>
<h2>Verified track record</h2><div class="card"><div class="row"><span class="muted">Days on the grind</span><b>${r.days}</b></div><div class="row"><span class="muted">Plays approved by the bot</span><b>${r.approvedPlays}</b></div><div class="row"><span class="muted">Receipt-verified earnings</span><b>${money(r.verifiedCents)}</b></div><div class="row"><span class="muted">Employer confirmations</span><b>${r.employerConfirmations}</b></div><div class="row"><span class="muted">Best streak</span><b>${r.bestStreak}</b></div><div class="row"><span class="muted">Trust score</span><b>${r.trust}/100</b></div></div>
${r.categories.length ? `<h2>Work history by type</h2><div class="card">${r.categories.map(c => `<div class="row"><span>${esc(CATEGORIES[c.category] || c.category)}</span><span>${c.plays} plays · ${c.hours}h${c.verifiedCents ? ' · ' + money(c.verifiedCents) + ' verified' : ''}</span></div>`).join('')}</div>` : ''}
${r.skills.length ? `<h2>Skills</h2><div class="card">${r.skills.map(esc).join(' · ')}</div>` : ''}
<p class="muted">Every line here was approved by the player's own Self-Made Legends bot, verified from a receipt, or confirmed by an employer through the app. Employers: open the full record inside the app.</p><a class="btn" href="/u/${encodeURIComponent(r.name)}">Legend page</a> <a class="btn ghost" href="/">Hire through Legends Only</a>` }));
  });
  app.get('/api/reports/city', (req, res) => { const city = String(req.query.city || '').slice(0, 80); const month = /^\d{4}-\d{2}$/.test(req.query.month || '') ? req.query.month : todayUTC().slice(0, 7); if (!city) return res.status(400).json({ error: 'city required' }); res.json({ report: market.cityReport(city, month) }); });
  app.get('/report/:city', (req, res) => {
    const month = /^\d{4}-\d{2}$/.test(req.query.month || '') ? req.query.month : todayUTC().slice(0, 7);
    const r = market.cityReport(String(req.params.city || '').slice(0, 80), month);
    res.send(page({ title: `${r.city} money report · ${r.month}`, description: `What paid in ${r.city} in ${r.month}: ${r.totals.playsDone} plays, ${money(r.totals.earnedCents)} logged, ${money(r.totals.perHourCents)}/hour.`, url: `${APP_URL}/report/${encodeURIComponent(r.city)}?month=${r.month}`,
      body: `<h1>Self-Made Legends City Report</h1><div class="muted">${esc(r.city)} · ${esc(r.month)} · ${r.players} player${r.players === 1 ? '' : 's'}</div>
<div class="card"><div class="row"><span class="muted">Plays done</span><b>${r.totals.playsDone}</b></div><div class="row"><span class="muted">Hours</span><b>${r.totals.hours}</b></div><div class="row"><span class="muted">Logged</span><b>${money(r.totals.earnedCents)}</b></div><div class="row"><span class="muted">Verified</span><b>${money(r.totals.verifiedCents)}</b></div><div class="row"><span class="muted">Per hour</span><b>${money(r.totals.perHourCents)}</b></div></div>
<h2>What paid, best first</h2><div class="card">${r.plays.length ? r.plays.map(p => `<div class="row"><span>${esc(p.title)}<br><span class="muted" style="font-size:.8em">${esc(p.category)} · done ${p.doneRate}% of ${p.planned} · grade ${p.difficulty}/10</span></span><b>${money(p.perHourCents)}/h</b></div>`).join('') : '<span class="muted">Not enough closed days in this city yet.</span>'}</div><p class="muted" style="font-size:.85em">${esc(r.note)}</p>` }));
  });

  // ── Clips ────────────────────────────────────────────────────────────────
  app.get('/api/clips', (req, res) => res.json({ clips: clips.latest(20) }));
  app.get('/api/clips/mine', requireUser, (req, res) => res.json({ clips: clips.mine(req.user.id) }));
  app.get('/api/live/:id/best-window', requireUser, (req, res) => res.json({ window: clips.bestWindow(Number(req.params.id)), activity: clips.activity(Number(req.params.id)) }));
  app.post('/api/clips', requireUser, express.raw({ type: ['video/webm', 'video/mp4'], limit: '26mb' }), (req, res) => {
    try { res.json({ clip: clips.save(req.user.id, { roomId: req.headers['x-room-id'] ? Number(req.headers['x-room-id']) : null, title: decodeURIComponent(String(req.headers['x-title'] || '')), buffer: req.body, mime: (req.headers['content-type'] || '').split(';')[0], seconds: Number(req.headers['x-seconds'] || 0) }) }); } catch (e) { fail(res, e); }
  });
  app.get('/api/clips/:id/video', (req, res) => { const f = clips.filePath(Number(req.params.id)); const c = clips.clip(Number(req.params.id)); if (!f || !c) return res.status(404).json({ error: 'Not found' }); clips.view(c.id); res.type(c.mime).sendFile(f); });
  app.delete('/api/clips/:id', requireUser, (req, res) => { try { clips.remove(req.user.id, Number(req.params.id)); res.json({ ok: true }); } catch (e) { fail(res, e); } });
  app.get('/clip/:id', (req, res) => {
    const c = clips.clip(Number(req.params.id));
    if (!c || !c.public) return res.status(404).send(page({ title: 'Not found', description: '', body: '<h1>No clip here.</h1>' }));
    const card = community.card(c.userId, c.date);
    res.send(page({ title: `${c.name}: ${c.title}`, description: `${c.seconds}s from ${c.name}'s live on Self-Made Legends.`, url: `${APP_URL}${c.url}`, image: card && card.public ? `${APP_URL}/api/cards/${c.userId}/${c.date}.svg` : undefined,
      body: `<h1>${esc(c.title)}</h1><div class="muted">${esc(c.name)} · ${esc(c.date)} · ${c.views} views</div><video controls playsinline src="${esc(c.fileUrl)}" style="width:100%;border-radius:16px;border:1px solid #262c3d;margin:12px 0;background:#000"></video>${card && card.public ? `<img class="card-img" src="/api/cards/${esc(c.userId)}/${esc(c.date)}.svg" alt="Receipt card">` : ''}<a class="btn" href="/u/${encodeURIComponent(c.name)}">Tip ${esc(c.name.split(' ')[0])}</a> <a class="btn ghost" href="/">Play Legends Only</a>` }));
  });

  // ── Seasons: monthly races, the ballot, vote packs, prizes ───────────────
  app.get('/api/season', (req, res) => { const user = auth.verify(tokenOf(req)); res.json(season.summary(user ? user.id : null)); });
  app.get('/api/season/wall', (req, res) => res.json(season.wall()));
  app.get('/api/season/:month', (req, res) => { const m = /^\d{4}-\d{2}$/.test(req.params.month) ? req.params.month : season.current(); res.json({ month: m, race: season.race(m, 50), crewRace: season.crewRace(m, 25), ballot: season.ballot(m), prizes: season.prizes(m), winners: season.winners(m) }); });
  app.post('/api/season/vote', requireUser, (req, res) => { const b = req.body || {}; try { res.json(season.vote(req.user.id, String(b.userId || ''), b.n || 1)); } catch (e) { fail(res, e); } });
  app.post('/api/season/votes/buy', requireUser, wrap(async (req, res) => { try { res.json({ ...(await season.buyPack(req.user.id, (req.body || {}).pack, { successUrl: `${APP_URL}/?votes=done`, cancelUrl: `${APP_URL}/` })), billing: !!stripe }); } catch (e) { fail(res, e); } }));

  // ── The Fan Club ─────────────────────────────────────────────────────────
  app.get('/api/fans/home', requireUser, (req, res) => res.json(fans.home(req.user.id)));
  app.post('/api/fans/join', requireUser, (req, res) => { if (engine.getProfile(req.user.id) && !fans.isFan(req.user.id)) return res.status(400).json({ error: 'You already grind. Fans are a separate door.' }); res.json({ profile: fans.join(req.user.id, req.body || {}) }); });
  app.post('/api/fans/become-player', requireUser, (req, res) => res.json(fans.becomePlayer(req.user.id)));
  app.get('/api/fans/following', requireUser, (req, res) => res.json(fans.following(req.user.id)));
  app.post('/api/fans/follow', requireUser, (req, res) => { const b = req.body || {}; try { res.json(fans.follow(req.user.id, b.type || 'user', b.id)); } catch (e) { fail(res, e); } });
  app.delete('/api/fans/follow/:type/:id', requireUser, (req, res) => res.json(fans.unfollow(req.user.id, req.params.type, req.params.id)));
  app.post('/api/fans/pick', requireUser, (req, res) => { try { res.json({ pick: fans.pick(req.user.id, String((req.body || {}).userId || '')) }); } catch (e) { fail(res, e); } });
  app.get('/api/fans/top', (req, res) => { const m = /^\d{4}-\d{2}$/.test(req.query.month || '') ? req.query.month : season.current(); res.json({ month: m, fans: fans.topFans(m, 25) }); });
  app.post('/api/fans/callout', requireUser, (req, res) => { const b = req.body || {}; try { res.json({ callout: fans.callout(req.user.id, String(b.legendId || ''), String(b.targetId || '')) }); } catch (e) { fail(res, e); } });
  app.get('/api/fans/club', requireUser, (req, res) => res.json({ ...fans.clubInfo(req.user.id), billing: !!stripe, priceId: !!TIER_PRICES.fanclub }));
  app.post('/api/fans/club', requireUser, wrap(async (req, res) => {
    if (!fans.isFan(req.user.id)) return res.status(400).json({ error: 'The Fan Club is for fan accounts' });
    if (!stripe || !TIER_PRICES.fanclub) { if (opts.allowFreeClub || process.env.ALLOW_FREE_CLUB === '1') { fans.setClub(req.user.id, true); return res.json({ club: true, billing: false }); } return res.status(404).json({ error: 'Fan Club billing is not switched on yet' }); }
    const session = await stripe.checkout.sessions.create({ mode: 'subscription', client_reference_id: req.user.id, customer_email: req.user.email, metadata: { tier: 'fanclub' }, line_items: [{ price: TIER_PRICES.fanclub, quantity: 1 }], success_url: `${APP_URL}/?billing=success`, cancel_url: `${APP_URL}/?billing=cancel` });
    res.json({ url: session.url });
  }));
  app.get('/api/u/:name/fan', (req, res) => { const u = db.prepare("SELECT id FROM users WHERE lower(display_name) = lower(?) AND role = 'fan' AND public_profile = 1").get(String(req.params.name || '')); if (!u) return res.status(404).json({ error: 'No public fan by that name' }); res.json({ fan: fans.profile(u.id) }); });

  // ── Health ───────────────────────────────────────────────────────────────
  app.get('/api/health', (req, res) => { const h = ops.health(); res.status(h.ok ? 200 : 503).json({ ok: h.ok, at: h.at, crewOnline: h.crewOnline }); });

  // ── Leaderboards ─────────────────────────────────────────────────────────
  app.get('/api/leaderboard', (req, res) => {
    const q = String(req.query.date || '');
    const date = /^\d{4}-\d{2}-\d{2}$/.test(q) ? q : todayUTC();
    const scope = ['world', 'women', 'country', 'region', 'city'].includes(req.query.scope) ? req.query.scope : 'world';
    const league = Engine.constants.LEAGUES.includes(req.query.league) ? req.query.league : null;
    const category = CATEGORIES[req.query.category] ? req.query.category : null;
    const mode = req.query.mode === 'verified' ? 'verified' : 'all';
    let viewer = null;
    if (['country', 'region', 'city'].includes(scope)) {
      const user = auth.verify(tokenOf(req));
      if (!user) return res.status(401).json({ error: 'Sign in for local boards' });
      viewer = engine.getProfile(user.id);
      if (!viewer) return res.status(400).json({ error: 'Set your location first' });
    }
    res.json({ date, scope, league, mode, category, leaderboard: engine.leaderboard(date, { scope, league, mode, category, viewer, limit: 100 }), allTime: engine.allTimeLeaderboard(25), bench: engine.bench(date), yesterdayPodium: engine.podium(Engine.shiftDate(date, -1)), champion: engine.championPlan(Engine.shiftDate(date, -1)), updatedAt: new Date(now()).toISOString() });
  });
  app.get('/api/champion', (req, res) => { const q = String(req.query.date || ''); res.json({ champion: engine.championPlan(/^\d{4}-\d{2}-\d{2}$/.test(q) ? q : Engine.shiftDate(todayUTC(), -1)) }); });

  // ── Admin (the owner's console) ──────────────────────────────────────────
  app.get('/api/admin/revenue', requireAdmin, (req, res) => res.json(money$.revenue({ months: 12 })));
  app.get('/api/admin/fees', requireAdmin, (req, res) => res.json({ fees: money$.fees }));
  app.post('/api/admin/fees', requireAdmin, (req, res) => { try { for (const [k, v] of Object.entries(req.body || {})) money$.setFee(k, v); res.json({ fees: money$.fees }); } catch (e) { fail(res, e); } });
  app.get('/api/admin/ideas', requireAdmin, (req, res) => res.json({ ideas: community.ideas() }));
  app.post('/api/admin/ideas/run', requireAdmin, wrap(async (req, res) => res.json({ ideas: await community.writeIdeas((req.body || {}).weekEnd || Community.shift(todayUTC(), -1)) })));
  app.post('/api/admin/ideas/:id', requireAdmin, (req, res) => { try { community.setIdeaStatus(Number(req.params.id), (req.body || {}).status); res.json({ ok: true }); } catch (e) { fail(res, e); } });
  app.post('/api/admin/challenge-days', requireAdmin, (req, res) => { try { res.json({ challenge: community.createChallengeDay(req.body || {}) }); } catch (e) { fail(res, e); } });
  app.post('/api/admin/prize-pools', requireAdmin, (req, res) => { try { res.json({ prize: community.createPrizePool(req.body || {}) }); } catch (e) { fail(res, e); } });
  app.post('/api/admin/prize-pools/:month/settle', requireAdmin, (req, res) => res.json({ prize: community.settlePrizePool(req.params.month) }));
  app.post('/api/admin/payouts/:userId', requireAdmin, wrap(async (req, res) => { try { res.json(await money$.payout(req.params.userId, { method: (req.body || {}).method || 'manual', ref: (req.body || {}).ref })); } catch (e) { fail(res, e); } }));
  app.post('/api/admin/close-month', requireAdmin, wrap(async (req, res) => res.json({ results: await money$.closeMonth((req.body || {}).month || todayUTC().slice(0, 7)) })));
  app.post('/api/admin/tier/:userId', requireAdmin, (req, res) => { try { engine.setTier(req.params.userId, (req.body || {}).tier); res.json({ ok: true }); } catch (e) { fail(res, e); } });
  app.get('/api/admin/players', requireAdmin, (req, res) => res.json({ players: db.prepare('SELECT u.id, u.display_name, u.email, u.tier, u.payout_balance_cents, u.stripe_account_id IS NOT NULL AS connected, u.created_at, u.trust, u.phone_verified_at IS NOT NULL AS phone_verified, u.banned_at, u.role, p.city, p.region FROM users u LEFT JOIN profiles p ON p.user_id = u.id ORDER BY u.created_at DESC LIMIT 500').all() }));
  app.post('/api/admin/show/run', requireAdmin, wrap(async (req, res) => res.json({ show: await community.writeShow((req.body || {}).weekEnd || Community.shift(Community.weekStart(todayUTC()), -1)) })));
  app.get('/api/admin/health', requireAdmin, (req, res) => res.json({ health: ops.health(), alerts: ops.alerts(50), errors: db.prepare('SELECT source, message, created_at FROM ops_errors ORDER BY created_at DESC LIMIT 30').all(), reconciliations: ops.reconciliations(30) }));
  app.post('/api/admin/alerts/:id/resolve', requireAdmin, (req, res) => { ops.resolve(Number(req.params.id)); res.json({ ok: true }); });
  app.post('/api/admin/reconcile', requireAdmin, wrap(async (req, res) => res.json({ result: await ops.reconcile(/^\d{4}-\d{2}-\d{2}$/.test((req.body || {}).day || '') ? req.body.day : Engine.shiftDate(todayUTC(), -1)) })));
  app.post('/api/admin/ban/:userId', requireAdmin, (req, res) => { trust.ban(req.params.userId, (req.body || {}).reason); res.json({ ok: true }); });
  app.get('/api/admin/sponsor-tiles', requireAdmin, (req, res) => res.json({ tiles: market.tiles() }));
  app.post('/api/admin/sponsor-tiles', requireAdmin, (req, res) => { try { res.json({ tile: market.createTile(req.body || {}) }); } catch (e) { fail(res, e); } });
  app.get('/api/admin/postings', requireAdmin, (req, res) => res.json({ postings: db.prepare('SELECT id FROM postings ORDER BY created_at DESC LIMIT 100').all().map(r => market.posting(r.id)), employers: db.prepare('SELECT e.*, u.display_name, u.email FROM employers e JOIN users u ON u.id = e.user_id ORDER BY e.created_at DESC').all() }));
  app.post('/api/admin/employers/:userId/verify', requireAdmin, (req, res) => { db.prepare('UPDATE employers SET verified = ? WHERE user_id = ?').run((req.body || {}).verified === false ? 0 : 1, req.params.userId); res.json({ ok: true }); });
  app.get('/api/admin/reports', requireAdmin, (req, res) => res.json({ reports: market.reports() }));
  app.get('/api/admin/season', requireAdmin, (req, res) => { const m = /^\d{4}-\d{2}$/.test(req.query.month || '') ? req.query.month : season.current(); res.json({ month: m, prizes: season.prizes(m), race: season.race(m, 10), crewRace: season.crewRace(m, 5), ballot: season.ballot(m), winners: season.winners(m), voteRevenueCents: season.voteRevenue(m), canSettle: season.canSettle(m), topFans: fans.topFans(m, 10), fanClubMembers: db.prepare("SELECT COUNT(*) AS c FROM users WHERE tier = 'fanclub'").get().c, fansTotal: db.prepare("SELECT COUNT(*) AS c FROM users WHERE role = 'fan'").get().c }); });
  app.post('/api/admin/season/prizes', requireAdmin, (req, res) => { const b = req.body || {}; try { res.json({ prize: season.setPrize(b.month, b.kind, b) }); } catch (e) { fail(res, e); } });
  app.post('/api/admin/season/:month/settle', requireAdmin, (req, res) => { try { res.json({ winners: season.settle(req.params.month, { force: !!(req.body || {}).force }) }); } catch (e) { fail(res, e); } });
  app.post('/api/admin/fans/:userId/club', requireAdmin, (req, res) => { try { res.json(fans.setClub(req.params.userId, (req.body || {}).on !== false)); } catch (e) { fail(res, e); } });
  app.post('/api/admin/votes/:userId/grant', requireAdmin, (req, res) => res.json({ credits: season.grantCredits(req.params.userId, parseInt((req.body || {}).n, 10) || 0) }));

  // ── Live updates (Server-Sent Events) ────────────────────────────────────
  app.get('/api/events', (req, res) => {
    const user = auth.verify(String(req.query.token || ''));
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    res.write('event: hello\ndata: {}\n\n');
    const listener = (userId, event, data) => { if (userId && (!user || userId !== user.id)) return; res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`); };
    listeners.add(listener);
    const ping = setInterval(() => res.write(': ping\n\n'), 25_000);
    req.on('close', () => { clearInterval(ping); listeners.delete(listener); });
  });

  app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err && err.type === 'entity.too.large') return res.status(413).json({ error: 'That upload is too large' });
    console.error('[api]', err && err.stack ? err.stack : err);
    try { ops.logError(req.path, err); } catch (_) {}
    res.status(err.status || 500).json({ error: err.message || 'Something broke' });
  });

  return { app, db, engine, auth, crew, push, money: money$, community, social, gigs, trust, ops, squads, market, clips, fun, season, fans, handleBillingEvent };
}

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  const { app, engine, crew, push } = createApp();
  const tick = () => engine.tick().catch(e => { console.error('[tick]', e.message); try { engine.ops.logError('tick', e); } catch (_) {} });
  setInterval(tick, 5 * 60 * 1000);
  setTimeout(tick, 3000);
  app.listen(PORT, () => {
    console.log(`Legends Only listening on http://localhost:${PORT}`);
    console.log(crew.online ? 'Crew online: Claude + live web research' : 'Crew offline: playbook mode (set ANTHROPIC_API_KEY to enable the agents)');
    console.log(push.enabled ? 'Push notifications on' : 'Push off (set VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY)');
    console.log(`Default tier for new players: ${engine.defaultTier}${process.env.STRIPE_SECRET_KEY ? ' (billing on)' : ' (billing off)'}${process.env.ADMIN_KEY ? '' : ' · ADMIN_KEY not set: owner console is off'}`);
  });
}

module.exports = { createApp };
