// Money and community: tips and the platform fee, payouts, the Legend Fee,
// the revenue dashboard, the Grind Feed, receipt cards, streak stories,
// Final Call, University, safety check-ins, mentors, City vs City, the Monday
// Money Bracket, Challenge Days, prize pools, the weekly show, and the crew's
// ideas report. In-memory SQLite, frozen clock, offline crew.
const { open } = require('../src/db');
const Engine = require('../src/engine');
const Crew = require('../src/agents');
const Money = require('../src/money');
const Community = require('../src/community');
const University = require('../src/university');

let clock, db, engine, money, community, events;
const finish = async (uid, taskId, opts = {}) => { engine.updateTask(uid, taskId, { status: 'done', ...opts }); return (await engine.requestApproval(uid, taskId, { note: opts.note || 'Did it start to finish, met the client at their place, finished on time. Logged what it paid; if nothing is logged it paid nothing today.' })).plan; };
function addUser(id, name, extra = {}) {
  db.prepare("INSERT INTO users (id, email, display_name, password_hash, tier, referral_code, created_at) VALUES (?, ?, ?, 'x', 'allstar', ?, 0)").run(id, `${id}@x.com`, name, id.toUpperCase());
  if (extra.profile) engine.saveProfile(id, extra.profile);
}
async function fullDay(id, dollars = 20) {
  const plan = await engine.ensurePlan(id);
  for (const t of plan.tasks) await finish(id, t.taskId, {earningsDollars: dollars });
  return engine.getPlan(id, plan.date);
}

beforeEach(() => {
  clock = Date.parse('2026-09-09T15:00:00Z'); // Wednesday
  events = [];
  db = open(':memory:');
  const crew = new Crew({ apiKey: '' });
  const onEvent = (u, e, d) => events.push({ u, e, d });
  engine = new Engine(db, { crew, now: () => clock, defaultTier: 'allstar', onEvent });
  money = new Money(db, { now: () => clock, env: {} });
  community = new Community(db, { engine, money, crew, now: () => clock, onEvent });
  engine.community = community;
  addUser('u_a', 'Ava Stone', { profile: { location: 'Atlanta, GA', resources: ['vehicle', 'beauty'], tzOffset: 0, gender: 'woman', safetyContact: 'Mom 555-0100' } });
  addUser('u_b', 'Ben Ray', { profile: { location: 'Austin, TX', resources: ['laptop'], tzOffset: 0, gender: 'man' } });
});

