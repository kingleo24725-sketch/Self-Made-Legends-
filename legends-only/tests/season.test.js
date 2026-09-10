// Seasons and the Fan Club: monthly races, the ballot, vote packs, prizes, settle,
// fan accounts, follows, picks, fan points, Fan Club perks, fan callouts.
const request = require('supertest');
const { createApp } = require('../server');
const { open } = require('../src/db');
const Crew = require('../src/agents');
const Season = require('../src/season');
const Fans = require('../src/fans');

let app, clock, engine, season, fans, db, events;
beforeAll(() => {
  clock = Date.parse('2026-09-09T15:00:00Z');
  events = [];
  ({ app, engine, season, fans, db } = createApp({ db: open(':memory:'), now: () => clock, crew: new Crew({ apiKey: '' }), defaultTier: 'free', adminKey: 'owner', allowFreeClub: true, env: { FAN_PRIZE_PCT: '20' } }));
  for (const m of [engine, season, fans]) { const orig = m.onEvent; m.onEvent = (u, e, d) => { events.push({ to: u, event: e, data: d }); orig(u, e, d); }; }
});
const auth = (t) => ({ Authorization: `Bearer ${t}` });
const signup = async (email, name, extra = {}) => (await request(app).post('/api/auth/register').send({ email, password: 'longenough', displayName: name, acceptTerms: true, ...extra })).body;
const profile = (token, extra = {}) => request(app).post('/api/profile').set(auth(token)).send({ location: 'Atlanta, GA', resources: ['vehicle', 'laptop'], skills: ['writing'], targetHours: 8, startHour: 8, tzOffset: 0, ...extra });
const NOTE = 'Did it start to finish, met the client at their place, finished on time. Logged what it paid; if nothing is logged it paid nothing today.';
const today = (token) => request(app).get('/api/today').set(auth(token)).then(r => r.body);
const approve = async (token, taskId, earningsDollars = 0) => { await request(app).post(`/api/tasks/${taskId}`).set(auth(token)).send({ status: 'done', earningsDollars }); return (await request(app).post(`/api/tasks/${taskId}/approve`).set(auth(token)).send({ note: NOTE })).body; };

