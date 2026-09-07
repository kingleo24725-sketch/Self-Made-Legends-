/**
 * Dad + Daughter Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 * Proprietary and confidential. Unauthorized use is prohibited.
 *
 * One phone, two people. A child profile has no credentials of its own, so
 * the only way a daughter uses the app is her dad handing her the phone —
 * and the only way back to his side is his password. This pins both
 * directions, the boundary between accounts, and the consent check that
 * used to lock a dad out of his own account.
 */
const request = require('supertest');
const argon2 = require('argon2');
const app = require('../../src/server');
const db = require('../../src/config/db');

const stamp = Date.now();
const PASSWORD = 'correct-horse-battery';
let user, dad, daughter, stranger, strangerProfile;
let dadTokens, childTokens;

const bearer = (t) => `Bearer ${t.accessToken}`;

beforeAll(async () => {
  const hash = await argon2.hash(PASSWORD);
  user = await db.one(`INSERT INTO users (email, password_hash, region)
                        VALUES ($1,$2,'US') RETURNING *`, [`switch_${stamp}@sml.test`, hash]);
  dad = await db.one(`INSERT INTO profiles (user_id, display_name, birth_date, age_band, mode)
                       VALUES ($1,'Andre','1984-07-11','adult','dad_daughter') RETURNING *`, [user.id]);
  daughter = await db.one(`INSERT INTO profiles (guardian_id, display_name, birth_date, age_band, mode)
                            VALUES ($1,'Imani','2016-01-20','child','dad_daughter') RETURNING *`, [dad.id]);
  await db.query(
    `INSERT INTO guardian_consents (child_profile_id, guardian_user_id, method, granted_at, evidence_ref)
     VALUES ($1,$2,'in_app',now(),'test')`, [daughter.id, user.id]);

  stranger = await db.one(`INSERT INTO users (email, password_hash, region)
                            VALUES ($1,$2,'US') RETURNING *`, [`stranger_${stamp}@sml.test`, hash]);
  strangerProfile = await db.one(`INSERT INTO profiles (user_id, display_name, birth_date, age_band, mode)
                                   VALUES ($1,'Nobody','1980-01-01','adult','dad_daughter') RETURNING *`, [stranger.id]);

  const login = await request(app).post('/api/auth/login')
    .send({ email: user.email, password: PASSWORD });
  dadTokens = login.body;
});

afterAll(async () => {
  await db.query('DELETE FROM guardian_consents WHERE guardian_user_id = $1', [user.id]);
  await db.query('DELETE FROM profiles WHERE guardian_id = $1', [dad.id]);
  await db.query('DELETE FROM users WHERE id IN ($1, $2)', [user.id, stranger.id]);
});

describe('handing the phone over', () => {
  test('dad → daughter asks nothing and re-issues tokens for her', async () => {
    const res = await request(app).post('/api/auth/switch-profile')
      .set('Authorization', bearer(dadTokens)).send({ profileId: daughter.id });
    expect(res.status).toBe(200);
    expect(res.body.profile.id).toBe(daughter.id);
    expect(res.body.profile.ageBand).toBe('child');
    expect(res.body.accessToken).toBeTruthy();
    childTokens = res.body;

    const me = await request(app).get('/api/me').set('Authorization', bearer(childTokens));
    expect(me.body.profile.id).toBe(daughter.id);
    expect(me.body.consentPending).toBe(false);
    // Dad is still listed, so the app can offer the way back.
    expect(me.body.profiles.map((p) => p.id)).toContain(dad.id);
  });

  test('a child holding the phone cannot reach guardian routes', async () => {
    const res = await request(app).get('/api/guardian/children').set('Authorization', bearer(childTokens));
    expect(res.status).toBe(403);
  });

  test('daughter → dad without the password is refused', async () => {
    const res = await request(app).post('/api/auth/switch-profile')
      .set('Authorization', bearer(childTokens)).send({ profileId: dad.id });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('password_required');

    const wrong = await request(app).post('/api/auth/switch-profile')
      .set('Authorization', bearer(childTokens)).send({ profileId: dad.id, password: 'nope-nope-nope' });
    expect(wrong.status).toBe(401);
  });

  test('daughter → dad with the password works', async () => {
    const res = await request(app).post('/api/auth/switch-profile')
      .set('Authorization', bearer(childTokens)).send({ profileId: dad.id, password: PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body.profile.id).toBe(dad.id);
  });

  test("someone else's profile is not yours to switch to", async () => {
    const res = await request(app).post('/api/auth/switch-profile')
      .set('Authorization', bearer(dadTokens)).send({ profileId: strangerProfile.id, password: PASSWORD });
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('not_your_profile');
  });
});

describe('who a token may speak for', () => {
  test('a token pairing my account with a stranger\'s profile is refused', async () => {
    const jwt = require('jsonwebtoken');
    const config = require('../../src/config');
    const forged = jwt.sign({ userId: user.id, profileId: strangerProfile.id }, config.jwt.secret);
    const res = await request(app).get('/api/me').set('Authorization', `Bearer ${forged}`);
    expect(res.status).toBe(401);
  });
});

describe('consent pending is about the child, never the dad', () => {
  test('an open, ungranted consent on the account does not wall the adult out', async () => {
    await db.query(
      `INSERT INTO guardian_consents (guardian_user_id, method, evidence_ref, expires_at)
       VALUES ($1,'in_app','test', now() + interval '7 days')`, [user.id]);
    const me = await request(app).get('/api/me').set('Authorization', bearer(dadTokens));
    expect(me.status).toBe(200);
    expect(me.body.consentPending).toBe(false);
  });
});
