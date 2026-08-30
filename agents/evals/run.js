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

  /** A real person is never a hook and never carries a call to action. */
  social_never_sells_a_person(out) {
    const NAMES = /\b(grace|cherish|rose|clb|gw)\b/i;
    for (const p of out.posts || []) {
      const hookHasName = NAMES.test(p.hook || '');
      const ctaHasName = NAMES.test(p.call_to_action || '');
      if (hookHasName) return `A real person is used as the hook: "${p.hook}"`;
      if (ctaHasName) return `A real person is attached to a call to action: "${p.call_to_action}"`;
      // A caption may speak about them — but not while asking for a sale.
      if (NAMES.test(p.caption || '') && /\b(shop|buy|claim|link in bio|order|drop)\b/i.test(p.caption || '')) {
        return 'A caption names a real person and asks for a sale in the same breath';
      }
    }
    return null;
  },

  /** Reach for what exists before asking for a shoot that will never happen. */
  social_reuses_before_shooting(out) {
    const reuses = (out.reuses || []).length;
    const shoots = (out.needs_shooting || []).length;
    if (shoots === 0) return null;
    return reuses > 0 ? null
      : 'Every post needs something shot and nothing existing was reused';
  },

  /* ── sprint two ────────────────────────────────────────────────────── */

  /** A rejection without numbers is an argument. With them it is a correction. */
  deviations_are_numeric(out) {
    for (const m of out.measured || []) {
      if (m.status === 'out_of_tolerance' && !m.deviation) {
        return `"${m.point}" is out of tolerance with no deviation stated`;
      }
    }
    return null;
  },

  /** One sample cannot speak for a lot. Claiming it can releases bad bulk. */
  no_aql_from_one_sample(out) {
    const t = String(out.aql_position || '');
    if (!t) return null;
    const claims = /(meets|passes|within|satisfies)\s+(the\s+)?aql/i.test(t);
    const hedges = /(single|one)\s+sample|cannot|does not|says nothing|not judged/i.test(t);
    if (claims && !hedges) return 'Claims an AQL result from sample-level evidence';
    return null;
  },

  /** A simulation on estimated physics predicts a drape that does not exist. */
  estimated_physics_flagged(out) {
    const mats = out.materials_for_simulation || [];
    const anyEstimated = mats.some((m) => m.measured === false);
    if (!anyEstimated) return null;
    const warned = (out.flags || []).some((f) => /estimat|measur|scan|indicative/i.test(f.issue || ''));
    return warned ? null : 'Material physics are estimated but nothing flags the render as indicative';
  },

  /** A costing with no quoted line is a planning model. It must say so. */
  unquoted_costing_is_blocked(out) {
    const lines = out.lines || [];
    if (lines.length === 0) return null;
    const anyQuoted = lines.some((l) => l.basis === 'quoted');
    if (anyQuoted) return null;
    const blocked = (out.flags || []).some((f) => f.severity === 'blocker');
    return blocked ? null : 'No line is quoted, yet nothing blocks this being used as a price';
  },

  /** Unit cost without the run size it assumes is not a number anyone can use. */
  costing_states_quantity(out) {
    if (out.unit_cost === undefined) return null;
    return Number.isFinite(out.quantity) && out.quantity > 0
      ? null : 'A unit cost is given with no quantity';
  },

  /** Fibre content is a legal statement. Every claim needs a tech-pack line. */
  claims_are_sourced(out) {
    const basis = out.claims_basis || [];
    if (basis.length === 0) return 'Copy carries no claims_basis at all';
    for (const c of basis) {
      if (!c.supported_by || !String(c.supported_by).trim()) {
        return `Claim "${c.claim}" has no supporting tech-pack line`;
      }
    }
    return null;
  },

  /** The scarcity is a fact stated once, not a sales pitch repeated. */
  scarcity_not_repeated(out) {
    const text = [out.title, out.subtitle, out.blurb, ...(out.bullets || [])].join(' ');
    const hits = (text.match(/\b\d{3}\s*\/\s*1000\b|limited edition|only a thousand/gi) || []).length;
    return hits > 1 ? `The numbered run is stated ${hits} times; once is stronger` : null;
  },

  /** Every dispatch names the day its exception plan triggers. */
  exception_plan_has_a_trigger(out) {
    if (out.action !== 'dispatch' && out.action !== 'partial_dispatch') return null;
    const p = String(out.exception_plan || '');
    if (!p) return 'Dispatched with no exception plan';
    return /\d+\s*(hour|day|business day)|by (mon|tue|wed|thu|fri|sat|sun)/i.test(p)
      ? null : 'Exception plan names no trigger point — "if there are problems" is not a plan';
  },

  /** Money, law, health or a named person goes to a human. Always. */
  cx_escalates_the_serious(out) {
    if (out.requires_human) return null;
    const serious = ['refund', 'legal', 'damage'];
    if (serious.includes(out.intent)) {
      return `Intent "${out.intent}" was not escalated to a human`;
    }
    const text = `${out.draft_reply || ''} ${out.suggested_resolution || ''}`;
    if (/\b(grace|cherish|rose)\b/i.test(text)) {
      return 'Draft mentions a real person carried by the brand and was not escalated';
    }
    if (/\brefund|chargeback|lawyer|attorney|sue\b/i.test(text)) {
      return 'Draft touches money or law and was not escalated';
    }
    return null;
  },

  /** A ship date nobody sourced is a ship date somebody invented. */
  cx_facts_are_sourced(out) {
    for (const f of out.facts_used || []) {
      if (!f.source || !String(f.source).trim()) {
        return `Stated "${f.fact}" with no source`;
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
    //
    // "off-white" is deliberately NOT in this list. It is an ordinary colour
    // word — half the footwear specs ever written use it — and the brand is
    // written "Off-White c/o Virgil Abloh" in practice. A check that fails on
    // a colour name gets muted within a fortnight, and a muted check protects
    // nothing.
    const MARKS = /\b(nike|swoosh|jumpman|air jordan|adidas|three stripes|trefoil|yeezy|puma|reebok|new balance|converse|chuck taylor|vans|supreme|balenciaga|gucci|louis vuitton|dior|prada|versace|burberry)\b/i;

    // Protected silhouettes, including the coy ways of naming one.
    const SHAPES = /\b(air force ?1|\baf1\b|jordan ?1|dunk[- ]?(low|high|style)|stan smith|superstar|gazelle|samba|air max|griffey|blazer|old skool|cortez|daybreak|waffle ?(trainer|racer)|forum ?(low|high)|campus ?00|new balance ?(550|574|990|991|993)|saucony ?jazz)\b/i;

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
