/**
 * Dads & Daughters Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 * Proprietary and confidential. Unauthorized copying, distribution,
 * or use of this file, via any medium, is strictly prohibited.
 *
 * Three defects survived a green 99-test suite because the tests that covered
 * them mocked the database. These exercise the real write paths instead.
 *
 *   1. GET /api/me returned req.user raw — a `SELECT *` row carrying
 *      password_hash and stripe_customer_id — to every client.
 *   2. POST /guardian/consent/start inserted NULL into three NOT NULL columns
 *      and omitted granted_at, so it raised 23502 on every call and no child
 *      profile could ever be created.
 *   3. room_participants was read by the untrusted-adult rule and written by
 *      nothing, so the rule read an always-empty set and could never fire.
 */
const request = require('supertest');
const jwt = require('jsonwebtoken');

const app = require('../../src/server');
const db = require('../../src/config/db');
const config = require('../../src/config');

const tokenFor = (userId, profileId) =>
  jwt.sign({ userId, profileId }, config.jwt.secret, { expiresIn: '15m' });

const stamp = Date.now();
let guardianUser, guardianProfile, strangerUser, strangerProfile;

async function makeAdult(name, tag) {
  const user = await db.one(
    `INSERT INTO users (email, password_hash, region)
     VALUES ($1,'x','US') RETURNING *`, [`coppa_${tag}_${stamp}@sml.test`]);
  const profile = await db.one(
    `INSERT INTO profiles (user_id, display_name, birth_date, age_band, mode)
     VALUES ($1,$2,'1985-04-02','adult','dad_daughter') RETURNING *`, [user.id, name]);
  return { user, profile };
}

beforeAll(async () => {
  ({ user: guardianUser, profile: guardianProfile } = await makeAdult('Marcus', 'g'));
  ({ user: strangerUser, profile: strangerProfile } = await makeAdult('Stranger', 's'));
});

afterAll(async () => {
  const ids = [guardianProfile?.id, strangerProfile?.id].filter(Boolean);
  await db.query('DELETE FROM room_participants WHERE profile_id = ANY($1)', [ids]);
  await db.query('DELETE FROM rooms WHERE host_profile_id = ANY($1)', [ids]);
  await db.query('DELETE FROM guardian_consents WHERE guardian_user_id = ANY($1)',
                 [[guardianUser?.id, strangerUser?.id].filter(Boolean)]);
  await db.query('DELETE FROM profiles WHERE guardian_id = ANY($1)', [ids]);
  await db.query('DELETE FROM profiles WHERE id = ANY($1)', [ids]);
  await db.query('DELETE FROM users WHERE id = ANY($1)',
                 [[guardianUser?.id, strangerUser?.id].filter(Boolean)]);
  await db.pool.end();
});

/* ── Defect 1 ─────────────────────────────────────────────────────── */

describe('GET /api/me never leaks credential material', () => {
  test('the response carries no password hash and no Stripe customer id', async () => {
    const res = await request(app).get('/api/me')
      .set('Authorization', `Bearer ${tokenFor(guardianUser.id, guardianProfile.id)}`);

    expect(res.status).toBe(200);

    // Belt and braces: check the shape, then scan the whole serialized body so
    // a future field cannot smuggle it back in under a different key.
    expect(res.body.user).not.toHaveProperty('password_hash');
    expect(res.body.user).not.toHaveProperty('stripe_customer_id');
    expect(JSON.stringify(res.body)).not.toMatch(/password_hash|stripe_customer_id/);
  });

  test('profiles come back camelCase, because every client age gate reads ageBand', async () => {
    const res = await request(app).get('/api/me')
      .set('Authorization', `Bearer ${tokenFor(guardianUser.id, guardianProfile.id)}`);

    expect(res.body.profile).toHaveProperty('ageBand', 'adult');
    expect(res.body.profile).not.toHaveProperty('age_band');
    res.body.profiles.forEach((p) => expect(p).toHaveProperty('ageBand'));
  });
});

/* ── Defect 2 ─────────────────────────────────────────────────────── */

