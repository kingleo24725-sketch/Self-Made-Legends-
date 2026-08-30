/**
 * Dad + Daughter Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 * Proprietary and confidential. Unauthorized use is prohibited.
 *
 * ══════════════════════════════════════════════════════════════════════
 *  SHARED SML STRIPE ACCOUNT.
 *  Beauty Bond and The Self-Made Legends Come Up bill through ONE Stripe
 *  account, by owner decision. Stripe fans out EVERY event to EVERY
 *  webhook endpoint on an account, so the game's events arrive here and
 *  Beauty Bond's arrive there. Neither product may act on the other's.
 *
 *  Isolation therefore lives in code, at four layers:
 *    1. Every object namespaced — sml_product metadata, bb_ lookup keys
 *    2. A separate Stripe Customer per product
 *    3. An ownership gate on the webhook that FAILS CLOSED
 *    4. A restricted API key scoped to this product
 *
 *  Read docs/stripe-flow.md §3.2 before touching any of this.
 * ══════════════════════════════════════════════════════════════════════
 */
const Stripe = require('stripe');
const config = require('./../config');
const db = require('../config/db');
const { setEntitlement } = require('./entitlements');
const logger = require('../utils/logger');

/**
 * Built on first use. The SDK throws without a key, which would take the API
 * down at boot on a deploy where billing is not yet configured.
 */
let _stripe;
const stripe = new Proxy({}, {
  get(_t, prop) {
    if (!config.enabled.billing && config.env === 'production') {
      const e = new Error('billing_not_configured');
      e.status = 503;
      e.publicMessage = 'Subscriptions are not available yet.';
      throw e;
    }
    _stripe ||= new Stripe(config.stripe.secretKey || 'sk_test_unconfigured',
                           { apiVersion: config.stripe.apiVersion });
    return _stripe[prop];
  },
});

const OURS = config.stripe.productTag;          // 'beauty_bond'
const PREFIX = config.stripe.lookupKeyPrefix;   // 'bb_'

/* ── Layer 1: namespaced price resolution ─────────────────────────── */

async function priceIdFor(lookupKey) {
  if (!lookupKey || !lookupKey.startsWith(PREFIX)) {
    const err = new Error('unknown_plan'); err.status = 400; throw err;
  }
  const { data } = await stripe.prices.list({ lookup_keys: [lookupKey], active: true });
  // The prefix keeps us off the game's keys; the tag is belt and braces.
  const price = data.find((p) => p.metadata.sml_product === OURS);
  if (!price) { const err = new Error('unknown_plan'); err.status = 400; throw err; }
  return price;
}

/* ── Layer 2: a separate Customer object per product ──────────────── */

/**
 * A human who buys BOTH products gets TWO Stripe Customers, one per product.
 * Share one and a Come Up subscription event resolves to a Beauty Bond user,
 * silently granting a paid tier. Two rows per human is far cheaper than that.
 */
async function findOrCreateCustomer(user) {
  if (user.stripe_customer_id) return user.stripe_customer_id;

  const customer = await stripe.customers.create({
    email: user.email,
    metadata: { sml_product: OURS, bb_user_id: user.id },
  }, { idempotencyKey: `bb_cust_${user.id}` });

  await db.query('UPDATE users SET stripe_customer_id = $1 WHERE id = $2',
                 [customer.id, user.id]);
  return customer.id;
}

/**
 * Product-scoped by construction: users.stripe_customer_id only ever holds a
 * Beauty Bond customer. There is deliberately NO unscoped variant.
 */
const userByCustomer = (customerId) =>
  db.one('SELECT * FROM users WHERE stripe_customer_id = $1 AND deleted_at IS NULL',
         [customerId]);

/* ── Layer 3: webhook ownership filter ────────────────────────────── */

/**
 * Resolve which SML product an event belongs to. FAILS CLOSED — an event that
 * cannot be attributed is ignored, never granted.
 */
