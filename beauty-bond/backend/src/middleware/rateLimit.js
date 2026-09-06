/**
 * Dad + Daughter Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 * Proprietary and confidential. Unauthorized copying, distribution,
 * or use of this file, via any medium, is strictly prohibited.
 * docs/api-reference.md §6.5 conventions.
 */
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const config = require('../config');

// Rate limiting is real behavior we want in production, but it makes
// integration tests flaky and order-dependent. Disable it under test only.
const DISABLED = config.env === 'test';

/**
 * Who is this request from?
 *
 * The limiter runs before auth — it has to, a flood of bad tokens is exactly
 * what it exists for — so req.profile is never set when the key is computed,
 * and the old keyGenerator (`req.profile?.id || req.ip`) always fell through
 * to the address. That is not per-person. A family on one router shares one
 * IP, and behind Railway's proxy every user shares the PROXY's address: the
 * whole product had sixty requests a minute between everybody, and opening
 * the Legacy tab costs six.
 *
 * A valid bearer token names its user without a database read. Anything else
 * keys on the address, which is what an unauthenticated flood looks like.
 */
function keyFor(req) {
  const header = req.headers?.authorization || '';
  if (header.startsWith('Bearer ')) {
    try {
      const { userId } = jwt.verify(header.slice(7), config.jwt.secret);
      if (userId) return `u:${userId}`;
    } catch { /* not ours — fall through to the address */ }
  }
  return req.ip;
}

const make = (max, windowMs = 60_000) => rateLimit({
  windowMs,
  max,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => DISABLED,
  keyGenerator: keyFor,
});

module.exports = {
  keyFor,
  standard: make(60),
  reads: make(120),
  auth: make(5),
  tryonRender: make(10),
  // Deliberately generous: a child in trouble must never be rate-limited
  // out of the panic button.
  panic: make(30),
};