describe('a child account can actually be created', () => {
  let consentId, token;

  test('starting consent stores a pending row instead of raising 23502', async () => {
    const res = await request(app).post('/api/guardian/consent/start')
      .set('Authorization', `Bearer ${tokenFor(guardianUser.id, guardianProfile.id)}`)
      .send({ guardianEmail: 'marcus@sml.test' });

    expect(res.status).toBe(202);
    expect(res.body.status).toBe('pending');
    ({ consentId, verificationToken: token } = res.body);
    expect(consentId).toBeTruthy();
    expect(token).toBeTruthy();
  });

  test('an ungranted consent cannot create a child — this is the COPPA gate', async () => {
    const res = await request(app).post('/api/guardian/children')
      .set('Authorization', `Bearer ${tokenFor(guardianUser.id, guardianProfile.id)}`)
      .send({ displayName: 'Zaria', birthDate: '2017-03-04', consentId });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('parental_consent_required');
  });

  test('a wrong verification token is refused', async () => {
    const res = await request(app).post(`/api/guardian/consent/${consentId}/verify`)
      .send({ token: 'not-the-token' });
    expect(res.status).toBe(400);
  });

  test('the real token grants consent and sets granted_at', async () => {
    const res = await request(app).post(`/api/guardian/consent/${consentId}/verify`)
      .send({ token });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('granted');

    const row = await db.one('SELECT * FROM guardian_consents WHERE id = $1', [consentId]);
    expect(row.granted_at).toBeTruthy();
    // The token hash is cleared once spent, so a replay cannot re-grant.
    expect(row.verification_token_hash).toBeNull();
  });

  test('now the child profile is created, with video OFF by default', async () => {
    const res = await request(app).post('/api/guardian/children')
      .set('Authorization', `Bearer ${tokenFor(guardianUser.id, guardianProfile.id)}`)
      .send({ displayName: 'Zaria', birthDate: '2017-03-04', consentId });

    expect(res.status).toBe(201);
    expect(res.body.ageBand).toBe('child');
    expect(res.body).not.toHaveProperty('birth_date');   // serialized, not raw

    const perms = await db.one(
      'SELECT * FROM guardian_permissions WHERE child_profile_id = $1', [res.body.id]);
    expect(perms.video_rooms).toBe(false);
    expect(perms.bff_rooms).toBe(false);
  });

  test('the same consent cannot be spent on a second child', async () => {
    const res = await request(app).post('/api/guardian/children')
      .set('Authorization', `Bearer ${tokenFor(guardianUser.id, guardianProfile.id)}`)
      .send({ displayName: 'Second', birthDate: '2016-01-01', consentId });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('consent_already_used');
  });

  test("another adult cannot spend this guardian's consent", async () => {
    const start = await request(app).post('/api/guardian/consent/start')
      .set('Authorization', `Bearer ${tokenFor(guardianUser.id, guardianProfile.id)}`)
      .send({ guardianEmail: 'marcus@sml.test' });
    await request(app).post(`/api/guardian/consent/${start.body.consentId}/verify`)
      .send({ token: start.body.verificationToken });

    const res = await request(app).post('/api/guardian/children')
      .set('Authorization', `Bearer ${tokenFor(strangerUser.id, strangerProfile.id)}`)
      .send({ displayName: 'NotYours', birthDate: '2017-03-04',
              consentId: start.body.consentId });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('consent_not_yours');
  });

  test('the database refuses a child attached to an ungranted consent', async () => {
    const pending = await db.one(
      `INSERT INTO guardian_consents (guardian_user_id, method, evidence_ref)
       VALUES ($1,'email_link','x') RETURNING id`, [guardianUser.id]);

    // Last line of defence: even with the service bypassed entirely, the
    // CHECK constraint from migration 003 rejects the write.
    await expect(
      db.query('UPDATE guardian_consents SET child_profile_id = $1 WHERE id = $2',
               [guardianProfile.id, pending.id])
    ).rejects.toThrow(/consent_granted_before_child/);
  });
});

/* ── Access control on profile edits ──────────────────────────────── */

describe('PATCH /api/profiles/:id is ownership-scoped', () => {
  let childId;

  beforeAll(async () => {
    const start = await request(app).post('/api/guardian/consent/start')
      .set('Authorization', `Bearer ${tokenFor(guardianUser.id, guardianProfile.id)}`)
      .send({ guardianEmail: 'marcus@sml.test' });
    await request(app).post(`/api/guardian/consent/${start.body.consentId}/verify`)
      .send({ token: start.body.verificationToken });
    const child = await request(app).post('/api/guardian/children')
      .set('Authorization', `Bearer ${tokenFor(guardianUser.id, guardianProfile.id)}`)
      .send({ displayName: 'Patchable', birthDate: '2017-03-04',
              consentId: start.body.consentId });
    childId = child.body.id;
  });

  test('a guardian may edit their own child', async () => {
    const res = await request(app).patch(`/api/profiles/${childId}`)
      .set('Authorization', `Bearer ${tokenFor(guardianUser.id, guardianProfile.id)}`)
      .send({ displayName: 'Renamed By Parent' });

    expect(res.status).toBe(200);
    expect(res.body.displayName).toBe('Renamed By Parent');
    // Serialized, not a raw row — the client reads camelCase everywhere else.
    expect(res.body).not.toHaveProperty('display_name');
  });

  test("a stranger cannot edit someone else's child", async () => {
    const res = await request(app).patch(`/api/profiles/${childId}`)
      .set('Authorization', `Bearer ${tokenFor(strangerUser.id, strangerProfile.id)}`)
      .send({ displayName: 'Renamed By A Stranger' });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('not_your_profile');
  });

  test("a stranger cannot edit another adult's profile", async () => {
    const res = await request(app).patch(`/api/profiles/${guardianProfile.id}`)
      .set('Authorization', `Bearer ${tokenFor(strangerUser.id, strangerProfile.id)}`)
      .send({ mode: 'solo_girl' });

    expect(res.status).toBe(403);
  });

  test('an unknown profile id is 404, not a silent no-op', async () => {
    const res = await request(app)
      .patch('/api/profiles/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${tokenFor(guardianUser.id, guardianProfile.id)}`)
      .send({ displayName: 'Nobody' });

    expect(res.status).toBe(404);
  });
});
