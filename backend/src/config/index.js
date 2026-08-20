/**
 * Dad + Daughter Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 *
 * Fails fast on a missing required secret — a server that boots without its
 * webhook secret will silently accept forged events.
 */
require('dotenv').config();

const REQUIRED = [
  'DATABASE_URL',
  'JWT_SECRET',
  'REFRESH_SECRET',
  'STRIPE_SECRET_KEY_BB',
  'STRIPE_WEBHOOK_SECRET_BB',
  'LIVEKIT_API_KEY',
  'LIVEKIT_API_SECRET',
];

function required(name) {
  const v = process.env[name];
  if (!v && process.env.NODE_ENV === 'production') {
    throw new Error(`Missing required env var: ${name}`);
  }
  return v;
}

if (process.env.NODE_ENV === 'production') REQUIRED.forEach(required);

module.exports = {
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
