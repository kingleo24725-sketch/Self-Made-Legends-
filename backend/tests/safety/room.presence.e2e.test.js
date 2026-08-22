/**
 * Dad + Daughter Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 * Proprietary and confidential. Unauthorized copying, distribution,
 * or use of this file, via any medium, is strictly prohibited.
 *
 * RELEASE BLOCKER — docs/video-rooms.md Rule 1: a U13 is never in a room with
 * an adult who is not their guardian or a guardian-trusted adult.
 *
 * roomSafety.test.js asserts the rule's logic with a mocked db.query. That is
 * necessary but not sufficient: it passed for the entire life of the project
 * while nothing ever wrote to room_participants, so in the running system the
 * checker read an empty set and the rule could not fire.
 *
 * This suite uses the real routes and a real Postgres. It fails if presence
 * stops being recorded, which is the failure the mocked test cannot see.
 */
const request = require('supertest');
const jwt = require('jsonwebtoken');

const app = require('../../src/server');
const db = require('../../src/config/db');
const config = require('../../src/config');

const tokenFor = (userId, profileId) =>
  jwt.sign({ userId, profileId }, config.jwt.secret, { expiresIn: '15m' });

const stamp = Date.now();
let guardian, stranger, child, room;

async function makeAdult(name, tag) {
  const user = await db.one(
    `INSERT INTO users (email, password_hash, region)
     VALUES ($1,'x','US') RETURNING *`, [`pres_${tag}_${stamp}@sml.test`]);
  const profile = await db.one(
    `INSERT INTO profiles (user_id, display_name, birth_date, age_band, mode)
     VALUES ($1,$2,'1985-04-02','adult','dad_daughter') RETURNING *`, [user.id, name]);
  return { user, profile };
}

const openRows = (roomId) =>
  db.query('SELECT * FROM room_participants WHERE room_id = $1 AND left_at IS NULL',
           [roomId]);

beforeAll(async () => {
  guardian = await makeAdult('Marcus', 'g');
  stranger = await makeAdult('Stranger', 's');

  child = await db.one(
    `INSERT INTO profiles (guardian_id, display_name, birth_date, age_band, mode)
     VALUES ($1,'Zaria','2017-03-04','child','dad_daughter') RETURNING *`,
    [guardian.profile.id]);

  // Video explicitly permitted, so a refusal below is Rule 1 and nothing else.
  await db.query(
    `INSERT INTO guardian_permissions (child_profile_id, camera_tryon, video_rooms)
     VALUES ($1, true, true)`, [child.id]);

  room = await db.one(
    `INSERT INTO rooms (type, name, host_profile_id, livekit_room, max_participants)
     VALUES ('family','Family Room',$1,$2,8) RETURNING *`,
    [guardian.profile.id, `test_room_${stamp}`]);
});

afterAll(async () => {
  await db.query('DELETE FROM room_participants WHERE room_id = $1', [room?.id]);
  // The panic test files a p0 report that references the room.
  await db.query('DELETE FROM reports WHERE room_id = $1', [room?.id]);
  await db.query('DELETE FROM rooms WHERE id = $1', [room?.id]);
  await db.query('DELETE FROM guardian_permissions WHERE child_profile_id = $1', [child?.id]);
  await db.query('DELETE FROM profiles WHERE id = ANY($1)',
                 [[child?.id, guardian?.profile.id, stranger?.profile.id].filter(Boolean)]);
  await db.query('DELETE FROM users WHERE id = ANY($1)',
                 [[guardian?.user.id, stranger?.user.id].filter(Boolean)]);
  await db.pool.end();
});

describe('presence is actually written', () => {
  test('the room starts empty', async () => {
    expect(await openRows(room.id)).toHaveLength(0);
  });

  test('minting a token records the joiner', async () => {
    const res = await request(app).post('/api/video/token')
      .set('Authorization', `Bearer ${tokenFor(guardian.user.id, guardian.profile.id)}`)
      .send({ roomId: room.id });

    expect(res.status).toBe(200);

    const rows = await openRows(room.id);
    expect(rows).toHaveLength(1);
    expect(rows[0].profile_id).toBe(guardian.profile.id);
    expect(rows[0].role).toBe('host');
    expect(rows[0].joined_at).toBeTruthy();
  });

  test('re-minting does not open a second session', async () => {
    // Tokens are 10-minute; a long call re-mints repeatedly. Without the
    // partial unique index each refresh would add another open row and the
    // safety loop would re-scan the same adult every time.
    await request(app).post('/api/video/token')
      .set('Authorization', `Bearer ${tokenFor(guardian.user.id, guardian.profile.id)}`)
      .send({ roomId: room.id });

    expect(await openRows(room.id)).toHaveLength(1);
  });
});

describe('Rule 1 — no U13 alone with an untrusted adult', () => {
  test('the child may join while only their guardian is present', async () => {
    const res = await request(app).post('/api/video/token')
      .set('Authorization', `Bearer ${tokenFor(null, child.id)}`)
      .send({ roomId: room.id });

    expect(res.status).toBe(200);
    expect(await openRows(room.id)).toHaveLength(2);
  });

  test('an untrusted adult joining is what makes it unsafe', async () => {
    const res = await request(app).post('/api/video/token')
      .set('Authorization', `Bearer ${tokenFor(stranger.user.id, stranger.profile.id)}`)
      .send({ roomId: room.id });

    expect(res.status).toBe(200);
    expect(await openRows(room.id)).toHaveLength(3);
  });

  test('the child is now refused — the rule fires off real presence rows', async () => {
    // The child re-mints (every 10 minutes). This is the moment the stranger's
    // presence must be seen. It never could be before presence was written.
    const res = await request(app).post('/api/video/token')
      .set('Authorization', `Bearer ${tokenFor(null, child.id)}`)
      .send({ roomId: room.id });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('untrusted_adult_present');
  });

  test('once the stranger leaves, the child is allowed back in', async () => {
    const left = await request(app).post(`/api/video/rooms/${room.id}/leave`)
      .set('Authorization', `Bearer ${tokenFor(stranger.user.id, stranger.profile.id)}`);
    expect(left.status).toBe(200);

    const rows = await openRows(room.id);
    expect(rows.map((r) => r.profile_id)).not.toContain(stranger.profile.id);

    const res = await request(app).post('/api/video/token')
      .set('Authorization', `Bearer ${tokenFor(null, child.id)}`)
      .send({ roomId: room.id });
    expect(res.status).toBe(200);
  });

  test('leaving banks the minutes and is idempotent', async () => {
    await request(app).post(`/api/video/rooms/${room.id}/leave`)
      .set('Authorization', `Bearer ${tokenFor(stranger.user.id, stranger.profile.id)}`);

    const closed = await db.query(
      'SELECT * FROM room_participants WHERE room_id = $1 AND profile_id = $2',
      [room.id, stranger.profile.id]);
    expect(closed).toHaveLength(1);
    expect(closed[0].left_at).toBeTruthy();
    expect(Number(closed[0].minutes)).toBeGreaterThanOrEqual(0);
  });
});

describe('panic clears presence', () => {
  test('a child who panics is no longer counted as present', async () => {
    await request(app).post('/api/video/token')
      .set('Authorization', `Bearer ${tokenFor(null, child.id)}`)
      .send({ roomId: room.id });

    await request(app).post(`/api/video/rooms/${room.id}/panic`)
      .set('Authorization', `Bearer ${tokenFor(null, child.id)}`);

    const rows = await openRows(room.id);
    expect(rows.map((r) => r.profile_id)).not.toContain(child.id);
  });
});
