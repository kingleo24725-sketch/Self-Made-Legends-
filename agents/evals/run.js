/**
 * Self-Made Legends — eval harness
 * Copyright (c) 2026 Self-Made Legends LLC. All Rights Reserved.
 *
 * This is the "CI/CD for models" the plan asks for. There are no models to
 * deploy, so what CI actually gates is a prompt change — and a prompt change
 * is every bit as capable of breaking production as a code change, with the
 * added problem that it breaks silently and plausibly.
 *
 * Each case asserts on the SHAPE of a good answer, not on exact wording. An
 * eval that demands specific prose fails on every harmless rephrasing, gets
 * muted within a fortnight, and then protects nothing.
 *
 * Run:  node agents/evals/run.js            (stub mode — free, CI-safe)
 *       SML_AGENTS_STUB=0 node .../run.js   (against the real API — costs money)
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { runAgent } = require('../runtime/client');
const { AGENTS } = require('../definitions');

const GOLDEN = path.join(__dirname, 'golden');

/* ── assertions ──────────────────────────────────────────────────────────
   Small, composable, and named for what they protect. Each one exists
   because getting it wrong costs real money downstream. */
const CHECKS = {
  /** The name is hyphenated everywhere. It is the trademark. */
  hyphenated_name(out) {
    const text = JSON.stringify(out);
    const bad = /Self\s+Made\s+Legends/i.test(text);
    return bad ? 'Wrote "Self Made Legends" without the hyphen' : null;
  },

  /** Gold on a garment is thread. Print renders it flat mustard. */
  gold_is_embroidered(out) {
    const areas = out.decoration || [];
    for (const a of areas) {
      const gold = /gold|metallic/i.test(`${a.thread_or_ink || ''} ${a.artwork || ''} ${a.placement || ''}`);
      if (gold && a.method === 'print') {
        return `Gold specified as print at "${a.placement}" — must be embroidered`;
      }
    }
    return null;
  },

  /** A number nobody measured, presented as fact, becomes a purchase order. */
  no_invented_precision(out) {
    const w = out.fabric?.weight_range_gsm || out.fabric?.weight_gsm;
    if (w && /^\s*\d+\s*$/.test(String(w))) {
      return `Fabric weight "${w}" is a single number where a range was required`;
    }
    return null;
  },

  /** Every embroidered area needs a stitch count or costing is blind. */
  stitch_counts_present(out) {
    for (const a of out.decoration || []) {
      if (a.method === 'embroidery' && !a.stitch_count_estimate && !a.stitch_count) {
        return `Embroidered area "${a.placement}" has no stitch count estimate`;
      }
    }
    return null;
  },

  /** A hex is not a Pantone. Dye houses work from physical standards. */
  no_hex_as_pantone(out) {
    for (const item of out.bill_of_materials || []) {
      const c = item.colour_standard || '';
      if (/^#?[0-9a-f]{6}$/i.test(c.trim())) {
        return `"${item.component}" gives a hex value as its colour standard`;
      }
    }
    return null;
  },

  /** Every measurement needs a tolerance or the factory cannot tell if it passed. */
  tolerances_present(out) {
    for (const p of out.measurements?.points || []) {
      if (!p.tolerance_cm) return `Measurement "${p.point}" has no tolerance`;
    }
    return null;
  },

  /** A first-draft tech pack with nothing open has guessed at something. */
  open_questions_not_empty(out) {
    if (!out.open_questions || out.open_questions.length === 0) {
      return 'open_questions is empty — a first draft that guessed at nothing does not exist';
    }
    return null;
  },

  /** Confidence must be expressed, and honest confidence is rarely 1.0. */
  confidence_is_honest(out) {
    if (typeof out.confidence !== 'number') return 'No confidence score';
    if (out.confidence >= 0.99) return `Confidence ${out.confidence} — nothing in this pipeline is that certain`;
    return null;
  },

  /**
   * Another brand's mark or silhouette anywhere in the output.
   *
   * This is the check that ends a company rather than costing it a re-cut.
   * Footwear is where it bites hardest: a sneaker's SHAPE is protected trade
   * dress, so "Air Force 1 silhouette, logos removed" is still infringement,
   * and Nike has won that argument many times.
   */
  no_third_party_marks(out) {
    const text = JSON.stringify(out);

    // Marks and logos.
    const MARKS = /\b(nike|swoosh|jumpman|air jordan|adidas|three stripes|trefoil|yeezy|puma|reebok|new balance|converse|chuck taylor|vans|supreme|off-white|balenciaga|gucci|louis vuitton|dior|prada|versace|burberry)\b/i;

    // Protected silhouettes, including the coy ways of naming one.
    const SHAPES = /\b(air force ?1|\baf1\b|jordan ?1|dunk[- ]?(low|high|style)|stan smith|superstar|gazelle|samba|air max|griffey|blazer|old skool)\b/i;

    // Nike moulds AIR into the Air Force 1 midsole. It reads as a material
    // note and is in fact somebody's trademark on somebody's product.
    const MIDSOLE_AIR = /"[^"]*\b(midsole|sole|outsole)\b[^"]*"/gi;

    const hitMark = text.match(MARKS);
    if (hitMark) return `References "${hitMark[0]}" — another brand's mark`;

    const hitShape = text.match(SHAPES);
    if (hitShape) return `References "${hitShape[0]}" — a protected silhouette, infringing even with the logos removed`;

    for (const seg of text.match(MIDSOLE_AIR) || []) {
      if (/\bair\b/i.test(seg) && !/air ?(flow|permeab|dry|mesh)/i.test(seg)) {
        return `"AIR" specified on a sole — that is Nike's mark moulded into their midsole`;
      }
    }
    return null;
  },

  /** An unroutable order must say why, not return an empty shrug. */
  unroutable_explains(out) {
    if (out.route === null && !out.unroutable_reason) {
      return 'Order marked unroutable with no reason given';
    }
    return null;
  },

  /** A split shipment the customer is not warned about becomes a support ticket. */
  split_is_explained(out) {
    const s = out.route?.shipments || [];
    if (s.length > 1 && !out.route.split_reason) {
      return `Order split across ${s.length} shipments with no split_reason`;
    }
    return null;
  },
};