let ava, ben, cat, fanA, fanB;
describe('the month race and the ballot', () => {
  beforeAll(async () => {
    ava = await signup('ava@x.com', 'Ava'); ben = await signup('ben@x.com', 'Ben'); cat = await signup('cat@x.com', 'Cat');
    for (const u of [ava, ben, cat]) await profile(u.token);
    // Ava and Ben in a squad; Cat alone.
    const sq = (await request(app).post('/api/squads').set(auth(ava.token)).send({ name: 'Night Shift' })).body.squad;
    await request(app).post('/api/squads/join').set(auth(ben.token)).send({ code: sq.code });
    // Work, made deterministic: seeded plans vary, so each player also gets added 10/10 four-hour plays (10,000 base each).
    const extra = { [ava.user.id]: 5, [ben.user.id]: 2, [cat.user.id]: 0 };
    for (const [u, n] of [[ava, 3], [ben, 2], [cat, 1]]) {
      await today(u.token); // the crew builds the plan first
      for (let i = 0; i < extra[u.user.id]; i++) engine.addTask(u.user.id, '2026-09-09', { title: `Big job ${i + 1}`, icon: '🏗️', category: 'local', hours: 4, difficulty: 10, steps: ['Do it'], why: 'test', sources: [], estimatedEarnings: { low: 100, high: 200 } });
      const t = await today(u.token);
      const ids = [...t.plan.tasks.filter(x => /^Big job/.test(x.title)), ...t.plan.tasks.filter(x => !/^Big job/.test(x.title)).slice(0, n)].map(x => x.taskId);
      for (const id of ids) await approve(u.token, id, 20);
    }
  });

  test('race, crew race, ballot, and the season summary', async () => {
    const s = (await request(app).get('/api/season')).body;
    expect(s.month).toBe('2026-09');
    expect(s.race.map(r => r.name)).toEqual(['Ava', 'Ben', 'Cat']);
    expect(s.race[0].points).toBeGreaterThan(s.race[1].points);
    expect(s.crewRace[0]).toMatchObject({ name: 'Night Shift', size: 2 });
    expect(s.ballot.candidates.length).toBe(3);
    expect(s.ballot.open).toBe(true); // the 9th: open to everyone
    expect(s.prizes.legend.title).toMatch(/Chain/);
    expect(s.prizes.fans.fanPct).toBe(20);
    expect(s.presentedBy).toBeNull();
    expect(s.rules).toMatch(/no purchase necessary/);
    expect((await today(ava.token)).season).toMatchObject({ month: '2026-09', myRank: 1 });
  });

  test('votes need credits, packs credit without Stripe, self-votes and off-ballot votes are refused', async () => {
    let r = await request(app).post('/api/season/vote').set(auth(ben.token)).send({ userId: ava.user.id });
    expect(r.body.error).toMatch(/0 votes/);
    r = await request(app).post('/api/season/votes/buy').set(auth(ben.token)).send({ pack: 'v20' });
    expect(r.body).toMatchObject({ credited: 20, credits: 20, billing: false });
    expect(db.prepare("SELECT gross_cents, fee_cents FROM ledger WHERE kind = 'votes'").get()).toEqual({ gross_cents: 1000, fee_cents: 1000 });
    expect((await request(app).post('/api/season/votes/buy').set(auth(ben.token)).send({ pack: 'nope' })).status).toBe(400);
    expect((await request(app).post('/api/season/vote').set(auth(ben.token)).send({ userId: ben.user.id })).body.error).toMatch(/yourself/);
    r = await request(app).post('/api/season/vote').set(auth(ben.token)).send({ userId: ava.user.id, n: 7 });
    expect(r.body).toMatchObject({ n: 7, total: 7, credits: 13 });
    expect(events.find(e => e.event === 'season_vote').data).toMatchObject({ toId: ava.user.id, total: 7 });
    expect(engine.inbox(ava.user.id).some(i => i.kind === 'vote')).toBe(true);
    const b = (await request(app).get('/api/season').set(auth(ben.token))).body.ballot;
    expect(b.candidates[0]).toMatchObject({ name: 'Ava', votes: 7, mine: 7, voteRank: 1 });
    expect(b.credits).toBe(13);
    const stranger = await signup('far@x.com', 'Far'); // no daily_scores: not on the ballot
    season.grantCredits(ben.user.id, 0);
    expect((await request(app).post('/api/season/vote').set(auth(ben.token)).send({ userId: stranger.user.id })).body.error).toMatch(/top 50/);
  });

  test('the owner sets prizes and the webhook credits a pack idempotently', async () => {
    let r = await request(app).post('/api/admin/season/prizes').set('x-admin-key', 'owner').send({ month: '2026-09', kind: 'legend', title: 'The Chain and $500', cashDollars: 500 });
    expect(r.body.prize).toMatchObject({ title: 'The Chain and $500', cashCents: 50000 });
    r = await request(app).post('/api/admin/season/prizes').set('x-admin-key', 'owner').send({ month: '2026-09', kind: 'fans', fanPct: 25 });
    expect(r.body.prize.fanPct).toBe(25);
    expect((await request(app).post('/api/admin/season/prizes').set('x-admin-key', 'owner').send({ month: '2026-09', kind: 'dinner' })).status).toBe(400);
    const before = season.credits(cat.user.id);
    expect(season.creditPack(cat.user.id, 'v5', 'pi_test_1')).toMatchObject({ credited: 5 });
    expect(season.creditPack(cat.user.id, 'v5', 'pi_test_1')).toMatchObject({ credited: 0 });
    expect(season.credits(cat.user.id)).toBe(before + 5);
    const admin = (await request(app).get('/api/admin/season').set('x-admin-key', 'owner')).body;
    expect(admin.voteRevenueCents).toBe(1250);
    expect(admin.canSettle).toBe(false);
  });
});

