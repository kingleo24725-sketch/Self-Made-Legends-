// The HTTP surface end to end: accounts with terms and invites, profile,
// today's plan with crew log, tasks, chat, receipts, challenges, push,
// leaderboards in every scope, billing gates, and the shell.
const request = require('supertest');
const { createApp } = require('../server');
const { open } = require('../src/db');
const Crew = require('../src/agents');

let app, clock, engine, handleBillingEvent;
beforeAll(() => {
  clock = Date.parse('2026-09-09T15:00:00Z');
  ({ app, engine, handleBillingEvent } = createApp({ db: open(':memory:'), now: () => clock, crew: new Crew({ apiKey: '' }), defaultTier: 'boss' }));
});

const auth = (t) => ({ Authorization: `Bearer ${t}` });
const signup = async (email, name, extra = {}) => (await request(app).post('/api/auth/register').send({ email, password: 'longenough', displayName: name, acceptTerms: true, ...extra })).body;

describe('accounts', () => {
  test('register validates terms, uniqueness, then signs in', async () => {
    let r = await request(app).post('/api/auth/register').send({ email: 'bad', password: 'short', displayName: '' });
    expect(r.status).toBe(400);
    r = await request(app).post('/api/auth/register').send({ email: 'ava@x.com', password: 'longenough', displayName: 'Ava' });
    expect(r.body.error).toMatch(/terms/);
    r = await request(app).post('/api/auth/register').send({ email: 'Ava@X.com', password: 'longenough', displayName: 'Ava', acceptTerms: true });
    expect(r.status).toBe(200);
    expect(r.body.token).toBeTruthy();
    expect(r.body.user).toMatchObject({ email: 'ava@x.com', displayName: 'Ava' });
    expect(r.body.user.referralCode).toMatch(/^[A-Z0-9]{6}$/);
    expect((await request(app).post('/api/auth/register').send({ email: 'ava2@x.com', password: 'longenough', displayName: 'ava', acceptTerms: true })).body.error).toMatch(/taken/);
    expect((await request(app).post('/api/auth/login').send({ email: 'ava@x.com', password: 'wrong' })).status).toBe(401);
    expect((await request(app).post('/api/auth/login').send({ email: 'ava@x.com', password: 'longenough' })).status).toBe(200);
  });

  test('protected routes need a session', async () => {
    expect((await request(app).get('/api/today')).status).toBe(401);
    expect((await request(app).get('/api/today').set(auth('nope'))).status).toBe(401);
  });
});

