/**
 * Dad + Daughter Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 * Proprietary and confidential. Unauthorized use is prohibited.
 *
 * RELEASE BLOCKER — docs/stripe-flow.md:778.
 *
 *   "Letters Forward already recorded are delivered forever, at any tier,
 *    including after full cancellation. A lapsed card must never withhold a
 *    dead parent's message to their child."
 *
 * This is the promise the whole module rests on, so it is tested three ways:
 * the entitlement is in ALWAYS_FREE, the delivery code physically cannot read
 * subscription state, and a real letter delivers through a real HTTP request
 * with the subscription cancelled in the database.
 */
const fs = require('fs');
const path = require('path');
const request = require('supertest');
const jwt = require('jsonwebtoken');

const app = require('../../src/server');
const db = require('../../src/config/db');
const config = require('../../src/config');
const { ALWAYS_FREE } = require('../../src/services/entitlements');

const tokenFor = (userId, profileId) =>
  jwt.sign({ userId, profileId }, config.jwt.secret, { expiresIn: '15m' });

const stamp = Date.now();
let guardianUser, guardianProfile, child;

beforeAll(async () => {
  guardianUser = await db.one(
    `INSERT INTO users (email, password_hash, region)
     VALUES ($1,'x','US') RETURNING *`, [`legacy_${stamp}@sml.test`]);
  guardianProfile = await db.one(
    `INSERT INTO profiles (user_id, display_name, birth_date, age_band, mode)
     VALUES ($1,'Marcus','1985-04-02','adult','dad_daughter') RETURNING *`,
    [guardianUser.id]);
  child = await db.one(
    `INSERT INTO profiles (guardian_id, display_name, birth_date, age_band, mode)
     VALUES ($1,'Zaria','2017-03-04','child','dad_daughter') RETURNING *`,
    [guardianProfile.id]);
});

afterAll(async () => {
  const ids = [guardianProfile?.id, child?.id].filter(Boolean);
  await db.query('DELETE FROM letters_forward WHERE to_profile_id = ANY($1)', [ids]);
  await db.query('DELETE FROM legacy_items WHERE contributed_by = ANY($1)', [ids]);
  await db.query('DELETE FROM legacy_people WHERE family_profile_id = ANY($1)', [ids]);
  await db.query('DELETE FROM journal_entries WHERE profile_id = ANY($1)', [ids]);
  await db.query('DELETE FROM subscriptions WHERE user_id = $1', [guardianUser?.id]);
  await db.query('DELETE FROM profiles WHERE id = ANY($1)', [ids]);
  await db.query('DELETE FROM users WHERE id = $1', [guardianUser?.id]);
  await db.pool.end();
});

describe('the guarantee, stated three ways', () => {
  test('delivery is in ALWAYS_FREE', () => {
    expect(ALWAYS_FREE.has('legacy.letter_delivery')).toBe(true);
  });

  test('the delivery service cannot read subscription state', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '../../src/services/legacyService.js'), 'utf8');

    // Strip comments first — the file explains the rule in prose, and the
    // prose naturally names the thing it forbids.
    const code = src
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '');

    expect(code).not.toMatch(/subscriptions/);
    expect(code).not.toMatch(/entitlement/i);
    expect(code).not.toMatch(/\btier\b/);
  });
});

