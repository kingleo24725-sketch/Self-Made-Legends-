// The engine, fully offline: playbook plans, verified vs self-reported scoring,
// leagues, local boards, chat replans, challenges, referral duels, streak
// insurance, weekly recaps, check-ins, tier gating, and the overnight scheduler.
// In-memory SQLite, frozen clock.
const { open } = require('../src/db');
const Engine = require('../src/engine');
const Crew = require('../src/agents');
const Push = require('../src/push');
const { buildOfflinePlan, PLAYS, layoutOnClock, parseClock } = require('../src/playbook');

const C = Engine.constants;
let clock, db, engine, events, pushes;
// Mark a play done AND get the player's own bot to approve it; points only exist after approval.
const finish = async (uid, taskId, opts = {}) => { engine.updateTask(uid, taskId, { status: 'done', ...opts }); return (await engine.requestApproval(uid, taskId, { note: opts.note || 'Did it start to finish, met the client at their place, finished on time. Logged what it paid; if nothing is logged it paid nothing today.' })).plan; };

function addUser(id, name, extra = {}) {
  db.prepare("INSERT INTO users (id, email, display_name, password_hash, tier, referral_code, referred_by, created_at) VALUES (?, ?, ?, 'x', ?, ?, ?, 0)")
    .run(id, `${id}@x.com`, name, extra.tier || 'free', extra.code || id.toUpperCase(), extra.referredBy || null);
}

beforeEach(() => {
  clock = Date.parse('2026-09-09T12:00:00Z'); // a Wednesday
  events = []; pushes = [];
  db = open(':memory:');
  const push = new Push(db, { publicKey: '', privateKey: '', sender: async (sub, payload) => { pushes.push({ sub, payload }); } });
  engine = new Engine(db, { crew: new Crew({ apiKey: '' }), push, now: () => clock, defaultTier: 'allstar', onEvent: (u, e, d) => events.push({ u, e, d }) });
  addUser('u_a', 'Ava'); addUser('u_b', 'Ben');
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
    expect(plan.tasks[0].endsMin).toBeGreaterThan(480);
  });

  test('is deterministic per person and day, and rotates across days', () => {
    const a1 = buildOfflinePlan({ userId: 'u', resources: ['vehicle', 'laptop'] }, '2026-09-09');
    const a2 = buildOfflinePlan({ userId: 'u', resources: ['vehicle', 'laptop'] }, '2026-09-09');
    expect(a1.tasks.map(t => t.playId)).toEqual(a2.tasks.map(t => t.playId));
    const recent = a1.tasks.map(t => t.playId).filter(id => id !== 'admin_money');
    const next = buildOfflinePlan({ userId: 'u', resources: ['vehicle', 'laptop'] }, '2026-09-10', { recentPlayIds: recent });
    expect(next.tasks.filter(t => recent.includes(t.playId)).length).toBeLessThan(recent.length);
  });

  test('blocked hours are never scheduled over and time-sensitive plays sit in their window order', () => {
    const plan = buildOfflinePlan({ userId: 'u', resources: ['vehicle'], startHour: 8, blockedHours: [{ start: 12, end: 14 }] }, '2026-09-10');
    for (const t of plan.tasks) {
      const s = t.startsMin, e = t.endsMin;
      expect(s >= 14 * 60 || e <= 12 * 60).toBe(true);
    }
    const windows = plan.tasks.map(t => (PLAYS.find(p => p.id === t.playId) || {}).window).filter(Boolean);
    expect(windows.map(w => w[0])).toEqual([...windows.map(w => w[0])].sort((a, b) => a - b));
  });

  test('real results steer the playbook: a play the person always skips drops out', () => {
    const base = { userId: 'u', resources: ['vehicle', 'laptop'], targetHours: 8 };
    const plain = buildOfflinePlan(base, '2026-09-10');
    const first = plain.tasks[0].playId;
    const stats = { [first]: { attempts: 5, doneRate: 0, earnRatio: null } };
    const learned = buildOfflinePlan(base, '2026-09-10', { playStats: stats });
    expect(learned.tasks[0].playId).not.toBe(first);
  });

  test('clock parsing and layout helpers', () => {
    expect(parseClock('10:30am')).toBe(630);
    expect(parseClock('1pm')).toBe(780);
    expect(parseClock('12:00am')).toBe(0);
    expect(parseClock('nope')).toBeNull();
    const laid = layoutOnClock([{ hours: 2 }, { hours: 1 }], 9, [{ start: 10, end: 11 }]);
    expect(laid[0].startsAt).toBe('11:00am'); // 9-11 would overlap 10-11, so it moves past the block
    expect(laid[1].startsAt).toBe('1:00pm');
  });
});

