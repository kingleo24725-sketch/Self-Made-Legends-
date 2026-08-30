/**
 * Dad + Daughter Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 * Proprietary and confidential. Unauthorized copying, distribution,
 * or use of this file, via any medium, is strictly prohibited.
 *
 * Error copy takes the blame — "Our side, not yours." docs/branding.md §7.6.
 */
const logger = require('../utils/logger');

function notFound(req, res) {
  res.status(404).json({ error: 'not_found' });
}

/**
 * Client errors (<500) surface their machine-readable code so the app can
 * branch on it — e.g. `server_render_forbidden_for_minor` drives the
 * on-device fallback. Server errors NEVER leak internals.
 *
 * 503 is the exception on both counts. "This feature is not configured yet" is
 * not an internal fault and must not read as one: videoService, stripeService
 * and mlProvider all raise a 503 carrying a publicMessage precisely so a
 * family sees "Glam Rooms are not available yet" rather than "Our side, not
 * yours", and so the client can tell an unconfigured feature from an outage.
 * Those errors are deliberate and carry nothing internal to leak.
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, _next) {
  const status = err.status || 500;

  if (status === 503 && err.publicMessage) {
    logger.warn({ code: err.message, path: req.path }, 'feature_not_configured');
    return res.status(503).json({
      error: err.code || err.message || 'not_configured',
      message: err.publicMessage,
      requestId: req.id,
    });
  }

  if (status >= 500) {
    logger.error({ err, path: req.path }, 'unhandled_error');
    return res.status(status).json({
      error: 'internal_error',
      message: 'Our side, not yours.',
      requestId: req.id,
    });
  }

  res.status(status).json({
    // Throwing `new Error('some_code')` with a status is the common pattern,
    // so fall back to the message when no explicit code is set.
    error: err.code || err.message || 'request_failed',
    message: err.publicMessage || err.message,
    ...(err.recovery ? { recovery: err.recovery } : {}),
    requestId: req.id,
  });
}

module.exports = { notFound, errorHandler };
