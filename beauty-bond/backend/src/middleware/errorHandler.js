/**
 * Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 *
 * Error copy takes the blame — "Our side, not yours." docs/branding.md §7.6.
 */
const logger = require('../utils/logger');

function notFound(req, res) {
  res.status(404).json({ error: 'not_found' });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, _next) {
  const status = err.status || 500;
  if (status >= 500) logger.error({ err, path: req.path }, 'unhandled_error');

  res.status(status).json({
    error: err.code || 'internal_error',
    message: status >= 500 ? 'Our side, not yours.' : err.message,
    ...(err.recovery ? { recovery: err.recovery } : {}),
    requestId: req.id,
  });
}

module.exports = { notFound, errorHandler };
