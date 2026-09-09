// The engine, fully offline: playbook plans, scoring, the world leaderboard,
// the nightly close, and the overnight scheduler. In-memory SQLite, frozen clock.
const { open } = require('../src/db');
const Engine = require('../src/engine');
const Crew = require('../src/agents');
const { buildOfflinePlan, PLAYS } = require('../src/playbook');

const C = Engine.constants;
let clock, db, engine, events;

beforeEach(() => {
  clock = Date.parse('2026-09-09T12:00:00Z');
  events = [];
  db = open(':memory:');
  engine = new Engine(db, { crew: new Crew({ apiKey: '' }), now: () => clock, onEvent: (u, e, d) => events.push({ u, e, d }) });
  const ins = db.prepare("INSERT INTO users (id, email, display_name, password_hash, created_at) VALUES (?, ?, ?, 'x', 0)");
  ins.run('u_a', 'a@x.com', 'Ava');
  ins.run('u_b', 'b@x.com', 'Ben');
});

describe('playbook', () => {
  test('every play is complete and free of anything the crew must never suggest', () => {
    for (const p of PLAYS) {
      expect(p.steps.length).toBeGreaterThanOrEqual(2);
      expect(p.earn[0]).toBeLessThanOrEqual(p.earn[1]);
      expect(p.hours).toBeGreaterThan(0);
      expect(/\b(gambl\w*|casino|bets?|betting|crypto|mlm|recruit\w*)\b/i.test(p.title + ' ' + p.why)).toBe(false);
    }
  });

  test('fills roughly a working day with only what the person has', () => {
    const plan = buildOfflinePlan({ userId: 'u', resources: ['laptop'], targetHours: 8 }, '2026-09-09');
    const hours = plan.tasks.reduce((s, t) => s + t.hours, 0);
    expect(hours).toBeGreaterThanOrEqual(6);
    expect(hours).toBeLessThanOrEqual(8.5);
    for (const t of plan.tasks) expect(PLAYS.find(p => p.id === t.playId).needs.every(n => n === 'laptop')).toBe(true);
    expect(plan.tasks[plan.tasks.length - 1].playId).toBe('admin_money');
    expect(plan.tasks[0].startsAt).toBe('8:00am');
  });

  test('is deterministic per person and day, and rotates across days', () => {
    const a1 = buildOfflinePlan({ userId: 'u', resources: ['vehicle', 'laptop'] }, '2026-09-09');
    const a2 = buildOfflinePlan({ userId: 'u', resources: ['vehicle', 'laptop'] }, '2026-09-09');
    expect(a1.tasks.map(t => t.playId)).toEqual(a2.tasks.map(t => t.playId));
    const recent = a1.tasks.map(t => t.playId).filter(id => id !== 'admin_money');
    const next = buildOfflinePlan({ userId: 'u', resources: ['vehicle', 'laptop'] }, '2026-09-10', { recentPlayIds: recent });
    expect(next.tasks.filter(t => recent.includes(t.playId)).length).toBeLessThan(recent.length);
  });

  test('a person with nothing but time still gets a plan', () => {
    expect(buildOfflinePlan({ userId: 'u', resources: [] }, '2026-09-09').tasks.length).toBeGreaterThanOrEqual(3);
  });
});

describe('profiles and plans', () => {
  test('profile is sanitised and saved', () => {
    const p = engine.saveProfile('u_a', { location: 'Atlanta, GA', resources: ['vehicle', 'laptop', 'vehicle'], skills: ['writing'], targetHours: 40, startHour: 7, tzOffset: -240 });
    expect(p.targetHours).toBe(12);
    expect(p.resources).toEqual(['vehicle', 'laptop']);
    expect(p.tz_offset).toBe(-240);
    expect(p.active).toBe(true);
  });

  test('ensurePlan builds once, is idempotent, and seeds the leaderboard', async () => {
    engine.saveProfile('u_a', { resources: ['vehicle'], tzOffset: -240 });
    const day = engine.localDateKey(engine.getProfile('u_a'));
    const plan = await engine.ensurePlan('u_a');
    expect(plan.date).toBe(day);
    expect(plan.status).toBe('open');
    expect(plan.tasks.every(t => t.taskId && t.status === 'pending')).toBe(true);
    expect((await engine.ensurePlan('u_a')).id).toBe(plan.id);
    expect(engine.inbox('u_a').filter(i => i.kind === 'plan').length).toBe(1);
    expect(engine.leaderboard(day)[0]).toMatchObject({ userId: 'u_a', score: 0, displayName: 'Ava' });
  });

  test('regeneration replaces tasks but keeps the day', async () => {
    engine.saveProfile('u_a', { resources: [] });
    const before = await engine.ensurePlan('u_a');
    const after = await engine.ensurePlan('u_a', undefined, { force: true });
    expect(after.id).toBe(before.id);
    expect(after.regenerations).toBe(1);
  });

  test('refuses a plan for someone with no profile', async () => {
    await expect(engine.ensurePlan('nobody')).rejects.toThrow(/profile/);
  });
});

