// The growth round: fraud defenses (phone, one account per device, trust),
// ops alarms and money reconciliation, squads and crew calls, bot vs bot,
// sponsor tiles, employers posting shifts into the Gig Finder, verified
// track records, city reports, clips, and day-one onboarding.
const path = require('path');
const os = require('os');
const fs = require('fs');
const request = require('supertest');
const { createApp } = require('../server');
const { open } = require('../src/db');
const Crew = require('../src/agents');

let app, clock, engine, trust, ops, squads, market, clips, db, sms;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sml-clips-'));
beforeAll(() => {
  clock = Date.parse('2026-09-09T15:00:00Z');
  sms = [];
  ({ app, engine, trust, ops, squads, market, clips, db } = createApp({ db: open(':memory:'), now: () => clock, crew: new Crew({ apiKey: '' }), defaultTier: 'free', adminKey: 'owner', sms: async (to, text) => sms.push({ to, text }), clipsDir: tmp, env: { ALERT_WEBHOOK_URL: 'https://hooks.example/alerts' } }));
  ops.post = async (url, payload) => posted.push({ url, payload });
});
afterAll(() => { try { fs.rmSync(tmp, { recursive: true }); } catch (_) {} });
const posted = [];

const auth = (t) => ({ Authorization: `Bearer ${t}` });
const signup = async (email, name, extra = {}) => (await request(app).post('/api/auth/register').send({ email, password: 'longenough', displayName: name, acceptTerms: true, ...extra })).body;
const profile = (token, extra = {}) => request(app).post('/api/profile').set(auth(token)).send({ location: 'Atlanta, GA', resources: ['vehicle', 'laptop'], skills: ['writing'], targetHours: 8, startHour: 8, tzOffset: 0, ...extra });
const NOTE = 'Did it start to finish, met the client at their place, finished on time. Logged what it paid; if nothing is logged it paid nothing today.';

describe('fraud defenses', () => {
  let ava, ben;
  beforeAll(async () => { ava = await signup('ava@x.com', 'Ava', { deviceId: 'phone-A' }); ben = await signup('ben@x.com', 'Ben', { deviceId: 'phone-B' }); await profile(ava.token); await profile(ben.token); });

  test('one account per device: a second registration on the same phone is refused, sign-in is fine', async () => {
    const r = await request(app).post('/api/auth/register').send({ email: 'dupe@x.com', password: 'longenough', displayName: 'Dupe', acceptTerms: true, deviceId: 'phone-A' });
    expect(r.status).toBe(409);
    expect(r.body.error).toMatch(/already has/);
    expect((await request(app).post('/api/auth/login').send({ email: 'ava@x.com', password: 'longenough', deviceId: 'phone-A' })).status).toBe(200);
    expect((await request(app).get('/api/trust').set(auth(ava.token))).body.devices).toBe(1);
  });

  test('phone verification: code goes out, wrong code counts, right code verifies and lifts trust', async () => {
    let t = (await request(app).get('/api/trust').set(auth(ava.token))).body;
    expect(t.phoneVerified).toBe(false);
    expect(t.proof.level).toBe('strict');
    expect((await request(app).post('/api/phone/send').set(auth(ava.token)).send({ phone: 'nope' })).status).toBe(400);
    let r = await request(app).post('/api/phone/send').set(auth(ava.token)).send({ phone: '(404) 555-0100' });
    expect(r.body).toMatchObject({ sent: true, phone: '+14045550100', provider: 'test' });
    const code = sms[0].text.match(/\d{6}/)[0];
    expect((await request(app).post('/api/phone/verify').set(auth(ava.token)).send({ code: '000000' })).status).toBe(400);
    r = await request(app).post('/api/phone/verify').set(auth(ava.token)).send({ code });
    expect(r.body).toEqual({ verified: true, phone: '+14045550100' });
    t = (await request(app).get('/api/trust').set(auth(ava.token))).body;
    expect(t.phoneVerified).toBe(true);
    expect(t.trust).toBeGreaterThanOrEqual(30);
    expect(t.proof.level).toBe('normal');
    // the same number cannot verify a second account
    await request(app).post('/api/phone/send').set(auth(ben.token)).send({ phone: '+14045550100' }).expect(400);
  });

  test('a low-trust account needs a receipt or photo for a big claim; a small one goes through on a note', async () => {
    const today = (await request(app).get('/api/today').set(auth(ben.token))).body;
    expect(today.plan.firstDay).toBe(true);
    const [t1, t2] = today.plan.tasks;
    await request(app).post(`/api/tasks/${t1.taskId}`).set(auth(ben.token)).send({ status: 'done', earningsDollars: 900 });
    let r = await request(app).post(`/api/tasks/${t1.taskId}/approve`).set(auth(ben.token)).send({ note: NOTE });
    expect(r.body.approved).toBe(false);
    expect(r.body.reason).toMatch(/trust score/);
    await request(app).post(`/api/tasks/${t2.taskId}`).set(auth(ben.token)).send({ status: 'done', earningsDollars: 60 });
    r = await request(app).post(`/api/tasks/${t2.taskId}/approve`).set(auth(ben.token)).send({ note: 'ok' });
    expect(r.body.approved).toBe(false);
    expect(r.body.reason).toMatch(/Tell your bot more/);
    r = await request(app).post(`/api/tasks/${t2.taskId}/approve`).set(auth(ben.token)).send({ note: NOTE });
    expect(r.body.approved).toBe(true);
    const me = (await request(app).get('/api/me').set(auth(ben.token))).body;
    expect(me.badges.map(b => b.badge)).toContain('first_approved');
    expect(me.trust).toBeGreaterThan(0);
  });

  test('a banned account is locked out everywhere', async () => {
    const mal = await signup('mal@x.com', 'Mal');
    await request(app).post('/api/admin/ban/' + mal.user.id).set('x-admin-key', 'owner').send({ reason: 'fake receipts' });
    expect((await request(app).get('/api/today').set(auth(mal.token))).status).toBe(401); // sessions were revoked
    expect((await request(app).post('/api/auth/login').send({ email: 'mal@x.com', password: 'longenough' })).status).toBe(403);
    expect(ops.alerts().some(a => a.kind === 'ban')).toBe(true);
  });
});

