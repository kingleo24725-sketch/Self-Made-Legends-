/**
 * Dad + Daughter Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 * Proprietary and confidential. Unauthorized use is prohibited.
 *
 * RELEASE BLOCKER. The Vault and Letters Forward hold WORDS (migration 007).
 *
 * Before this, both required a storage_key pointing at an object store that
 * was never built, so neither could hold a single word and nothing in the app
 * could create either. These tests pin the text path, the has-content rule,
 * and — above all — that a sealed letter's words stay sealed.
 */
const request = require('supertest');
const jwt = require('jsonwebtoken');

const app = require('../../src/server');
const db = require('../../src/config/db');
const config = require('../../src/config');

const tokenFor = (userId, profileId) =>
  jwt.sign({ userId, profileId }, config.jwt.secret, { expiresIn: '15m' });

const stamp = Date.now();
let user, dad, daughter, auth, person;

// This file is about v1, which ships with billing OFF: the server applies
// V1_UNGATED and Letters Forward is open. tests/setup.js sets Stripe keys, so
// the test process boots with billing ON and a free-tier dad gets a 402 at
// the plan gate — correct behaviour for a billing world, and not the world
// under test. Forced off here, restored after.
const realBilling = config.enabled.billing;
beforeAll(() => { config.enabled.billing = false; });
afterAll(() => { config.enabled.billing = realBilling; });

beforeAll(async () => {
  user = await db.one(`INSERT INTO users (email, password_hash, region)
                        VALUES ($1,'x','US') RETURNING *`, [`content_${stamp}@sml.test`]);
  dad = await db.one(`INSERT INTO profiles (user_id, display_name, birth_date, age_band, mode)
                       VALUES ($1,'Andre','1984-07-11','adult','dad_daughter') RETURNING *`, [user.id]);
  daughter = await db.one(`INSERT INTO profiles (guardian_id, display_name, birth_date, age_band, mode)
                            VALUES ($1,'Imani','2016-01-20','child','dad_daughter') RETURNING *`, [dad.id]);
  auth = `Bearer ${tokenFor(user.id, dad.id)}`;
  const res = await request(app).post('/api/legacy/people').set('Authorization', auth)
    .send({ name: 'Denise' });
  person = res.body;
});

afterAll(async () => {
  // Order matters three times over: legacy_items.contributed_by, the child's
  // guardian_id and the consent row's guardian_user_id all lack ON DELETE
  // CASCADE. A schema that refuses to orphan a family's rows is the schema
  // behaving correctly. Removing the person cascades every item and letter.
  await db.query('DELETE FROM legacy_people WHERE family_profile_id = $1', [dad.id]);
  await db.query('DELETE FROM guardian_consents WHERE guardian_user_id = $1', [user.id]);
  await db.query('DELETE FROM profiles WHERE guardian_id = $1', [dad.id]);
  await db.query('DELETE FROM users WHERE id = $1', [user.id]);
});

