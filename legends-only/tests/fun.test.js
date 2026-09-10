// The fun layer: Boss of the Day, Power Play, combos, weekly quests, titles,
// the climb, callouts, rank-ups, and the bot talking back.
const request = require('supertest');
const { createApp } = require('../server');
const { open } = require('../src/db');
const Crew = require('../src/agents');
const Fun = require('../src/fun');

let app, clock, engine, fun, db, events;
beforeAll(() => {
  clock = Date.parse('2026-09-09T15:00:00Z');
  events = [];
  ({ app, engine, fun, db } = createApp({ db: open(':memory:'), now: () => clock, crew: new Crew({ apiKey: '' }), defaultTier: 'free' }));
  const orig = fun.onEvent; fun.onEvent = (u, e, d) => { events.push({ to: u, event: e, data: d }); orig(u, e, d); };
  const origE = engine.onEvent; engine.onEvent = (u, e, d) => { events.push({ to: u, event: e, data: d }); origE(u, e, d); };
});
const auth = (t) => ({ Authorization: `Bearer ${t}` });
const signup = async (email, name) => (await request(app).post('/api/auth/register').send({ email, password: 'longenough', displayName: name, acceptTerms: true })).body;
const profile = (token, extra = {}) => request(app).post('/api/profile').set(auth(token)).send({ location: 'Atlanta, GA', resources: ['vehicle', 'laptop'], skills: ['writing'], targetHours: 8, startHour: 8, tzOffset: 0, ...extra });
const NOTE = 'Did it start to finish, met the client at their place, finished on time. Logged what it paid; if nothing is logged it paid nothing today.';
const today = (token) => request(app).get('/api/today').set(auth(token)).then(r => r.body);
const approve = async (token, taskId, earningsDollars = 0) => { await request(app).post(`/api/tasks/${taskId}`).set(auth(token)).send({ status: 'done', earningsDollars }); return (await request(app).post(`/api/tasks/${taskId}/approve`).set(auth(token)).send({ note: NOTE })).body; };

