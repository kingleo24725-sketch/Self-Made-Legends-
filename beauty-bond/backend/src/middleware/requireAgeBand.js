/**
 * Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 *
 * ══════════════════════════════════════════════════════════════════════
 *  COMPLIANCE GATE. This ALWAYS runs BEFORE requireEntitlement.
 *  No tier, coupon, promo code, or admin flag unlocks age-restricted
 *  content. A 9-year-old cannot buy access to Level 6.
 *  docs/api-reference.md §6.6, docs/stripe-flow.md §3.5.
 * ══════════════════════════════════════════════════════════════════════
 */
const db = require('../config/db');

function ageFromBirthDate(birthDate) {
  const d = new Date(birthDate);
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
  return age;
}

/**
 * @param {(req) => Promise<number>|number} minAgeResolver
 *        Resolves the minimum age for the requested resource.
 */
function requireAgeBand(minAgeResolver) {
  return async (req, res, next) => {
    const profile = req.profile;
    if (!profile) return res.status(401).json({ error: 'unauthorized' });

    const age = ageFromBirthDate(profile.birth_date);
    const minAge = typeof minAgeResolver === 'function'
      ? await minAgeResolver(req)
      : (minAgeResolver ?? 0);

    if (age < minAge) {
      // NOTE: never return 402 here — an age lock is not purchasable.
      return res.status(403).json({
        error: 'age_restricted',
        minAge,
        message: 'This is for older users. It cannot be unlocked with a plan.',
      });
    }
    return next();
  };
}

/** Guardian permission check for any minor-facing capability. */
function requireGuardianPermission(key) {
  return async (req, res, next) => {
    if (req.profile.age_band === 'adult') return next();
    const perms = await db.one(
      'SELECT * FROM guardian_permissions WHERE child_profile_id = $1', [req.profile.id]);
    if (!perms || !perms[key]) {
      return res.status(403).json({
        error: 'guardian_permission_required',
        permission: key,
        message: 'Ask your grown-up to turn this on.',
      });
    }
    return next();
  };
}

module.exports = { requireAgeBand, requireGuardianPermission, ageFromBirthDate };