describe('a letter delivers after the subscription is cancelled', () => {
  let letterId;

  test('a subscriber seals a letter dated in the past', async () => {
    // Premium is what unlocks recording.
    await db.query(
      `INSERT INTO subscriptions (id, user_id, source, tier, status)
       VALUES ($1,$2,'stripe','premium','active')`,
      [`sub_test_${stamp}`, guardianUser.id]);

    const res = await request(app).post('/api/legacy/letters')
      .set('Authorization', `Bearer ${tokenFor(guardianUser.id, guardianProfile.id)}`)
      .send({
        toProfileId: child.id,
        occasion: 'For your 13th birthday',
        deliverOn: '2020-03-04',          // already due
        storageKey: 'enc/letters/test-key',
      });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('sealed');
    letterId = res.body.id;

    // Sealed means sealed: metadata only, never the body.
    expect(res.body).not.toHaveProperty('storageKey');
  });

  test('now the subscription is cancelled entirely', async () => {
    await db.query(
      `UPDATE subscriptions SET status = 'canceled' WHERE user_id = $1`,
      [guardianUser.id]);

    const { effectiveTierFor } = require('../../src/services/entitlements');
    expect(await effectiveTierFor(guardianProfile.id)).toBe('free');
  });

  test('recording a NEW letter is now refused — that part is paid', async () => {
    const res = await request(app).post('/api/legacy/letters')
      .set('Authorization', `Bearer ${tokenFor(guardianUser.id, guardianProfile.id)}`)
      .send({
        toProfileId: child.id,
        occasion: 'Another one',
        deliverOn: '2030-01-01',
        storageKey: 'enc/letters/other',
      });

    expect(res.status).toBe(402);
    expect(res.body.capability).toBe('legacy.letters');
  });

  test('but the letter already recorded still delivers, in full', async () => {
    const res = await request(app).get('/api/legacy/letters')
      .set('Authorization', `Bearer ${tokenFor(null, child.id)}`);

    expect(res.status).toBe(200);

    const letter = res.body.delivered.find((l) => l.id === letterId);
    expect(letter).toBeTruthy();
    expect(letter.occasion).toBe('For your 13th birthday');
    expect(letter.storageKey).toBe('enc/letters/test-key');
    expect(letter.deliveredAt).toBeTruthy();
  });

  test('a letter not yet due stays sealed, body withheld', async () => {
    const future = await db.one(
      `INSERT INTO letters_forward
         (to_profile_id, occasion, deliver_on, storage_key)
       VALUES ($1,'On your wedding morning','2040-06-01','enc/letters/future')
       RETURNING *`, [child.id]);

    const res = await request(app).get('/api/legacy/letters')
      .set('Authorization', `Bearer ${tokenFor(null, child.id)}`);

    const sealed = res.body.sealed.find((l) => l.id === future.id);
    expect(sealed).toBeTruthy();
    expect(sealed.occasion).toBe('On your wedding morning');
    expect(sealed).not.toHaveProperty('storageKey');
    expect(res.body.delivered.find((l) => l.id === future.id)).toBeUndefined();
  });
});

describe('the database refuses an incoherent letter', () => {
  test('a delivered letter must record when it was delivered', async () => {
    await expect(
      db.query(
        `INSERT INTO letters_forward
           (to_profile_id, occasion, deliver_on, storage_key, status, delivered_at)
         VALUES ($1,'Bad','2020-01-01','k','delivered',NULL)`, [child.id])
    ).rejects.toThrow(/letter_delivered_has_timestamp/);
  });

  test('status is a closed set', async () => {
    await expect(
      db.query(
        `INSERT INTO letters_forward
           (to_profile_id, occasion, deliver_on, storage_key, status)
         VALUES ($1,'Bad','2020-01-01','k','opened')`, [child.id])
    ).rejects.toThrow(/letter_status_known/);
  });
});

describe('the Healing Journal', () => {
  test('presence can be logged without words', async () => {
    const res = await request(app).post('/api/journal/presence')
      .set('Authorization', `Bearer ${tokenFor(guardianUser.id, guardianProfile.id)}`)
      .send({ promptId: 'what_would_she_say' });

    expect(res.status).toBe(201);
    expect(res.body.id).toBeTruthy();
  });

  test('an entry round-trips as opaque ciphertext', async () => {
    const secret = Buffer.from('this is already encrypted client-side').toString('base64');

    await request(app).post('/api/journal')
      .set('Authorization', `Bearer ${tokenFor(guardianUser.id, guardianProfile.id)}`)
      .send({ ciphertext: secret, keyId: 'testkey00001', promptId: 'p1' })
      .expect(201);

    const res = await request(app).get('/api/journal')
      .set('Authorization', `Bearer ${tokenFor(guardianUser.id, guardianProfile.id)}`);

    const entry = res.body.entries.find((e) => e.promptId === 'p1');
    expect(entry.ciphertext).toBe(secret);

    const presence = res.body.entries.find((e) => e.presenceOnly);
    expect(presence).toBeTruthy();
  });

  test("a guardian cannot read their child's journal — there is no such route", async () => {
    await request(app).post('/api/journal')
      .set('Authorization', `Bearer ${tokenFor(null, child.id)}`)
      .send({ ciphertext: Buffer.from('hers').toString('base64'), keyId: 'herkey000001' })
      .expect(201);

    // The guardian's own listing must not contain it. There is deliberately
    // no endpoint that takes a profile id at all.
    const res = await request(app).get('/api/journal')
      .set('Authorization', `Bearer ${tokenFor(guardianUser.id, guardianProfile.id)}`);

    const hers = Buffer.from('hers').toString('base64');
    expect(res.body.entries.map((e) => e.ciphertext)).not.toContain(hers);
  });
});