describe('a full day through the API', () => {
  let token, ben;
  beforeAll(async () => { ben = await signup('ben@x.com', 'Ben'); token = ben.token; });

  test('new player is asked for a profile first', async () => {
    expect((await request(app).get('/api/today').set(auth(token))).body).toEqual({ needsProfile: true });
  });

  test('profile saves and today\'s plan appears with the crew log', async () => {
    let r = await request(app).post('/api/profile').set(auth(token)).send({ location: 'Atlanta, GA', resources: ['vehicle', 'laptop', 'nonsense'], skills: ['writing'], goals: '$200 today', targetHours: 8, startHour: 8, tzOffset: -240, goal: { title: 'New laptop', targetDollars: 900 } });
    expect(r.body.profile.resources).toEqual(['vehicle', 'laptop']);
    r = await request(app).get('/api/today').set(auth(token));
    expect(r.status).toBe(200);
    expect(r.body.date).toBe('2026-09-09');
    expect(r.body.plan.tasks.length).toBeGreaterThanOrEqual(3);
    expect(r.body.plan.league).toBe('gold');
    expect(r.body.rank).toMatchObject({ rank: 1, of: 1, score: 0, league: 'gold' });
    expect(r.body).toMatchObject({ canRegenerate: true, canChat: true, canVerify: true, crewOnline: false, tier: 'boss' });
    expect(r.body.crewLog.length).toBe(2);
    expect(r.body.goal).toMatchObject({ title: 'New laptop', targetCents: 90000 });
    const me = (await request(app).get('/api/me').set(auth(token))).body;
    expect(me.features).toEqual({ liveCrew: true, chat: true, receipts: true, localBoards: true });
    expect(me.inviteUrl).toMatch(/\?invite=[A-Z0-9]{6}$/);
  });

  test('one rebuild per day, then it is locked', async () => {
    expect((await request(app).post('/api/today/regenerate').set(auth(token))).status).toBe(200);
    expect((await request(app).post('/api/today/regenerate').set(auth(token))).status).toBe(429);
  });

  test('conditions for today reach the plan and chat answers', async () => {
    let r = await request(app).post('/api/today/conditions').set(auth(token)).send({ conditions: 'raining all day' });
    expect(r.body.profile.conditions).toBe('raining all day');
    r = await request(app).post('/api/today/chat').set(auth(token)).send({ message: 'what should I do first?' });
    expect(r.status).toBe(200);
    expect(r.body.reply).toMatch(/Next up/);
    expect((await request(app).post('/api/today/chat').set(auth(token)).send({ message: '' })).status).toBe(400);
  });

  test('completing a play with earnings scores and ranks; receipts are checked', async () => {
    const today = (await request(app).get('/api/today').set(auth(token))).body;
    const t = today.plan.tasks[0];
    let r = await request(app).post(`/api/tasks/${t.taskId}`).set(auth(token)).send({ status: 'done', earningsDollars: 62.5, note: '3 moves' });
    expect(r.status).toBe(200);
    expect(r.body.plan.progress).toMatchObject({ tasksDone: 1, earningsCents: 6250, verifiedCents: 0 });
    expect((await request(app).post('/api/tasks/999999').set(auth(token)).send({ status: 'done' })).status).toBe(400);
    expect((await request(app).post('/api/today/regenerate').set(auth(token))).status).toBe(400);
    r = await request(app).post(`/api/tasks/${t.taskId}/receipt`).set(auth(token)).send({ image: 'data:image/png;base64,aGVsbG8=', mediaType: 'image/png' });
    expect(r.status).toBe(200);
    expect(r.body.verified).toBe(false);
    const lb = (await request(app).get('/api/leaderboard')).body;
    expect(lb.leaderboard[0]).toMatchObject({ displayName: 'Ben', location: 'Atlanta, GA', earningsVerified: false, league: 'gold' });
  });

  test('local boards need a session and the Boss tier', async () => {
    expect((await request(app).get('/api/leaderboard?scope=city')).status).toBe(401);
    let r = await request(app).get('/api/leaderboard?scope=city&league=gold&mode=verified').set(auth(token));
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ scope: 'city', league: 'gold', mode: 'verified' });
    expect(r.body.leaderboard[0].displayName).toBe('Ben');
    engine.setTier(ben.user.id, 'pro'); engine.defaultTier = 'free';
    expect((await request(app).get('/api/leaderboard?scope=city').set(auth(token))).status).toBe(402);
    expect((await request(app).post('/api/today/chat').set(auth(token)).send({ message: 'hi' })).status).toBe(402);
    engine.setTier(ben.user.id, 'boss'); engine.defaultTier = 'boss';
  });

  test('challenges: create by name, accept, list', async () => {
    const cy = await signup('cy@x.com', 'Cy', { referralCode: ben.user.referralCode });
    await request(app).post('/api/profile').set(auth(cy.token)).send({ resources: [], tzOffset: -240 });
    await request(app).get('/api/today').set(auth(cy.token)); // first plan links the invite duel
    let r = await request(app).get('/api/challenges').set(auth(cy.token));
    expect(r.body.challenges[0]).toMatchObject({ status: 'accepted', challengerName: 'Ben', opponentName: 'Cy' });
    r = await request(app).post('/api/challenges').set(auth(token)).send({ opponent: 'cy', date: '2026-09-10' });
    expect(r.body.challenge.status).toBe('pending');
    r = await request(app).post(`/api/challenges/${r.body.challenge.id}/respond`).set(auth(cy.token)).send({ accept: true });
    expect(r.body.challenge.status).toBe('accepted');
    expect((await request(app).post('/api/challenges').set(auth(token)).send({ opponent: 'nobody' })).status).toBe(400);
  });

  test('push subscriptions are validated', async () => {
    expect((await request(app).post('/api/push/subscribe').set(auth(token)).send({ subscription: { endpoint: 'http://nope' } })).status).toBe(400);
    const r = await request(app).post('/api/push/subscribe').set(auth(token)).send({ subscription: { endpoint: 'https://push.example/1', keys: { p256dh: 'a', auth: 'b' } } });
    expect(r.body.devices).toBe(1);
    expect((await request(app).get('/api/me').set(auth(token))).body.pushDevices).toBe(1);
    await request(app).post('/api/push/unsubscribe').set(auth(token)).send({ endpoint: 'https://push.example/1' });
    expect((await request(app).get('/api/me').set(auth(token))).body.pushDevices).toBe(0);
  });

  test('billing is off without keys, and webhook events still flip tiers', async () => {
    expect((await request(app).post('/api/billing/checkout').set(auth(token)).send({ tier: 'pro' })).status).toBe(404);
    expect((await request(app).get('/api/billing').set(auth(token))).body).toMatchObject({ enabled: false, tier: 'boss' });
    handleBillingEvent({ type: 'checkout.session.completed', data: { object: { client_reference_id: ben.user.id, customer: 'cus_1', metadata: { tier: 'pro' } } } });
    expect(engine.tierOf(ben.user.id)).toBe('pro');
    handleBillingEvent({ type: 'customer.subscription.deleted', data: { object: { customer: 'cus_1' } } });
    expect(engine.tierOf(ben.user.id)).toBe('boss'); // free rows fall back to the default tier while billing is off
    engine.setTier(ben.user.id, 'boss');
  });

  test('closing the day writes the debrief, then edits are refused', async () => {
    let r = await request(app).post('/api/today/close').set(auth(token));
    expect(r.status).toBe(200);
    expect(r.body.streak).toBe(1);
    expect(r.body.debrief.summary).toMatch(/finished 1/);
    expect((await request(app).post('/api/today/close').set(auth(token))).status).toBe(400);
    const today = (await request(app).get('/api/today').set(auth(token))).body;
    expect(today.plan.status).toBe('closed');
    expect(today).toMatchObject({ canRegenerate: false, canChat: false });
    r = await request(app).post(`/api/tasks/${today.plan.tasks[1].taskId}`).set(auth(token)).send({ status: 'done' });
    expect(r.status).toBe(400);
    const hist = (await request(app).get('/api/history').set(auth(token))).body;
    expect(hist.history[0]).toMatchObject({ date: '2026-09-09', closed: true });
    expect(hist.stats.days).toBe(1);
    expect((await request(app).get('/api/inbox').set(auth(token))).body.inbox.map(i => i.kind)).toEqual(expect.arrayContaining(['plan', 'close']));
  });

  test('public endpoints reject malformed dates and serve the shell and legal pages', async () => {
    expect((await request(app).get('/api/leaderboard?date=nope')).body.date).toBe('2026-09-09');
    expect((await request(app).get('/api/champion')).body).toEqual({ champion: null });
    for (const p of ['/', '/manifest.json', '/terms', '/privacy', '/sw.js']) expect((await request(app).get(p)).status).toBe(200);
  });
});
