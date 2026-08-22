/**
 * Dad + Daughter Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 * Proprietary and confidential. Unauthorized copying, distribution,
 * or use of this file, via any medium, is strictly prohibited.
 *
 * COMMERCIAL GATE. Runs AFTER the age gate, never before.
 * docs/stripe-flow.md §3.5.
 */
const { ENTITLEMENTS, ALWAYS_FREE } = require('../services/entitlements');
const { effectiveTierFor } = require('../services/entitlements');

function requireEntitlement(check, capability) {
  return async (req, res, next) => {
    // Safety, guardian tools, data export, and letter delivery never lapse.
    if (capability && ALWAYS_FREE.has(capability)) return next();

    const tier = await effectiveTierFor(req.profile.id);
    const entitlements = ENTITLEMENTS[tier];

    let allowed;
    try {
      allowed = await check(entitlements, req);
    } catch {
      allowed = false;   // fail closed
    }

    if (allowed) return next();

    return res.status(402).json({
      error: 'upgrade_required',
      currentTier: tier,
      capability,
      // The client renders this as a soft paywall sheet, never a hard wall.
    });
  };
}

module.exports = { requireEntitlement };
