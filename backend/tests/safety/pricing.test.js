/**
 * Dad + Daughter Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 * Proprietary and confidential. Unauthorized use is prohibited.
 *
 * Prices appear in three places: the backend catalogue, the app's display
 * strings, and the docs. Nothing at runtime forces them to agree, so a change
 * in one can quietly leave the paywall advertising a price the card is not
 * charged. These tests are that check.
 */
const fs = require('fs');
const path = require('path');
const { PLANS, TIERS } = require('../../src/services/entitlements');

const read = (rel) => fs.readFileSync(path.join(__dirname, '../../..', rel), 'utf8');
const dollars = (cents) => `$${(cents / 100).toFixed(2)}`;

describe('plan catalogue', () => {
  test('every tier has a plan entry', () => {
    TIERS.forEach((t) => {
      expect(PLANS[t]).toBeDefined();
      expect(typeof PLANS[t].monthly).toBe('number');
      expect(typeof PLANS[t].yearly).toBe('number');
    });
  });

  test('the free tier costs nothing', () => {
    expect(PLANS.free.monthly).toBe(0);
    expect(PLANS.free.yearly).toBe(0);
  });

  test('paid plans increase in price with tier', () => {
    expect(PLANS.basic.monthly).toBeLessThan(PLANS.premium.monthly);
    expect(PLANS.premium.monthly).toBeLessThan(PLANS.family.monthly);
  });

  test('yearly saves close to the advertised 30%', () => {
    ['basic', 'premium', 'family'].forEach((t) => {
      const saving = 1 - PLANS[t].yearly / (PLANS[t].monthly * 12);
      expect(saving).toBeGreaterThan(0.25);
      expect(saving).toBeLessThan(0.35);
    });
  });

  test('amounts are whole cents, and priced to a .99 point', () => {
    ['basic', 'premium', 'family'].forEach((t) => {
      expect(Number.isInteger(PLANS[t].monthly)).toBe(true);
      expect(Number.isInteger(PLANS[t].yearly)).toBe(true);
      expect(PLANS[t].monthly % 100).toBe(99);
    });
  });
});

describe('prices agree across the app and the docs', () => {
  test("the app's display strings match the backend", () => {
    const constants = read('app/utils/constants.js');
    ['basic', 'premium', 'family'].forEach((t) => {
      const shown = `${dollars(PLANS[t].monthly)}/mo`;
      expect(constants).toContain(shown);
    });
    expect(constants).toContain("price: '$0'");
  });

  test('docs/stripe-flow.md quotes the same monthly and yearly amounts', () => {
    const doc = read('docs/stripe-flow.md');
    ['basic', 'premium', 'family'].forEach((t) => {
      expect(doc).toContain(dollars(PLANS[t].monthly));
      expect(doc).toContain(dollars(PLANS[t].yearly));
    });
  });

  test('the paywall screen renders from PLAN_META, not hardcoded prices', () => {
    const screen = read('app/screens/PlanSelectionScreen.js');
    expect(screen).toContain('PLAN_META');
    // A literal price in the screen would drift silently from the catalogue.
    expect(screen).not.toMatch(/\$\d+\.\d\d/);
  });
});

describe('Stripe lookup keys', () => {
  test('every paid plan maps to bb_-prefixed monthly and yearly keys', () => {
    ['basic', 'premium', 'family'].forEach((t) => {
      expect(`bb_${t}_monthly`).toMatch(/^bb_[a-z]+_monthly$/);
      expect(`bb_${t}_yearly`).toMatch(/^bb_[a-z]+_yearly$/);
    });
  });

  test('the seed script tags everything to Beauty Bond', () => {
    const seed = read('backend/src/config/seed-stripe.js');
    expect(seed).toContain('sml_product: TAG');
    expect(seed).toContain('transfer_lookup_key');   // repricing keeps the key
  });
});
