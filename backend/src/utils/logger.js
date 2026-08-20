/**
 * Dad + Daughter Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
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
