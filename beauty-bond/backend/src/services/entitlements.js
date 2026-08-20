/**
 * Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 *
 * Single source of truth for what each tier unlocks.
 * docs/stripe-flow.md §3.1 and §3.5.
 */
const db = require('../config/db');

const TIERS = ['sparkle', 'bond', 'legacy', 'studio'];

const ENTITLEMENTS = {
  sparkle: {
    learningMaxLevel: 2, culturalCollections: 1, tryOnPerMonth: 5,
    culturalGlamSets: false, familyRoomMinutesPerMonth: 20, globalRooms: 'listen',
    vaultItems: 3, lettersForward: false, bondBooksPerYear: 0, childSeats: 1,
    creatorTools: false,
  },
  bond: {
    learningMaxLevel: 6, culturalCollections: 'all', tryOnPerMonth: 'unlimited',
    culturalGlamSets: true, familyRoomMinutesPerMonth: 300, globalRooms: 'full',
    vaultItems: 25, lettersForward: false, bondBooksPerYear: 1, childSeats: 3,
    creatorTools: false,
  },
  legacy: {
    learningMaxLevel: 6, culturalCollections: 'all', tryOnPerMonth: 'unlimited',
    culturalGlamSets: true, familyRoomMinutesPerMonth: 'unlimited', globalRooms: 'full',
    vaultItems: 'unlimited', lettersForward: true, bondBooksPerYear: 4, childSeats: 6,
    creatorTools: false,
  },
  studio: {
    learningMaxLevel: 6, culturalCollections: 'all', tryOnPerMonth: 'unlimited',
    culturalGlamSets: true, familyRoomMinutesPerMonth: 'unlimited', globalRooms: 'full',
    vaultItems: 'unlimited', lettersForward: true, bondBooksPerYear: 'unlimited',
    childSeats: 6, creatorTools: true,
  },
};

/**
 * NEVER gated, at any tier, in any billing state.
 * A lapsed card must not withhold a dead parent's letter or a panic button.
 */
const ALWAYS_FREE = new Set([
  'safety.panic_button',
  'safety.report',
  'safety.block',
  'guardian.console',
  'guardian.permissions',
  'privacy.data_export',
  'privacy.account_delete',
  'learning.hygiene',
  'legacy.letter_delivery',
]);

async function getTier(userId) {
  const sub = await db.one(
    `SELECT * FROM subscriptions
      WHERE user_id = $1 AND status IN ('active','trialing','past_due')
      ORDER BY updated_at DESC LIMIT 1`, [userId]);
  if (!sub) return 'sparkle';

  if (['active', 'trialing'].includes(sub.status)) return sub.tier;

  // past_due keeps FULL access during the 7-day grace window.
  if (sub.status === 'past_due') {
    const dunning = await db.one(
      'SELECT grace_ends_at FROM dunning WHERE user_id = $1', [userId]);
    if (dunning && new Date(dunning.grace_ends_at) > new Date()) return sub.tier;
  }
  return 'sparkle';
}

/** A guardian's tier flows down to every linked child. Kids never pay. */
async function effectiveTierFor(profileId) {
  const profile = await db.one(
    'SELECT user_id, guardian_id FROM profiles WHERE id = $1', [profileId]);
  if (!profile) return 'sparkle';

  if (profile.guardian_id) {
    const guardian = await db.one(
      'SELECT user_id FROM profiles WHERE id = $1', [profile.guardian_id]);
    return getTier(guardian?.user_id);
  }
  return getTier(profile.user_id);
}

async function setEntitlement(userId, tier) {
  await db.query(
    `INSERT INTO entitlement_audit (user_id, tier, changed_at)
     VALUES ($1, $2, now())`, [userId, tier]);
}

/** Monthly quota counter, reset by period rather than by cron. */
async function consumeQuota(profileId, metric) {
  const rows = await db.query(
    `INSERT INTO usage_counters (profile_id, metric, period, used)
     VALUES ($1, $2, to_char(now(),'YYYY-MM'), 1)
     ON CONFLICT (profile_id, metric, period)
     DO UPDATE SET used = usage_counters.used + 1
     RETURNING used`, [profileId, metric]);
  return rows[0].used;
}

async function quotaUsed(profileId, metric) {
  const row = await db.one(
    `SELECT used FROM usage_counters
      WHERE profile_id = $1 AND metric = $2 AND period = to_char(now(),'YYYY-MM')`,
    [profileId, metric]);
  return row?.used ?? 0;
}

module.exports = {
  TIERS, ENTITLEMENTS, ALWAYS_FREE,
  getTier, effectiveTierFor, setEntitlement, consumeQuota, quotaUsed,
};
