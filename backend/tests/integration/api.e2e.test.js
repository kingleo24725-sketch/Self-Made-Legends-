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
    expect(render.body.url).toMatch(/^https?:\/\/.+\.jpg$/);   // processed image URL
    expect(render.body.beforeUrl).toBeTruthy();
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

describe('billing is adults-only', () => {
  test('child cannot reach checkout', async () => {
    const auth = `Bearer ${tokenFor(null, childProfile.id)}`;
    const res = await request(app)
      .post('/api/stripe/checkout')
      .set('Authorization', auth)
      .send({ lookupKey: 'bb_bond_monthly' });
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('adults_only');
  });
});