describe('ops alarms and reconciliation', () => {
  test('health reports, alerts dedupe, webhook fires, resolve clears', async () => {
    const h = ops.health();
    expect(h).toMatchObject({ activePlayers: expect.any(Number), crewOnline: false, stripe: false });
    expect((await request(app).get('/api/health')).body.ok).toBe(h.ok);
    const id = await ops.alert('test-kind', 'Something is off', { severity: 'error' });
    expect(id).toBeTruthy();
    expect(await ops.alert('test-kind', 'Something is off again')).toBeNull(); // deduped
    expect(posted.length).toBe(1);
    expect(posted[0].payload.text).toMatch(/\[error\] test-kind/);
    ops.resolve(id);
    expect(ops.alerts().find(a => a.id === id).resolved).toBe(true);
    const admin = (await request(app).get('/api/admin/health').set('x-admin-key', 'owner')).body;
    expect(admin.health.ok).toBeDefined();
    expect(admin.alerts.length).toBeGreaterThan(0);
  });

  test('reconciliation without Stripe checks the ledger against payout balances, and the scheduler runs it once a day', async () => {
    const r = await ops.reconcile('2026-09-08');
    expect(r.ok).toBe(true);
    expect(r.stripeCents).toBeNull();
    // Break the books on purpose: a balance nobody paid in for.
    db.prepare("UPDATE users SET payout_balance_cents = payout_balance_cents + 1234 WHERE email = 'ava@x.com'").run();
    const bad = await ops.reconcile('2026-09-08');
    expect(bad.ok).toBe(false);
    expect(bad.diffCents).toBe(-1234);
    expect(ops.alerts().some(a => a.kind === 'reconcile' && !a.resolved)).toBe(true);
    db.prepare("UPDATE users SET payout_balance_cents = payout_balance_cents - 1234 WHERE email = 'ava@x.com'").run();
    await engine.tick();
    expect(db.prepare("SELECT value FROM settings WHERE key = 'ops.lastReconcile'").get().value).toBe('2026-09-08');
    expect(db.prepare("SELECT value FROM settings WHERE key = 'ops.lastTick'").get()).toBeTruthy();
    const before = ops.reconciliations().length;
    await engine.tick();
    expect(ops.reconciliations().length).toBe(before); // once a day
  });
});

