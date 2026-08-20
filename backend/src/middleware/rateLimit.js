/**
 * Dad + Daughter Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 * docs/api-reference.md §6.5 conventions.
 */
const rateLimit = require('express-rate-limit');
const config = require('../config');

// Rate limiting is real behavior we want in production, but it makes
// integration tests flaky and order-dependent. Disable it under test only.
const DISABLED = config.env === 'test';

const make = (max, windowMs = 60_000) => rateLimit({
  windowMs,
  max,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => DISABLED,
  keyGenerator: (req) => req.profile?.id || req.ip,
});

module.exports = {
  standard: make(60),
  reads: make(120),
  auth: make(5),
  tryonRender: make(10),
  // Deliberately generous: a child in trouble must never be rate-limited
  // out of the panic button.
  panic: make(30),
};
