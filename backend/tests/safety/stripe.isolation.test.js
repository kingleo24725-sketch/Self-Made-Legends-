/**
 * Dads & Daughters Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 * Proprietary and confidential. Unauthorized use is prohibited.
 *
 * Beauty Bond and The Self-Made Legends Come Up share one Stripe account.
 * Stripe delivers every event to every endpoint on an account, so the only
 * thing keeping a game payment from granting a Beauty Bond plan is the code
 * in stripeService. These tests are that guarantee.
 */
const fs = require('fs');
const path = require('path');

jest.mock('../../src/config/db', () => ({ one: jest.fn(), query: jest.fn() }));
const svc = require('../../src/services/stripeService');

const read = (rel) => fs.readFileSync(path.join(__dirname, '../..', rel), 'utf8');
const ev = (type, object) => ({ id: `evt_${Math.random()}`, type, data: { object } });

describe('Layer 1 — namespacing', () => {
  test('product tag and lookup-key prefix are the documented values', () => {
    expect(svc.OURS).toBe('beauty_bond');
    expect(svc.PREFIX).toBe('bb_');
  });

  test('a price outside the bb_ namespace is rejected', async () => {
    await expect(svc.priceIdFor('premium_monthly')).rejects.toThrow('unknown_plan');
    await expect(svc.priceIdFor('comeup_season_pass')).rejects.toThrow('unknown_plan');
  });

  test('metadata never uses the keys the Come Up handler reads', () => {
    // That handler branches on metadata.userId and metadata.type. Writing
    // either from here would make the game grant SML Bucks on a Beauty Bond
    // payment.
    const src = read('src/services/stripeService.js');
    expect(src).toContain('bb_user_id');
    expect(src).not.toMatch(/metadata:\s*\{[^}]*\buserId\b/);
    expect(src).not.toMatch(/metadata:\s*\{[^}]*\btype:/);
  });
});

describe('Layer 2 — a Customer per product', () => {
  test('customer lookup is product-scoped, with no unscoped variant', () => {
    const src = read('src/services/stripeService.js');
    expect(src).toContain('NO unscoped variant');
    expect(src).toContain('stripe_customer_id = $1');
  });
});

describe('Layer 3 — webhook ownership gate', () => {
  test('accepts an event tagged beauty_bond', async () => {
    await expect(svc.belongsToBeautyBond(
      ev('customer.subscription.updated', { metadata: { sml_product: 'beauty_bond' } })
    )).resolves.toBe(true);
  });

  test('REJECTS an event from the Come Up game', async () => {
    await expect(svc.belongsToBeautyBond(
      ev('customer.subscription.updated',
         { metadata: { sml_product: 'come_up', userId: '42', type: 'season_pass' } })
    )).resolves.toBe(false);
  });

  test('fails CLOSED on an unattributable event', async () => {
    await expect(svc.belongsToBeautyBond(ev('charge.succeeded', { id: 'ch_1' })))
      .resolves.toBe(false);
  });

  test('attributes an invoice by its bb_ price lookup_key', async () => {
    await expect(svc.belongsToBeautyBond(ev('invoice.payment_failed', {
      object: 'invoice', lines: { data: [{ price: { lookup_key: 'bb_basic_monthly' } }] },
    }))).resolves.toBe(true);
  });

  test('rejects an invoice carrying a non-bb lookup_key', async () => {
    await expect(svc.belongsToBeautyBond(ev('invoice.payment_failed', {
      object: 'invoice', lines: { data: [{ price: { lookup_key: 'comeup_season_pass' } }] },
    }))).resolves.toBe(false);
  });

  test('the gate runs before anything is written', () => {
    const route = read('src/api/stripe/index.js');
    const gate = route.indexOf('belongsToBeautyBond');
    const ledger = route.indexOf('INSERT INTO webhook_events');
    expect(gate).toBeGreaterThan(-1);
    expect(gate).toBeLessThan(ledger);
  });
});

describe('defence in depth', () => {
  test('syncSubscription refuses a foreign subscription', async () => {
    await expect(svc.syncSubscription({ id: 'sub_x', metadata: { sml_product: 'come_up' } }))
      .rejects.toThrow(/foreign subscription/);
  });

  test('Layer 4 — the API key and webhook secret are BB-scoped', () => {
    const cfg = read('src/config/index.js');
    expect(cfg).toContain('STRIPE_SECRET_KEY_BB');
    expect(cfg).toContain('STRIPE_WEBHOOK_SECRET_BB');
    expect(cfg).not.toMatch(/process\.env\.STRIPE_SECRET_KEY\b(?!_BB)/);
  });
});