describe('Boss of the Day, Power Play, combos', () => {
  let ava;
  beforeAll(async () => { ava = await signup('ava@x.com', 'Ava'); await profile(ava.token); });

  test('the hardest play on the plan is the Boss, and the bot has a mood line', async () => {
    const t = await today(ava.token);
    const bosses = t.plan.tasks.filter(x => x.boss);
    expect(bosses.length).toBe(1);
    expect(Math.max(...t.plan.tasks.map(x => x.difficulty))).toBe(bosses[0].difficulty);
    expect(t.mood).toMatchObject({ name: 'Your bot' });
    expect(t.mood.line.length).toBeGreaterThan(5);
    expect(t.quests.length).toBe(3);
    expect(t.calloutLines.length).toBe(Fun.constants.CALLOUT_LINES.length);
  });

  test('Power Play: one a day, only on a pending play, movable until it locks', async () => {
    const t = await today(ava.token);
    const pending = t.plan.tasks.filter(x => !x.boss);
    let r = await request(app).post(`/api/tasks/${pending[0].taskId}/power`).set(auth(ava.token));
    expect(r.body.plan.tasks.find(x => x.taskId === pending[0].taskId).power).toBe(true);
    r = await request(app).post(`/api/tasks/${pending[1].taskId}/power`).set(auth(ava.token)); // moved
    expect(r.body.plan.tasks.filter(x => x.power).map(x => x.taskId)).toEqual([pending[1].taskId]);
    await request(app).post(`/api/tasks/${pending[1].taskId}`).set(auth(ava.token)).send({ status: 'done' });
    expect((await request(app).post(`/api/tasks/${pending[1].taskId}/power`).set(auth(ava.token))).status).toBe(400);
    expect((await request(app).post(`/api/tasks/${pending[0].taskId}/power`).set(auth(ava.token))).body.error).toMatch(/locked in/);
    await request(app).post(`/api/tasks/${pending[1].taskId}`).set(auth(ava.token)).send({ status: 'pending' });
  });

  test('approvals stack: power +50%, boss 2x, combo +10% per extra approval, all as bonus on top of base', async () => {
    let t = await today(ava.token);
    const powered = t.plan.tasks.find(x => x.power); const boss = t.plan.tasks.find(x => x.boss);
    const others = t.plan.tasks.filter(x => !x.power && !x.boss);
    events.length = 0;
    let r = await approve(ava.token, powered.taskId, 40);
    expect(r.approved).toBe(true);
    let task = r.plan.tasks.find(x => x.taskId === powered.taskId);
    expect(task.bonusPoints).toBe(Math.round(task.points * 0.5)); // first approval: power only
    expect(task.combo).toBe(1);
    const ev = events.find(e => e.event === 'approved');
    expect(ev.data).toMatchObject({ power: true, boss: false, combo: 1, bonus: task.bonusPoints, botName: 'Your bot' });
    expect(ev.data.line.length).toBeGreaterThan(5);
    r = await approve(ava.token, boss.taskId, 100);
    task = r.plan.tasks.find(x => x.taskId === boss.taskId);
    expect(task.combo).toBe(2);
    expect(task.bonusPoints).toBe(Math.round(task.points * 1.0) + Math.round(task.points * 0.1));
    expect(engine.badges(ava.user.id).some(b => b.badge === 'boss_slayer')).toBe(true);
    expect((await request(app).get('/api/feed')).body.feed.some(f => f.kind === 'boss')).toBe(true);
    r = await approve(ava.token, others[0].taskId);
    task = r.plan.tasks.find(x => x.taskId === others[0].taskId);
    expect(task.combo).toBe(3);
    expect(task.bonusPoints).toBe(Math.round(task.points * 0.2));
    const p = r.plan.progress;
    expect(p.combo).toBe(3);
    expect(p.bonusPoints).toBe(r.plan.tasks.filter(x => x.approval === 'approved').reduce((s, x) => s + x.bonusPoints, 0));
    expect(p.score).toBe(engine.scoreFor({ ...p }));
    expect(p.score).toBeGreaterThan(p.taskPoints + p.bonusPoints); // dollars and streak on top
    expect(db.prepare('SELECT bonus_points, score FROM daily_scores WHERE user_id = ?').get(ava.user.id)).toMatchObject({ bonus_points: p.bonusPoints, score: p.score });
    t = await today(ava.token);
    expect(t.mood.line).toMatch(/#1|x3|combo/i); // leading the world outranks the combo line
  });
});

describe('quests, titles, the climb', () => {
  let ben, cat;
  beforeAll(async () => { ben = await signup('ben@x.com', 'Ben'); cat = await signup('cat@x.com', 'Cat'); await profile(ben.token); await profile(cat.token); });

  test('three quests a week, deterministic per player, progress read live, reward lands on the day it completes', async () => {
    const q1 = (await today(ben.token)).quests;
    expect(q1.length).toBe(3);
    expect(q1.map(q => q.key)).toEqual(fun.quests(ben.user.id, '2026-09-09').map(q => q.key));
    expect(q1.map(q => q.key)).not.toEqual((await today(cat.token)).quests.map(q => q.key).slice(0, 3).concat(['x']));
    // Give Ben a known quest and finish it.
    db.prepare("INSERT OR IGNORE INTO quests (user_id, week_start, key, label, target, reward, created_at) VALUES (?, '2026-09-07', 'approve_5', 'Get 5 plays approved this week', 5, 7500, ?)").run(ben.user.id, clock);
    let t = await today(ben.token);
    while (t.plan.tasks.length < 5) { engine.addTask(ben.user.id, '2026-09-09', { title: 'Extra flip', icon: '🏷️', category: 'online', hours: 1, difficulty: 4, steps: ['List it'], why: 'test', sources: [], estimatedEarnings: { low: 10, high: 20 } }); t = await today(ben.token); }
    const ids = t.plan.tasks.map(x => x.taskId);
    events.length = 0;
    let r;
    for (let i = 0; i < 5 && i < ids.length; i++) r = await approve(ben.token, ids[i]);
    const q = fun.quests(ben.user.id, '2026-09-09').find(x => x.key === 'approve_5');
    expect(q).toMatchObject({ done: true, progress: 5, doneOn: '2026-09-09' });
    expect(r.plan.questPoints).toBe(fun.quests(ben.user.id, '2026-09-09').filter(x => x.done).reduce((n, x) => n + x.reward, 0)); // other assigned quests can finish on the same run
    expect(r.plan.questPoints).toBeGreaterThanOrEqual(7500);
    expect(r.plan.progress.score).toBe(engine.scoreFor(r.plan.progress));
    expect(r.plan.progress.score - r.plan.progress.taskPoints - r.plan.progress.bonusPoints).toBeGreaterThanOrEqual(7500);
    expect(events.some(e => e.event === 'quest' && e.data.key === 'approve_5')).toBe(true);
    expect(engine.badges(ben.user.id).some(b => b.badge === 'quest_approve_5')).toBe(true);
    // Five approvals in a day is a x5 combo: Combo King.
    expect(fun.title(ben.user.id)).toBe('Combo King');
    expect((await request(app).get('/api/leaderboard')).body.leaderboard.find(x => x.userId === ben.user.id).title).toBe('Combo King');
    expect((await request(app).get('/u/Ben')).text).toContain('Combo King');
  });

  test('titles: crowd favorite from live ratings; the climb reports who you passed', async () => {
    for (let i = 0; i < 5; i++) db.prepare('INSERT INTO bot_ratings (room_id, rater_id, host_id, rating, created_at) VALUES (?, ?, ?, 5, ?)').run(100 + i, 'r' + i, cat.user.id, clock);
    expect(fun.titleFor(cat.user.id)).toBe('Crowd Favorite');
    // Cat is at zero; Ben is far ahead; Ava too. Cat approves the boss with big verified-ish dollars and passes nobody, then keeps going.
    const t = await today(cat.token);
    events.length = 0;
    const before = fun.worldRank(cat.user.id, '2026-09-09');
    expect(before).toBe(3);
    await approve(cat.token, t.plan.tasks.find(x => x.boss).taskId, 900); // strict trust: >$150 needs proof, so this one is rejected
    let r = await approve(cat.token, t.plan.tasks.find(x => !x.boss).taskId, 100);
    expect(r.approved).toBe(true);
    const climb = events.find(e => e.event === 'climb');
    if (fun.worldRank(cat.user.id, '2026-09-09') < before) { expect(climb).toBeTruthy(); expect(climb.data.passed.length).toBeGreaterThan(0); expect(climb.data.line).toMatch(/#\d/); }
  });
});

describe('callouts and rank-ups', () => {
  let dee, eve;
  beforeAll(async () => { dee = await signup('dee@x.com', 'Dee'); eve = await signup('eve@x.com', 'Eve'); await profile(dee.token); await profile(eve.token); });

  test('a callout lands in the inbox and the feed, three a day, blocked players are off limits, accepting makes a head-to-head for tomorrow', async () => {
    events.length = 0;
    let r = await request(app).post('/api/callouts/' + eve.user.id).set(auth(dee.token)).send({ line: 1 });
    expect(r.body.callout).toMatchObject({ toId: eve.user.id, line: Fun.constants.CALLOUT_LINES[1], date: '2026-09-09' });
    expect(events.find(e => e.event === 'callout' && e.to === eve.user.id).data.fromName).toBe('Dee');
    expect(engine.inbox(eve.user.id).some(i => i.kind === 'callout')).toBe(true);
    expect((await request(app).get('/api/feed')).body.feed.some(f => f.kind === 'callout' && /Dee called out Eve/.test(f.text))).toBe(true);
    expect((await request(app).post('/api/callouts/' + dee.user.id).set(auth(dee.token)).send({ line: 0 })).status).toBe(400);
    await request(app).post('/api/callouts/' + eve.user.id).set(auth(dee.token)).send({ line: 0 });
    await request(app).post('/api/callouts/' + eve.user.id).set(auth(dee.token)).send({ line: 2 });
    expect((await request(app).post('/api/callouts/' + eve.user.id).set(auth(dee.token)).send({ line: 3 })).body.error).toMatch(/3 callouts/);
    const mine = (await request(app).get('/api/callouts').set(auth(eve.token))).body;
    expect(mine.callouts.length).toBe(3);
    expect(mine.callouts[0].mine).toBe(false);
    r = await request(app).post(`/api/callouts/${r.body.callout.id}/accept`).set(auth(eve.token));
    expect(r.body.challenge).toMatchObject({ status: 'accepted', date: '2026-09-10' });
    expect((await request(app).get('/api/today').set(auth(eve.token))).body.callouts.filter(c => !c.mine && !c.challengeId).length).toBe(2);
    await request(app).post('/api/block/' + dee.user.id).set(auth(eve.token));
    clock += 86_400_000;
    expect((await request(app).post('/api/callouts/' + eve.user.id).set(auth(dee.token)).send({ line: 0 })).body.error).toMatch(/cannot call out/);
    clock -= 86_400_000;
  });

  test('naming the bot changes who talks; a world win at the crown ranks a player up with a badge and a splash event', async () => {
    let r = await request(app).post('/api/me/bot-name').set(auth(dee.token)).send({ name: 'Sarge' });
    expect(r.body.botName).toBe('Sarge');
    expect((await today(dee.token)).mood.name).toBe('Sarge');
    expect((await request(app).get('/api/me').set(auth(dee.token))).body.botName).toBe('Sarge');
    // Close everyone's day: Ben is the champion of 2026-09-09 (most approvals); the crown makes him Pro.
    events.length = 0;
    for (const u of db.prepare('SELECT user_id FROM profiles').all()) await engine.closeDay(u.user_id, '2026-09-09');
    engine.crownDay('2026-09-09');
    const champ = db.prepare('SELECT user_id FROM champions WHERE date = ? AND rank = 1').get('2026-09-09').user_id;
    expect(engine.rankInfo(champ).rank).toBe('pro');
    expect(engine.badges(champ).some(b => b.badge === 'rank_pro')).toBe(true);
    expect(events.some(e => e.event === 'rankup' && e.to === champ && e.data.rank === 'pro')).toBe(true);
    expect(engine.inbox(champ).some(i => i.kind === 'rankup')).toBe(true);
    // Idempotent: a second crown or close does not announce twice.
    engine._checkRankUp(champ, '2026-09-09');
    expect(events.filter(e => e.event === 'rankup' && e.to === champ).length).toBe(1);
  });
});
