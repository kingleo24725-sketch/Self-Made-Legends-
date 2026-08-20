/**
 * Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 */
const db = require('../config/db');

module.exports = {
  byId: (id) => db.one('SELECT * FROM users WHERE id = $1 AND deleted_at IS NULL', [id]),
  byEmail: (email) => db.one(
    'SELECT * FROM users WHERE email = $1 AND deleted_at IS NULL', [String(email).toLowerCase()]),

  /**
   * Product-scoped by construction: users.stripe_customer_id only ever holds a
   * Beauty Bond customer. Do NOT add an unscoped lookup — the SML Stripe
   * account is shared with the Come Up game. docs/stripe-flow.md §3.2 Layer 2.
   */
  byStripeCustomer: (customerId) => db.one(
    'SELECT * FROM users WHERE stripe_customer_id = $1 AND deleted_at IS NULL', [customerId]),

  setStripeCustomer: (id, customerId) => db.query(
    'UPDATE users SET stripe_customer_id = $2 WHERE id = $1', [id, customerId]),

  softDelete: (id) => db.query('UPDATE users SET deleted_at = now() WHERE id = $1', [id]),
};
