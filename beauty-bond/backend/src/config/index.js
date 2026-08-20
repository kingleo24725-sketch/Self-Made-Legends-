/**
 * Dad + Daughter Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 * Proprietary and confidential. Unauthorized copying, distribution,
 * or use of this file, via any medium, is strictly prohibited.
 *
 * Two tiers of configuration:
 *
 *   BOOT-CRITICAL — the process cannot serve anything without these, so a
 *   missing one is a hard failure in production. Better a refused deploy than
 *   a server answering requests it cannot fulfil.
 *
 *   FEATURE — billing, video, and ML. Missing keys disable that feature and
 *   log it loudly; the rest of the API still serves. Each one fails closed on
 *   its own: Stripe signature verification rejects unsigned webhooks, and
 *   LiveKit token minting throws rather than issuing an unsigned token. This
 *   split is what lets a first deploy come up before those accounts exist.
 */
require('dotenv').config();

const BOOT_CRITICAL = ['DATABASE_URL', 'JWT_SECRET', 'REFRESH_SECRET'];

const FEATURES = {
  billing: ['STRIPE_SECRET_KEY_BB', 'STRIPE_WEBHOOK_SECRET_BB'],
  video: ['LIVEKIT_API_KEY', 'LIVEKIT_API_SECRET', 'LIVEKIT_WS_URL'],
  ml: ['ML_SERVICE_URL'],
};

const isProd = process.env.NODE_ENV === 'production';

if (isProd) {
  const missing = BOOT_CRITICAL.filter((k) => !process.env[k]);
  if (missing.length) {
    throw new Error(
      `Cannot start: missing ${missing.join(', ')}.\n` +
      'On Railway, DATABASE_URL arrives automatically once a Postgres service is\n' +
      'attached; JWT_SECRET and REFRESH_SECRET must be set in service variables.');
  }
}

/** Which optional features are fully configured. */
const enabled = Object.fromEntries(
  Object.entries(FEATURES).map(([name, keys]) => [name, keys.every((k) => !!process.env[k])]));

// ML runs on the mock provider in non-production, so it is always "on" there.
if (!isProd) enabled.ml = true;

if (isProd) {
  Object.entries(enabled).forEach(([name, ok]) => {
    if (!ok) {
      const missing = FEATURES[name].filter((k) => !process.env[k]).join(', ');
      // eslint-disable-next-line no-console
      console.warn(`[config] ${name} DISABLED — set ${missing} to enable it.`);
    }
  });
}

module.exports = {
  enabled,
  env: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 4000),
  databaseUrl: process.env.DATABASE_URL,
  jwt: {
    secret: process.env.JWT_SECRET,
    refreshSecret: process.env.REFRESH_SECRET,
    accessTtl: '15m',
    refreshTtlDays: 30,
  },
  stripe: {
    // Restricted key, Beauty Bond scope only. NOT the SML account's sk_live.
    secretKey: process.env.STRIPE_SECRET_KEY_BB,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET_BB,
    portalConfigId: process.env.STRIPE_PORTAL_CONFIG_ID_BB,
    apiVersion: '2024-06-20',
    /** Namespace tag — see docs/stripe-flow.md §3.2 Layer 1. */
    productTag: 'beauty_bond',
    lookupKeyPrefix: 'bb_',
  },
  livekit: {
    apiKey: process.env.LIVEKIT_API_KEY,
    apiSecret: process.env.LIVEKIT_API_SECRET,
    wsUrl: process.env.LIVEKIT_WS_URL,
    webhookKey: process.env.LIVEKIT_WEBHOOK_KEY,
  },
  ml: {
    serviceUrl: process.env.ML_SERVICE_URL,
    // 'mock' runs the full pipeline locally; 'http' calls a real Vision/ML
    // service. The mock is refused in production — see services/mlProvider.js.
    provider: process.env.ML_PROVIDER || (process.env.NODE_ENV === 'production' ? 'http' : 'mock'),
  },
  mock: {
    mediaBaseUrl: process.env.MOCK_MEDIA_BASE_URL || 'http://localhost:4000/static',
  },
  webUrl: process.env.WEB_URL || 'http://localhost:3000',
};
