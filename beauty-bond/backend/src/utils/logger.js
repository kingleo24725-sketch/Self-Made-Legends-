/**
 * Dads & Daughters Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 * Proprietary and confidential. Unauthorized copying, distribution,
 * or use of this file, via any medium, is strictly prohibited.
 */
const pino = require('pino');
const config = require('../config');

module.exports = pino({
  level: config.env === 'production' ? 'info' : 'debug',
  // Never log a face image reference, a journal entry, or a child's PII.
  redact: {
    paths: ['req.headers.authorization', '*.password', '*.ciphertext',
            '*.storage_key', '*.assetId'],
    censor: '[redacted]',
  },
});
