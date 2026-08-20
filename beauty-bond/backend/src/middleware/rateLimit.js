/**
 * Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 * docs/api-reference.md §6.5 conventions.
 */
const rateLimit = require('express-rate-limit');

const make = (max, windowMs = 60_000) => rateLimit({
  windowMs, max, standardHeaders: true, legacyHeaders: false,
  keyGenerator: (req) => req.profile?.id || req.ip,
});

module.exports = {
  standard: make(60),
  reads: make(120),
  auth: make(5),
  tryonRender: make(10),
  // The panic route is deliberately NOT rate limited beyond abuse protection.
  panic: make(30),
};