async function belongsToBeautyBond(event) {
  const obj = event.data.object;

  // 1. Direct tag — subscription, checkout.session, payment_intent, charge, customer
  if (obj?.metadata?.sml_product) return obj.metadata.sml_product === OURS;

  // 2. Invoices carry no metadata of their own
  if (obj?.object === 'invoice') {
    if (typeof obj.subscription === 'string') {
      const sub = await stripe.subscriptions.retrieve(obj.subscription);
      if (sub.metadata?.sml_product) return sub.metadata.sml_product === OURS;
    }
    const key = obj.lines?.data?.[0]?.price?.lookup_key;
    if (key) return key.startsWith(PREFIX);
  }

  // 3. Fall back to the customer's tag
  const customerId = typeof obj?.customer === 'string' ? obj.customer : null;
  if (customerId) {
    const customer = await stripe.customers.retrieve(customerId);
    if (!customer.deleted) return customer.metadata?.sml_product === OURS;
  }

  // 4. Unattributable -> not ours.
  logger.warn({ eventId: event.id, type: event.type }, 'unattributable_stripe_event');
  return false;
}

/* ── Checkout ─────────────────────────────────────────────────────── */

async function createSubscriptionCheckout(user, lookupKey, nonce) {
  const price = await priceIdFor(lookupKey);
  const customerId = await findOrCreateCustomer(user);

  const subscription = await stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: price.id }],
    payment_behavior: 'default_incomplete',
    payment_settings: { save_default_payment_method: 'on_subscription' },
    automatic_tax: { enabled: true },
    trial_period_days: 7,
    metadata: { bb_user_id: user.id, tier: price.metadata.tier, sml_product: OURS },
    expand: ['latest_invoice.payment_intent'],
  }, { idempotencyKey: `bb_sub_${user.id}_${price.id}_${nonce ?? ''}` });

  const ephemeralKey = await stripe.ephemeralKeys.create(
    { customer: customerId }, { apiVersion: config.stripe.apiVersion });

  return {
    subscriptionId: subscription.id,
    clientSecret: subscription.latest_invoice.payment_intent.client_secret,
    ephemeralKey: ephemeralKey.secret,
    customerId,
  };
}

const createPortalSession = (user) =>
  stripe.billingPortal.sessions.create({
    customer: user.stripe_customer_id,
    return_url: `${config.webUrl}/settings/billing`,
    configuration: config.stripe.portalConfigId,
  });

/* ── Sync ─────────────────────────────────────────────────────────── */

async function syncSubscription(sub) {
  // Defence in depth — a wrong grant here is a revenue and trust bug.
  if (sub.metadata?.sml_product !== OURS) {
    throw new Error(`refusing to sync foreign subscription ${sub.id}`);
  }

  const userId = sub.metadata.bb_user_id ?? (await userByCustomer(sub.customer))?.id;
  if (!userId) return;

  const price = sub.items.data[0]?.price;
  const tier = price?.metadata?.tier ?? 'free';
  const ACTIVE = ['active', 'trialing', 'past_due'];
  const effectiveTier = ACTIVE.includes(sub.status) ? tier : 'free';

  await db.query(
    `INSERT INTO subscriptions
       (id, user_id, source, tier, status, price_lookup_key,
        current_period_end, cancel_at_period_end, trial_end, seats, updated_at)
     VALUES ($1,$2,'stripe',$3,$4,$5,to_timestamp($6),$7,
             CASE WHEN $8::bigint IS NULL THEN NULL ELSE to_timestamp($8) END,$9, now())
     ON CONFLICT (id) DO UPDATE SET
       tier = EXCLUDED.tier, status = EXCLUDED.status,
       price_lookup_key = EXCLUDED.price_lookup_key,
       current_period_end = EXCLUDED.current_period_end,
       cancel_at_period_end = EXCLUDED.cancel_at_period_end,
       trial_end = EXCLUDED.trial_end, seats = EXCLUDED.seats, updated_at = now()`,
    [sub.id, userId, tier, sub.status, price?.lookup_key ?? null,
     sub.current_period_end, sub.cancel_at_period_end, sub.trial_end,
     sub.items.data.find((i) => i.price.lookup_key === `${PREFIX}seat_child`)?.quantity ?? 0]);

  await setEntitlement(userId, effectiveTier);
}

module.exports = {
  stripe, OURS, PREFIX,
  priceIdFor, findOrCreateCustomer, userByCustomer, belongsToBeautyBond,
  createSubscriptionCheckout, createPortalSession, syncSubscription,
};
