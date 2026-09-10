// Faces, friends, messages, calls, live rooms, bot ratings, the Gig Finder,
// and the learning layer. In-memory SQLite, frozen clock, offline crew.
const request = require('supertest');
const { createApp } = require('../server');
const { open } = require('../src/db');
const Crew = require('../src/agents');
const Social = require('../src/social');
const Learning = require('../src/learning');

let app, clock, social, engine, gigs, events;
beforeAll(() => {
  clock = Date.parse('2026-09-10T15:00:00Z');
  ({ app, social, engine, gigs } = createApp({ db: open(':memory:'), now: () => clock, crew: new Crew({ apiKey: '' }), defaultTier: 'hof' }));
});
const auth = (t) => ({ Authorization: `Bearer ${t}` });
const signup = async (email, name) => (await request(app).post('/api/auth/register').send({ email, password: 'longenough', displayName: name, acceptTerms: true })).body;
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

describe('faces and people', () => {
  let ava, ben;
  beforeAll(async () => { ava = await signup('ava@x.com', 'Ava Stone'); ben = await signup('ben@x.com', 'Ben Ray'); await request(app).post('/api/profile').set(auth(ava.token)).send({ location: 'Atlanta, GA', resources: ['vehicle'], tzOffset: 0 }); await request(app).post('/api/profile').set(auth(ben.token)).send({ resources: [], tzOffset: 0 }); });

  test('everyone has a likeness; a photo replaces it; clearing brings the likeness back', async () => {
    let r = await request(app).get(`/api/avatar/${ava.user.id}`);
    expect(r.headers['content-type']).toMatch(/svg/);
    expect((r.text || r.body.toString())).toContain('AS');
    expect((await request(app).post('/api/me/avatar').set(auth(ava.token)).send({ image: 'data:text/plain;base64,aGk=' })).status).toBe(400);
    r = await request(app).post('/api/me/avatar').set(auth(ava.token)).send({ image: PNG });
    expect(r.status).toBe(200);
    r = await request(app).get(`/api/avatar/${ava.user.id}`);
    expect(r.headers['content-type']).toMatch(/png/);
    await request(app).delete('/api/me/avatar?style=legend').set(auth(ava.token));
    r = await request(app).get(`/api/avatar/${ava.user.id}`);
    expect((r.text || r.body.toString())).toContain('👑');
    expect(Social.likenessSVG('Cy', 'x', 'initials')).toContain('>C<');
  });

  test('search, friend request, accept, remove, block', async () => {
    let r = await request(app).get('/api/people?q=ben').set(auth(ava.token));
    expect(r.body.people[0]).toMatchObject({ name: 'Ben Ray', online: true });
    r = await request(app).post(`/api/friends/${ben.user.id}`).set(auth(ava.token));
    expect(r.body.friend.status).toBe('requested');
    expect((await request(app).get('/api/friends').set(auth(ben.token))).body.friends[0].status).toBe('incoming');
    r = await request(app).post(`/api/friends/${ava.user.id}`).set(auth(ben.token)); // accepting by requesting back
    expect(r.body.friend.status).toBe('friends');
    expect(social.areFriends(ava.user.id, ben.user.id)).toBe(true);
    expect((await request(app).post(`/api/friends/${ava.user.id}`).set(auth(ava.token))).status).toBe(400);
    await request(app).post(`/api/block/${ava.user.id}`).set(auth(ben.token));
    expect(social.areFriends(ava.user.id, ben.user.id)).toBe(false);
    expect((await request(app).post(`/api/friends/${ben.user.id}`).set(auth(ava.token))).status).toBe(400);
    expect((await request(app).post(`/api/messages/${ben.user.id}`).set(auth(ava.token)).send({ body: 'hey' })).status).toBe(400);
    await request(app).delete(`/api/block/${ava.user.id}`).set(auth(ben.token));
  });

  test('anyone can message anyone; threads, inbox, unread, and rate limits', async () => {
    let r = await request(app).post(`/api/messages/${ben.user.id}`).set(auth(ava.token)).send({ body: 'You up for a duel?' });
    expect(r.body.message).toMatchObject({ body: 'You up for a duel?', fromName: 'Ava Stone' });
    r = await request(app).get('/api/messages').set(auth(ben.token));
    expect(r.body.unread).toBe(1);
    expect(r.body.inbox[0]).toMatchObject({ name: 'Ava Stone', unread: 1, lastMine: false });
    r = await request(app).get(`/api/messages/${ava.user.id}`).set(auth(ben.token));
    expect(r.body.thread[0].mine).toBe(false);
    expect((await request(app).get('/api/messages').set(auth(ben.token))).body.unread).toBe(0);
    expect((await request(app).post(`/api/messages/${ben.user.id}`).set(auth(ava.token)).send({ body: '' })).status).toBe(400);
    for (let i = 0; i < 29; i++) await request(app).post(`/api/messages/${ben.user.id}`).set(auth(ava.token)).send({ body: 'spam ' + i });
    expect((await request(app).post(`/api/messages/${ben.user.id}`).set(auth(ava.token)).send({ body: 'one more' })).body.error).toMatch(/Slow down/);
    expect((await request(app).get('/api/me').set(auth(ben.token))).body.unreadMessages).toBe(29);
  });

  test('video calls relay signals between friends only, and log the call', async () => {
    const cy = await signup('cy@x.com', 'Cy Lee');
    expect((await request(app).post(`/api/calls/${cy.user.id}/signal`).set(auth(ava.token)).send({ type: 'ring' })).body.error).toMatch(/friends/);
    await request(app).post(`/api/friends/${ben.user.id}`).set(auth(ava.token)); await request(app).post(`/api/friends/${ava.user.id}`).set(auth(ben.token));
    const got = [];
    const off = (u, e, d) => { if (e === 'call') got.push({ u, d }); };
    engine.onEvent = (u, e, d) => off(u, e, d);
    expect((await request(app).post(`/api/calls/${ben.user.id}/signal`).set(auth(ava.token)).send({ type: 'ring' })).status).toBe(200);
    expect((await request(app).post(`/api/calls/${ben.user.id}/signal`).set(auth(ava.token)).send({ type: 'offer', payload: { sdp: 'x' } })).status).toBe(200);
    expect((await request(app).post(`/api/calls/${ava.user.id}/signal`).set(auth(ben.token)).send({ type: 'answer', payload: { sdp: 'y' } })).status).toBe(200);
    expect((await request(app).post(`/api/calls/${ben.user.id}/signal`).set(auth(ava.token)).send({ type: 'end' })).status).toBe(200);
    expect((await request(app).post(`/api/calls/${ben.user.id}/signal`).set(auth(ava.token)).send({ type: 'hack' })).status).toBe(400);
    const calls = (await request(app).get('/api/friends').set(auth(ava.token))).body.calls;
    expect(calls[0]).toMatchObject({ withName: 'Ben Ray', outgoing: true, status: 'ended' });
  });

  test('going live: viewers join, chat, rate the bot; the host ends it', async () => {
    let r = await request(app).post('/api/live').set(auth(ava.token)).send({ title: 'How my bot found me $300 today' });
    const room = r.body.room;
    expect(room).toMatchObject({ hostName: 'Ava Stone', status: 'live', viewers: 0 });
    expect((await request(app).get('/api/live')).body.live[0].id).toBe(room.id);
    expect((await request(app).get('/api/live')).body.iceServers[0].urls[0]).toMatch(/^stun:/);
    expect((await request(app).post(`/api/live/${room.id}/join`).set(auth(ava.token))).body.error).toMatch(/host/);
    r = await request(app).post(`/api/live/${room.id}/join`).set(auth(ben.token));
    expect(r.body.room.viewers).toBe(1);
    expect((await request(app).post(`/api/live/${room.id}/signal`).set(auth(ben.token)).send({ to: ava.user.id, type: 'offer', payload: {} })).status).toBe(200);
    expect((await request(app).post(`/api/live/${room.id}/signal`).set(auth(ben.token)).send({ to: 'someone', type: 'offer', payload: {} })).status).toBe(400);
    r = await request(app).post(`/api/live/${room.id}/chat`).set(auth(ben.token)).send({ body: 'Bot is amazing' });
    expect(r.body.message.name).toBe('Ben Ray');
    expect((await request(app).get(`/api/live/${room.id}/chat`)).body.messages.length).toBe(1);
    r = await request(app).post(`/api/live/${room.id}/rate`).set(auth(ben.token)).send({ rating: 5 });
    expect(r.body.rating).toEqual({ average: 5, count: 1 });
    expect((await request(app).post(`/api/live/${room.id}/rate`).set(auth(ava.token)).send({ rating: 5 })).status).toBe(400);
    await request(app).post(`/api/live/${room.id}/leave`).set(auth(ben.token));
    expect((await request(app).delete('/api/live').set(auth(ava.token))).body.ended).toBe(1);
    expect((await request(app).get('/api/live')).body.live).toEqual([]);
    expect((await request(app).post(`/api/live/${room.id}/join`).set(auth(ben.token))).status).toBe(400);
    expect((await request(app).get('/api/bot').set(auth(ava.token))).body.bot.rating).toEqual({ average: 5, count: 1 });
  });

  test('the Gig Finder always has real links, refreshes hourly, and claims become graded plays', async () => {
    const today = (await request(app).get('/api/today').set(auth(ava.token))).body;
    const found = today.gigs;
    expect(found.length).toBeGreaterThan(5);
    expect(found.some(g => g.platform === 'DoorDash')).toBe(true);   // has a vehicle
    expect(found.every(g => g.source === 'links' && g.status === 'found')).toBe(true);
    const before = today.plan.tasks.length;
    const pick = found.find(g => g.platform === 'Indeed');
    let r = await request(app).post(`/api/gigs/${pick.id}/claim`).set(auth(ava.token));
    expect(r.body.task).toMatchObject({ difficulty: pick.difficulty, points: pick.points, gigUrl: pick.url });
    expect((await request(app).post(`/api/gigs/${pick.id}/claim`).set(auth(ava.token))).status).toBe(400);
    const after = (await request(app).get('/api/today').set(auth(ava.token))).body;
    expect(after.plan.tasks.length).toBe(before + 1);
    expect(after.gigs.find(g => g.id === pick.id).status).toBe('claimed');
    await request(app).post(`/api/gigs/${found[1].id}/dismiss`).set(auth(ava.token));
    clock += 61 * 60 * 1000;
    const refreshed = (await request(app).post('/api/gigs/refresh').set(auth(ava.token))).body.gigs;
    expect(refreshed.find(g => g.id === pick.id).status).toBe('claimed');           // claimed gigs survive a refresh
    expect(refreshed.find(g => g.id === found[1].id).status).toBe('dismissed');
    expect(refreshed.filter(g => g.status === 'found').length).toBeGreaterThan(3);
  });
});

describe('learning', () => {
  test('outcomes move user, city and world weights and the blend trusts the closest layer', () => {
    const db = open(':memory:');
    const L = new Learning(db, { now: () => clock });
    const prof = { location: 'Atlanta, GA' };
    for (let i = 0; i < 3; i++) L.observe('u1', prof, 'yard_work', { done: false });
    for (let i = 0; i < 10; i++) L.observe('u2', prof, 'yard_work', { done: true, earnRatio: 1.5 });
    const w1 = L.weights('u1', prof).yard_work;
    const w2 = L.weights('u2', prof).yard_work;
    expect(w1.doneRate).toBeLessThan(w2.doneRate);
    expect(w2.earnRatio).toBeGreaterThan(1);
    expect(L.weights('stranger', { location: 'Boise, ID' }).yard_work.confidence).toBeGreaterThan(0); // the world still teaches
    const iq = L.botIQ('u2');
    expect(iq.iq).toBeGreaterThan(L.botIQ('nobody').iq);
    expect(iq.outcomesFromWorld).toBe(13);
  });
});