describe('squads, crew calls, bot vs bot', () => {
  let cap, mate, fan;
  beforeAll(async () => {
    cap = await signup('cap@x.com', 'Cap'); mate = await signup('mate@x.com', 'Mate'); fan = await signup('fan@x.com', 'Fan');
    for (const u of [cap, mate, fan]) await profile(u.token);
  });

  test('create, join by code, board, leave hands the captaincy over', async () => {
    let r = await request(app).post('/api/squads').set(auth(cap.token)).send({ name: 'Night Shift' });
    expect(r.body.squad).toMatchObject({ name: 'Night Shift', captainId: cap.user.id });
    const code = r.body.squad.code;
    expect((await request(app).post('/api/squads').set(auth(cap.token)).send({ name: 'Another' })).status).toBe(400);
    r = await request(app).post('/api/squads/join').set(auth(mate.token)).send({ code: code.toLowerCase() });
    expect(r.body.squad.members.map(m => m.name).sort()).toEqual(['Cap', 'Mate']);
    expect((await request(app).post('/api/squads/join').set(auth(fan.token)).send({ code: 'ZZZZZZ' })).status).toBe(400);
    const s = (await request(app).get('/api/squads').set(auth(cap.token))).body;
    expect(s.mine.name).toBe('Night Shift');
    expect(s.board[0]).toMatchObject({ rank: 1, name: 'Night Shift', size: 2 });
    expect((await request(app).get('/api/squads/board')).body.board.length).toBe(1);
    await request(app).delete('/api/squads').set(auth(cap.token));
    expect(squads.mine(mate.user.id).captainId).toBe(mate.user.id);
    await request(app).post('/api/squads/join').set(auth(cap.token)).send({ code });
  });

  test('crew call: open a room, squad-mates get signaling, outsiders do not', async () => {
    const events = [];
    const orig = squads.onEvent; squads.onEvent = (u, e, d) => { events.push({ to: u, event: e, data: d }); orig(u, e, d); };
    let r = await request(app).post('/api/squads/room').set(auth(cap.token));
    expect(r.body.roomId).toBeTruthy();
    expect(r.body.iceServers.length).toBeGreaterThan(0);
    const roomId = r.body.roomId;
    r = await request(app).post(`/api/squads/room/${roomId}/signal`).set(auth(cap.token)).send({ to: mate.user.id, type: 'offer', payload: { sdp: 'x' } });
    expect(r.body).toEqual({ ok: true });
    expect((await request(app).post(`/api/squads/room/${roomId}/signal`).set(auth(cap.token)).send({ to: fan.user.id, type: 'offer' })).status).toBe(400);
    expect((await request(app).post('/api/squads/room').set(auth(fan.token))).status).toBe(400);
    squads.onEvent = orig;
    expect(events.find(e => e.event === 'crew_signal')).toMatchObject({ to: mate.user.id, data: { roomId, type: 'offer', fromId: cap.user.id } });
    expect(engine.inbox(mate.user.id).some(i => i.kind === 'crew_call')).toBe(true);
    await request(app).post(`/api/squads/room/${roomId}/leave`).set(auth(cap.token));
    expect(db.prepare('SELECT status FROM live_rooms WHERE id = ?').get(roomId).status).toBe('ended');
  });

  test('bot vs bot: challenge by name, crowd votes, the close settles it by score', async () => {
    await request(app).get('/api/today').set(auth(cap.token)); // both bots have built a plan
    let r = await request(app).post('/api/bot-duels').set(auth(cap.token)).send({ opponent: 'Mate' });
    expect(r.body.duel).toMatchObject({ status: 'open', a: { name: 'Cap' }, b: { name: 'Mate' } });
    const id = r.body.duel.id;
    expect((await request(app).post('/api/bot-duels').set(auth(cap.token)).send({ opponent: 'Nobody' })).status).toBe(404);
    expect((await request(app).post(`/api/bot-duels/${id}/vote`).set(auth(cap.token)).send({ pick: 'a' })).status).toBe(400); // in it
    r = await request(app).post(`/api/bot-duels/${id}/vote`).set(auth(fan.token)).send({ pick: 'b' });
    expect(r.body.duel.b.votes).toBe(1);
    expect((await request(app).get('/api/bot-duels')).body.duels[0].a.plan.tasks.length).toBeGreaterThan(0);
    // Mate works, Cap does not; close both days and settle.
    const mt = (await request(app).get('/api/today').set(auth(mate.token))).body.plan.tasks[0];
    await request(app).post(`/api/tasks/${mt.taskId}`).set(auth(mate.token)).send({ status: 'done', earningsDollars: 40 });
    await request(app).post(`/api/tasks/${mt.taskId}/approve`).set(auth(mate.token)).send({ note: NOTE });
    await request(app).post('/api/today/close').set(auth(mate.token));
    await request(app).post('/api/today/close').set(auth(cap.token));
    squads.settle('2026-09-09');
    const d = squads.duel(id);
    expect(d.status).toBe('settled');
    expect(d.winnerId).toBe(mate.user.id);
    expect(engine.badges(mate.user.id).some(b => b.badge === 'bot_vs_bot')).toBe(true);
  });
});

