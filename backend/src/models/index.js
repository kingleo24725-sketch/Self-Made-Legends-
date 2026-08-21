/**
 * Dads & Daughters Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 * Proprietary and confidential. Unauthorized copying, distribution,
 * or use of this file, via any medium, is strictly prohibited.
 *
 * Data access layer. Thin query modules over pg — the canonical schema is
 * docs/api-reference.md §6.4, applied by src/config/migrate.js.
 */
module.exports = {
  User: require('./User'),
  Profile: require('./Profile'),
  Subscription: require('./Subscription'),
  Memory: require('./Memory'),
  GlamSet: require('./GlamSet'),
  Room: require('./Room'),
};
