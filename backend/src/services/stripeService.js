/**
 * Dad + Daughter Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 *
 * ══════════════════════════════════════════════════════════════════════
 *  SHARED SML STRIPE ACCOUNT.
 *  Beauty Bond and The Self-Made Legends Come Up bill through ONE Stripe
 *  account. Stripe fans out EVERY event to EVERY endpoint, so isolation
 *  lives here, in code. Read docs/stripe-flow.md §3.2 before editing.
 * ══════════════════════════════════════════════════════════════════════
 */
const Stripe = require('stripe');
const config = require('../config');
const db = require('../config/db');
const logger = require('../utils/logger');
const { setEntitlement } = require('./entitlements');

const stripe = new Stripe(config.stripe.secretKey, { apiVersion: config.stripe.apiVersion });

const OURS = config.stripe.productTag;           // 'beauty_bond'
const PREFIX = config.stripe.lookupKeyPrefix;    // 'bb_'

/* ── Layer 1: namespaced price resolution ─────────────────────────── */

async function priceIdFor(lookupKey) {
  if (!lookupKey || !lookupKey.startsWith(PREFIX)) {
    const err = new Error('unknown_plan'); err.status = 400; throw err;
  }
  const { data } = await stripe.prices.list({ lookup_keys: [lookupKey], active: true });
  const price = data.find((p) => p.metadata.sml_product === OURS);
  if (!price) { const err = new Error('unknown_plan'); err.status = 400; throw err; }
  return price;
}

/* ── Layer 2: separate Customer object per product ────────────────── */

/**
 * A human who buys BOTH products gets TWO Stripe Customers, one per product.
 * With a shared Customer, a Come Up event would resolve to a Beauty Bond user
 * and silently grant a paid tier.
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

/** Product-scoped. There is deliberately NO unscoped variant of this. */
async function userByCustomer(customerId) {
  return db.one(
    'SELECT * FROM users WHERE stripe_customer_id = $1 AND deleted_at IS NULL',
    [customerId]);
}

/* ── Layer 3: webhook ownership filter ────────────────────────────── */

/**
 * Resolve which SML product an event belongs to. FAILS CLOSED — an event we
 * cannot attribute is ignored, never granted.
 */
async function belongsToBeautyBond(event) {
  const obj = event.data.object;

  // 1. Direct tag: subscription, checkout.session, payment_intent, charge, customer
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
    // `bb_user_id`, NEVER `userId` — the Come Up handler reads `userId`.
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

async function createPortalSession(user) {
  return stripe.billingPortal.sessions.create({
    customer: user.stripe_customer_id,
    return_url: `${config.webUrl}/settings/billing`,
    configuration: config.stripe.portalConfigId,
  });
}

/* ── Sync ─────────────────────────────────────────────────────────── */

async function syncSubscription(sub) {
  // Defense in depth — a wrong grant here is a revenue and trust bug.
  if (sub.metadata?.sml_product !== OURS) {
    throw new Error(`refusing to sync foreign subscription ${sub.id}`);
  }

  const userId = sub.metadata.bb_user_id
    ?? (await userByCustomer(sub.customer))?.id;
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
  priceIdFor, findOrCreateCustomer, userByCustomer,
  belongsToBeautyBond, createSubscriptionCheckout, createPortalSession, syncSubscription,
};
