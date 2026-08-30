/**
 * Self-Made Legends — print-on-demand adapter
 * Copyright (c) 2026 Self-Made Legends LLC. All Rights Reserved.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  THIS REPLACES THE DISTRIBUTOR YOU DO NOT HAVE.
 *
 *  Print-on-demand removes every blocker at once: no minimum order, no
 *  inventory, no warehouse, no distribution partner, and no money leaves
 *  the account until a customer has already paid. The printer takes the
 *  order, makes the piece, and ships it to the buyer directly.
 *
 *  That is the entire reason the roster changed. Routing, Fulfillment, QA
 *  and CAD all exist to coordinate a supply chain. With POD there is no
 *  chain to coordinate — the printer is the chain.
 * ─────────────────────────────────────────────────────────────────────────
 *
 *  ⚠️  THE PRICES BELOW ARE RESEARCHED, NOT QUOTED.
 *
 *  Gathered from public pricing pages and comparison write-ups, August 2026.
 *  They are the right order of magnitude and they are NOT your account's
 *  numbers. Before you set a single retail price from these, open your own
 *  Printful or Printify dashboard, read the real figure for the exact blank
 *  you picked, and replace them here.
 *
 *  A margin built on a researched number is a plan. A margin built on your
 *  own quoted number is a business.
 */

'use strict';

/**
 * Base cost per unit, USD, before shipping and before Stripe.
 *
 * `blank` names what the customer actually receives, because that is the
 * thing that decides whether a price holds. Nobody returns a hoodie over the
 * embroidery; they return it because the body felt like a promotional
 * giveaway at a price that promised otherwise.
 */
const CATALOG = {
  'hoodie-embroidered': {
    label: 'Hoodie, embroidered chest + back',
    base: 45.00,
    blank: 'Cotton Heritage / Independent Trading heavyweight',
    range: [26.92, 69.58],
    decoration: 'embroidery',
    note: 'Range covers light fleece to premium heavyweight. Pick the heavyweight; the cheap one is where returns come from.',
  },
  'tee-embroidered': {
    label: 'Tee, embroidered chest',
    base: 16.00,
    blank: 'Bella+Canvas 3001 or heavier',
    range: [12.00, 22.00],
    decoration: 'embroidery',
  },
  'tee-print': {
    label: 'Tee, printed',
    base: 12.00,
    blank: 'Bella+Canvas 3001',
    range: [8.00, 14.00],
    decoration: 'dtg',
    note: 'Printify runs nearer $8-10 on the same blank. Printful is dearer and more consistent.',
  },
  'cap-embroidered': {
    label: 'Snapback, 3D puff embroidered',
    base: 18.00,
    blank: 'Structured six-panel',
    range: [15.00, 24.00],
    decoration: 'embroidery',
    note: '3D puff is the closest POD gets to the sheets. It is genuinely good.',
  },
  'sweatpants-embroidered': {
    label: 'Sweatpants, embroidered',
    base: 30.00,
    blank: 'Cotton Heritage fleece jogger',
    range: [24.00, 38.00],
    decoration: 'embroidery',
  },
  'socks': {
    label: 'Socks, all-over knit',
    base: 11.00,
    blank: 'Sublimated crew',
    range: [9.00, 14.00],
    decoration: 'knit',
    note: 'Knitted, not printed — the gold band and crest can be in the yarn.',
  },
  'beanie-embroidered': {
    label: 'Beanie, embroidered',
    base: 14.00,
    blank: 'Ribbed acrylic cuffed',
    range: [11.00, 18.00],
    decoration: 'embroidery',
  },
  'tote': {
    label: 'Tote, embroidered',
    base: 16.00,
    blank: 'Heavy cotton canvas',
    range: [12.00, 20.00],
    decoration: 'embroidery',
  },
};

/** Shipping, US domestic. First item, then each additional in the same order. */
const SHIPPING = { first: 4.69, additional: 2.20 };

/**
 * Stripe, US card-present-absent standard rate.
 *
 * Included because founders model cost-of-goods and forget the processor,
 * then wonder why the bank balance disagrees with the spreadsheet.
 */
const STRIPE = { percent: 0.029, fixed: 0.30 };

/**
 * One-time costs. Not per unit, but real, and they land before revenue does.
 */
const SETUP = {
  digitisation: { label: 'Embroidery digitisation, per artwork', usd: 25, note: 'Charged once per design, not per garment.' },
  sample: { label: 'Sample of each piece, at your own cost', usd: 60, note: 'Order one of everything before you list it. This is not optional.' },
};

/**
 * What one unit actually earns.
 *
 * `alone` is the honest default: most first orders are a single item, so the
 * full shipping cost lands on that one unit. Modelling a basket of three
 * flatters the number and the first month will not match it.
 */
function margin(key, retail, { alone = true, quantity = 1 } = {}) {
  const item = CATALOG[key];
  if (!item) throw new Error(`Unknown POD item "${key}". Known: ${Object.keys(CATALOG).join(', ')}`);
  if (!Number.isFinite(retail) || retail <= 0) throw new Error('retail must be a positive number');

  const base = item.base * quantity;
  const ship = alone
    ? SHIPPING.first + SHIPPING.additional * (quantity - 1)
    : SHIPPING.additional * quantity;
  const revenue = retail * quantity;
  const stripe = revenue * STRIPE.percent + STRIPE.fixed;

  const cost = base + ship + stripe;
  const profit = revenue - cost;

  return {
    item: item.label,
    blank: item.blank,
    quantity,
    revenue: round(revenue),
    base: round(base),
    shipping: round(ship),
    stripe: round(stripe),
    cost: round(cost),
    profit: round(profit),
    margin: revenue ? profit / revenue : 0,
    // Below this you are paying to give it away.
    breakeven_retail: round((item.base + SHIPPING.first + STRIPE.fixed) / (1 - STRIPE.percent)),
    note: item.note || null,
  };
}

/**
 * The price at which a target margin is hit.
 *
 * Useful in the other direction: "I want 70% — what do I charge?"
 */
function priceFor(key, targetMargin) {
  const item = CATALOG[key];
  if (!item) throw new Error(`Unknown POD item "${key}"`);
  if (!(targetMargin > 0 && targetMargin < 1)) throw new Error('targetMargin must be between 0 and 1');
  const fixed = item.base + SHIPPING.first + STRIPE.fixed;
  return round(fixed / (1 - targetMargin - STRIPE.percent));
}

/**
 * How many units clear a given amount of profit.
 *
 * The number that matters when deciding whether tier one can fund tier two.
 */
function unitsFor(key, retail, targetProfit) {
  const one = margin(key, retail).profit;
  if (one <= 0) return null;
  return Math.ceil(targetProfit / one);
}

function round(n) { return Number(n.toFixed(2)); }

function capabilities() {
  return {
    name: 'Print-on-demand',
    live: false,
    minimum_order: 0,
    inventory_required: false,
    distribution_partner_required: false,
    can_make: Object.keys(CATALOG),
    cannot_make: [
      'footwear — no POD service makes a leather trainer to a tech pack',
      'tailoring — a suit is cut and sewn to measure, not printed',
      'jewellery — needs a caster, not a printer',
      'dress shoes, heels — same as footwear',
    ],
    note: 'Apparel and accessories ship this week. Everything else waits for money that tier one earns.',
  };
}

module.exports = { CATALOG, SHIPPING, STRIPE, SETUP, margin, priceFor, unitsFor, capabilities };
