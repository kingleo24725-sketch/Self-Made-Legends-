/**
 * Dad + Daughter Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 * Proprietary and confidential. Unauthorized copying, distribution,
 * or use of this file, via any medium, is strictly prohibited.
 *
 * Test env. Dummy values only — never real keys, never a real database.
 */
process.env.NODE_ENV = 'test';
// Respect an externally provided test database (CI service container,
// local instance). Only fall back to the default when nothing is set.
process.env.DATABASE_URL = process.env.DATABASE_URL
  || 'postgres://postgres:postgres@localhost:5432/beauty_bond_test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.REFRESH_SECRET = 'test-refresh-secret';
process.env.STRIPE_SECRET_KEY_BB = 'sk_test_dummy_beauty_bond';
process.env.STRIPE_WEBHOOK_SECRET_BB = 'whsec_test_dummy';
process.env.LIVEKIT_API_KEY = 'test-livekit-key';
process.env.LIVEKIT_API_SECRET = 'test-livekit-secret';
process.env.LIVEKIT_WS_URL = 'wss://test.livekit.local';
process.env.ML_SERVICE_URL = 'http://localhost:9000';
