/**
 * Dad + Daughter Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 * Proprietary and confidential. Unauthorized copying, distribution,
 * or use of this file, via any medium, is strictly prohibited.
 *
 * API entry point. docs/api-reference.md §6.6 for middleware ordering.
 */
const express = require('express');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const config = require('./config');
const logger = require('./utils/logger');
const limits = require('./middleware/rateLimit');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const authRoutes = require('./api/auth');
const userRoutes = require('./api/users');
const contentRoutes = require('./api/content');
const legacyRoutes = require('./api/legacy');
const tryonRoutes = require('./api/tryon');
const videoRoutes = require('./api/video');
const { router: stripeRoutes, webhook: stripeWebhook } = require('./api/stripe');

const app = express();

/**
 * helmet's default Content-Security-Policy blocks the bundle and inline styles
 * that Expo's web export emits, and the symptom is a blank white page with a
 * console error — which reads as "the build is broken" rather than "a header
 * refused it". The web app is served from this same origin (see WEB_APP below),
 * so the policy is widened to 'self' for scripts, styles and images and to
 * nothing else.
 *
 * crossOriginEmbedderPolicy stays OFF for the same reason: on it, Safari
 * refuses the favicon and fonts. Every other helmet default is untouched, and
 * none of this loosens anything for /api — a JSON response carries no CSP
 * consequence.
 */
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'data:', 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'blob:'],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false,
}));
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

app.get('/health', (req, res) => res.json({
  ok: true,
  product: 'beauty-bond',
  env: config.env,
  version: require('../package.json').version,
  // Which optional features are configured. A deploy can be healthy with some
  // of these false — see src/config/index.js.
  features: config.enabled,
}));

app.use('/api/auth', authRoutes);
app.use('/api', userRoutes);
app.use('/api', contentRoutes);
app.use('/api/legacy', legacyRoutes);
// The journal lives under /api/journal per docs/api-reference.md:602, but is
// implemented in the legacy router because it is the same module.
app.use('/api', legacyRoutes);
app.use('/api/tryon', tryonRoutes);
app.use('/api/video', videoRoutes);
app.use('/api/stripe', stripeRoutes);

// Mock-mode static media so try-on renders resolve in local development.
if (config.env !== 'production') {
  app.use('/static', express.static(require('path').join(__dirname, '../public')));
}

/**
 * THE WEB APP.
 *
 * An iPhone cannot install an APK, and Apple charges $99/yr before a native app
 * may run on a device — so the same React Native app is also exported for the
 * browser and served from here. Opened in Safari and added to the home screen,
 * it runs full-screen from an icon. docs/get-it-on-your-phone.md.
 *
 * Mounted LAST on purpose. Every /api route and /health is registered above, so
 * this can never shadow one; the SPA fallback below explicitly refuses to
 * answer for them, because a client-side HTML page returned where JSON was
 * expected is far harder to diagnose than a 404.
 */
const WEB_APP = require('path').join(__dirname, '../public/web');

if (require('fs').existsSync(path.join(WEB_APP, 'index.html'))) {
  app.use(express.static(WEB_APP, {
    // index.html is rewritten on every deploy; the hashed bundle never is.
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('index.html')) res.setHeader('Cache-Control', 'no-cache');
    },
  }));

  // SPA fallback: the app owns its own routing, so a deep link or a refresh on
  // /legacy must return index.html rather than 404.
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path === '/health') return next();
    if (req.method !== 'GET') return next();
    res.sendFile(path.join(WEB_APP, 'index.html'));
  });
} else {
  logger.warn({ dir: WEB_APP },
    'web build absent — API only. Run: cd app && npx expo export --platform web '
    + '--output-dir ../backend/public/web');
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
