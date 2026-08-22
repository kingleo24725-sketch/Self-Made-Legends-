/**
 * Dad + Daughter Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 * Proprietary and confidential. Unauthorized use is prohibited.
 *
 * RELEASE BLOCKER — docs/architecture.md:411.
 *
 * The Healing Journal is private, never scanned, and not guardian-visible.
 * models/Memory.js has always said "encrypted client-side; the server holds no
 * key" — but for most of this project's life the client sent base64, which is
 * obfuscation, not encryption. Anyone with the database could read every word.
 *
 * These tests hold the real thing:
 *   - the server stores bytes it cannot interpret,
 *   - it never acquires a key, by any route,
 *   - an entry records WHICH device key sealed it,
 *   - and there is no path by which a guardian reads a child's entries.
 */
const fs = require('fs');
const path = require('path');
const request = require('supertest');
const jwt = require('jsonwebtoken');

const app = require('../../src/server');
const db = require('../../src/config/db');
const config = require('../../src/config');

const APP = path.join(__dirname, '../../../app');
const readApp = (rel) => fs.readFileSync(path.join(APP, rel), 'utf8');

const tokenFor = (userId, profileId) =>
  jwt.sign({ userId, profileId }, config.jwt.secret, { expiresIn: '15m' });

const stamp = Date.now();
let user, guardian, child;

beforeAll(async () => {
  user = await db.one(
    `INSERT INTO users (email, password_hash, region)
     VALUES ($1,'x','US') RETURNING *`, [`jrnl_${stamp}@sml.test`]);
  guardian = await db.one(
    `INSERT INTO profiles (user_id, display_name, birth_date, age_band, mode)
     VALUES ($1,'Marcus','1985-04-02','adult','dad_daughter') RETURNING *`, [user.id]);
  child = await db.one(
    `INSERT INTO profiles (guardian_id, display_name, birth_date, age_band, mode)
     VALUES ($1,'Zaria','2012-03-04','teen','dad_daughter') RETURNING *`, [guardian.id]);
});

afterAll(async () => {
  const ids = [guardian?.id, child?.id].filter(Boolean);
  await db.query('DELETE FROM journal_entries WHERE profile_id = ANY($1)', [ids]);
  await db.query('DELETE FROM profiles WHERE id = ANY($1)', [ids]);
  await db.query('DELETE FROM users WHERE id = $1', [user?.id]);
  await db.pool.end();
});

/* ── The client actually encrypts ─────────────────────────────────── */

