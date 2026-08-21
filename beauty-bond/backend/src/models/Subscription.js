/**
 * Dads & Daughters Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 * Proprietary and confidential. Unauthorized copying, distribution,
 * or use of this file, via any medium, is strictly prohibited.
 */
const db = require('../config/db');

module.exports = {
  activeFor: (userId) => db.one(
    `SELECT * FROM subscriptions
      WHERE user_id = $1 AND status IN ('active','trialing','past_due')
      ORDER BY updated_at DESC LIMIT 1`, [userId]),
  byId: (id) => db.one('SELECT * FROM subscriptions WHERE id = $1', [id]),
};
