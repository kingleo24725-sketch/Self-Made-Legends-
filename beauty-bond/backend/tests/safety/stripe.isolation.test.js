/**
 * Dad + Daughter Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 * Proprietary and confidential. Unauthorized copying, distribution,
 * or use of this file, via any medium, is strictly prohibited.
 *
 * RELEASE BLOCKER — shared SML Stripe account isolation.
 * docs/stripe-flow.md §3.2.
 */
jest.mock('../../src/config/db', () => ({ one: jest.fn(), query: jest.fn() }));

const svc = require('../../src/services/stripeService');

const ev = (type, object) => ({ id: `evt_${Math.random()}`, type, data: { object } });

describe('webhook ownership gate', () => {
  test('accepts an event tagged beauty_bond', async () => {
    const e = ev('customer.subscription.updated',
                 { metadata: { sml_product: 'beauty_bond' } });
    await expect(svc.belongsToBeautyBond(e)).resolves.toBe(true);
  });

  test('REJECTS an event from the Come Up game', async () => {
    const e = ev('customer.subscription.updated',
                 { metadata: { sml_product: 'come_up', userId: '42', type: 'season_pass' } });
    await expect(svc.belongsToBeautyBond(e)).resolves.toBe(false);
  });

  test('fails CLOSED on an unattributable event', async () => {
    const e = ev('charge.succeeded', { id: 'ch_1' });   // no metadata, no customer
    await expect(svc.belongsToBeautyBond(e)).resolves.toBe(false);
  });

  test('attributes an invoice by its bb_ price lookup_key', async () => {
    const e = ev('invoice.payment_failed', {
      object: 'invoice',
      lines: { data: [{ price: { lookup_key: 'bb_bond_monthly' } }] },
    });
    await expect(svc.belongsToBeautyBond(e)).resolves.toBe(true);
  });

  test('rejects an invoice carrying a non-bb lookup_key', async () => {
    const e = ev('invoice.payment_failed', {
      object: 'invoice',
      lines: { data: [{ price: { lookup_key: 'comeup_season_pass' } }] },
    });
    await expect(svc.belongsToBeautyBond(e)).resolves.toBe(false);
  });
});

describe('syncSubscription refuses foreign objects', () => {
  test('throws on a subscription that is not ours', async () => {
    await expect(svc.syncSubscription({
      id: 'sub_x', metadata: { sml_product: 'come_up' },
    })).rejects.toThrow(/foreign subscription/);
  });
});

describe('metadata namespace', () => {
  test('the product tag and prefix are the documented values', () => {
    expect(svc.OURS).toBe('beauty_bond');
    expect(svc.PREFIX).toBe('bb_');
  });

  test('rejects a price lookup key without the bb_ prefix', async () => {
    await expect(svc.priceIdFor('bond_monthly')).rejects.toThrow('unknown_plan');
  });
});