describe('marketplace: sponsors, employers, résumés, city report', () => {
  let boss, worker;
  beforeAll(async () => {
    boss = await signup('boss@x.com', 'Boss'); worker = await signup('worker@x.com', 'Worker');
    await profile(boss.token, { location: 'Atlanta, GA' }); await profile(worker.token, { location: 'atlanta, ga', gender: 'woman' });
    clock += 86_400_000; // 2026-09-10, fresh days
  });

  test('sponsor tiles show up in the right city only, record revenue, and count clicks', async () => {
    let r = await request(app).post('/api/admin/sponsor-tiles').set('x-admin-key', 'owner').send({ sponsor: 'Peach Auto', city: 'Atlanta, GA', title: 'Free detail supplies this week', url: 'https://peachauto.example/', starts: '2026-09-01', ends: '2026-09-30', amountDollars: 250 });
    expect(r.body.tile).toMatchObject({ sponsor: 'Peach Auto', amountCents: 25000 });
    expect((await request(app).post('/api/admin/sponsor-tiles').set('x-admin-key', 'owner').send({ sponsor: 'X', city: 'Y', title: 'Z', url: 'nope', starts: '2026-09-01', ends: '2026-09-30' })).status).toBe(400);
    const today = (await request(app).get('/api/today').set(auth(worker.token))).body;
    expect(today.sponsors.map(t => t.sponsor)).toEqual(['Peach Auto']);
    const other = await signup('far@x.com', 'Far'); await profile(other.token, { location: 'Denver, CO' });
    expect((await request(app).get('/api/today').set(auth(other.token))).body.sponsors).toEqual([]);
    const click = await request(app).get(`/api/sponsor/${r.body.tile.id}/click`);
    expect(click.status).toBe(302);
    expect(click.headers.location).toBe('https://peachauto.example/');
    expect(market.tile(r.body.tile.id).clicks).toBe(1);
    expect(db.prepare("SELECT fee_cents FROM ledger WHERE kind = 'sponsor_tile'").get().fee_cents).toBe(25000);
  });

  test('an employer posts a shift, it lands in the Gig Finder, a player claims it, the employer confirms, the bot approves, everyone gets paid', async () => {
    expect((await request(app).post('/api/employer/postings').set(auth(boss.token)).send({ title: 'Load trucks' })).status).toBe(400);
    let r = await request(app).post('/api/employer').set(auth(boss.token)).send({ org: 'Peach Movers', contact: 'boss@x.com', city: 'Atlanta, GA' });
    expect(r.body.employer).toMatchObject({ org: 'Peach Movers', verified: false });
    expect((await request(app).post('/api/employer/postings').set(auth(boss.token)).send({ title: 'Load trucks', date: '2026-09-10', payDollars: 5 })).status).toBe(400);
    r = await request(app).post('/api/employer/postings').set(auth(boss.token)).send({ title: 'Load trucks', body: 'Two hours at the warehouse.', date: '2026-09-10', hours: 2, payDollars: 60, slots: 1, difficulty: 6 });
    const posting = r.body.posting;
    expect(posting).toMatchObject({ org: 'Peach Movers', payCents: 6000, feeCents: 600, points: engine.taskPoints(6, 2), status: 'open' });
    expect(db.prepare("SELECT fee_cents FROM ledger WHERE kind = 'posting'").get().fee_cents).toBe(500);
    // The worker sees it on Today and claims it.
    let today = (await request(app).get('/api/today').set(auth(worker.token))).body;
    expect(today.postings.map(p => p.id)).toContain(posting.id);
    expect((await request(app).post(`/api/postings/${posting.id}/claim`).set(auth(boss.token))).status).toBe(400); // own posting
    r = await request(app).post(`/api/postings/${posting.id}/claim`).set(auth(worker.token));
    expect(r.body.task.title).toBe('Peach Movers: Load trucks');
    expect(r.body.posting.status).toBe('filled');
    expect((await request(app).post(`/api/postings/${posting.id}/claim`).set(auth(worker.token))).status).toBe(400);
    expect(engine.inbox(boss.user.id).some(i => i.kind === 'posting')).toBe(true);
    // Employer confirms: task done, verified, approved, pay in balance minus the platform cut.
    const claimId = r.body.posting.claims[0].id;
    expect((await request(app).post(`/api/employer/claims/${claimId}/confirm`).set(auth(worker.token))).status).toBe(400);
    r = await request(app).post(`/api/employer/claims/${claimId}/confirm`).set(auth(boss.token));
    expect(r.body.posting.claims[0]).toMatchObject({ status: 'confirmed', paidCents: 6000 });
    today = (await request(app).get('/api/today').set(auth(worker.token))).body;
    const task = today.plan.tasks.find(t => t.title === 'Peach Movers: Load trucks');
    expect(task).toMatchObject({ status: 'done', approval: 'approved', verifiedCents: 6000, earningsCents: 6000 });
    expect(task.approvalReason).toMatch(/Confirmed by Peach Movers/);
    expect(task.points).toBe(engine.taskPoints(6, 2));
    expect((await request(app).get('/api/me').set(auth(worker.token))).body.payoutBalanceCents).toBe(5400);
    expect(db.prepare("SELECT gross_cents, fee_cents, net_cents FROM ledger WHERE kind = 'posting_pay'").get()).toEqual({ gross_cents: 6000, fee_cents: 600, net_cents: 5400 });
    // Confirming twice does nothing more.
    await request(app).post(`/api/employer/claims/${claimId}/confirm`).set(auth(boss.token));
    expect((await request(app).get('/api/me').set(auth(worker.token))).body.payoutBalanceCents).toBe(5400);
    const mine = (await request(app).get('/api/employer').set(auth(boss.token))).body;
    expect(mine.postings.length).toBe(1);
    expect(mine.feeCents).toBe(500);
    const adminView = (await request(app).get('/api/admin/postings').set('x-admin-key', 'owner')).body;
    expect(adminView.employers[0].org).toBe('Peach Movers');
  });

  test('the verified track record: public summary, employer search, paid full view', async () => {
    let r = await request(app).get('/api/u/Worker/resume');
    expect(r.body.resume).toMatchObject({ name: 'Worker', employerConfirmations: 1, approvedPlays: 1, verifiedCents: 6000 });
    expect(r.body.resume.employers).toBeUndefined();
    expect((await request(app).get('/u/Worker/resume')).text).toContain('Verified track record');
    expect((await request(app).get('/api/employer/search?city=atlanta').set(auth(worker.token))).status).toBe(403);
    r = await request(app).get('/api/employer/search?city=atlanta&category=gig').set(auth(boss.token));
    expect(r.body.results.map(x => x.name)).toContain('Worker');
    r = await request(app).get(`/api/employer/resume/${worker.user.id}`).set(auth(boss.token));
    expect(r.body.resume.employers[0]).toMatchObject({ org: 'Peach Movers', paidCents: 6000 });
    expect(db.prepare("SELECT COUNT(*) AS c FROM ledger WHERE kind = 'resume_view'").get().c).toBe(1);
    await request(app).get(`/api/employer/resume/${worker.user.id}`).set(auth(boss.token));
    expect(db.prepare("SELECT COUNT(*) AS c FROM ledger WHERE kind = 'resume_view'").get().c).toBe(1); // one fee per 30 days
  });

  test('the city report aggregates closed days, anonymized, and has a public page', async () => {
    await request(app).post('/api/today/close').set(auth(worker.token));
    for (let i = 0; i < 3; i++) { const u = await signup(`w${i}@x.com`, `W${i}`); await profile(u.token, { location: 'Atlanta, GA' }); const t = (await request(app).get('/api/today').set(auth(u.token))).body.plan.tasks[0]; await request(app).post(`/api/tasks/${t.taskId}`).set(auth(u.token)).send({ status: 'done', earningsDollars: 45 }); await request(app).post(`/api/tasks/${t.taskId}/approve`).set(auth(u.token)).send({ note: NOTE }); await request(app).post('/api/today/close').set(auth(u.token)); }
    const r = (await request(app).get('/api/reports/city?city=Atlanta&month=2026-09')).body.report;
    expect(r.players).toBeGreaterThanOrEqual(4);
    expect(r.totals.playsDone).toBeGreaterThanOrEqual(3);
    expect(r.plays.every(p => p.planned >= 3)).toBe(true);
    expect(JSON.stringify(r)).not.toMatch(/Worker|W0|w0@/);
    expect((await request(app).get('/report/Atlanta?month=2026-09')).text).toContain('City Report');
    expect((await request(app).get('/api/admin/reports').set('x-admin-key', 'owner')).body.reports[0].key).toBe('city:atlanta:2026-09');
  });
});

