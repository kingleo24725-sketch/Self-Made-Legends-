/**
 * Dads & Daughters Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 * Proprietary and confidential. Unauthorized use is prohibited.
 *
 * Creates the Products and Prices in Stripe from services/entitlements.js,
 * so the code stays the single source of truth for pricing.
 *
 *   npm run seed:stripe -- --dry-run     # show what would change
 *   npm run seed:stripe                  # create/reconcile
 *
 * IDEMPOTENT. Re-running does not duplicate anything: prices are matched by
 * `lookup_key`, and an existing price with the correct amount is left alone.
 *
 * PRICES ARE IMMUTABLE IN STRIPE. To change an amount you create a NEW price
 * and move the lookup_key onto it — this script does that for you, and existing
 * subscribers stay on the price they signed up at (see CHANGING A PRICE below).
 *
 * SHARED SML ACCOUNT: The Self-Made Legends Come Up bills through the same
 * Stripe account. Everything created here is tagged sml_product=beauty_bond and
 * prefixed bb_, which is what keeps the two products' catalogues apart.
 * Read docs/stripe-flow.md §3.2 before changing any of this.
 */
const Stripe = require('stripe');
const config = require('./index');
const { TIERS, PLANS } = require('../services/entitlements');

const stripe = new Stripe(config.stripe.secretKey, { apiVersion: config.stripe.apiVersion });
const TAG = config.stripe.productTag;        // 'beauty_bond'
const PREFIX = config.stripe.lookupKeyPrefix; // 'bb_'
const DRY = process.argv.includes('--dry-run');

/** One-off and metered extras. docs/stripe-flow.md §3.1. */
const ADDONS = [
  { code: 'seat_child',     name: 'Extra child seat',        amount: 299,  recurring: 'month' },
  { code: 'vault_100',      name: 'Legacy Vault +100 GB',    amount: 399,  recurring: 'month' },
  { code: 'bondbook_pdf',   name: 'Bond Book (PDF)',         amount: 999,  recurring: null },
  { code: 'bondbook_print', name: 'Bond Book (printed)',     amount: 3499, recurring: null },
  { code: 'gift_bond_12',   name: 'Gift subscription — 12 months of Basic',
    amount: 5899, recurring: null },
];

const money = (c) => `$${(c / 100).toFixed(2)}`;
let created = 0, reused = 0, repriced = 0;

async function findProduct(code) {
  // search is eventually consistent; list+filter is reliable for a small catalogue
  const { data } = await stripe.products.list({ limit: 100, active: true });
  return data.find((p) => p.metadata.sml_product === TAG && p.metadata.code === code) || null;
}

async function ensureProduct(code, name) {
  const existing = await findProduct(code);
  if (existing) { reused++; return existing; }

  if (DRY) { console.log(`  + product  ${name}`); created++; return { id: `dry_${code}` }; }

  const product = await stripe.products.create({
    name: `Beauty Bond ${name}`,
    statement_descriptor: 'SML BEAUTY BOND',
    metadata: { code, sml_product: TAG },
  }, { idempotencyKey: `bb_prod_${code}` });
  created++;
  console.log(`  + product  ${product.name}  ${product.id}`);
  return product;
}

async function ensurePrice({ productId, lookupKey, amount, interval, nickname }) {
  const { data } = await stripe.prices.list({ lookup_keys: [lookupKey], active: true });
  const existing = data.find((p) => p.metadata.sml_product === TAG);

  if (existing && existing.unit_amount === amount) {
    reused++;
    console.log(`  = price    ${lookupKey.padEnd(24)} ${money(amount).padStart(8)}  unchanged`);
    return existing;
  }

  if (existing) {
    // Amount changed. Stripe prices are immutable, so create a new one and move
    // the lookup_key across. Existing subscribers keep the price they signed up
    // at until they explicitly change plan — that is deliberate.
    console.log(`  ~ price    ${lookupKey.padEnd(24)} ${money(existing.unit_amount)} → ${money(amount)}`
                + '  (new price; existing subscribers grandfathered)');
    repriced++;
    if (DRY) return existing;
    await stripe.prices.update(existing.id, { lookup_key: `${lookupKey}_v${Date.now()}` });
  } else {
    console.log(`  + price    ${lookupKey.padEnd(24)} ${money(amount).padStart(8)}`);
    created++;
    if (DRY) return null;
  }

  return stripe.prices.create({
    product: productId,
    currency: 'usd',
    unit_amount: amount,
    nickname,
    lookup_key: lookupKey,
    transfer_lookup_key: true,
    ...(interval ? { recurring: { interval } } : {}),
    metadata: { sml_product: TAG, tier: nickname },
  });
}

async function main() {
  if (!config.stripe.secretKey) {
    console.error('STRIPE_SECRET_KEY_BB is not set. Add it to .env first.');
    process.exit(1);
  }
  const live = config.stripe.secretKey.startsWith('sk_live') ||
               config.stripe.secretKey.startsWith('rk_live');

  console.log(`\nDads & Daughters Beauty Bond™ — Stripe catalogue`);
  console.log(`mode: ${DRY ? 'DRY RUN' : 'WRITE'}   account: ${live ? 'LIVE' : 'test'}\n`);

  if (live && !DRY && !process.argv.includes('--yes')) {
    console.error('Refusing to write to a LIVE account without --yes.');
    console.error('Run with --dry-run first, then re-run with --yes.');
    process.exit(1);
  }

  // Fail with something readable if the key is wrong, rather than letting the
  // first list() surface "Invalid JSON received from the Stripe API".
  try {
    await stripe.products.list({ limit: 1 });
  } catch (err) {
    console.error('Could not reach Stripe with STRIPE_SECRET_KEY_BB.');
    console.error(`  ${err.message}`);
    console.error('\nCheck the key is a valid restricted key for the SML account');
    console.error('with write access to Products and Prices (docs/stripe-flow.md §3.2).');
    process.exit(1);
  }

  console.log('plans:');
  for (const code of TIERS) {
    if (code === 'free') continue;              // no card, no Stripe object
    const plan = PLANS[code];
    const product = await ensureProduct(code, plan.name);
    await ensurePrice({ productId: product.id, lookupKey: `${PREFIX}${code}_monthly`,
                        amount: plan.monthly, interval: 'month', nickname: code });
    await ensurePrice({ productId: product.id, lookupKey: `${PREFIX}${code}_yearly`,
                        amount: plan.yearly, interval: 'year', nickname: code });
  }

  console.log('\nadd-ons:');
  for (const a of ADDONS) {
    const product = await ensureProduct(a.code, a.name);
    await ensurePrice({ productId: product.id, lookupKey: `${PREFIX}${a.code}`,
                        amount: a.amount, interval: a.recurring, nickname: a.code });
  }

  console.log(`\ncreated ${created}   unchanged ${reused}   repriced ${repriced}`);
  if (DRY) console.log('\nDry run — nothing was written. Re-run without --dry-run to apply.');
}

/*
 * CHANGING A PRICE
 * ----------------
 * 1. Edit PLANS in services/entitlements.js.
 * 2. npm run seed:stripe -- --dry-run      confirm the diff
 * 3. npm run seed:stripe                   (add --yes on a live account)
 *
 * Existing subscribers keep their original price. Stripe holds them on the
 * price object they subscribed to, and this script never migrates them — a
 * silent price rise on existing families is not something to do by accident.
 */

if (require.main === module) {
  main().catch((err) => { console.error(err.message); process.exit(1); });
}
module.exports = { main, ADDONS };