describe('money', () => {
  test('a tip splits the platform fee and lands in the Legend\'s payout balance', async () => {
    const t = await money.createTip({ id: 'u_a', displayName: 'Ava Stone' }, { amountCents: 2000, fromName: 'Fan', message: 'go' });
    expect(t).toMatchObject({ fee: 300, net: 1700, url: null });
    money.markTipPaid(t.tipId, 'test');
    money.markTipPaid(t.tipId, 'test'); // idempotent
    expect(money.balance('u_a')).toBe(1700);
    expect(money.tipsFor('u_a')[0]).toMatchObject({ fromName: 'Fan', netCents: 1700 });
    await expect(money.createTip({ id: 'u_a', displayName: 'A' }, { amountCents: 50 })).rejects.toThrow(/Tips are/);
    const r = money.revenue();
    expect(r.months[0]).toMatchObject({ platformCents: 300, grossCents: 2000 });
    expect(r.owedToLegendsCents).toBe(1700);
  });

  test('fees can be changed by the owner and persist', () => {
    money.setFee('TIP_FEE_PCT', 25);
    expect(new Money(db, { env: {} }).fees.TIP_FEE_PCT).toBe(25);
    expect(() => money.setFee('NOPE', 1)).toThrow();
    expect(money.split(1000, 25)).toEqual({ gross: 1000, fee: 250, net: 750 });
  });

  test('manual payout clears the balance and hits the ledger', async () => {
    const t = await money.createTip({ id: 'u_a', displayName: 'A' }, { amountCents: 1000 });
    money.markTipPaid(t.tipId);
    const p = await money.payout('u_a', { method: 'manual', ref: 'cashapp' });
    expect(p.amountCents).toBe(850);
    expect(money.balance('u_a')).toBe(0);
    await expect(money.payout('u_a')).rejects.toThrow(/Nothing/);
    await expect(money.payout('u_b', { method: 'stripe' })).rejects.toThrow();
  });

  test('the Legend Fee is computed on verified earnings only and recorded at month close', async () => {
    engine.crew.readReceipt = async () => ({ verified: true, amountDollars: 200, source: 'DoorDash', confidence: 0.9 });
    const plan = await engine.ensurePlan('u_a');
    await finish('u_a', plan.tasks[1].taskId, {earningsDollars: 500 }); // self-reported: not billable
    await engine.verifyReceipt('u_a', plan.tasks[0].taskId, 'aGVsbG8=', 'image/png');
    await engine.closeDay('u_a', plan.date);
    const f = money.successFeeFor('u_a', '2026-09');
    expect(f).toMatchObject({ verifiedCents: 20000, feeCents: 1000, pct: 5, optedIn: true, billable: false });
    const results = await money.closeMonth('2026-09');
    expect(results[0]).toMatchObject({ userId: 'u_a', feeCents: 1000, status: 'uncollectable' });
    expect(await money.closeMonth('2026-09')).toEqual([]); // idempotent
    db.prepare('UPDATE users SET success_fee_optin = 0 WHERE id = ?').run('u_a');
    expect(money.successFeeFor('u_a', '2026-09').optedIn).toBe(false);
  });

  test('with Stripe, tips go through Checkout and month close invoices customers with a card', async () => {
    const calls = [];
    const stripe = {
      checkout: { sessions: { create: async (p) => { calls.push(['checkout', p]); return { id: 'cs_1', url: 'https://stripe.test/cs_1' }; } } },
      invoiceItems: { create: async (p) => { calls.push(['item', p]); return {}; } },
      invoices: { create: async () => ({ id: 'in_1' }), finalizeInvoice: async (id) => { calls.push(['finalize', id]); } },
    };
    const m = new Money(db, { now: () => clock, stripe, env: {} });
    db.prepare("UPDATE users SET stripe_account_id = 'acct_1' WHERE id = 'u_a'").run();
    const t = await m.createTip({ id: 'u_a', displayName: 'A', stripeAccountId: 'acct_1' }, { amountCents: 1000, successUrl: 's', cancelUrl: 'c' });
    expect(t.url).toBe('https://stripe.test/cs_1');
    expect(calls[0][1].payment_intent_data).toEqual({ application_fee_amount: 150, transfer_data: { destination: 'acct_1' } });
    m.markTipPaid(t.tipId, 'pi_1');
    expect(m.balance('u_a')).toBe(0); // paid straight to the connected account
    db.prepare("UPDATE users SET stripe_customer_id = 'cus_1' WHERE id = 'u_a'").run();
    db.prepare("INSERT INTO daily_scores (user_id, date, verified_cents, closed, updated_at) VALUES ('u_a','2026-08-03',40000,1,0)").run();
    const r = await m.closeMonth('2026-08');
    expect(r[0]).toMatchObject({ feeCents: 2000, status: 'invoiced' });
    expect(calls.some(c => c[0] === 'finalize')).toBe(true);
  });
});

describe('feed, cards and stories', () => {
  test('finishing and verifying plays posts to the Grind Feed with first name and city', async () => {
    const plan = await engine.ensurePlan('u_a');
    await finish('u_a', plan.tasks[0].taskId, {earningsDollars: 40 });
    engine.crew.readReceipt = async () => ({ verified: true, amountDollars: 60, source: 'Cash App', confidence: 0.9 });
    await engine.verifyReceipt('u_a', plan.tasks[1].taskId, 'aGVsbG8=', 'image/png');
    const feed = community.feed();
    expect(feed[1].text).toMatch(/^Ava in Atlanta, GA just finished .* and logged \$40\.$/);
    expect(feed[0]).toMatchObject({ kind: 'verified', amountCents: 6000 });
    expect(events.filter(e => e.e === 'feed').length).toBe(2);
    db.prepare("UPDATE users SET public_profile = 0 WHERE id = 'u_a'").run();
    engine.updateTask('u_a', plan.tasks[2].taskId, { status: 'done' });
    expect(community.feed().length).toBe(2); // private players stay off the feed
  });

  test('a receipt card carries the day and renders as SVG', async () => {
    await fullDay('u_a', 25);
    const plan = engine.getPlan('u_a', '2026-09-09');
    const card = community.card('u_a', '2026-09-09');
    expect(card).toMatchObject({ name: 'Ava Stone', city: 'Atlanta, GA', tasksDone: plan.tasks.length, score: plan.progress.score });
    const svg = community.cardSVG(card);
    expect(svg).toContain('RISE');
    expect(svg).toContain('Ava Stone');
    expect(svg).toContain('Every play done');
    expect(community.card('u_a', '2020-01-01')).toBeNull();
  });

  test('a 7-day streak writes a shareable story and a badge', async () => {
    for (let i = 0; i < 7; i++) {
      const plan = await engine.ensurePlan('u_a');
      await finish('u_a', plan.tasks[0].taskId, {earningsDollars: 30 });
      await engine.closeDay('u_a', plan.date);
      clock += 86_400_000;
    }
    const stories = community.stories('u_a');
    expect(stories.length).toBe(1);
    expect(stories[0]).toMatchObject({ kind: 'streak_7', name: 'Ava Stone' });
    expect(stories[0].body).toMatch(/7 days/);
    expect(community.latestStories()[0].url).toBe(`/story/${stories[0].id}`);
    expect(engine.badges('u_a').map(b => b.badge)).toContain('streak_7');
  });

  test('public profile hides private players and shows tips and stories', async () => {
    const p = community.publicProfile('ava stone');
    expect(p).toMatchObject({ displayName: 'Ava Stone', city: 'Atlanta, GA' });
    db.prepare("UPDATE users SET public_profile = 0 WHERE id = 'u_a'").run();
    expect(community.publicProfile('Ava Stone')).toBeNull();
  });
});

