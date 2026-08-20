/**
 * Dad + Daughter Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
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