describe('clips from lives', () => {
  test('the busiest minute is picked from chat, a clip uploads as raw video, gets a page, streams, and can be removed', async () => {
    const host = await signup('host@x.com', 'Host'); const viewer = await signup('viewer@x.com', 'Viewer');
    await profile(host.token);
    const room = (await request(app).post('/api/live').set(auth(host.token)).send({ title: 'Grind talk' })).body.room;
    await request(app).post(`/api/live/${room.id}/join`).set(auth(viewer.token));
    clock += 70_000; await request(app).post(`/api/live/${room.id}/chat`).set(auth(viewer.token)).send({ body: 'fire' });
    clock += 5_000; await request(app).post(`/api/live/${room.id}/chat`).set(auth(viewer.token)).send({ body: 'more' });
    const w = (await request(app).get(`/api/live/${room.id}/best-window`).set(auth(host.token))).body;
    expect(w.window).toMatchObject({ startSec: 50, seconds: 60, messages: 2 }); // the burst at 70s sits 20s into the clip
    expect((await request(app).post('/api/clips').set(auth(host.token)).set('Content-Type', 'text/plain').send('nope')).status).toBe(400);
    const r = await request(app).post('/api/clips').set(auth(host.token)).set('Content-Type', 'video/webm').set('x-title', encodeURIComponent('Best minute')).set('x-room-id', String(room.id)).set('x-seconds', '60').send(Buffer.from('WEBMDATA'));
    expect(r.body.clip).toMatchObject({ title: 'Best minute', seconds: 60, bytes: 8, mime: 'video/webm' });
    const id = r.body.clip.id;
    expect((await request(app).get('/api/clips')).body.clips[0].id).toBe(id);
    expect((await request(app).get(`/clip/${id}`)).text).toContain('Best minute');
    const v = await request(app).get(`/api/clips/${id}/video`);
    expect(v.headers['content-type']).toMatch(/video\/webm/);
    expect(clips.clip(id).views).toBe(1);
    expect((await request(app).delete(`/api/clips/${id}`).set(auth(viewer.token))).status).toBe(400);
    await request(app).delete(`/api/clips/${id}`).set(auth(host.token)).expect(200);
    expect((await request(app).get('/api/clips')).body.clips).toEqual([]);
  });
});
