/**
 * Dad + Daughter Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 *
 * RELEASE BLOCKER. docs/stripe-flow.md §3.1, §3.6.
 */
const {
  ENTITLEMENTS, ALWAYS_FREE, TIERS, PLANS, atLeast,
} = require('../../src/services/entitlements');

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
    expect(ENTITLEMENTS.free.learningMaxLevel).toBeGreaterThanOrEqual(2);
  });

  test('plan names are Free, Basic, Premium, Family', () => {
    expect(TIERS).toEqual(['free', 'basic', 'premium', 'family']);
    expect(PLANS.basic.name).toBe('Basic');
    expect(PLANS.premium.name).toBe('Premium');
    expect(PLANS.family.name).toBe('Family');
  });

  test('plans are ordered so higher tiers include lower ones', () => {
    expect(atLeast('family', 'premium')).toBe(true);
    expect(atLeast('premium', 'basic')).toBe(true);
    expect(atLeast('basic', 'premium')).toBe(false);
    expect(atLeast('free', 'basic')).toBe(false);
  });

  test('only Premium and above unlock Letters Forward', () => {
    expect(ENTITLEMENTS.free.lettersForward).toBe(false);
    expect(ENTITLEMENTS.basic.lettersForward).toBe(false);
    expect(ENTITLEMENTS.premium.lettersForward).toBe(true);
    expect(ENTITLEMENTS.family.lettersForward).toBe(true);
  });

  test('Family carries the most child seats', () => {
    expect(ENTITLEMENTS.family.childSeats).toBeGreaterThan(ENTITLEMENTS.premium.childSeats);
    expect(ENTITLEMENTS.premium.childSeats).toBeGreaterThan(ENTITLEMENTS.basic.childSeats);
  });

  test('the free tier never unlocks paid capabilities', () => {
    expect(ENTITLEMENTS.free.lettersForward).toBe(false);
    expect(ENTITLEMENTS.free.culturalGlamSets).toBe(false);
    expect(ENTITLEMENTS.free.creatorTools).toBe(false);
  });
});
