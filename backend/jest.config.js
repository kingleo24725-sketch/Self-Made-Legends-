/**
 * Dad + Daughter Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 * Proprietary and confidential. Unauthorized use is prohibited.
 */
module.exports = {
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/tests/setup.js'],
  collectCoverageFrom: ['src/**/*.js'],
  coverageThreshold: {
    global: { branches: 60, functions: 70, lines: 75 },
    // Safety-critical modules require full coverage — release blocker.
    './src/services/roomSafety.js': { branches: 90, functions: 100, lines: 100 },
    './src/services/entitlements.js': { functions: 90, lines: 90 },
  },
};