describe('the day', () => {
  test('Final Call goes out once after 8pm local with rank and gap', async () => {
    await engine.ensurePlan('u_a'); await engine.ensurePlan('u_b');
    const pa = engine.getPlan('u_a', '2026-09-09');
    await finish('u_b', engine.getPlan('u_b', '2026-09-09').tasks[0].taskId, { earningsDollars: 100 });
    expect(community.finalCall(engine.getProfile('u_a'), '2026-09-09')).toBe(false);
    clock = Date.parse('2026-09-09T20:05:00Z');
    expect(community.finalCall(engine.getProfile('u_a'), '2026-09-09')).toBe(true);
    expect(community.finalCall(engine.getProfile('u_a'), '2026-09-09')).toBe(false);
    const msg = engine.inbox('u_a').find(i => i.kind === 'final_call');
    expect(msg.body).toMatch(/#2 of 2, \d+ points behind the leader/);
    expect(pa.status).toBe('open');
  });

  test('University: a correct answer adds points to the day and never repeats a passed lesson', async () => {
    const plan = await engine.ensurePlan('u_a');
    const lesson = community.lessonFor('u_a', plan.date);
    expect(lesson.answered).toBe(false);
    const wrong = (University.LESSONS.find(l => l.id === lesson.id).answer + 1) % 3;
    const r = community.answerLesson('u_a', plan.date, lesson.id, wrong);
    expect(r).toMatchObject({ correct: false, points: 0 });
    expect(() => community.answerLesson('u_a', plan.date, lesson.id, 0)).toThrow(/already/);
    const next = community.lessonFor('u_a', Engine.shiftDate(plan.date, 1));
    const ok = community.answerLesson('u_a', plan.date, next.id, University.LESSONS.find(l => l.id === next.id).answer);
    expect(ok).toMatchObject({ correct: true, points: University.POINTS_PER_CORRECT });
    expect(engine.getPlan('u_a', plan.date).progress.score).toBe(University.POINTS_PER_CORRECT);
    expect(engine.leaderboard(plan.date)[0].score).toBe(University.POINTS_PER_CORRECT);
    expect(community.lessonFor('u_a', Engine.shiftDate(plan.date, 2)).id).not.toBe(next.id);
  });

  test('safety sessions share a live status link and only the owner can update it', async () => {
    const plan = await engine.ensurePlan('u_a');
    const s = community.startSafety('u_a', { taskId: plan.tasks[0].taskId, place: '12 Peach St', eta: '3pm' });
    expect(s).toMatchObject({ status: 'heading', task: plan.tasks[0].title, contact: 'Mom 555-0100' });
    expect(community.activeSafety('u_a').token).toBe(s.token);
    expect(() => community.updateSafety('u_b', s.token, 'arrived')).toThrow(/Not found/);
    expect(community.updateSafety('u_a', s.token, 'done').status).toBe('done');
    expect(community.activeSafety('u_a')).toBeUndefined();
    expect(() => community.updateSafety('u_a', s.token, 'lost')).toThrow(/Unknown/);
  });
});

describe('mentors and leagues of cities', () => {
  test('mentoring needs a track record; a paid answer splits the fee', async () => {
    expect(() => community.becomeMentor('u_a', { topics: ['nails'] })).toThrow(/7 closed days/);
    db.prepare("UPDATE daily_scores SET rank = 1 WHERE 1=0").run();
    for (let i = 0; i < 7; i++) db.prepare("INSERT INTO daily_scores (user_id, date, score, tasks_done, closed, updated_at) VALUES ('u_a', ?, 100, 1, 1, 0)").run(Engine.shiftDate('2026-09-01', i));
    const m = community.becomeMentor('u_a', { topics: ['nails', 'pricing'], priceDollars: 10, bio: 'Ask me.' });
    expect(m).toMatchObject({ name: 'Ava Stone', priceCents: 1000, topics: ['nails', 'pricing'] });
    expect(() => community.ask('u_a', 'u_a', 'how do I price?')).toThrow(/someone else/);
    const q = community.ask('u_b', 'u_a', 'How do I price a full set?');
    expect(q).toMatchObject({ status: 'open', priceCents: 1000 });
    expect(() => community.answer('u_b', q.id, 'no')).toThrow(/Not found/);
    const a = community.answer('u_a', q.id, 'Start at $45 and raise it when you are booked a week out.');
    expect(a.status).toBe('answered');
    expect(money.balance('u_a')).toBe(800);
    expect(money.revenue().months[0].platformCents).toBe(200);
    expect(engine.inbox('u_b').some(i => i.kind === 'mentor')).toBe(true);
    community.stopMentoring('u_a');
    expect(community.mentors().length).toBe(0);
  });

  test('City vs City ranks cities by verified dollars for the week', async () => {
    db.prepare("INSERT INTO daily_scores (user_id, date, score, earnings_cents, verified_cents, city, region, country, closed, updated_at) VALUES ('u_a','2026-09-08',300,10000,8000,'Atlanta','GA','US',1,0)").run();
    db.prepare("INSERT INTO daily_scores (user_id, date, score, earnings_cents, verified_cents, city, region, country, closed, updated_at) VALUES ('u_b','2026-09-08',500,20000,3000,'Austin','TX','US',1,0)").run();
    const ws = Community.weekStart('2026-09-09');
    expect(ws).toBe('2026-09-07');
    const board = community.cityBoard(ws);
    expect(board.map(c => c.city)).toEqual(['Atlanta, GA', 'Austin, TX']);
    expect(community.cityMatchup(ws)).toMatchObject({ leader: 'Atlanta, GA', aPct: 73 });
  });
});

describe('brackets, challenge days, prizes, show, ideas', () => {
  test('the Monday Money Bracket seeds, runs daily rounds, and crowns a Bracket Legend', async () => {
    addUser('u_c', 'Cy Lee', { profile: { resources: [], tzOffset: 0 } });
    addUser('u_d', 'Dee Fox', { profile: { resources: [], tzOffset: 0 } });
    clock = Date.parse('2026-09-12T12:00:00Z'); // Saturday: enter next week's bracket
    const ws = '2026-09-14';
    for (const u of ['u_a', 'u_b', 'u_c', 'u_d']) community.enterBracket(u, ws);
    let b = community.ensureBracket(ws);
    expect(b.status).toBe('open');
    expect(b.entries.length).toBe(4);
    // Seeds come from last week's verified earnings.
    db.prepare("INSERT INTO daily_scores (user_id, date, verified_cents, score, closed, updated_at) VALUES ('u_d','2026-09-10',9000,10,1,0)").run();
    clock = Date.parse('2026-09-14T05:00:00Z'); // Monday
    await community.weeklyTick('2026-09-14');
    b = community.ensureBracket(ws);
    expect(b.status).toBe('running');
    expect(b.entries.find(e => e.userId === 'u_d').seed).toBe(1);
    expect(b.matches.filter(m => m.round === 1).length).toBe(2);
    // Round 1 scores: everyone plays Monday.
    for (const u of ['u_a', 'u_b', 'u_c', 'u_d']) { const p = await engine.ensurePlan(u, '2026-09-14'); await finish(u, p.tasks[0].taskId, {earningsDollars: u === 'u_a' ? 1000 : 10 }); }
    clock = Date.parse('2026-09-15T05:00:00Z');
    await engine.tick(); // closes Monday for everyone, then advances the bracket
    b = community.ensureBracket(ws);
    expect(b.round).toBe(2);
    expect(b.entries.filter(e => e.alive).length).toBe(2);
    expect(b.entries.find(e => e.userId === 'u_a').alive).toBe(true);
    for (const e of b.entries.filter(e => e.alive)) { const p = await engine.ensurePlan(e.userId, '2026-09-15'); await finish(e.userId, p.tasks[0].taskId, {earningsDollars: e.userId === 'u_a' ? 1000 : 5 }); }
    clock = Date.parse('2026-09-16T05:00:00Z');
    await engine.tick();
    b = community.ensureBracket(ws);
    expect(b).toMatchObject({ status: 'done', winnerName: 'Ava Stone' });
    expect(engine.badges('u_a').map(x => x.badge)).toContain('bracket_legend');
    expect(community.feed().some(f => f.kind === 'bracket')).toBe(true);
  });

  test('a paid bracket pools entries minus the platform cut and pays the winner\'s balance', () => {
    community.ensureBracket('2026-09-21', { entryCents: 1000 });
    community.enterBracket('u_a', '2026-09-21'); community.enterBracket('u_b', '2026-09-21');
    const b = community.ensureBracket('2026-09-21');
    expect(b.poolCents).toBe(1800);
    expect(money.revenue().months[0].platformCents).toBe(200);
  });

  test('a Challenge Day counts who beat the celebrity and awards the badge at close', async () => {
    const c = community.createChallengeDay({ name: 'Big Star', slug: 'big-star', headline: 'Beat my day', date: '2026-09-09', targetScore: 150, targetDollars: 400, plan: { tasks: [{ title: 'Signed 20 hats', hours: 2 }] } });
    expect(c.url).toBe('/challenge/big-star');
    expect(community.activeChallenges('2026-09-09').length).toBe(1);
    await fullDay('u_a', 50);
    expect(community.challengeDay('big-star').beaters[0].name).toBe('Ava Stone');
    clock += 86_400_000;
    await engine.tick();
    expect(engine.badges('u_a').map(b => b.badge)).toContain('beat_big-star');
    expect(() => community.createChallengeDay({ name: 'x', date: 'nope' })).toThrow(/Date/);
  });

  test('a sponsored prize pool takes the platform cut up front and pays the top verified earner', () => {
    const p = community.createPrizePool({ month: '2026-08', sponsor: 'Big Brand', amountDollars: 1000 });
    expect(p).toMatchObject({ amountCents: 90000, status: 'open' });
    expect(money.revenue().months[0].platformCents).toBe(10000);
    expect(community.settlePrizePool('2026-08')).toBeNull(); // nobody verified anything
    db.prepare("INSERT INTO daily_scores (user_id, date, verified_cents, score, closed, updated_at) VALUES ('u_b','2026-08-20',5000,100,1,0)").run();
    const settled = community.settlePrizePool('2026-08');
    expect(settled).toMatchObject({ status: 'paid', winnerId: 'u_b' });
    expect(money.balance('u_b')).toBe(90000);
    expect(engine.badges('u_b').map(b => b.badge)).toContain('monthly_legend');
  });

  test('the weekly show and the crew\'s ideas are written once per week', async () => {
    await fullDay('u_a', 40);
    await engine.closeDay('u_a', '2026-09-09');
    const show = await community.writeShow('2026-09-13');
    expect(show.title).toMatch(/Legend of the Week: Ava Stone/);
    expect(show.week.champion.displayName).toBe('Ava Stone');
    expect(engine.badges('u_a').map(b => b.badge)).toContain('legend_of_week');
    expect((await community.writeShow('2026-09-13')).weekEnd).toBe('2026-09-13');
    const ideas = await community.writeIdeas('2026-09-13');
    expect(ideas.length).toBeGreaterThan(0);
    expect(ideas.every(i => i.status === 'new' && i.agent)).toBe(true);
    community.setIdeaStatus(ideas[0].id, 'doing');
    expect(community.ideas()[0].status).toBe('doing');
    const stats = community.appStats('2026-09-13');
    expect(stats.activePlayers).toBe(1);
    expect(stats.womenShare).toBe(1);
  });

  test('women\'s board and category boards', async () => {
    const pa = await engine.ensurePlan('u_a'); const pb = await engine.ensurePlan('u_b');
    await finish('u_a', pa.tasks[0].taskId, {});
    await finish('u_b', pb.tasks[0].taskId, {});
    expect(engine.leaderboard('2026-09-09', { scope: 'women' }).map(r => r.userId)).toEqual(['u_a']);
    expect(engine.leaderboard('2026-09-09', { category: pa.progress.category }).some(r => r.userId === 'u_a')).toBe(true);
    clock += 86_400_000; await engine.tick();
    expect(engine.badges('u_a').map(b => b.badge)).toContain('womens_grind');
  });
});
