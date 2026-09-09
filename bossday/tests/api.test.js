// The HTTP surface end to end: accounts, profile, today's plan, task updates,
// the world leaderboard, and the guard rails around each.
const request = require('supertest');
const { createApp } = require('../server');
const { open } = require('../src/db');
const Crew = require('../src/agents');

let app, clock;
beforeAll(() => {
  clock = Date.parse('2026-09-09T15:00:00Z');
  ({ app } = createApp({ db: open(':memory:'), now: () => clock, crew: new Crew({ apiKey: '' }) }));
});

const auth = (t) => ({ Authorization: `Bearer ${t}` });

describe('accounts', () => {
  test('register validates, then signs in', async () => {
    let r = await request(app).post('/api/auth/register').send({ email: 'bad', password: 'short', displayName: '' });
    expect(r.status).toBe(400);
    r = await request(app).post('/api/auth/register').send({ email: 'Ava@X.com', password: 'longenough', displayName: 'Ava' });
    expect(r.status).toBe(200);
    expect(r.body.token).toBeTruthy();
    expect(r.body.user).toMatchObject({ email: 'ava@x.com', displayName: 'Ava' });
    r = await request(app).post('/api/auth/register').send({ email: 'ava@x.com', password: 'longenough', displayName: 'Ava 2' });
    expect(r.status).toBe(400);
    r = await request(app).post('/api/auth/login').send({ email: 'ava@x.com', password: 'wrong' });
    expect(r.status).toBe(401);
    r = await request(app).post('/api/auth/login').send({ email: 'ava@x.com', password: 'longenough' });
    expect(r.status).toBe(200);
  });

  test('protected routes need a session', async () => {
    expect((await request(app).get('/api/today')).status).toBe(401);
    expect((await request(app).get('/api/today').set(auth('nope'))).status).toBe(401);
  });
});

describe('a full day through the API', () => {
  let token;
  beforeAll(async () => {
    token = (await request(app).post('/api/auth/register').send({ email: 'ben@x.com', password: 'longenough', displayName: 'Ben' })).body.token;
  });

  test('new player is asked for a profile first', async () => {
    const r = await request(app).get('/api/today').set(auth(token));
    expect(r.body).toEqual({ needsProfile: true });
  });

  test('profile saves and today\'s plan appears immediately', async () => {
    let r = await request(app).post('/api/profile').set(auth(token)).send({ location: 'Atlanta, GA', resources: ['vehicle', 'laptop', 'nonsense'], skills: ['writing'], goals: '$200 today', targetHours: 8, startHour: 8, tzOffset: -240 });
    expect(r.body.profile.resources).toEqual(['vehicle', 'laptop']);
    r = await request(app).get('/api/today').set(auth(token));
    expect(r.status).toBe(200);
    expect(r.body.date).toBe('2026-09-09');
    expect(r.body.plan.tasks.length).toBeGreaterThanOrEqual(3);
    expect(r.body.rank).toEqual({ rank: 1, of: 1, score: 0 });
    expect(r.body.canRegenerate).toBe(true);
    expect(r.body.crewOnline).toBe(false);
  });

  test('one rebuild per day, then it is locked', async () => {
    let r = await request(app).post('/api/today/regenerate').set(auth(token));
    expect(r.status).toBe(200);
    r = await request(app).post('/api/today/regenerate').set(auth(token));
    expect(r.status).toBe(429);
  });

  test('completing a play with earnings scores and ranks', async () => {
    const today = (await request(app).get('/api/today').set(auth(token))).body;
    const t = today.plan.tasks[0];
    let r = await request(app).post(`/api/tasks/${t.taskId}`).set(auth(token)).send({ status: 'done', earningsDollars: 62.5, note: '3 moves' });
    expect(r.status).toBe(200);
    expect(r.body.plan.progress).toMatchObject({ tasksDone: 1, earningsCents: 6250 });
    expect(r.body.plan.progress.score).toBeGreaterThan(100);
    expect((await request(app).post('/api/tasks/999999').set(auth(token)).send({ status: 'done' })).status).toBe(400);
    expect((await request(app).post('/api/today/regenerate').set(auth(token))).status).toBe(400);
    const lb = (await request(app).get('/api/leaderboard')).body;
    expect(lb.leaderboard[0]).toMatchObject({ displayName: 'Ben', location: 'Atlanta, GA', earningsVerified: false });
    expect((await request(app).get('/api/me').set(auth(token))).body.profile.location).toBe('Atlanta, GA');
  });

  test('closing the day writes the debrief, then edits are refused', async () => {
    let r = await request(app).post('/api/today/close').set(auth(token));
    expect(r.status).toBe(200);
    expect(r.body.streak).toBe(1);
    expect(r.body.debrief.summary).toMatch(/finished 1/);
    expect((await request(app).post('/api/today/close').set(auth(token))).status).toBe(400);
    const today = (await request(app).get('/api/today').set(auth(token))).body;
    expect(today.plan.status).toBe('closed');
    expect(today.canRegenerate).toBe(false);
    r = await request(app).post(`/api/tasks/${today.plan.tasks[1].taskId}`).set(auth(token)).send({ status: 'done' });
    expect(r.status).toBe(400);
    const hist = (await request(app).get('/api/history').set(auth(token))).body;
    expect(hist.history[0]).toMatchObject({ date: '2026-09-09', closed: true });
    expect(hist.stats.days).toBe(1);
    const inbox = (await request(app).get('/api/inbox').set(auth(token))).body.inbox;
    expect(inbox.map(i => i.kind)).toEqual(expect.arrayContaining(['plan', 'close']));
  });

  test('leaderboard rejects a malformed date and serves the shell', async () => {
    const r = await request(app).get('/api/leaderboard?date=nope');
    expect(r.body.date).toBe('2026-09-09');
    expect((await request(app).get('/')).status).toBe(200);
    expect((await request(app).get('/manifest.json')).status).toBe(200);
  });
});
