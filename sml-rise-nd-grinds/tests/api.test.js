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
  ({ app, engine, handleBillingEvent } = createApp({ db: open(':memory:'), now: () => clock, crew: new Crew({ apiKey: '' }), defaultTier: 'hof' }));
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
    expect(r.body).toMatchObject({ canRegenerate: true, canChat: true, canVerify: true, crewOnline: false, tier: 'hof' });
    expect(r.body.tierInfo.name).toBe('Self-Made Legends Hall of Fame');
    expect(r.body.crewLog.length).toBe(2);
    expect(r.body.goal).toMatchObject({ title: 'New laptop', targetCents: 90000 });
    const me = (await request(app).get('/api/me').set(auth(token))).body;
    expect(me.features).toMatchObject({ liveCrew: true, chat: true, receipts: true, localBoards: true, video: true, live: true, hallOfFame: true });
    expect(r.body.gigs.length).toBeGreaterThan(3);
    expect(r.body.gigs.every(g => /^https?:\/\//.test(g.url) && g.points > 0)).toBe(true);
    expect(r.body.bot.iq).toBeGreaterThanOrEqual(100);
    expect(me.inviteUrl).toMatch(/\?invite=[A-Z0-9]{6}$/);
  });

  test('Hall of Fame gets three rebuilds a day, then it is locked', async () => {
    for (let i = 0; i < 3; i++) expect((await request(app).post('/api/today/regenerate').set(auth(token))).status).toBe(200);
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
    expect(r.body.plan.progress).toMatchObject({ tasksDone: 0, awaitingApproval: 1, score: 0, loggedCents: 6250 });
    r = await request(app).post(`/api/tasks/${t.taskId}/approve`).set(auth(token)).send({ note: 'short' });
    expect(r.body.approved).toBe(false);
    expect(r.body.reason).toMatch(/Tell your bot/);
    r = await request(app).post(`/api/tasks/${t.taskId}/approve`).set(auth(token)).send({ note: 'Three moves across town for a family on Peach St, done by 2pm, paid cash.' });
    expect(r.body.approved).toBe(true);
    expect(r.body.plan.progress).toMatchObject({ tasksDone: 1, earningsCents: 6250, verifiedCents: 0 });
    expect(r.body.plan.tasks[0]).toMatchObject({ approval: 'approved', graded: true });
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
    expect((await request(app).post('/api/live').set(auth(token)).send({ title: 'x' })).status).toBe(402);
    engine.setTier(ben.user.id, 'hof'); engine.defaultTier = 'hof';
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
    const bill = (await request(app).get('/api/billing').set(auth(token))).body;
    expect(bill).toMatchObject({ enabled: false, tier: 'hof' });
    expect(bill.tierPrices.hof).toBe(1499);
    expect(bill.myFees).toEqual({ tipPct: 5, successPct: 0 });
    handleBillingEvent({ type: 'checkout.session.completed', data: { object: { client_reference_id: ben.user.id, customer: 'cus_1', metadata: { tier: 'pro' } } } });
    expect(engine.tierOf(ben.user.id)).toBe('pro');
    handleBillingEvent({ type: 'customer.subscription.deleted', data: { object: { customer: 'cus_1' } } });
    expect(engine.tierOf(ben.user.id)).toBe('hof'); // free rows fall back to the default tier while billing is off
    engine.setTier(ben.user.id, 'hof');
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
    for (const p of ['/', '/manifest.json', '/terms', '/privacy', '/sw.js', '/logo.svg', '/hall-of-fame', '/api/hall-of-fame']) expect((await request(app).get(p)).status).toBe(200);
  });
});