describe('tasks, scoring and the world leaderboard', () => {
  test('completing tasks and logging earnings moves the score', async () => {
    engine.saveProfile('u_a', { resources: ['vehicle'] });
    const plan = await engine.ensurePlan('u_a');
    const t = plan.tasks[0];
    const updated = engine.updateTask('u_a', t.taskId, { status: 'done', earningsDollars: 45.5, note: 'two moves' });
    expect(updated.progress.earningsCents).toBe(4550);
    expect(updated.progress.score).toBe(C.POINTS_PER_TASK + Math.round(t.hours * C.POINTS_PER_HOUR) + 46);
    expect(events.some(e => e.e === 'leaderboard')).toBe(true);
  });

  test('self-reported earnings are capped so nobody can buy the board', () => {
    const honest = engine.scoreFor({ tasksDone: 1, tasksTotal: 3, hoursDone: 1, earningsCents: C.EARNINGS_CAP_CENTS });
    expect(engine.scoreFor({ tasksDone: 1, tasksTotal: 3, hoursDone: 1, earningsCents: 999_999_999 })).toBe(honest);
    expect(engine.scoreFor({ tasksDone: 3, tasksTotal: 3 })).toBe(3 * C.POINTS_PER_TASK + C.FULL_DAY_BONUS);
    expect(engine.scoreFor({ streak: 99 })).toBe(C.STREAK_CAP * C.STREAK_BONUS);
  });

  test('cannot touch another player\'s task', async () => {
    engine.saveProfile('u_a', { resources: [] });
    const plan = await engine.ensurePlan('u_a');
    expect(() => engine.updateTask('u_b', plan.tasks[0].taskId, { status: 'done' })).toThrow(/not found/);
  });

  test('two players rank by score, then earnings', async () => {
    engine.saveProfile('u_a', { resources: ['vehicle'], tzOffset: -240 });
    engine.saveProfile('u_b', { resources: ['bike'], tzOffset: -240 });
    const planA = await engine.ensurePlan('u_a');
    engine.updateTask('u_a', planA.tasks[0].taskId, { status: 'done', earningsDollars: 20 });
    const planB = await engine.ensurePlan('u_b');
    for (const t of planB.tasks) engine.updateTask('u_b', t.taskId, { status: 'done', earningsDollars: 10 });
    const day = engine.localDateKey(engine.getProfile('u_a'));
    const lb = engine.leaderboard(day);
    expect(lb.map(r => r.userId)).toEqual(['u_b', 'u_a']);
    expect(lb[0].earningsVerified).toBe(false);
    expect(engine.myRank('u_a', day)).toEqual({ rank: 2, of: 2, score: lb[1].score });
  });
});