describe('profiles and plans', () => {
  test('profile is sanitised, location is split, blocked hours and goals are kept', () => {
    const p = engine.saveProfile('u_a', { location: 'Atlanta, GA', country: 'us', resources: ['vehicle', 'laptop', 'vehicle'], targetHours: 40, startHour: 7, tzOffset: -240,
      blockedHours: [{ start: 12, end: 13 }, { start: 5, end: 4 }], goal: { title: 'Quit the night shift', targetDollars: 3000 } });
    expect(p.targetHours).toBe(12);
    expect(p.resources).toEqual(['vehicle', 'laptop']);
    expect(p).toMatchObject({ city: 'Atlanta', region: 'GA', country: 'US', tz_offset: -240 });
    expect(p.blockedHours).toEqual([{ start: 12, end: 13 }]);
    expect(p.goal).toMatchObject({ title: 'Quit the night shift', targetCents: 300000, progressCents: 0 });
    expect(p.goal.byDate).toBe('2026-10-09');
  });

  test('ensurePlan builds once, logs the crew, seeds the board, and is idempotent', async () => {
    engine.saveProfile('u_a', { resources: ['vehicle'], tzOffset: -240 });
    const day = engine.localDateKey(engine.getProfile('u_a'));
    const plan = await engine.ensurePlan('u_a');
    expect(plan.date).toBe(day);
    expect(plan.status).toBe('open');
    expect(plan.league).toBe('rookie');
    expect(plan.tasks.every(t => t.taskId && t.status === 'pending' && t.endsMin)).toBe(true);
    expect((await engine.ensurePlan('u_a')).id).toBe(plan.id);
    expect(engine.inbox('u_a').filter(i => i.kind === 'plan').length).toBe(1);
    expect(engine.crewLog('u_a', day).map(l => l.agent)).toEqual(['Coach', 'Strategist']);
    expect(engine.leaderboard(day)[0]).toMatchObject({ userId: 'u_a', score: 0, displayName: 'Ava', league: 'rookie' });
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

  test('ranks are earned: Rookie, then Pro, All Star, Superstar by days, points, or wins', () => {
    engine.saveProfile('u_a', { resources: [] });
    expect(engine.rankInfo('u_a')).toMatchObject({ rank: 'rookie', next: { rank: 'pro' } });
    for (let i = 0; i < 7; i++) db.prepare("INSERT INTO daily_scores (user_id, date, score, tasks_done, closed, updated_at) VALUES ('u_a', ?, 1000, 1, 1, 0)").run(Engine.shiftDate('2026-08-01', i));
    expect(engine.rankInfo('u_a').rank).toBe('pro');
    expect(engine.leagueFor('u_a', engine.getProfile('u_a'), '2026-09-09')).toBe('pro');
    expect(engine.leagueFor('u_a', engine.getProfile('u_a'), '2026-08-03')).toBe('rookie'); // rank as of a date
    db.prepare("UPDATE daily_scores SET rank = 1 WHERE user_id = 'u_a' AND date <= '2026-08-03'").run();
    expect(engine.rankInfo('u_a')).toMatchObject({ rank: 'allstar', have: { wins: 3 } });
    db.prepare("UPDATE daily_scores SET score = 200000 WHERE user_id = 'u_a'").run();
    expect(engine.rankInfo('u_a')).toMatchObject({ rank: 'superstar', next: null });
    expect(engine.tierInfo('u_a')).toMatchObject({ tier: 'free', name: 'Self-Made Legends Member', rankName: 'Self-Made Legends Superstar' });
  });
});

describe('tasks, scoring and the world leaderboard', () => {
  test('points come from difficulty and hours; verified dollars count double self-reported', async () => {
    engine.saveProfile('u_a', { resources: ['vehicle'] });
    const plan = await engine.ensurePlan('u_a');
    const t = plan.tasks[0];
    expect(t.points).toBe(engine.taskPoints(t.difficulty, t.hours));
    expect(engine.taskPoints(10, 4)).toBe(10_000);
    const pendingPlan = engine.updateTask('u_a', t.taskId, { status: 'done', earningsDollars: 45.5, note: 'two moves' });
    expect(pendingPlan.progress).toMatchObject({ tasksDone: 0, awaitingApproval: 1, score: 0, pendingPoints: t.points, loggedCents: 4550 });
    expect(pendingPlan.tasks[0]).toMatchObject({ approval: 'pending', points: 0 });
    const rejected = await engine.requestApproval('u_a', t.taskId, { note: 'did it' });
    expect(rejected.approved).toBe(false);
    expect(rejected.plan.tasks[0].approval).toBe('rejected');
    const updated = await finish('u_a', t.taskId, { earningsDollars: 45.5 });
    expect(updated.tasks[0]).toMatchObject({ approval: 'approved', graded: true });
    expect(updated.progress.earningsCents).toBe(4550);
    expect(updated.progress.taskPoints).toBe(t.points);
    expect(updated.progress.score).toBe(t.points + Math.round(45.5 * C.UNVERIFIED_POINTS_PER_DOLLAR));
    expect(updated.progress.verifiedScore).toBe(t.points);
    expect(events.some(e => e.e === 'leaderboard')).toBe(true);
    expect(engine.scoreFor({ tasksDone: 1, taskPoints: 1000, earningsCents: 10000, verifiedCents: 10000 })).toBe(1000 + 100 * C.VERIFIED_POINTS_PER_DOLLAR);
    // The bot learned from that outcome, for this person, this city, and the world.
    expect(db.prepare('SELECT COUNT(*) AS c FROM play_weights WHERE play_key = ?').get(t.playId).c).toBe(3);
    expect(engine.learning.botIQ('u_a').outcomesFromYou).toBe(1);
  });

  test('a day tops out at 100,000 and earnings are capped so nobody can buy the board', () => {
    const honest = engine.scoreFor({ tasksDone: 1, tasksTotal: 3, taskPoints: 500, earningsCents: C.EARNINGS_CAP_CENTS });
    expect(engine.scoreFor({ tasksDone: 1, tasksTotal: 3, taskPoints: 500, earningsCents: 999_999_999 })).toBe(honest);
    expect(engine.scoreFor({ tasksDone: 3, tasksTotal: 3, taskPoints: 0 })).toBe(C.FULL_DAY_BONUS);
    expect(engine.scoreFor({ tasksDone: 1, streak: 99 })).toBe(C.STREAK_CAP * C.STREAK_BONUS);
    expect(engine.scoreFor({ tasksDone: 3, tasksTotal: 3, taskPoints: 60_000, earningsCents: 500_000, verifiedCents: 500_000, streak: 10, lessonPoints: 500 })).toBe(C.DAILY_CAP);
    expect(engine.scoreFor({ penalty: 3000 })).toBe(-3000);
  });

  test('cannot touch another player\'s task', async () => {
    engine.saveProfile('u_a', { resources: [] });
    const plan = await engine.ensurePlan('u_a');
    expect(() => engine.updateTask('u_b', plan.tasks[0].taskId, { status: 'done' })).toThrow(/not found/);
  });

  test('receipts are gated, deduplicated, and offline they cannot verify', async () => {
    engine.saveProfile('u_a', { resources: [] });
    const plan = await engine.ensurePlan('u_a');
    const r = await engine.verifyReceipt('u_a', plan.tasks[0].taskId, 'aGVsbG8=', 'image/png');
    expect(r.verified).toBe(false);
    await expect(engine.verifyReceipt('u_a', plan.tasks[0].taskId, 'aGVsbG8=', 'text/plain')).rejects.toThrow(/PNG/);
  });

  test('a verifying crew marks the task done and the board shows it as verified', async () => {
    engine.crew.readReceipt = async () => ({ verified: true, amountDollars: 80, source: 'DoorDash', confidence: 0.9 });
    engine.saveProfile('u_a', { resources: [] });
    const plan = await engine.ensurePlan('u_a');
    const r = await engine.verifyReceipt('u_a', plan.tasks[0].taskId, 'aGVsbG8=', 'image/png');
    expect(r.verified).toBe(true);
    expect(r.plan.tasks[0]).toMatchObject({ status: 'done', earningsCents: 8000, verifiedCents: 8000 });
    expect(r.plan.progress.score).toBe(r.plan.progress.verifiedScore);
    await expect(engine.verifyReceipt('u_a', plan.tasks[0].taskId, 'aGVsbG8=', 'image/png')).rejects.toThrow(/already used/);
    const lb = engine.leaderboard(plan.date, { mode: 'verified' });
    expect(lb[0]).toMatchObject({ userId: 'u_a', earningsVerified: true });
    expect(engine.crewLog('u_a', plan.date).some(l => l.agent === 'Auditor')).toBe(true);
  });

  test('world, league, and local boards', async () => {
    engine.saveProfile('u_a', { location: 'Atlanta, GA', resources: ['vehicle'], tzOffset: -240 });
    engine.saveProfile('u_b', { location: 'Austin, TX', resources: [], tzOffset: -240 });
    const planA = await engine.ensurePlan('u_a');
    await finish('u_a', planA.tasks[0].taskId, {earningsDollars: 20 });
    const planB = await engine.ensurePlan('u_b');
    for (const t of planB.tasks) await finish('u_b', t.taskId, {earningsDollars: 10 });
    const day = engine.localDateKey(engine.getProfile('u_a'));
    const lb = engine.leaderboard(day);
    expect(lb.map(r => r.userId)).toEqual(['u_b', 'u_a']);
    expect(lb[0].earningsVerified).toBe(false);
    expect(engine.leaderboard(day, { league: 'rookie' }).map(r => r.userId).sort()).toEqual(['u_a', 'u_b']);
    expect(engine.leaderboard(day, { scope: 'region', viewer: engine.getProfile('u_a') }).map(r => r.userId)).toEqual(['u_a']);
    expect(engine.leaderboard(day, { scope: 'country', viewer: engine.getProfile('u_a') }).length).toBe(2);
    expect(engine.myRank('u_a', day)).toMatchObject({ rank: 2, of: 2, league: 'rookie', leagueRank: 2, leagueOf: 2 });
  });
});

describe('chat with the crew', () => {
  test('a plain question gets an answer; a fallen-through play rebuilds the rest of the day', async () => {
    engine.saveProfile('u_a', { resources: ['laptop', 'vehicle'], tzOffset: 0, startHour: 8, targetHours: 8 });
    clock = Date.parse('2026-09-09T11:00:00Z');
    const plan = await engine.ensurePlan('u_a');
    await finish('u_a', plan.tasks[0].taskId, {earningsDollars: 30 });
    const a = await engine.chat('u_a', 'what is next?');
    expect(a.replaced).toBe(0);
    expect(a.reply).toMatch(/Next up/);
    const b = await engine.chat('u_a', 'the delivery fell through, what now?');
    expect(b.replaced).toBeGreaterThan(0);
    expect(b.plan.tasks[0].status).toBe('done');
    expect(b.plan.tasks.slice(1).every(t => t.status === 'pending' && t.startsMin >= 11 * 60)).toBe(true);
    expect(b.plan.progress.tasksDone).toBe(1);
    expect(b.plan.headline).toMatch(new RegExp(`^${b.plan.tasks.length} plays, .*rebuilt mid-day`));
    expect(b.plan.headline).toMatch(new RegExp(`^${b.plan.tasks.length} plays.*rebuilt mid-day`));
    expect(engine.chatHistory('u_a', plan.date).map(m => m.role)).toEqual(['user', 'crew', 'user', 'crew']);
    engine.defaultTier = 'free';
    expect((await engine.chat('u_a', 'hi')).reply).toBeTruthy(); // chat is free for every rank
  });
});

describe('challenges and invites', () => {
  test('challenge, accept, settle, badge', async () => {
    engine.saveProfile('u_a', { resources: [], tzOffset: 0 });
    engine.saveProfile('u_b', { resources: [], tzOffset: 0 });
    const day = engine.localDateKey(engine.getProfile('u_a'));
    const c = engine.createChallenge('u_a', 'ben', day);
    expect(c.status).toBe('pending');
    expect(() => engine.createChallenge('u_a', 'Ben', day)).toThrow(/already/);
    expect(() => engine.createChallenge('u_a', 'ava', day)).toThrow(/yourself/);
    expect(() => engine.respondChallenge('u_a', c.id, true)).toThrow(/not found/);
    engine.respondChallenge('u_b', c.id, true);
    const pa = await engine.ensurePlan('u_a'); const pb = await engine.ensurePlan('u_b');
    engine.updateTask('u_a', pa.tasks[0].taskId, { status: 'done' });
    await finish('u_b', pb.tasks[0].taskId, {earningsDollars: 50 });
    clock += 86_400_000;
    await engine.tick();
    const settled = engine.challenges('u_a')[0];
    expect(settled).toMatchObject({ status: 'settled', winnerId: 'u_b' });
    expect(engine.badges('u_b').map(b => b.badge)).toContain('duel_win');
    expect(engine.stats('u_b')).toMatchObject({ duelsWon: 1, duelsPlayed: 1 });
  });

  test('an invited player starts with a duel against the person who invited them', async () => {
    addUser('u_c', 'Cy', { referredBy: 'U_A' });
    engine.saveProfile('u_a', { resources: [], tzOffset: 0 });
    engine.saveProfile('u_c', { resources: [], tzOffset: 0 });
    await engine.ensurePlan('u_c');
    const duel = engine.challenges('u_c')[0];
    expect(duel).toMatchObject({ status: 'accepted', challengerId: 'u_a', opponentId: 'u_c' });
    expect(engine.badges('u_a').map(b => b.badge)).toContain('recruiter');
    expect(db.prepare('SELECT referred_by FROM users WHERE id = ?').get('u_c').referred_by).toBeNull();
  });
});

describe('closing the day', () => {
  async function seedTwoDays() {
    engine.saveProfile('u_a', { resources: ['vehicle'], tzOffset: -240 });
    engine.saveProfile('u_b', { resources: ['bike'], tzOffset: -240 });
    const planA = await engine.ensurePlan('u_a');
    await finish('u_a', planA.tasks[0].taskId, {earningsDollars: 20 });
    const planB = await engine.ensurePlan('u_b');
    for (const t of planB.tasks) await finish('u_b', t.taskId, {earningsDollars: 10 });
    return engine.localDateKey(engine.getProfile('u_a'));
  }

  test('tick closes yesterday, ranks everyone, crowns the podium, awards badges, and preps today', async () => {
    const yesterday = await seedTwoDays();
    clock += 24 * 3600 * 1000;
    const today = engine.localDateKey(engine.getProfile('u_a'));
    await engine.tick();

    expect(engine.getPlan('u_a', yesterday).status).toBe('closed');
    expect(db.prepare('SELECT * FROM daily_scores WHERE user_id = ? AND date = ?').get('u_b', yesterday)).toMatchObject({ streak: 1, rank: 1, closed: 1 });
    expect(db.prepare('SELECT rank FROM daily_scores WHERE user_id = ? AND date = ?').get('u_a', yesterday).rank).toBe(2);
    expect(engine.podium(yesterday).map(p => p.userId)).toEqual(['u_b', 'u_a']);
    expect(engine.badges('u_b').map(b => b.badge).sort()).toEqual(['full_day', 'world_champion']);
    expect(engine.inbox('u_b').find(i => i.kind === 'close').title).toMatch(/Full day/);
    expect(pushes.some(p => p.payload.kind === 'podium')).toBe(false); // no subscriptions registered
    const champ = engine.championPlan(yesterday);
    expect(champ).toMatchObject({ displayName: 'Ben', earningsCents: engine.getPlan('u_b', yesterday).progress.earningsCents });
    expect(champ.tasks.every(t => t.status === 'done')).toBe(true);

    const memB = engine.getProfile('u_b').memory;
    expect(memB.favorites.length).toBeGreaterThan(0);
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
    expect(engine.allTimeLeaderboard()[0]).toMatchObject({ userId: 'u_b', wins: 1 });
  });

  test('streak insurance saves one empty day a week, then the streak breaks', async () => {
    await seedTwoDays();
    clock += 86_400_000; await engine.tick();          // day 1 closed: streak 1; day 2 open
    clock += 86_400_000; await engine.tick();          // day 2 empty: insured, streak stays 1
    const p = engine.getProfile('u_b');
    expect(p.insuranceUsedOn).toBe(Engine.shiftDate(engine.localDateKey(p), -1));
    expect(engine.getPlan('u_b', engine.localDateKey(p)).streak).toBe(1);
    expect(engine.inbox('u_b').some(i => i.kind === 'insurance')).toBe(true);
    clock += 86_400_000; await engine.tick();          // day 3 empty: no insurance left, streak 0, first penalty
    expect(engine.getPlan('u_b', engine.localDateKey(p)).streak).toBe(0);
    const day3 = Engine.shiftDate(engine.localDateKey(p), -1);
    expect(db.prepare('SELECT score, penalty, idle_streak FROM daily_scores WHERE user_id = ? AND date = ?').get('u_b', day3)).toMatchObject({ score: -C.IDLE_PENALTY, penalty: C.IDLE_PENALTY, idle_streak: 1 });
    clock += 86_400_000; await engine.tick();          // day 4 empty: penalty doubles, and now they are on the Bench
    const day4 = Engine.shiftDate(engine.localDateKey(p), -1);
    expect(db.prepare('SELECT score, idle_streak FROM daily_scores WHERE user_id = ? AND date = ?').get('u_b', day4)).toMatchObject({ score: -2 * C.IDLE_PENALTY, idle_streak: 2 });
    expect(engine.stats('u_b').benched).toBe(true);
    expect(engine.myRank('u_b', engine.localDateKey(p)).benched).toBe(true);
    expect(engine.bench(Engine.shiftDate(day4, 4)).find(b => b.userId === 'u_b')).toMatchObject({ idleStreak: 2 }); // a window without the big first day
    expect(engine.inbox('u_b').some(i => i.title === 'You are on the Bench')).toBe(true);
    // One finished play resets the penalty streak.
    const plan = engine.getPlan('u_b', engine.localDateKey(p));
    engine.updateTask('u_b', plan.tasks[0].taskId, { status: 'done' });
    clock += 86_400_000; await engine.tick();
    expect(db.prepare('SELECT idle_streak, penalty FROM daily_scores WHERE user_id = ? AND date = ?').get('u_b', Engine.shiftDate(engine.localDateKey(p), -1))).toMatchObject({ idle_streak: 0, penalty: 0 });
    expect(engine.stats('u_b').benched).toBe(false);
  });

  test('claimed gigs join the day as graded plays, and the crew can regrade', async () => {
    engine.saveProfile('u_a', { resources: ['vehicle'], tzOffset: 0 });
    const plan = await engine.ensurePlan('u_a');
    const t = engine.addTask('u_a', plan.date, { title: 'Indeed: warehouse shift', icon: '🎯', category: 'gig', hours: 4, difficulty: 8, steps: ['go'], why: 'found', sources: ['https://indeed.com/x'], gigUrl: 'https://indeed.com/x', estimatedEarnings: { low: 60, high: 90 } });
    expect(t).toMatchObject({ difficulty: 8, points: 8000, gigUrl: 'https://indeed.com/x', status: 'pending' });
    expect(t.startsMin).toBeGreaterThanOrEqual(plan.tasks[plan.tasks.length - 1].endsMin);
    engine.crew.approveTask = async () => ({ approved: true, difficulty: 10, reason: 'Twelve-hour double shift, verified.' });
    Object.defineProperty(engine.crew, 'online', { get: () => true });
    await finish('u_a', t.taskId, { earningsDollars: 150, note: 'brutal' });
    const fresh = engine.getPlan('u_a', plan.date).tasks.find(x => x.taskId === t.taskId);
    expect(fresh).toMatchObject({ graded: true, difficulty: 10, points: 10_000, approval: 'approved' });
    expect(engine.crewLog('u_a', plan.date).some(l => l.agent === 'Auditor' && /10\/10/.test(l.message))).toBe(true);
    expect(() => engine.addTask('u_a', '2020-01-01', { title: 'x', hours: 1 })).toThrow(/No plan/);
  });

  test('a Sunday close writes the weekly recap', async () => {
    clock = Date.parse('2026-09-13T12:00:00Z'); // Sunday
    engine.saveProfile('u_a', { resources: [], tzOffset: 0 });
    const plan = await engine.ensurePlan('u_a');
    await finish('u_a', plan.tasks[0].taskId, {earningsDollars: 40 });
    engine.updateTask('u_a', plan.tasks[1].taskId, { status: 'skipped' });
    const r = await engine.closeDay('u_a', '2026-09-13');
    expect(r.recap.headline).toMatch(/1 active day/);
    expect(r.recap.week).toMatchObject({ daysActive: 1, playsDone: 1, earnedCents: 4000, skippedMostCount: 1 });
    expect(engine.recaps('u_a')[0].weekEnd).toBe('2026-09-13');
    expect(engine.inbox('u_a').some(i => i.kind === 'recap')).toBe(true);
  });

  test('plans are not built before the crew\'s 4am window', async () => {
    addUser('u_c', 'Cy');
    engine.saveProfile('u_c', { resources: [], tzOffset: 0 });
    clock = Date.parse('2026-09-11T02:30:00Z');
    await engine.tick();
    expect(engine.getPlan('u_c', '2026-09-11')).toBeNull();
    clock = Date.parse('2026-09-11T04:05:00Z');
    await engine.tick();
    expect(engine.getPlan('u_c', '2026-09-11')).not.toBeNull();
  });

  test('the crew checks in once after a block ends, on the phone if one is registered', async () => {
    engine.saveProfile('u_a', { resources: [], tzOffset: 0, startHour: 8 });
    engine.push.subscribe('u_a', { endpoint: 'https://push.example/abc', keys: {} });
    clock = Date.parse('2026-09-09T08:30:00Z');
    const plan = await engine.ensurePlan('u_a');
    await engine.tick();
    expect(events.filter(e => e.e === 'checkin').length).toBe(0);
    clock = Date.parse('2026-09-09T00:00:00Z') + (plan.tasks[0].endsMin + C.CHECKIN_GRACE_MIN) * 60_000;
    await engine.tick();
    expect(events.filter(e => e.e === 'checkin').map(e => e.d.taskId)).toEqual([plan.tasks[0].taskId]);
    expect(pushes.map(p => p.payload.kind)).toEqual(['plan', 'checkin']);
    await engine.tick();
    expect(events.filter(e => e.e === 'checkin').length).toBe(1);
  });
});

describe('memberships', () => {
  test('only Veteran and Hall of Fame cost money; every crew feature is free', () => {
    expect(engine.tierOf('u_a')).toBe('free');
    for (const f of ['liveCrew', 'gigFinder', 'chat', 'receipts', 'localBoards', 'video', 'live']) expect(engine.allows('u_a', f)).toBe(true);
    expect(engine.allows('u_a', 'lowerFees')).toBe(false);
    expect(engine.regenerationsAllowed('u_a')).toBe(1);
    engine.setTier('u_a', 'veteran');
    expect(engine.regenerationsAllowed('u_a')).toBe(2);
    expect(engine.allows('u_a', 'lowerFees')).toBe(true);
    expect(engine.allows('u_a', 'noLegendFee')).toBe(false);
    engine.setTier('u_a', 'hof');
    expect(engine.tierInfo('u_a')).toMatchObject({ name: 'Self-Made Legends Hall of Fame', priceCents: 1499, regenerationsPerDay: 3, insurancePerWeek: 2 });
    expect(engine.badges('u_a').map(b => b.badge)).toContain('hall_of_fame');
    engine.setTier('u_a', 'allstar'); // old paid name: now a free rank, so membership drops to free
    expect(engine.tierOf('u_a')).toBe('free');
    expect(Engine.constants.TIER_PRICES_CENTS).toEqual({ free: 0, veteran: 1299, hof: 1499 });
    expect(() => engine.setTier('u_a', 'gold')).toThrow();
  });
});

describe('crew plan normalisation', () => {
  test('model output is coerced into the playbook shape, clocks parsed, bad URLs dropped', () => {
    const plan = Crew.normalizePlan({
      headline: 'h', focus: 'f', brief: ['b'],
      tasks: [{ title: 'Deliver', icon: '🛵', category: 'gig', hours: '2', startsAt: '11am', endsAt: '1:00pm', estimatedEarnings: { low: 20, high: 60 }, steps: ['a', 'b'], why: 'w', sources: ['https://ok.example', 'javascript:alert(1)'] }],
    }, '2026-09-09', 'crew');
    expect(plan.generatedBy).toBe('crew');
    expect(plan.tasks[0]).toMatchObject({ hours: 2, startsMin: 660, endsMin: 780, sources: ['https://ok.example'] });
    expect(plan.estimatedEarnings).toEqual({ low: 20, high: 60 });
  });
});
