/**
 * Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 * Proprietary and confidential.
 *
 * API entry point. docs/api-reference.md §6.6 for middleware ordering.
 */
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const config = require('./config');
const logger = require('./utils/logger');
const limits = require('./middleware/rateLimit');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const authRoutes = require('./api/auth');
const userRoutes = require('./api/users');
const tryonRoutes = require('./api/tryon');
const videoRoutes = require('./api/video');
const { router: stripeRoutes, webhook: stripeWebhook } = require('./api/stripe');

const app = express();

app.use(helmet());
app.use(cors({ origin: config.webUrl, credentials: true }));

// Request id for support correlation on every response.
app.use((req, res, next) => {
  req.id = `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  res.setHeader('x-request-id', req.id);
  next();
});

/**
 * WEBHOOKS FIRST — they need the RAW body for signature verification, so they
 * must be registered before express.json(). Getting this order wrong makes
 * every signature check fail.
 */
app.use('/api/webhooks', stripeWebhook);

// 12mb accommodates a base64 photo payload on /api/tryon.
app.use(express.json({ limit: '12mb' }));
app.use(limits.standard);

app.get('/health', (req, res) => res.json({ ok: true, product: 'beauty-bond' }));

app.use('/api/auth', authRoutes);
app.use('/api', userRoutes);
app.use('/api/tryon', tryonRoutes);
app.use('/api/video', videoRoutes);
app.use('/api/stripe', stripeRoutes);

// Mock-mode static media so try-on renders resolve in local development.
if (config.env !== 'production') {
  app.use('/static', express.static(require('path').join(__dirname, '../public')));
}

app.use(notFound);
app.use(errorHandler);

if (require.main === module) {
  app.listen(config.port, () => {
    logger.info({ port: config.port, env: config.env },
                'Beauty Bond API — a Self-Made Legends LLC (SML) product');
  });
}

module.exports = app;
