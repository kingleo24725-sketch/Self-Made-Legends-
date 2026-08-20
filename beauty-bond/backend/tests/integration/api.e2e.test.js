/**
 * Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 *
 * End-to-end against a real Postgres. Proves the routes the client calls
 * actually exist and enforce the age rules.
 */
const request = require('supertest');
const jwt = require('jsonwebtoken');

const app = require('../../src/server');
const db = require('../../src/config/db');
const config = require('../../src/config');

const tokenFor = (userId, profileId) =>
  jwt.sign({ userId, profileId }, config.jwt.secret, { expiresIn: '15m' });

let adultUser, adultProfile, childProfile;

beforeAll(async () => {
  adultUser = await db.one(
    `INSERT INTO users (email, password_hash, region)
     VALUES ($1,'x','US') RETURNING *`, [`e2e_${Date.now()}@sml.test`]);

  adultProfile = await db.one(
    `INSERT INTO profiles (user_id, display_name, birth_date, age_band, mode)
     VALUES ($1,'Marcus','1985-04-02','adult','dad_daughter') RETURNING *`,
    [adultUser.id]);

  childProfile = await db.one(
    `INSERT INTO profiles (guardian_id, display_name, birth_date, age_band, mode)
     VALUES ($1,'Zaria','2017-03-04','child','dad_daughter') RETURNING *`,
    [adultProfile.id]);

  await db.query(
    `INSERT INTO guardian_permissions (child_profile_id, camera_tryon, video_rooms)
     VALUES ($1, true, false)`, [childProfile.id]);
});

afterAll(async () => {
  await db.query('DELETE FROM profiles WHERE guardian_id = $1', [adultProfile.id]);
  await db.query('DELETE FROM profiles WHERE id = $1', [adultProfile.id]);
  await db.query('DELETE FROM users WHERE id = $1', [adultUser.id]);
  await db.pool.end();
});

describe('health', () => {
  test('GET /health', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.product).toBe('beauty-bond');
  });
});

describe('auth is required', () => {
  test('POST /api/video/token without a token is 401', async () => {
    const res = await request(app).post('/api/video/token').send({ roomId: 'x' });
    expect(res.status).toBe(401);
  });

  test('POST /api/tryon/render without a token is 401', async () => {
    const res = await request(app).post('/api/tryon/render').send({});
    expect(res.status).toBe(401);
  });
});

describe('AI try-on pipeline (mock provider)', () => {
  test('adult: upload-url -> render -> processed image URL', async () => {
    const auth = `Bearer ${tokenFor(adultUser.id, adultProfile.id)}`;

    const upload = await request(app)
      .post('/api/tryon/upload-url')
      .set('Authorization', auth)
      .send({ contentType: 'image/jpeg', bytes: 120000 });

    expect(upload.status).toBe(200);
    expect(upload.body.assetId).toMatch(/^ast_/);
    expect(upload.body.deleteAfter).toBeTruthy();   // 24h TTL is advertised

    const render = await request(app)
      .post('/api/tryon/render')
      .set('Authorization', auth)
      .send({
        assetId: upload.body.assetId,
        look: { id: 'soft_glam', layers: [{ type: 'lip', opacity: 0.8 }] },
      });

    expect(render.status).toBe(200);
    expect(render.body.processedImageUrl).toMatch(/^https?:\/\/.+\.jpg$/);
    expect(render.body.originalImageUrl).toBeTruthy();
    expect(render.body.safety.geometryLocked).toBe(true);
    expect(render.body.safety.deltaLandmarkPx).toBe(0);
  });

  test('adult: geometry and skin-tone layers are stripped, not rendered', async () => {
    const auth = `Bearer ${tokenFor(adultUser.id, adultProfile.id)}`;
    const render = await request(app)
      .post('/api/tryon/render')
      .set('Authorization', auth)
      .send({
        assetId: 'ast_test',
        look: { layers: [
          { type: 'lip', opacity: 0.8 },
          { type: 'reshape', jaw: -0.3 },
          { type: 'skin_lighten', amount: 0.5 },
        ] },
      });

    expect(render.status).toBe(200);
    expect(render.body.appliedLayers).toBe(1);      // only the lip survived
  });

  test('adult: base64 image returns a processedImageUrl', async () => {
    const auth = `Bearer ${tokenFor(adultUser.id, adultProfile.id)}`;
    // 1x1 transparent PNG
    const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

    const res = await request(app).post('/api/tryon')
      .set('Authorization', auth)
      .send({ image: { base64: png }, look: { id: 'soft_glam', layers: [{ type: 'lip' }] } });

    expect(res.status).toBe(200);
    expect(res.body.processedImageUrl).toMatch(/^https?:\/\/.+\.jpg$/);
    expect(res.body.safety.cosmeticsOnly).toBe(true);
  });

  test('rejects a non-image base64 payload', async () => {
    const auth = `Bearer ${tokenFor(adultUser.id, adultProfile.id)}`;
    const res = await request(app).post('/api/tryon')
      .set('Authorization', auth)
      .send({ image: { base64: 'data:application/pdf;base64,AAAA' },
              look: { layers: [{ type: 'lip' }] } });
    expect(res.status).toBe(422);
    expect(res.body.error).toBe('invalid_image_format');
  });

  test('rejects a look whose every layer is disallowed', async () => {
    const auth = `Bearer ${tokenFor(adultUser.id, adultProfile.id)}`;
    const res = await request(app).post('/api/tryon')
      .set('Authorization', auth)
      .send({ image: { assetId: 'ast_x' },
              look: { layers: [{ type: 'reshape' }, { type: 'skin_lighten' }] } });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('no_valid_layers');
  });

  test('CHILD: base64 render is 403 — a U13 image never leaves the device', async () => {
    const auth = `Bearer ${tokenFor(null, childProfile.id)}`;
    const res = await request(app).post('/api/tryon')
      .set('Authorization', auth)
      .send({ image: { base64: 'data:image/png;base64,AAAA' },
              look: { layers: [{ type: 'lip' }] } });
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('server_render_forbidden_for_minor');
  });

  test('CHILD: upload-url is 403 — a U13 image never leaves the device', async () => {
    const auth = `Bearer ${tokenFor(null, childProfile.id)}`;
    const res = await request(app)
      .post('/api/tryon/upload-url')
      .set('Authorization', auth)
      .send({ contentType: 'image/jpeg', bytes: 1000 });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('server_render_forbidden_for_minor');
  });
});

