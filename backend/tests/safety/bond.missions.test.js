/**
 * Dad + Daughter Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 * Proprietary and confidential. Unauthorized use is prohibited.
 *
 * A bond mission is something two people did together, so it completes
 * only when both say so. This pins the catalogue exists, that nobody
 * starts with missions already done, that a dad without a daughter is
 * told so rather than ticking into a void, and that both ticks move the
 * one shared meter.
 */
const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../src/server');
const db = require('../../src/config/db');
const config = require('../../src/config');

const tokenFor = (userId, profileId) =>
  jwt.sign({ userId, profileId }, config.jwt.secret, { expiresIn: '15m' });

const stamp = Date.now();
let user, dad, solo, daughter, auth, soloAuth, childAuth, mission;

beforeAll(async () => {
  user = await db.one(`INSERT INTO users (email, password_hash, region)
                        VALUES ($1,'x','US') RETURNING *`, [`missions_${stamp}@sml.test`]);
  dad = await db.one(`INSERT INTO profiles (user_id, display_name, birth_date, age_band, mode)
                       VALUES ($1,'Andre','1984-07-11','adult','dad_daughter') RETURNING *`, [user.id]);
  solo = await db.one(`INSERT INTO profiles (user_id, display_name, birth_date, age_band, mode)
                        VALUES ($1,'Solo','1984-07-11','adult','dad_daughter') RETURNING *`, [user.id]);
  daughter = await db.one(`INSERT INTO profiles (guardian_id, display_name, birth_date, age_band, mode)
                            VALUES ($1,'Imani','2016-01-20','child','dad_daughter') RETURNING *`, [dad.id]);
  auth = `Bearer ${tokenFor(user.id, dad.id)}`;
  soloAuth = `Bearer ${tokenFor(user.id, solo.id)}`;
  childAuth = `Bearer ${tokenFor(user.id, daughter.id)}`;
});

afterAll(async () => {
  await db.query('DELETE FROM profiles WHERE guardian_id = $1', [dad.id]);
  await db.query('DELETE FROM users WHERE id = $1', [user.id]);
});

test('the catalogue exists and nothing starts done', async () => {
  const res = await request(app).get('/api/bond/missions').set('Authorization', auth);
  expect(res.status).toBe(200);
  expect(res.body.missions.length).toBeGreaterThanOrEqual(5);
  res.body.missions.forEach((m) => {
    expect(m.confirmedBy).toEqual([]);
    expect(m.confirmedByMe).toBe(false);
    expect(m.completedAt).toBeNull();
    expect(m.points).toBeGreaterThan(0);
  });
  mission = res.body.missions[0];
});

test('a dad with no daughter cannot tick a mission for a pair that does not exist', async () => {
  const res = await request(app).post(`/api/bond/missions/${mission.id}/confirm`)
    .set('Authorization', soloAuth);
  expect(res.status).toBe(409);
  expect(res.body.error).toBe('no_bond_partner');
});

test('one tick is waiting, two ticks complete it and move the shared meter', async () => {
  const before = (await request(app).get('/api/me/progression').set('Authorization', auth)).body.bond.meter;

  const his = await request(app).post(`/api/bond/missions/${mission.id}/confirm`).set('Authorization', auth);
  expect(his.status).toBe(200);
  expect(his.body.complete).toBe(false);
  expect(his.body.waitingOn).toBe('Imani');
  expect(his.body.meter).toBe(before);

  const list = (await request(app).get('/api/bond/missions').set('Authorization', childAuth)).body.missions;
  const hers = list.find((m) => m.id === mission.id);
  expect(hers.confirmedByMe).toBe(false);
  expect(hers.confirmedBy).toEqual([dad.id]);

  const done = await request(app).post(`/api/bond/missions/${mission.id}/confirm`).set('Authorization', childAuth);
  expect(done.body.complete).toBe(true);
  expect(done.body.waitingOn).toBeNull();
  expect(done.body.meter).toBe(before + mission.points);

  const again = (await request(app).get('/api/me/progression').set('Authorization', auth)).body.bond.meter;
  expect(again).toBe(before + mission.points);
});

test('ticking twice does not pay twice', async () => {
  const before = (await request(app).get('/api/me/progression').set('Authorization', auth)).body.bond.meter;
  await request(app).post(`/api/bond/missions/${mission.id}/confirm`).set('Authorization', auth);
  const after = (await request(app).get('/api/me/progression').set('Authorization', auth)).body.bond.meter;
  expect(after).toBe(before);
});
