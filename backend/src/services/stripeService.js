/**
 * Dad + Daughter Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 * Proprietary and confidential. Unauthorized use is prohibited.
 *
 * ══════════════════════════════════════════════════════════════════════
 *  DEDICATED STRIPE ACCOUNT.
 *  Beauty Bond bills through its OWN Stripe account — separate from The
 *  Self-Made Legends Come Up and from every other SML product. Its
 *  customers, products, prices, webhook endpoint, API keys, payouts, and
 *  dispute history are its own.
 *
 *  This is why there is no product-ownership gate in the webhook handler:
 *  no other product's events can arrive here. Objects are still tagged
 *  sml_product and bb_-prefixed, which costs nothing and keeps reporting
 *  and any future migration straightforward.
 *
 *  If this ever moves onto a shared account, the isolation described in
 *  docs/stripe-flow.md §3.2 has to come back first.
 * ══════════════════════════════════════════════════════════════════════
 */
const Stripe = require('stripe');
const config = require('./../config');
const db = require('../config/db');
const { setEntitlement } = require('./entitlements');

const stripe = new Stripe(config.stripe.secretKey, { apiVersion: config.stripe.apiVersion });

const OURS = config.stripe.productTag;          // 'beauty_bond'
const PREFIX = config.stripe.lookupKeyPrefix;   // 'bb_'

/* ── Prices ───────────────────────────────────────────────────────── */

async function priceIdFor(lookupKey) {
  if (!lookupKey || !lookupKey.startsWith(PREFIX)) {
    const err = new Error('unknown_plan'); err.status = 400; throw err;
  }
  const { data } = await stripe.prices.list({ lookup_keys: [lookupKey], active: true });
  const price = data[0];
  if (!price) { const err = new Error('unknown_plan'); err.status = 400; throw err; }
  return price;
}

/* ── Customers ────────────────────────────────────────────────────── */

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

const userByCustomer = (customerId) =>
  db.one('SELECT * FROM users WHERE stripe_customer_id = $1 AND deleted_at IS NULL',
         [customerId]);

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
  priceIdFor, findOrCreateCustomer, userByCustomer,
  createSubscriptionCheckout, createPortalSession, syncSubscription,
};