describe('the app encrypts before sending', () => {
  const crypto = readApp('utils/journalCrypto.js');

  test('it uses an authenticated cipher, not an encoding', () => {
    expect(crypto).toContain('xchacha20poly1305');
    // The old implementation. If this comes back, entries are readable again.
    expect(readApp('screens/LegacyScreen.js')).not.toMatch(/globalThis\.btoa/);
  });

  test('the key is generated with a CSPRNG, never derived from anything guessable', () => {
    expect(crypto).toMatch(/Crypto\.getRandomBytes\(KEY_BYTES\)/);
    expect(crypto).not.toMatch(/Math\.random/);
  });

  test('the key is kept on this device only and out of backups', () => {
    expect(crypto).toContain('WHEN_UNLOCKED_THIS_DEVICE_ONLY');
    expect(crypto).toContain('SecureStore');
  });

  test('the nonce is random per entry, so the same words never repeat bytes', () => {
    expect(crypto).toMatch(/Crypto\.getRandomBytes\(NONCE_BYTES\)/);
  });

  test('the key is never sent anywhere', () => {
    const code = crypto.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    expect(code).not.toMatch(/api\.(post|get|put|patch)/);
    expect(code).not.toMatch(/fetch\(/);
  });

  test('a wrong-key entry is reported, not rendered as garbage', () => {
    expect(crypto).toMatch(/entryKeyId !== keyId/);
    expect(readApp('screens/LegacyScreen.js'))
      .toContain('Written on a device you no longer have');
  });

  test('the irreversible trade is disclosed BEFORE the first entry', () => {
    const screen = readApp('screens/LegacyScreen.js');
    expect(screen).toMatch(/Before you write/);
    expect(screen).toMatch(/can't be recovered|cannot be recovered/);
  });
});

/* ── The server cannot read what it stores ────────────────────────── */

describe('the server holds no key', () => {
  test('nothing server-side decrypts, and no key column exists', () => {
    const backend = path.join(__dirname, '../../src');
    const files = [];
    (function walk(dir) {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) walk(p);
        else if (p.endsWith('.js') || p.endsWith('.sql')) files.push(p);
      }
    })(backend);

    const offenders = files.filter((f) => {
      const src = fs.readFileSync(f, 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '').replace(/^--.*$/gm, '');
      return /decrypt|journal_key|journalKey/i.test(src);
    }).map((f) => path.relative(backend, f));

    expect(offenders).toEqual([]);
  });

  test('an entry is opaque on the wire and in the row', async () => {
    // Real ciphertext: random bytes, exactly what the app produces.
    const sealed = require('crypto').randomBytes(64).toString('base64');

    const res = await request(app).post('/api/journal')
      .set('Authorization', `Bearer ${tokenFor(user.id, guardian.id)}`)
      .send({ ciphertext: sealed, keyId: 'abc123def456', promptId: 'i_wish' })
      .expect(201);

    expect(res.body.key_id).toBe('abc123def456');

    const row = await db.one(
      'SELECT * FROM journal_entries WHERE id = $1', [res.body.id]);
    // The stored bytes are exactly what arrived — untouched, uninterpreted.
    expect(Buffer.from(row.ciphertext).toString('base64')).toBe(sealed);
  });

  test('an entry without a key id is refused — it would be unopenable', async () => {
    await request(app).post('/api/journal')
      .set('Authorization', `Bearer ${tokenFor(user.id, guardian.id)}`)
      .send({ ciphertext: 'AAAA' })
      .expect(400);
  });

  test('the key id comes back so the app knows which device wrote it', async () => {
    const res = await request(app).get('/api/journal')
      .set('Authorization', `Bearer ${tokenFor(user.id, guardian.id)}`);
    expect(res.body.entries.some((e) => e.keyId === 'abc123def456')).toBe(true);
  });

  test('presence rows carry no key, because they carry no content', async () => {
    const res = await request(app).post('/api/journal/presence')
      .set('Authorization', `Bearer ${tokenFor(user.id, guardian.id)}`)
      .send({ promptId: 'sat_here' })
      .expect(201);

    const row = await db.one('SELECT * FROM journal_entries WHERE id = $1', [res.body.id]);
    expect(row.key_id).toBeNull();
    expect(row.ciphertext.length).toBe(0);
  });
});

/* ── Privacy holds regardless of encryption ───────────────────────── */

describe('a guardian cannot reach a teen’s journal', () => {
  test("the child's entry never appears in the guardian's listing", async () => {
    const hers = require('crypto').randomBytes(48).toString('base64');
    await request(app).post('/api/journal')
      .set('Authorization', `Bearer ${tokenFor(null, child.id)}`)
      .send({ ciphertext: hers, keyId: 'herkey000000' })
      .expect(201);

    const res = await request(app).get('/api/journal')
      .set('Authorization', `Bearer ${tokenFor(user.id, guardian.id)}`);

    expect(res.body.entries.map((e) => e.ciphertext)).not.toContain(hers);
  });

  test('no route accepts a profile id for reading a journal', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '../../src/api/legacy/index.js'), 'utf8');
    // Every journal read is scoped to req.profile.id and nothing else.
    expect(src).not.toMatch(/journal[^\n]*req\.params\.profileId/);
    expect(src).not.toMatch(/journal[^\n]*req\.query\.profileId/);
  });
});
