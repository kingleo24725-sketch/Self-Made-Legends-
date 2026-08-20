/**
 * Dad + Daughter Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 * Proprietary and confidential. Unauthorized use is prohibited.
 *
 * Beauty Bond bills through its OWN Stripe account. These tests hold that
 * boundary: they fail if the shared-account assumptions ever creep back in,
 * and they fail if the catalogue stops being namespaced (which is what would
 * make a future move onto a shared account dangerous rather than merely
 * inconvenient).
 */
const fs = require('fs');
const path = require('path');

jest.mock('../../src/config/db', () => ({ one: jest.fn(), query: jest.fn() }));
const svc = require('../../src/services/stripeService');

const read = (rel) => fs.readFileSync(path.join(__dirname, '../..', rel), 'utf8');

describe('dedicated account', () => {
  test('objects stay namespaced to Beauty Bond', () => {
    expect(svc.OURS).toBe('beauty_bond');
    expect(svc.PREFIX).toBe('bb_');
  });

  test('a price outside the bb_ namespace is rejected', async () => {
    await expect(svc.priceIdFor('premium_monthly')).rejects.toThrow('unknown_plan');
    await expect(svc.priceIdFor('comeup_season_pass')).rejects.toThrow('unknown_plan');
    await expect(svc.priceIdFor(undefined)).rejects.toThrow('unknown_plan');
  });

  test('the webhook uses its own signing secret, not a shared one', () => {
    const cfg = read('src/config/index.js');
    expect(cfg).toContain('STRIPE_WEBHOOK_SECRET_BB');
    const route = read('src/api/stripe/index.js');
    expect(route).toContain('config.stripe.webhookSecret');
  });

  test('the API key is read from the Beauty Bond variable', () => {
    const cfg = read('src/config/index.js');
    expect(cfg).toContain('STRIPE_SECRET_KEY_BB');
    // The account-wide unrestricted key must never be the documented default.
    expect(cfg).not.toMatch(/process\.env\.STRIPE_SECRET_KEY\b(?!_BB)/);
  });
});

describe('no cross-product coupling', () => {
  test('nothing reads or writes another SML product', () => {
    const src = read('src/services/stripeService.js');
    expect(src).not.toMatch(/come_up|comeup|SML Bucks|season_pass/i);
  });

  test('metadata never uses the key names another SML product reads', () => {
    // Come Up's handler keys off metadata.userId / metadata.type. Beauty Bond
    // writes bb_user_id, so the two catalogues could never collide even if the
    // accounts were merged later.
    const src = read('src/services/stripeService.js');
    expect(src).toContain('bb_user_id');
    expect(src).not.toMatch(/metadata:\s*\{[^}]*\buserId\b/);
    expect(src).not.toMatch(/metadata:\s*\{[^}]*\btype:/);
  });
});

describe('seed script targets only this account', () => {
  const seed = read('src/config/seed-stripe.js');

  test('tags every object it creates', () => {
    expect(seed).toContain('sml_product: TAG');
  });

  test('refuses to write to a live account without an explicit flag', () => {
    expect(seed).toContain("--yes");
    expect(seed).toContain('Refusing to write to a LIVE account');
  });

  test('repricing transfers the lookup key rather than mutating a price', () => {
    // Stripe prices are immutable; existing subscribers must keep their price.
    expect(seed).toContain('transfer_lookup_key');
  });
});
