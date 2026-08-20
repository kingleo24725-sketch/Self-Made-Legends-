// Guards the Stripe price resolution logic. This decides what real customers are
// charged, so a silent regression here costs money.
process.env.STRIPE_SECRET_KEY = 'sk_test_stub';
const StripeProcessor = require('../src/payments/StripeProcessor');

const CREATOR_CENTS = 499;

// Builds a processor with Stripe stubbed out.
//   pinnedAmount: what prices.retrieve returns for the env-var price (null = throws)
//   lookupAmount: what prices.list finds by lookup key (null = nothing found)
function makeProcessor({ pinned = null, pinnedAmount = null, pinnedActive = true, lookupAmount = null } = {}) {
  if (pinned) process.env.STRIPE_CREATOR_PRICE_ID = pinned;
  else delete process.env.STRIPE_CREATOR_PRICE_ID;

  const processor = new StripeProcessor();
  const created = [];
  processor.stripe = {
    prices: {
      retrieve: async (id) => {
        if (pinnedAmount === null) throw new Error('No such price');
        return { id, active: pinnedActive, unit_amount: pinnedAmount, recurring: { interval: 'month' } };
      },
      list: async () => ({ data: lookupAmount === null ? [] : [{ id: 'price_lookup', unit_amount: lookupAmount }] }),
      create: async (args) => { created.push(args); return { id: 'price_NEW' }; },
    },
    products: { create: async () => ({ id: 'prod_NEW' }) },
  };
  return { processor, created };
}

describe('creator subscription price resolution', () => {
  test('rejects an env var still pinned to the old $7.50 price', async () => {
    const { processor, created } = makeProcessor({ pinned: 'price_OLD750', pinnedAmount: 750 });
    await expect(processor.getOrCreatePrice()).resolves.toBe('price_NEW');
    expect(created[0].unit_amount).toBe(CREATOR_CENTS);
    expect(created[0].lookup_key).toBe('sml_creator_monthly');
  });

  test('reuses the env var price when it is already correct', async () => {
    const { processor, created } = makeProcessor({ pinned: 'price_GOOD', pinnedAmount: CREATOR_CENTS });
    await expect(processor.getOrCreatePrice()).resolves.toBe('price_GOOD');
    expect(created).toHaveLength(0);
  });

  test('falls back when the env var points at a deleted price', async () => {
    const { processor } = makeProcessor({ pinned: 'price_GONE', pinnedAmount: null });
    await expect(processor.getOrCreatePrice()).resolves.toBe('price_NEW');
  });

  test('ignores an inactive price', async () => {
    const { processor } = makeProcessor({ pinned: 'price_OFF', pinnedAmount: CREATOR_CENTS, pinnedActive: false });
    await expect(processor.getOrCreatePrice()).resolves.toBe('price_NEW');
  });

  test('reuses an existing price across restarts instead of duplicating it', async () => {
    const { processor, created } = makeProcessor({ lookupAmount: CREATOR_CENTS });
    await expect(processor.getOrCreatePrice()).resolves.toBe('price_lookup');
    expect(created).toHaveLength(0);
  });

  test('replaces an existing price that has the wrong amount', async () => {
    const { processor, created } = makeProcessor({ lookupAmount: 750 });
    await expect(processor.getOrCreatePrice()).resolves.toBe('price_NEW');
    expect(created[0].unit_amount).toBe(CREATOR_CENTS);
  });
});

describe('pack value curves', () => {
  const perDollar = (amount, cents) => amount / (cents / 100);

  test('SML Bucks give more per dollar at every step up', () => {
    const packs = Object.values(StripeProcessor.PAPER_MONEY_PACKAGES);
    for (let i = 1; i < packs.length; i++) {
      expect(perDollar(packs[i].paper, packs[i].amount_cents))
        .toBeGreaterThan(perDollar(packs[i - 1].paper, packs[i - 1].amount_cents));
    }
  });

  test('SML Credits give more per dollar at every step up', () => {
    const packs = Object.values(StripeProcessor.CREDIT_PACKAGES);
    for (let i = 1; i < packs.length; i++) {
      expect(perDollar(packs[i].credits, packs[i].amount_cents))
        .toBeGreaterThan(perDollar(packs[i - 1].credits, packs[i - 1].amount_cents));
    }
  });

  test('no pack is more than 2x better value than the cheapest, so entry buyers are not punished', () => {
    for (const packs of [
      Object.values(StripeProcessor.PAPER_MONEY_PACKAGES).map(p => perDollar(p.paper, p.amount_cents)),
      Object.values(StripeProcessor.CREDIT_PACKAGES).map(p => perDollar(p.credits, p.amount_cents)),
    ]) {
      expect(Math.max(...packs) / Math.min(...packs)).toBeLessThanOrEqual(2);
    }
  });

  test('every price ends in .99', () => {
    const all = [
      ...Object.values(StripeProcessor.PAPER_MONEY_PACKAGES),
      ...Object.values(StripeProcessor.CREDIT_PACKAGES),
    ];
    for (const p of all) expect(p.amount_cents % 100).toBe(99);
  });
});
