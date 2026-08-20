/**
 * Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 *
 * Billing routes + the shared-account webhook. docs/stripe-flow.md.
 */
const express = require('express');
const config = require('../../config');
const db = require('../../config/db');
const logger = require('../../utils/logger');
const { requireAuth, requireAdult } = require('../../middleware/auth');
const svc = require('../../services/stripeService');

const router = express.Router();

/* ── Checkout (adults only — a child can never reach this) ───────── */
router.post('/checkout', requireAuth, requireAdult, async (req, res, next) => {
  try {
    const out = await svc.createSubscriptionCheckout(
      req.user, req.body.lookupKey, req.body.nonce);
    res.json(out);
  } catch (err) { next(err); }
});

router.post('/portal', requireAuth, requireAdult, async (req, res, next) => {
  try {
    // Store-sourced subs deep-link to the OS manager instead of the portal.
    const sub = await db.one(
      `SELECT source FROM subscriptions WHERE user_id = $1
        ORDER BY updated_at DESC LIMIT 1`, [req.user.id]);
    if (sub && sub.source !== 'stripe') {
      return res.json({ source: sub.source, manageUrl: null });
    }
    const session = await svc.createPortalSession(req.user);
    res.json({ url: session.url, source: 'stripe' });
  } catch (err) { next(err); }
});

/* ── Webhook ─────────────────────────────────────────────────────── */
/**
 * MUST be mounted with express.raw BEFORE any json body parser.
 * See server.js — this route is registered ahead of express.json().
 */
const webhook = express.Router();

webhook.post('/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  let event;
  try {
    event = svc.stripe.webhooks.constructEvent(
      req.body, req.headers['stripe-signature'], config.stripe.webhookSecret);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // ── OWNERSHIP GATE — before idempotency, before any write ──
  // The SML Stripe account is shared with The Self-Made Legends Come Up.
  // Its events arrive here and must be ignored. Fails closed.
  let ours;
  try {
    ours = await svc.belongsToBeautyBond(event);
  } catch (err) {
    logger.error({ err, eventId: event.id }, 'ownership_check_failed');
    ours = false;
  }
  if (!ours) return res.json({ received: true, ignored: 'not_beauty_bond' });

  // Idempotency ledger stays free of the game's traffic.
  const inserted = await db.query(
    `INSERT INTO webhook_events (id, provider, type, payload)
     VALUES ($1,'stripe',$2,$3) ON CONFLICT (id) DO NOTHING RETURNING id`,
    [event.id, event.type, event]);
  if (inserted.length === 0) return res.json({ received: true, duplicate: true });

  // ACK fast; process async. Stripe times out at 20s.
  res.json({ received: true });

  try {
    await handle(event);
    await db.query('UPDATE webhook_events SET processed_at = now() WHERE id = $1', [event.id]);
  } catch (err) {
    logger.error({ err, eventId: event.id }, 'webhook_handler_failed');
    await db.query('UPDATE webhook_events SET failed_reason = $2 WHERE id = $1',
                   [event.id, String(err)]);
  }
});

async function handle(event) {
  const obj = event.data.object;

  switch (event.type) {
    case 'checkout.session.completed': {
      // client_reference_id is `bb:<userId>` — strip the namespace prefix.
      const ref = obj.client_reference_id?.startsWith('bb:')
        ? obj.client_reference_id.slice(3) : null;
      if (ref && typeof obj.customer === 'string') {
        await db.query('UPDATE users SET stripe_customer_id = $1 WHERE id = $2',
                       [obj.customer, ref]);
      }
      break;
    }

    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      await svc.syncSubscription(obj);
      break;

    case 'invoice.paid':
      if (typeof obj.subscription === 'string') {
        await svc.syncSubscription(await svc.stripe.subscriptions.retrieve(obj.subscription));
        await db.query('DELETE FROM dunning WHERE user_id = (SELECT id FROM users WHERE stripe_customer_id = $1)',
                       [obj.customer]);
      }
      break;

    case 'invoice.payment_failed': {
      const user = await svc.userByCustomer(obj.customer);
      if (user) {
        // Access is PRESERVED for a 7-day grace window.
        await db.query(
          `INSERT INTO dunning (user_id, attempt, grace_ends_at)
           VALUES ($1,$2, now() + interval '7 days')
           ON CONFLICT (user_id) DO UPDATE SET attempt = EXCLUDED.attempt,
             grace_ends_at = EXCLUDED.grace_ends_at`,
          [user.id, obj.attempt_count ?? 1]);
      }
      break;
    }

    case 'customer.subscription.trial_will_end':
      logger.info({ sub: obj.id }, 'trial_ending_notify');
      break;

    default:
      logger.debug({ type: event.type }, 'unhandled_event_type');
  }
}

module.exports = { router, webhook };
