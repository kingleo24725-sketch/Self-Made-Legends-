/**
 * Dad + Daughter Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 * Proprietary and confidential. Unauthorized use is prohibited.
 *
 * RELEASE BLOCKER — docs/stripe-flow.md §3.6.
 *
 * entitlements.js carries a 90%-line / 90%-function threshold in jest.config.js
 * because it is what stands between a family and their own data. It sat at
 * 81% — and the uncovered lines were not incidental. They were:
 *
 *   - the 7-day dunning grace window, which decides whether a failed card
 *     locks a paying family out on the day it declines;
 *   - the billing-ON branch of capabilitiesFor, which is the ONLY branch that
 *     will run once Stripe is configured, and which no test exercised because
 *     v1 ships with billing off;
 *   - setEntitlement, which writes the audit trail.
 *
 * A grace window nobody tested is a grace window that might not exist.
 */
const db = require('../../src/config/db');
const config = require('../../src/config');
const {
  getTier, effectiveTierFor, capabilitiesFor, setEntitlement, ENTITLEMENTS, V1_UNGATED,
} = require('../../src/services/entitlements');

const stamp = Date.now();
let payer, payerProfile, child;

const daysFromNow = (n) => new Date(Date.now() + n * 864e5).toISOString();

beforeAll(async () => {
  payer = await db.one(
    `INSERT INTO users (email, password_hash, region)
     VALUES ($1,'x','US') RETURNING *`, [`grace_${stamp}@sml.test`]);
  payerProfile = await db.one(
    `INSERT INTO profiles (user_id, display_name, birth_date, age_band, mode)
     VALUES ($1,'Andre','1984-07-11','adult','dad_daughter') RETURNING *`, [payer.id]);
  child = await db.one(
    `INSERT INTO profiles (guardian_id, display_name, birth_date, age_band, mode)
     VALUES ($1,'Imani','2016-01-20','child','dad_daughter') RETURNING *`,
    [payerProfile.id]);
});

afterAll(async () => {
  // Order matters: profiles.guardian_id has no ON DELETE CASCADE, so deleting
  // the user cascades to the parent profile and then trips the child's FK.
  // The child goes first, deliberately — a schema that refuses to orphan a
  // minor's row is the schema behaving correctly.
  await db.query('DELETE FROM profiles WHERE guardian_id = $1', [payerProfile.id]);
  await db.query('DELETE FROM users WHERE id = $1', [payer.id]);
});

const setSub = (status, tier = 'premium') => db.query(
  `INSERT INTO subscriptions (id, user_id, source, tier, status)
     VALUES ($1,$2,'stripe',$3,$4)
   ON CONFLICT (id) DO UPDATE SET status = $4, tier = $3, updated_at = now()`,
  [`sub_${stamp}`, payer.id, tier, status]);

const setGrace = (endsAt) => db.query(
  `INSERT INTO dunning (user_id, grace_ends_at) VALUES ($1,$2)
   ON CONFLICT (user_id) DO UPDATE SET grace_ends_at = $2`, [payer.id, endsAt]);

describe('a declined card does not lock the family out on day one', () => {
  test('no subscription at all is free', async () => {
    expect(await getTier(payer.id)).toBe('free');
  });

  test('an active subscription grants its tier', async () => {
    await setSub('active');
    expect(await getTier(payer.id)).toBe('premium');
  });

  test('past_due INSIDE the grace window keeps full access', async () => {
    await setSub('past_due');
    await setGrace(daysFromNow(3));
    expect(await getTier(payer.id)).toBe('premium');
  });

  test('past_due AFTER the window expires drops to free', async () => {
    await setSub('past_due');
    await setGrace(daysFromNow(-1));
    expect(await getTier(payer.id)).toBe('free');
  });

  test('past_due with no dunning row at all drops to free, not to a crash', async () => {
    await setSub('past_due');
    await db.query('DELETE FROM dunning WHERE user_id = $1', [payer.id]);
    expect(await getTier(payer.id)).toBe('free');
  });

  test('an anonymous profile is free without touching the database', async () => {
    expect(await getTier(null)).toBe('free');
  });
});

describe("a child inherits the guardian's plan and never pays", () => {
  test('the grace window flows down to the child too', async () => {
    await setSub('past_due');
    await setGrace(daysFromNow(2));
    // The child holds no subscription of their own — and must not lose their
    // father's plan because his card bounced this morning.
    expect(await effectiveTierFor(child.id)).toBe('premium');
  });

  test('an unknown profile id is free', async () => {
    expect(await effectiveTierFor('00000000-0000-0000-0000-000000000000')).toBe('free');
  });
});

/**
 * config.enabled.billing is derived from STRIPE_SECRET_KEY_BB being present,
 * which tests/setup.js sets — so the test environment runs the billing-ON
 * branch, and the v1 branch that actually ships needed forcing. Both are
 * exercised here, and the flag is restored either way.
 */
describe('capabilitiesFor answers to whether billing exists', () => {
  const realBilling = config.enabled.billing;
  afterEach(() => { config.enabled.billing = realBilling; });

  test('billing ON: the plan ladder applies exactly as designed', async () => {
    config.enabled.billing = true;
    await setSub('active', 'basic');
    const caps = await capabilitiesFor(payerProfile.id);
    expect(caps.tier).toBe('basic');
    expect(caps.lettersForward).toBe(ENTITLEMENTS.basic.lettersForward);
    expect(caps.lettersForward).toBe(false);   // Basic does not include them
  });

  test('billing OFF: v1 opens the commercial gates instead', async () => {
    config.enabled.billing = false;
    await setSub('active', 'basic');
    const caps = await capabilitiesFor(payerProfile.id);
    expect(caps.tier).toBe('basic');            // the tier is still reported truthfully
    expect(caps.lettersForward).toBe(true);     // but nothing is withheld
    expect(caps.vaultItems).toBe(V1_UNGATED.vaultItems);
  });

  test('billing OFF never widens a SAFETY decision, only a commercial one', async () => {
    config.enabled.billing = false;
    const caps = await capabilitiesFor(child.id);
    // V1_UNGATED is deliberately narrow: the Legacy module and nothing else.
    expect(Object.keys(V1_UNGATED).sort())
      .toEqual(['bondBooksPerYear', 'lettersForward', 'vaultItems']);
    expect(caps.childSeats).toBe(ENTITLEMENTS[caps.tier].childSeats);
  });
});

describe('entitlement changes leave an audit trail', () => {
  test('setEntitlement writes a row that says who and what', async () => {
    await setEntitlement(payer.id, 'family');
    const row = await db.one(
      `SELECT tier FROM entitlement_audit WHERE user_id = $1
        ORDER BY changed_at DESC LIMIT 1`, [payer.id]);
    expect(row.tier).toBe('family');
  });
});