describe('the Fan Club', () => {
  test('a fan walks in through the fan door: no profile, a fan home instead of a plan', async () => {
    fanA = await signup('fana@x.com', 'Fan Ana', { role: 'fan', city: 'Atlanta, GA' });
    expect(fanA.user.role).toBe('fan');
    const home = await today(fanA.token);
    expect(home.fan).toBe(true);
    expect(home.needsProfile).toBeUndefined();
    expect(home.board.length).toBe(3);
    expect(home.picksOpen).toBe(true); // 15:00 UTC
    expect(home.season.ballot.candidates.length).toBe(3);
    expect(home.club.member).toBe(false);
    expect(home.profile).toMatchObject({ fan: true, city: 'atlanta, ga', follows: 0 });
    expect((await request(app).get('/api/leaderboard')).body.leaderboard.some(x => x.userId === fanA.user.id)).toBe(false);
    const me = (await request(app).get('/api/me').set(auth(fanA.token))).body;
    expect(me.fan.fan).toBe(true);
    expect(me.user.role).toBe('fan');
  });

  test('follows, My Legends, and follower notifications', async () => {
    let r = await request(app).post('/api/fans/follow').set(auth(fanA.token)).send({ type: 'user', id: ava.user.id });
    expect(r.body.users[0]).toMatchObject({ name: 'Ava', today: { tasksDone: 8, rank: 1 } }); // 3 plays plus 5 added big jobs
    r = await request(app).post('/api/fans/follow').set(auth(fanA.token)).send({ type: 'squad', id: 1 });
    expect(r.body.squads[0].name).toBe('Night Shift');
    expect((await request(app).post('/api/fans/follow').set(auth(fanA.token)).send({ type: 'user', id: 'nobody' })).status).toBe(400);
    expect(engine.inbox(ava.user.id).some(i => i.kind === 'fan' && /following you/.test(i.title))).toBe(true);
    expect((await request(app).get('/api/me').set(auth(ava.token))).body.followers).toBe(1);
    // Ava takes down the Boss: her fan hears about it.
    const t = await today(ava.token);
    const boss = t.plan.tasks.find(x => x.boss && x.approval !== 'approved') || t.plan.tasks.find(x => x.approval !== 'approved');
    if (boss) { await approve(ava.token, boss.taskId, 50); }
    await request(app).post('/api/live').set(auth(ava.token)).send({ title: 'Recap' });
    expect(engine.inbox(fanA.user.id).some(i => i.kind === 'live')).toBe(true);
    const fol = (await request(app).get('/api/fans/following').set(auth(fanA.token))).body;
    expect(fol.users[0].live).toMatchObject({ title: 'Recap' });
    await request(app).delete('/api/live').set(auth(ava.token));
    r = await request(app).delete('/api/fans/follow/squad/1').set(auth(fanA.token));
    expect(r.body.squads).toEqual([]);
  });

  test('picks close at the cutoff, pay when the crown lands, and build the Top Fans board', async () => {
    fanB = await signup('fanb@x.com', 'Fan Bo', { role: 'fan' });
    expect((await request(app).post('/api/fans/pick').set(auth(fanA.token)).send({ userId: fanA.user.id })).status).toBe(400);
    let r = await request(app).post('/api/fans/pick').set(auth(fanA.token)).send({ userId: ava.user.id });
    expect(r.body.pick).toMatchObject({ name: 'Ava', settled: false });
    await request(app).post('/api/fans/pick').set(auth(fanB.token)).send({ userId: ben.user.id });
    const saved = clock; clock = Date.parse('2026-09-09T18:30:00Z');
    expect((await request(app).post('/api/fans/pick').set(auth(fanB.token)).send({ userId: cat.user.id })).body.error).toMatch(/close/);
    clock = saved;
    // Close the day and crown: Ava wins, Ben is on the podium.
    for (const u of [ava, ben, cat]) await engine.closeDay(u.user.id, '2026-09-09');
    engine.crownDay('2026-09-09');
    expect(fans.myPick(fanA.user.id, '2026-09-09')).toMatchObject({ settled: true, points: Fans.constants.PICK_WIN_POINTS });
    expect(fans.myPick(fanB.user.id, '2026-09-09')).toMatchObject({ settled: true, points: Fans.constants.PICK_PODIUM_POINTS });
    const top = (await request(app).get('/api/fans/top')).body.fans;
    expect(top[0]).toMatchObject({ name: 'Fan Ana', points: 1000, picks: 1 });
    expect(top[1]).toMatchObject({ name: 'Fan Bo', points: 300 });
    expect(engine.inbox(fanA.user.id).some(i => /You called it/.test(i.title))).toBe(true);
  });

  test('Fan Club: ten votes a month, early ballot, gold name in live chat, nightly recap', async () => {
    expect((await request(app).post('/api/fans/club').set(auth(ava.token))).status).toBe(400); // players have their own memberships
    let r = await request(app).post('/api/fans/club').set(auth(fanA.token));
    expect(r.body.club).toBe(true);
    expect(season.credits(fanA.user.id)).toBe(Season.constants.CLUB_VOTES_PER_MONTH);
    expect(engine.badges(fanA.user.id).some(b => b.badge === 'fan_club')).toBe(true);
    // Early ballot: on the 1st only members can vote.
    const saved = clock; clock = Date.parse('2026-10-01T12:00:00Z');
    // Open a day in October for Ava so she is on October's ballot.
    await today(ava.token); await approve(ava.token, (await today(ava.token)).plan.tasks[0].taskId, 10);
    expect(season.ballotOpen(fanB.user.id)).toBe(false);
    expect(season.ballotOpen(fanA.user.id)).toBe(true);
    season.grantCredits(fanB.user.id, 2);
    expect((await request(app).post('/api/season/vote').set(auth(fanB.token)).send({ userId: ava.user.id })).body.error).toMatch(/Fan Club members vote from day one/);
    r = await request(app).post('/api/season/vote').set(auth(fanA.token)).send({ userId: ava.user.id, n: 3 });
    expect(r.body).toMatchObject({ month: '2026-10', n: 3, credits: 7 });
    clock = saved;
    // Gold name in live chat.
    const room = (await request(app).post('/api/live').set(auth(ben.token)).send({ title: 'Ben live' })).body.room;
    await request(app).post(`/api/live/${room.id}/join`).set(auth(fanA.token));
    r = await request(app).post(`/api/live/${room.id}/chat`).set(auth(fanA.token)).send({ body: 'front row' });
    expect(r.body.message.club).toBe(true);
    expect((await request(app).get(`/api/live/${room.id}/chat`)).body.messages[0].club).toBe(true);
    await request(app).delete('/api/live').set(auth(ben.token));
    // Nightly recap for members who follow someone, once a day, after 21:00 UTC.
    expect(fans.nightlyRecap('2026-09-09')).toBe(0);
    clock = Date.parse('2026-09-09T21:30:00Z');
    expect(fans.nightlyRecap('2026-09-09')).toBe(1);
    expect(fans.nightlyRecap('2026-09-09')).toBe(0);
    expect(engine.inbox(fanA.user.id).find(i => i.kind === 'recap').body).toMatch(/Ava/);
    clock = saved;
  });

  test('a fan calls out one Legend to take another, three a day', async () => {
    let r = await request(app).post('/api/fans/callout').set(auth(fanB.token)).send({ legendId: cat.user.id, targetId: ben.user.id });
    expect(r.body.callout.line).toBe('Fan Bo says: go get Ben.');
    expect(engine.inbox(cat.user.id).some(i => i.kind === 'callout' && /take Ben/.test(i.title))).toBe(true);
    expect((await request(app).get('/api/feed')).body.feed.some(f => /Fan Bo wants Cat to take Ben/.test(f.text))).toBe(true);
    expect((await request(app).post('/api/fans/callout').set(auth(fanB.token)).send({ legendId: cat.user.id, targetId: cat.user.id })).status).toBe(400);
    expect((await request(app).post('/api/fans/callout').set(auth(fanB.token)).send({ legendId: fanA.user.id, targetId: ben.user.id })).status).toBe(400);
    await request(app).post('/api/fans/callout').set(auth(fanB.token)).send({ legendId: cat.user.id, targetId: ava.user.id });
    await request(app).post('/api/fans/callout').set(auth(fanB.token)).send({ legendId: ben.user.id, targetId: ava.user.id });
    expect((await request(app).post('/api/fans/callout').set(auth(fanB.token)).send({ legendId: ben.user.id, targetId: cat.user.id })).body.error).toMatch(/3 callouts/);
    const home = await today(fanB.token);
    expect(home.callouts.length).toBe(3);
    // Cat accepts the fan's callout: head-to-head with Ben tomorrow.
    const c = (await today(cat.token)).callouts.find(x => !x.mine);
    expect(c).toMatchObject({ fan: true, fromName: 'Fan Bo', toName: 'Ben' });
    r = await request(app).post(`/api/callouts/${c.id}/accept`).set(auth(cat.token));
    expect(r.body.challenge).toMatchObject({ status: 'accepted', date: '2026-09-10' });
    expect(engine.inbox(fanB.user.id).some(i => /Your callout landed/.test(i.title))).toBe(true);
    expect((await request(app).post(`/api/callouts/${c.id}/accept`).set(auth(ben.token))).status).toBe(400);
  });
});