describe('video token safety', () => {
  test('child without guardian video permission is refused', async () => {
    const auth = `Bearer ${tokenFor(null, childProfile.id)}`;
    const res = await request(app)
      .post('/api/video/token')
      .set('Authorization', auth)
      .send({ type: 'family', name: 'Test' });

    // Child cannot create a family room; and video_rooms permission is false.
    expect([403, 400]).toContain(res.status);
  });

  test('missing roomId and type is a 400', async () => {
    const auth = `Bearer ${tokenFor(adultUser.id, adultProfile.id)}`;
    const res = await request(app)
      .post('/api/video/token')
      .set('Authorization', auth)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('room_id_or_type_required');
  });
});

describe('auth API', () => {
  const email = `reg_${Date.now()}@sml.test`;
  let created;

  test('POST /api/auth/register creates an adult account', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email, password: 'a-strong-passphrase', birthDate: '1990-01-01',
      region: 'US', displayName: 'Test Adult',
    });
    expect(res.status).toBe(201);
    expect(res.body.accessToken).toBeTruthy();
    expect(res.body.refreshToken).toBeTruthy();
    expect(res.body.user.email).toBe(email);
    // A password hash must never appear in a response body.
    expect(JSON.stringify(res.body)).not.toMatch(/password_hash|\$argon/);
    created = res.body;
  });

  test('register rejects a weak password', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: `weak_${Date.now()}@sml.test`, password: 'short',
      birthDate: '1990-01-01',
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('weak_password');
  });

  test('register refuses a duplicate email', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email, password: 'a-strong-passphrase', birthDate: '1990-01-01',
    });
    expect(res.status).toBe(409);
  });

  test('register refuses a minor — children are guardian-provisioned', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: `kid_${Date.now()}@sml.test`, password: 'a-strong-passphrase',
      birthDate: '2016-01-01',
    });
    expect(res.status).toBe(403);
  });

  test('POST /api/auth/login returns tokens', async () => {
    const res = await request(app).post('/api/auth/login')
      .send({ email, password: 'a-strong-passphrase' });
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeTruthy();
  });

  test('login with a wrong password is 401', async () => {
    const res = await request(app).post('/api/auth/login')
      .send({ email, password: 'wrong-password-entirely' });
    expect(res.status).toBe(401);
  });

  test('GET /api/auth/me returns profile and plan', async () => {
    const res = await request(app).get('/api/auth/me')
      .set('Authorization', `Bearer ${created.accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.profile.ageBand).toBe('adult');
    expect(res.body.subscription.tier).toBe('free');
  });
});

describe('subscription plans', () => {
  test('GET /api/stripe/plans lists Free, Basic, Premium, Family', async () => {
    const res = await request(app).get('/api/stripe/plans');
    expect(res.status).toBe(200);
    expect(res.body.plans.map((p) => p.code))
      .toEqual(['free', 'basic', 'premium', 'family']);
    expect(res.body.plans.find((p) => p.code === 'basic').lookupKeyMonthly)
      .toBe('bb_basic_monthly');
  });

  test('GET /api/stripe/subscription reports the free plan by default', async () => {
    const auth = `Bearer ${tokenFor(adultUser.id, adultProfile.id)}`;
    const res = await request(app).get('/api/stripe/subscription').set('Authorization', auth);
    expect(res.status).toBe(200);
    expect(res.body.tier).toBe('free');
    expect(res.body.status).toBe('none');
    expect(res.body.entitlements.tryOnPerMonth).toBe(5);
  });

  test('a child inherits the guardian plan and is flagged as inherited', async () => {
    const auth = `Bearer ${tokenFor(null, childProfile.id)}`;
    const res = await request(app).get('/api/stripe/subscription').set('Authorization', auth);
    expect(res.status).toBe(200);
    expect(res.body.inheritedFromGuardian).toBe(true);
  });
});

describe('billing is adults-only', () => {
  test('child cannot reach checkout', async () => {
    const auth = `Bearer ${tokenFor(null, childProfile.id)}`;
    const res = await request(app)
      .post('/api/stripe/subscription')
      .set('Authorization', auth)
      .send({ plan: 'premium' });
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('adults_only');
  });
});