function loadCases() {
  if (!fs.existsSync(GOLDEN)) return [];
  return fs.readdirSync(GOLDEN)
    .filter((f) => f.endsWith('.json'))
    .map((f) => ({ file: f, ...JSON.parse(fs.readFileSync(path.join(GOLDEN, f), 'utf8')) }));
}

async function main() {
  // Default to stub mode: CI must be free and must not need a key. Opt in to
  // the real API explicitly, because that spends money on every run.
  if (process.env.SML_AGENTS_STUB === undefined) process.env.SML_AGENTS_STUB = '1';
  const live = process.env.SML_AGENTS_STUB !== '1';

  const cases = loadCases();
  if (!cases.length) {
    console.error('No golden cases found in', GOLDEN);
    process.exit(1);
  }

  console.log(`\nSelf-Made Legends — agent evals  (${live ? 'LIVE API — this costs money' : 'stub mode'})`);
  console.log('─'.repeat(72));

  let failed = 0;
  let cost = 0;

  for (const c of cases) {
    const def = AGENTS[c.agent];
    if (!def) {
      console.log(`  ??  ${c.file}: unknown agent "${c.agent}"`);
      failed++;
      continue;
    }

    let output, meta;
    try {
      ({ output, meta } = await runAgent(def, c.input, { context: 'eval' }));
      cost += meta.cost_usd || 0;
    } catch (err) {
      console.log(`  ✗   ${c.name}\n        threw: ${err.message}`);
      failed++;
      continue;
    }

    const failures = [];
    for (const name of c.checks || []) {
      const check = CHECKS[name];
      if (!check) { failures.push(`unknown check "${name}"`); continue; }
      const problem = check(output);
      if (problem) failures.push(`${name}: ${problem}`);
    }

    if (failures.length) {
      failed++;
      console.log(`  ✗   ${c.name}`);
      failures.forEach((f) => console.log(`        ${f}`));
    } else {
      console.log(`  ✓   ${c.name}  (${c.checks.length} checks)`);
    }
  }

  console.log('─'.repeat(72));
  console.log(`${cases.length - failed}/${cases.length} passed` + (live ? `  ·  $${cost.toFixed(4)}` : ''));

  if (failed) {
    console.log('\nA failing eval means a prompt change broke something. Fix the prompt,');
    console.log('or — if the new behaviour is genuinely correct — change the check and');
    console.log('say why in the commit message.\n');
  }
  process.exit(failed ? 1 : 0);
}

if (require.main === module) main().catch((err) => { console.error(err); process.exit(1); });

module.exports = { CHECKS, loadCases };
