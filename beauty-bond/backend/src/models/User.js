/**
 * Dad + Daughter Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 *
 * User = auth identity + billing + profile linkage.
 *
 * The split matters: `users` holds the ADULT auth/billing identity, while
 * `profiles` holds everyone who actually uses the app, children included.
 * A child has a profile and no user row — they never authenticate
 * independently and never hold a payment method.
 */
const db = require('../config/db');

/* ── Auth ─────────────────────────────────────────────────────────── */

const byId = (id) =>
  db.one('SELECT * FROM users WHERE id = $1 AND deleted_at IS NULL', [id]);

const byEmail = (email) =>
  db.one('SELECT * FROM users WHERE email = $1 AND deleted_at IS NULL',
         [String(email).toLowerCase()]);

const create = ({ email, passwordHash, region, authProvider }) =>
  db.one(
    `INSERT INTO users (email, password_hash, region, auth_provider)
     VALUES ($1,$2,$3,$4) RETURNING *`,
    [String(email).toLowerCase(), passwordHash ?? null, region, authProvider ?? null]);

/* ── Subscription ─────────────────────────────────────────────────── */

/**
 * Product-scoped by construction: users.stripe_customer_id only ever holds a
 * Beauty Bond customer. Do NOT add an unscoped lookup — the SML Stripe account
 * is shared with the Come Up game, and an unscoped match is exactly how a game
 * event would grant a Beauty Bond plan. docs/stripe-flow.md §3.2 Layer 2.
 */
const byStripeCustomer = (customerId) =>
  db.one('SELECT * FROM users WHERE stripe_customer_id = $1 AND deleted_at IS NULL',
         [customerId]);

const setStripeCustomer = (id, customerId) =>
  db.query('UPDATE users SET stripe_customer_id = $2 WHERE id = $1', [id, customerId]);

const activeSubscription = (userId) =>
  db.one(
    `SELECT * FROM subscriptions
      WHERE user_id = $1 AND status IN ('active','trialing','past_due')
      ORDER BY updated_at DESC LIMIT 1`, [userId]);

/* ── Profiles ─────────────────────────────────────────────────────── */

const profiles = (userId) =>
  db.query('SELECT * FROM profiles WHERE user_id = $1 AND deleted_at IS NULL', [userId]);

const primaryProfile = (userId) =>
  db.one(`SELECT * FROM profiles WHERE user_id = $1 AND deleted_at IS NULL
           ORDER BY created_at LIMIT 1`, [userId]);

/* ── Deletion ─────────────────────────────────────────────────────── */

/** Always free, every tier, every region. Cascades to linked child profiles. */
async function softDelete(id) {
  await db.query('UPDATE users SET deleted_at = now() WHERE id = $1', [id]);
  await db.query(
    `UPDATE profiles SET deleted_at = now()
      WHERE user_id = $1
         OR guardian_id IN (SELECT id FROM profiles WHERE user_id = $1)`, [id]);
}

module.exports = {
  byId, byEmail, create,
  byStripeCustomer, setStripeCustomer, activeSubscription,
  profiles, primaryProfile, softDelete,
};
