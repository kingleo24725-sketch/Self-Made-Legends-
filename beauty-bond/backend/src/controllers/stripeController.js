/**
 * Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 *
 * Billing endpoints. The SML Stripe account is SHARED with The Self-Made
 * Legends Come Up — read docs/stripe-flow.md §3.2 before editing anything here.
 */
const db = require('../config/db');
const svc = require('../services/stripeService');
const {
  PLANS, TIERS, ENTITLEMENTS, effectiveTierFor, quotaUsed,
} = require('../services/entitlements');

/** GET /api/stripe/plans — public plan catalogue for the paywall UI. */
async function listPlans(req, res) {
  res.json({
    plans: TIERS.map((code) => ({
      code,
      ...PLANS[code],
      lookupKeyMonthly: code === 'free' ? null : `bb_${code}_monthly`,
      lookupKeyYearly: code === 'free' ? null : `bb_${code}_yearly`,
      entitlements: ENTITLEMENTS[code],
    })),
    note: 'Safety features, guardian controls, and data export are free on every plan.',
  });
}

/**
 * POST /api/stripe/customer
 * Idempotent. Creates the Beauty Bond-scoped Stripe Customer for this user.
 *
 * A human who also plays the Come Up game gets a SEPARATE customer object
 * there — sharing one would let a game event grant a Beauty Bond plan.
 */
async function createCustomer(req, res, next) {
  try {
    const customerId = await svc.findOrCreateCustomer(req.user);
    res.status(201).json({ customerId, smlProduct: svc.OURS });
  } catch (err) { next(err); }
}

/** POST /api/stripe/subscription — create a subscription, returns a client secret. */
async function createSubscription(req, res, next) {
  try {
    const { plan, interval = 'monthly', lookupKey, nonce } = req.body;

    const key = lookupKey
      || (plan && plan !== 'free' ? `bb_${plan}_${interval}` : null);
    if (!key) return res.status(400).json({ error: 'plan_required' });

    const out = await svc.createSubscriptionCheckout(req.user, key, nonce);
    res.status(201).json(out);
  } catch (err) { next(err); }
}

/**
 * GET /api/stripe/subscription — current status.
 *
 * This is what the frontend hook polls after checkout, because entitlement is
 * granted by the WEBHOOK, never by the client returning from the payment sheet.
 */
async function getSubscriptionStatus(req, res, next) {
  try {
    const tier = await effectiveTierFor(req.profile.id);

    const sub = req.user
      ? await db.one(
          `SELECT * FROM subscriptions WHERE user_id = $1
            ORDER BY updated_at DESC LIMIT 1`, [req.user.id])
      : null;

    const dunning = req.user
      ? await db.one('SELECT * FROM dunning WHERE user_id = $1', [req.user.id])
      : null;

    res.json({
      tier,
      plan: PLANS[tier],
      entitlements: ENTITLEMENTS[tier],
      usage: {
        tryon: await quotaUsed(req.profile.id, 'tryon'),
        room_minutes: await quotaUsed(req.profile.id, 'room_minutes'),
      },
      status: sub?.status ?? 'none',
      source: sub?.source ?? null,
      currentPeriodEnd: sub?.current_period_end ?? null,
      cancelAtPeriodEnd: sub?.cancel_at_period_end ?? false,
      trialEnd: sub?.trial_end ?? null,
      // In grace: payment failed but access is deliberately preserved.
      inGracePeriod: !!(dunning && new Date(dunning.grace_ends_at) > new Date()),
      graceEndsAt: dunning?.grace_ends_at ?? null,
      // Children never hold their own plan — they inherit the guardian's.
      inheritedFromGuardian: !!req.profile.guardian_id,
    });
  } catch (err) { next(err); }
}

/** POST /api/stripe/portal */
async function createPortal(req, res, next) {
  try {
    const sub = await db.one(
      `SELECT source FROM subscriptions WHERE user_id = $1
        ORDER BY updated_at DESC LIMIT 1`, [req.user.id]);

    // Store-sourced subscriptions deep-link to the OS manager instead.
    if (sub && sub.source !== 'stripe') {
      return res.json({ source: sub.source, url: null,
                        message: 'Manage this subscription in your app store.' });
    }
    const session = await svc.createPortalSession(req.user);
    res.json({ url: session.url, source: 'stripe' });
  } catch (err) { next(err); }
}

/** POST /api/stripe/subscription/cancel — at period end, never mid-period. */
async function cancelSubscription(req, res, next) {
  try {
    const sub = await db.one(
      `SELECT * FROM subscriptions WHERE user_id = $1 AND status IN ('active','trialing')
        ORDER BY updated_at DESC LIMIT 1`, [req.user.id]);
    if (!sub) return res.status(404).json({ error: 'no_active_subscription' });

    const updated = await svc.stripe.subscriptions.update(sub.id, {
      cancel_at_period_end: true,
    });
    await svc.syncSubscription(updated);

    res.json({
      ok: true,
      cancelAtPeriodEnd: true,
      accessUntil: new Date(updated.current_period_end * 1000).toISOString(),
      message: 'You keep everything you paid for until the end of the period.',
    });
  } catch (err) { next(err); }
}

module.exports = {
  listPlans, createCustomer, createSubscription,
  getSubscriptionStatus, createPortal, cancelSubscription,
};