describe('closing the day', () => {
  async function seedTwoDays() {
    engine.saveProfile('u_a', { resources: ['vehicle'], tzOffset: -240 });
    engine.saveProfile('u_b', { resources: ['bike'], tzOffset: -240 });
    const planA = await engine.ensurePlan('u_a');
    engine.updateTask('u_a', planA.tasks[0].taskId, { status: 'done', earningsDollars: 20 });
    const planB = await engine.ensurePlan('u_b');
    for (const t of planB.tasks) engine.updateTask('u_b', t.taskId, { status: 'done', earningsDollars: 10 });
    return engine.localDateKey(engine.getProfile('u_a'));
  }

  test('tick closes yesterday, crowns the podium, updates memory and preps today', async () => {
    const yesterday = await seedTwoDays();
    clock += 24 * 3600 * 1000;
    const today = engine.localDateKey(engine.getProfile('u_a'));
    expect(today).not.toBe(yesterday);

    await engine.tick();

    expect(engine.getPlan('u_a', yesterday).status).toBe('closed');
    const scoreB = db.prepare('SELECT * FROM daily_scores WHERE user_id = ? AND date = ?').get('u_b', yesterday);
    expect(scoreB).toMatchObject({ streak: 1, rank: 1, closed: 1 });
    expect(engine.podium(yesterday).map(p => p.userId)).toEqual(['u_b', 'u_a']);
    expect(engine.inbox('u_b').map(i => i.kind)).toEqual(expect.arrayContaining(['podium', 'close', 'plan']));
    expect(engine.inbox('u_b').find(i => i.kind === 'close').title).toMatch(/Full day/);

    const memB = engine.getProfile('u_b').memory;
    expect(memB.favorites.length).toBeGreaterThan(0);
    expect(memB.lastSummary).toMatch(/finished/);
    const planToday = engine.getPlan('u_b', today);
    expect(planToday.status).toBe('open');
    expect(planToday.streak).toBe(1);
    expect(engine.stats('u_b')).toMatchObject({ days: 1, wins: 1, bestStreak: 1 });

    const before = db.prepare('SELECT * FROM champions WHERE date = ?').all(yesterday);
    await engine.tick();
    expect(db.prepare('SELECT * FROM champions WHERE date = ?').all(yesterday)).toEqual(before);
    expect(engine.inbox('u_b').filter(i => i.kind === 'podium').length).toBe(1);
  });

  test('closed days cannot be edited; history and all-time boards read back', async () => {
    const yesterday = await seedTwoDays();
    clock += 24 * 3600 * 1000;
    await engine.tick();
    const closed = engine.getPlan('u_a', yesterday);
    expect(() => engine.updateTask('u_a', closed.tasks[0].taskId, { status: 'skipped' })).toThrow(/closed/);
    expect(engine.history('u_a').length).toBe(2);
    expect(engine.history('u_a')[1].summary).toMatch(/finished/);
    const all = engine.allTimeLeaderboard();
    expect(all[0]).toMatchObject({ userId: 'u_b', wins: 1 });
  });

  test('a streak breaks on a day with nothing done', async () => {
    await seedTwoDays();
    clock += 24 * 3600 * 1000;
    await engine.tick();                       // day 2 open, streak 1
    clock += 24 * 3600 * 1000;
    await engine.tick();                       // day 2 closed with nothing done
    const profile = engine.getProfile('u_b');
    expect(engine.getPlan('u_b', engine.localDateKey(profile)).streak).toBe(0);
  });

  test('plans are not built before the crew\'s 4am window', async () => {
    db.prepare("INSERT INTO users (id, email, display_name, password_hash, created_at) VALUES ('u_c','c@x.com','Cy','x',0)").run();
    engine.saveProfile('u_c', { resources: [], tzOffset: 0 });
    clock = Date.parse('2026-09-11T02:30:00Z');
    await engine.tick();
    expect(engine.getPlan('u_c', '2026-09-11')).toBeNull();
    clock = Date.parse('2026-09-11T04:05:00Z');
    await engine.tick();
    expect(engine.getPlan('u_c', '2026-09-11')).not.toBeNull();
  });
});

describe('crew plan normalisation', () => {
  test('model output is coerced into the playbook shape and bad URLs dropped', () => {
    const plan = Crew.normalizePlan({
      headline: 'h', focus: 'f', brief: ['b'],
      tasks: [{ title: 'Deliver', icon: '🛵', category: 'gig', hours: '2', startsAt: '11am', endsAt: '1pm', estimatedEarnings: { low: 20, high: 60 }, steps: ['a', 'b'], why: 'w', sources: ['https://ok.example', 'javascript:alert(1)'] }],
    }, '2026-09-09', 'crew');
    expect(plan.generatedBy).toBe('crew');
    expect(plan.tasks[0].hours).toBe(2);
    expect(plan.tasks[0].sources).toEqual(['https://ok.example']);
    expect(plan.estimatedEarnings).toEqual({ low: 20, high: 60 });
  });
});
