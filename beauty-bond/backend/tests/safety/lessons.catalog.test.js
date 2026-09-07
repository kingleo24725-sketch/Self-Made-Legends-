/**
 * Dad + Daughter Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 * Proprietary and confidential. Unauthorized use is prohibited.
 *
 * The Learn tab is only a feature if the lessons it lists exist, load their
 * own steps, and finishing one leaves a mark. None of that was true: the
 * lessons table was empty, every topic played three demo steps, and
 * progress went to an id that could not be a uuid. This pins the loop end
 * to end — catalogue, resolution by slug, progress, streak, badge, meter.
 */
const fs = require('fs');
const path = require('path');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../src/server');
const db = require('../../src/config/db');
const config = require('../../src/config');

const APP = path.join(__dirname, '../../../app');
const tokenFor = (userId, profileId) =>
  jwt.sign({ userId, profileId }, config.jwt.secret, { expiresIn: '15m' });

const stamp = Date.now();
let user, dad, daughter, auth, childAuth;

beforeAll(async () => {
  user = await db.one(`INSERT INTO users (email, password_hash, region)
                        VALUES ($1,'x','US') RETURNING *`, [`lessons_${stamp}@sml.test`]);
  dad = await db.one(`INSERT INTO profiles (user_id, display_name, birth_date, age_band, mode)
                       VALUES ($1,'Andre','1984-07-11','adult','dad_daughter') RETURNING *`, [user.id]);
  daughter = await db.one(`INSERT INTO profiles (guardian_id, display_name, birth_date, age_band, mode)
                            VALUES ($1,'Imani','2016-01-20','child','dad_daughter') RETURNING *`, [dad.id]);
  auth = `Bearer ${tokenFor(user.id, dad.id)}`;
  childAuth = `Bearer ${tokenFor(user.id, daughter.id)}`;
});

afterAll(async () => {
  await db.query('DELETE FROM profiles WHERE guardian_id = $1', [dad.id]);
  await db.query('DELETE FROM users WHERE id = $1', [user.id]);
});

describe('the catalogue matches what the app lists', () => {
  const slugsInDb = async () =>
    new Set((await db.query('SELECT slug FROM lessons WHERE slug IS NOT NULL')).map((r) => r.slug));

  test('every Safe Makeup Learning topic is a real lesson with steps', async () => {
    const constants = fs.readFileSync(path.join(APP, 'utils/constants.js'), 'utf8');
    const block = constants.match(/SAFE_LEARNING_TOPICS = \[([\s\S]*?)\n\];/)[1];
    const keys = [...block.matchAll(/key:\s*'(\w+)'/g)].map((m) => m[1]);
    expect(keys.length).toBe(5);
    const have = await slugsInDb();
    keys.forEach((k) => expect(have.has(k)).toBe(true));
  });

  test('every Dad School lesson is a real lesson with steps', async () => {
    const src = fs.readFileSync(path.join(APP, 'screens/DadSchoolScreen.js'), 'utf8');
    const ids = [...src.matchAll(/\{ id:\s*'(dad_\w+)'/g)].map((m) => m[1]);
    expect(ids.length).toBe(5);
    const have = await slugsInDb();
    ids.forEach((k) => expect(have.has(k)).toBe(true));
  });

  test('no lesson in the catalogue is empty', async () => {
    const rows = await db.query(
      `SELECT slug, jsonb_array_length(steps) AS n FROM lessons WHERE slug IS NOT NULL`);
    rows.forEach((r) => expect(r.n).toBeGreaterThanOrEqual(3));
  });
});

describe('a lesson resolves by slug and reads camelCase', () => {
  test('GET /lessons/brush_basics', async () => {
    const res = await request(app).get('/api/lessons/brush_basics').set('Authorization', auth);
    expect(res.status).toBe(200);
    expect(res.body.lesson.slug).toBe('brush_basics');
    expect(res.body.lesson.steps.length).toBe(5);
    expect(res.body.lesson.steps[0]).toHaveProperty('supervisionRequired');
    expect(res.body.lesson.steps[0]).not.toHaveProperty('supervision_required');
    expect(res.body.progress).toEqual({ stepIndex: 0, completedAt: null });
  });

  test('the same lesson by uuid', async () => {
    const res = await request(app).get('/api/lessons/a1000000-0000-4000-8000-000000000001')
      .set('Authorization', auth);
    expect(res.status).toBe(200);
    expect(res.body.lesson.slug).toBe('brush_basics');
  });

  test('an unknown slug is a 404, not a cast error', async () => {
    const res = await request(app).get('/api/lessons/demo').set('Authorization', auth);
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('lesson_not_found');
  });

  test('eye safety marks the waterline step as supervised', async () => {
    const res = await request(app).get('/api/lessons/eye_safety').set('Authorization', auth);
    expect(res.body.lesson.steps.some((s) => s.supervisionRequired)).toBe(true);
  });
});

describe('finishing a lesson leaves a mark', () => {
  test('mid-lesson progress is stored and resumable', async () => {
    const res = await request(app).post('/api/lessons/dad_ponytail/progress')
      .set('Authorization', auth).send({ stepIndex: 2 });
    expect(res.status).toBe(200);
    expect(res.body.stepIndex).toBe(2);
    expect(res.body.badgesAwarded).toEqual([]);

    const back = await request(app).get('/api/lessons/dad_ponytail').set('Authorization', auth);
    expect(back.body.progress.stepIndex).toBe(2);
  });

  test('first completion: first_lesson badge, streak 1, +10 on the Bond Meter', async () => {
    const before = await request(app).get('/api/me/progression').set('Authorization', auth);
    const res = await request(app).post('/api/lessons/dad_ponytail/progress')
      .set('Authorization', auth).send({ stepIndex: 4, completed: true });
    expect(res.status).toBe(200);
    expect(res.body.completedAt).toBeTruthy();
    expect(res.body.badgesAwarded).toContain('first_lesson');

    const after = await request(app).get('/api/me/progression').set('Authorization', auth);
    expect(after.body.lessonsCompleted).toBe(1);
    expect(after.body.streak.current).toBe(1);
    expect(after.body.badges.map((b) => b.code)).toContain('first_lesson');
    expect(after.body.bond.meter).toBe(before.body.bond.meter + 10);
  });

  test('replaying it earns nothing twice', async () => {
    const res = await request(app).post('/api/lessons/dad_ponytail/progress')
      .set('Authorization', auth).send({ stepIndex: 4, completed: true });
    expect(res.body.badgesAwarded).toEqual([]);
    const after = await request(app).get('/api/me/progression').set('Authorization', auth);
    expect(after.body.lessonsCompleted).toBe(1);
    expect(after.body.bond.meter).toBe(10);
  });

  test('a topic badge on top of the first one', async () => {
    const res = await request(app).post('/api/lessons/brush_basics/progress')
      .set('Authorization', childAuth).send({ stepIndex: 5, completed: true });
    expect(res.status).toBe(200);
    expect(res.body.badgesAwarded).toEqual(expect.arrayContaining(['first_lesson', 'brush_care']));
  });

  test('the daughter sees the same meter as the dad', async () => {
    const his = await request(app).get('/api/me/progression').set('Authorization', auth);
    const hers = await request(app).get('/api/me/progression').set('Authorization', childAuth);
    expect(hers.body.bond.meter).toBe(his.body.bond.meter);
    expect(hers.body.bond.meter).toBe(20);
  });
});
