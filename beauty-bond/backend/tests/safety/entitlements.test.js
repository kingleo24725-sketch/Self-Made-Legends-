/**
 * Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 *
 * RELEASE BLOCKER. docs/stripe-flow.md §3.1, §3.6.
 */
const { ENTITLEMENTS, ALWAYS_FREE, TIERS } = require('../../src/services/entitlements');

describe('entitlements', () => {
  test('every tier is defined', () => {
    TIERS.forEach((t) => expect(ENTITLEMENTS[t]).toBeDefined());
  });

  test('safety capabilities are never gated', () => {
    ['safety.panic_button', 'safety.report', 'safety.block',
     'guardian.console', 'guardian.permissions'].forEach((c) => {
      expect(ALWAYS_FREE.has(c)).toBe(true);
    });
  });

  test('data export and account deletion are always free', () => {
    expect(ALWAYS_FREE.has('privacy.data_export')).toBe(true);
    expect(ALWAYS_FREE.has('privacy.account_delete')).toBe(true);
  });

  test('an already-recorded Letter Forward always delivers', () => {
    // A lapsed card must never withhold a dead parent's message to their child.
    expect(ALWAYS_FREE.has('legacy.letter_delivery')).toBe(true);
  });

  test('hygiene lessons are free at every tier', () => {
    expect(ALWAYS_FREE.has('learning.hygiene')).toBe(true);
    expect(ENTITLEMENTS.sparkle.learningMaxLevel).toBeGreaterThanOrEqual(2);
  });

  test('the free tier never unlocks paid capabilities', () => {
    expect(ENTITLEMENTS.sparkle.lettersForward).toBe(false);
    expect(ENTITLEMENTS.sparkle.culturalGlamSets).toBe(false);
    expect(ENTITLEMENTS.sparkle.creatorTools).toBe(false);
  });
});