describe('the public side and the money side', () => {
  let ava, fanless;
  beforeAll(async () => {
    ava = await signup('ava2@x.com', 'Ava Stone');
    await request(app).post('/api/profile').set(auth(ava.token)).send({ location: 'Atlanta, GA', resources: ['beauty'], tzOffset: 0, gender: 'woman', safetyContact: 'Mom 555' });
    const today = (await request(app).get('/api/today').set(auth(ava.token))).body;
    await request(app).post(`/api/tasks/${today.plan.tasks[0].taskId}`).set(auth(ava.token)).send({ status: 'done', earningsDollars: 80 });
    await request(app).post(`/api/tasks/${today.plan.tasks[0].taskId}/approve`).set(auth(ava.token)).send({ note: 'Two full sets at my place this morning, both clients rebooked, paid by Cash App.' });
  });

  test('the Grind Feed, Legend page, card, and tip all work without a session', async () => {
    const feed = (await request(app).get('/api/feed')).body.feed;
    expect(feed[0].text).toMatch(/^Ava in Atlanta, GA just finished/);
    const prof = (await request(app).get('/api/u/ava%20stone')).body.profile;
    expect(prof).toMatchObject({ displayName: 'Ava Stone', city: 'Atlanta, GA' });
    expect((await request(app).get('/u/Ava%20Stone')).text).toContain('Tip the grind');
    expect((await request(app).get('/u/Nobody')).status).toBe(404);
    const card = (await request(app).get(`/api/cards/${ava.user.id}/2026-09-09`)).body;
    expect(card.card.tasksDone).toBe(1);
    const svg = await request(app).get(`/api/cards/${ava.user.id}/2026-09-09.svg`);
    expect(svg.headers['content-type']).toMatch(/svg/);
    expect((await request(app).get(`/card/${ava.user.id}/2026-09-09`)).text).toContain('og:image');
    let r = await request(app).post('/api/tips/Ava%20Stone').send({ amountCents: 500, fromName: 'Fan', message: 'go' });
    expect(r.body).toMatchObject({ fee: 25, net: 475, billing: false }); // Hall of Fame keeps 95% of tips
    expect((await request(app).post('/api/tips/Ava%20Stone').send({ amountCents: 10 })).status).toBe(400);
    const me = (await request(app).get('/api/me').set(auth(ava.token))).body;
    expect(me.payoutBalanceCents).toBe(475);
    expect(me.stats.tipsCount).toBe(1);
    expect((await request(app).get('/api/payouts').set(auth(ava.token))).body.balanceCents).toBe(475);
    expect((await request(app).post('/api/payouts/request').set(auth(ava.token))).status).toBe(400);
  });

  test('going private removes the Legend page and the feed', async () => {
    await request(app).post('/api/me/settings').set(auth(ava.token)).send({ publicProfile: false });
    expect((await request(app).get('/api/u/Ava%20Stone')).status).toBe(404);
    expect((await request(app).post('/api/tips/Ava%20Stone').send({ amountCents: 500 })).status).toBe(404);
    await request(app).post('/api/me/settings').set(auth(ava.token)).send({ publicProfile: true });
  });

  test('University, safety, bracket, cities, challenge days, prize, shows, stories endpoints', async () => {
    const today = (await request(app).get('/api/today').set(auth(ava.token))).body;
    expect(today.lesson.answered).toBe(false);
    expect(today.bracket).toBeTruthy();
    let r = await request(app).post('/api/lesson/answer').set(auth(ava.token)).send({ lessonId: today.lesson.id, answer: 99 });
    expect(r.body.correct).toBe(false);
    r = await request(app).post('/api/safety/start').set(auth(ava.token)).send({ taskId: today.plan.tasks[1].taskId, place: '5th St', eta: '4pm' });
    const token = r.body.session.token;
    expect((await request(app).get(`/safe/${token}`)).text).toContain('On the way');
    expect((await request(app).get(`/api/safety/${token}`)).body.session.contact).toBeUndefined();
    expect((await request(app).post(`/api/safety/${token}`).set(auth(ava.token)).send({ status: 'done' })).body.session.status).toBe('done');
    expect((await request(app).get('/api/today').set(auth(ava.token))).body.safety).toBeNull();
    r = await request(app).post('/api/bracket/enter').set(auth(ava.token));
    expect(r.body.bracket.entries.some(e => e.userId === ava.user.id)).toBe(true);
    expect((await request(app).get('/api/bracket')).status).toBe(200);
    expect((await request(app).get('/api/cities')).body.weekStart).toBe('2026-09-07');
    expect((await request(app).get('/api/challenge-days')).body.challenges).toEqual([]);
    expect((await request(app).get('/api/prize')).body.prize).toBeNull();
    expect((await request(app).get('/api/shows')).body.shows).toEqual([]);
    expect((await request(app).get('/api/stories/latest')).body.stories).toEqual([]);
    expect((await request(app).get('/challenge/nope')).status).toBe(404);
    expect((await request(app).get('/show/2026-09-06')).status).toBe(404);
    expect((await request(app).get('/story/1')).status).toBe(404);
    const lb = (await request(app).get('/api/leaderboard?scope=women&category=beauty')).body;
    expect(lb.scope).toBe('women');
    expect(lb.leaderboard.some(x => x.displayName === 'Ava Stone')).toBe(true);
  });

  test('mentors need a record; asking and answering routes the fee', async () => {
    expect((await request(app).post('/api/mentors').set(auth(ava.token)).send({ topics: ['nails'] })).status).toBe(400);
    for (let i = 0; i < 7; i++) engine.db.prepare("INSERT OR IGNORE INTO daily_scores (user_id, date, score, tasks_done, closed, updated_at) VALUES (?, ?, 100, 1, 1, 0)").run(ava.user.id, `2026-08-0${i + 1}`);
    let r = await request(app).post('/api/mentors').set(auth(ava.token)).send({ topics: ['nails'], priceDollars: 8, bio: 'Ask me' });
    expect(r.body.mentor.priceCents).toBe(800);
    expect((await request(app).get('/api/mentors')).body.mentors[0].name).toBe('Ava Stone');
    const ben = (await request(app).post('/api/auth/login').send({ email: 'ben@x.com', password: 'longenough' })).body;
    r = await request(app).post(`/api/mentors/${ava.user.id}/ask`).set(auth(ben.token)).send({ question: 'How do I price a full set of nails?' });
    expect(r.body.question.status).toBe('open');
    r = await request(app).post(`/api/mentors/questions/${r.body.question.id}/answer`).set(auth(ava.token)).send({ answer: 'Start at $45 and raise it when you are booked out a week.' });
    expect(r.body.question.status).toBe('answered');
    expect((await request(app).get('/api/me').set(auth(ava.token))).body.payoutBalanceCents).toBe(475 + 640);
    await request(app).delete('/api/mentors').set(auth(ava.token));
  });

  test('the owner console is locked without the key and works with it', async () => {
    expect((await request(app).get('/api/admin/revenue')).status).toBe(401);
    const { createApp: mk } = require('../server');
    const adminApp = mk({ db: open(':memory:'), now: () => clock, crew: new Crew({ apiKey: '' }), defaultTier: 'allstar', adminKey: 'k1', env: {}, defaultTier: 'hof' }).app;
    const h = { 'x-admin-key': 'k1' };
    expect((await request(adminApp).get('/api/admin/revenue').set(h)).body.players).toBe(0);
    let r = await request(adminApp).post('/api/admin/fees').set(h).send({ TIP_FEE_PCT: 20 });
    expect(r.body.fees.TIP_FEE_PCT).toBe(20);
    r = await request(adminApp).post('/api/admin/challenge-days').set(h).send({ name: 'Big Star', date: '2026-09-09', targetScore: 400, targetDollars: 900 });
    expect(r.body.challenge.slug).toBe('big-star');
    expect((await request(adminApp).get('/challenge/big-star')).text).toContain('Beat Big Star');
    r = await request(adminApp).post('/api/admin/prize-pools').set(h).send({ month: '2026-09', sponsor: 'Brand', amountDollars: 500 });
    expect(r.body.prize.amountCents).toBe(45000);
    expect((await request(adminApp).get('/api/prize')).body.prize.sponsor).toBe('Brand');
    r = await request(adminApp).post('/api/admin/ideas/run').set(h).send({});
    expect(r.body.ideas.length).toBeGreaterThan(0);
    expect((await request(adminApp).get('/api/admin/revenue').set(h)).body.months[0].platformCents).toBe(5000);
    expect((await request(adminApp).get('/admin.html')).status).toBe(200);
  });
});