describe('settling the month', () => {
  test('nothing settles while the month is open; after it closes the crowns, chain, jacket, Hall of Fame for life, and cash land', async () => {
    expect((await request(app).post('/api/admin/season/2026-09/settle').set('x-admin-key', 'owner')).body.error).toMatch(/still open/);
    // October 2nd: September is over and every September day is closed.
    clock = Date.parse('2026-10-02T09:00:00Z');
    for (const p of db.prepare("SELECT user_id, date FROM plans WHERE status = 'open' AND date < '2026-10-01'").all()) await engine.closeDay(p.user_id, p.date);
    expect(season.canSettle('2026-09')).toBe(true);
    events.length = 0;
    await engine.tick(); // the scheduler settles it
    const w = season.winners('2026-09');
    expect(w.legend).toMatchObject({ name: 'Ava', jacketNumber: 1, cashCents: 50000 });
    expect(w.fans).toMatchObject({ name: 'Ava', votes: 7 });
    expect(w.fans.cashCents).toBe(Math.round(1250 * 25 / 100)); // fan-funded check at 25% of vote revenue
    expect(w.crew).toMatchObject({ squadName: 'Night Shift' });
    expect(w.fan).toMatchObject({ name: 'Fan Ana' });
    const ava2 = (await request(app).get('/api/me').set(auth(ava.token))).body;
    expect(ava2.tier).toBe('hof');
    expect(ava2.frame).toBe('gold');
    expect(ava2.payoutBalanceCents).toBe(50000 + Math.round(1250 * 25 / 100));
    expect(ava2.badges.map(b => b.badge)).toEqual(expect.arrayContaining(['legend_of_month', 'peoples_champion', 'crew_of_month']));
    expect(engine.badges(ben.user.id).some(b => b.badge === 'crew_of_month')).toBe(true);
    expect(engine.badges(fanA.user.id).some(b => b.badge === 'fan_of_month')).toBe(true);
    // Hall of Fame for life survives a cancelled subscription.
    engine.setTier(ava.user.id, 'free');
    expect(engine.tierOf(ava.user.id)).toBe('hof');
    // Fan Ana backed the champion with 0 votes in September (her votes were October), Ben backed Ava with 7 early votes but he is a player: points still recorded for him as a voter.
    expect(fans.fanPoints(ben.user.id, '2026-09')).toBe(7 * 2 * Fans.constants.VOTE_POINTS);
    expect(db.prepare("SELECT COUNT(*) AS c FROM ledger WHERE kind = 'prize'").get().c).toBe(2);
    expect((await request(app).get('/api/stories/latest')).body.stories[0].title).toMatch(/Ava: Legend of the Month/);
    expect((await request(app).get('/api/feed')).body.feed.filter(f => f.kind === 'season').length).toBeGreaterThanOrEqual(3);
    expect(events.some(e => e.event === 'season')).toBe(true);
    // Presented by: October's landing shows September's winners; the wall has jacket #001.
    const s = (await request(app).get('/api/season')).body;
    expect(s.presentedBy.legend.name).toBe('Ava');
    expect((await request(app).get('/hall-of-fame')).text).toContain('jacket #001');
    expect((await request(app).get('/api/season/wall')).body.legends[0].jacketNumber).toBe(1);
    // Settling twice is a no-op.
    expect(season.settle('2026-09').legend.jacketNumber).toBe(1);
  });
});