describe('the Vault holds words', () => {
  test('a note is created from text alone — no storage key needed', async () => {
    const res = await request(app).post('/api/legacy/items').set('Authorization', auth)
      .send({ legacyPersonId: person.id, kind: 'note', text: '  "Fix your face, baby." Every morning.  ' });
    expect(res.status).toBe(201);
    expect(res.body.kind).toBe('note');
    expect(res.body.body).toBe('"Fix your face, baby." Every morning.');   // trimmed
    expect(res.body.storageKey).toBeNull();
  });

  test('a recipe reads back with its words', async () => {
    await request(app).post('/api/legacy/items').set('Authorization', auth)
      .send({ legacyPersonId: person.id, kind: 'recipe', text: 'Sweet potato pie. Nutmeg, not cinnamon.' });
    const res = await request(app).get(`/api/legacy/items?personId=${person.id}`).set('Authorization', auth);
    const recipe = res.body.items.find((i) => i.kind === 'recipe');
    expect(recipe.body).toMatch(/Nutmeg/);
    expect(res.body.textKinds).toEqual(['recipe', 'routine', 'shade', 'note']);
  });

  test('an item with no content at all is refused', async () => {
    const res = await request(app).post('/api/legacy/items').set('Authorization', auth)
      .send({ legacyPersonId: person.id, kind: 'note' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('content_required');
  });

  test('whitespace is not content', async () => {
    const res = await request(app).post('/api/legacy/items').set('Authorization', auth)
      .send({ legacyPersonId: person.id, kind: 'note', text: '   \n  ' });
    expect(res.status).toBe(400);
  });

  test('the database refuses a row with neither body nor storage key', async () => {
    await expect(db.query(
      `INSERT INTO legacy_items (legacy_person_id, kind) VALUES ($1, 'note')`, [person.id],
    )).rejects.toThrow(/legacy_item_has_content/);
  });

  test("'note' is a known kind; an unknown one still is not", async () => {
    const res = await request(app).post('/api/legacy/items').set('Authorization', auth)
      .send({ legacyPersonId: person.id, kind: 'hologram', text: 'x' });
    expect(res.status).toBe(400);
    expect(res.body.allowed).toContain('note');
  });
});

describe('a letter is words, and sealed means sealed', () => {
  const WORDS = 'On your wedding morning: you were always enough. — Dad';
  let letterId;

  test('written from text, it comes back sealed with NO body', async () => {
    const res = await request(app).post('/api/legacy/letters').set('Authorization', auth)
      .send({ toProfileId: daughter.id, occasion: 'Your wedding morning',
              deliverOn: '2045-06-01', text: WORDS, legacyPersonId: person.id });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('sealed');
    expect(res.body).not.toHaveProperty('body');
    expect(res.body).not.toHaveProperty('storageKey');
    letterId = res.body.id;
  });

  test("the writer's outbox shows it sealed — words withheld even from the author", async () => {
    const res = await request(app).get('/api/legacy/letters/outbox').set('Authorization', auth);
    const mine = res.body.letters.find((l) => l.id === letterId);
    expect(mine).toBeTruthy();
    expect(mine).not.toHaveProperty('body');
    expect(mine).not.toHaveProperty('storageKey');
    // The envelope is addressed, even though it is sealed.
    expect(mine.toProfileId).toBe(daughter.id);
  });

  test('a letter with no content is refused', async () => {
    const res = await request(app).post('/api/legacy/letters').set('Authorization', auth)
      .send({ toProfileId: daughter.id, occasion: 'Nothing', deliverOn: '2045-01-01' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('content_required');
  });

  test('once due, the daughter receives the words — and only then', async () => {
    await request(app).post('/api/legacy/letters').set('Authorization', auth)
      .send({ toProfileId: daughter.id, occasion: 'First day of school',
              deliverOn: '2020-09-01', text: 'Walk in like you own the place.' });
    const her = `Bearer ${tokenFor(null, daughter.id)}`;
    const res = await request(app).get('/api/legacy/letters').set('Authorization', her);
    const due = res.body.delivered.find((l) => l.occasion === 'First day of school');
    expect(due.body).toBe('Walk in like you own the place.');
    const notYet = res.body.sealed.find((l) => l.id === letterId);
    expect(notYet).toBeTruthy();
    expect(notYet).not.toHaveProperty('body');
  });
});

describe('parental consent reaches the guardian even with no mail service', () => {
  test('with mail unconfigured, /consent/start delivers in-app and says so', async () => {
    expect(config.enabled.mail).toBe(false);   // tests/setup.js sets no MAIL_* keys
    const res = await request(app).post('/api/guardian/consent/start').set('Authorization', auth)
      .send({ guardianEmail: user.email });
    expect(res.status).toBe(202);
    expect(res.body.delivery).toBe('in_app');
    expect(typeof res.body.verificationToken).toBe('string');
  });

  test('the route no longer decides this by NODE_ENV', () => {
    const src = require('fs').readFileSync(
      require('path').join(__dirname, '../../src/api/users/index.js'), 'utf8');
    const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    expect(code).toMatch(/config\.enabled\.mail/);
    expect(code).not.toMatch(/config\.env !== 'production'\)\s*payload\.verificationToken/);
  });
});
