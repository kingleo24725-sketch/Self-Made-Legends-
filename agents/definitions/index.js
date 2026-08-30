/**
 * Self-Made Legends — agent definitions
 * Copyright (c) 2026 Self-Made Legends LLC. All Rights Reserved.
 *
 * The four production agents of sprint one. Six more (QA, 3D/CAD, Costing,
 * Catalog, Fulfillment, CX) are declared at the bottom as `PLANNED` so the
 * pipeline, the review UI and the dashboard already know their names — but
 * they have no prompt and will refuse to run, which is the honest state.
 *
 * Model choice, per agent, on purpose:
 *
 *   The default is Opus 5. It is only dearer than Sonnet in the abstract —
 *   in this pipeline a wrong tech pack costs a re-cut and six weeks, which
 *   is worth several thousand Opus calls. Where the job is genuinely
 *   mechanical (routing against a table of partner capabilities) a smaller
 *   model is used, and that is stated rather than assumed.
 */

'use strict';

const schemas = require('../runtime/schemas');

const VISION = {
  name: 'vision',
  title: 'Vision',
  model: 'claude-opus-5',
  effort: 'high',
  maxTokens: 8000,
  schema: schemas.VISION,
  reviewRequired: true,
  stub: (input) => ({
    image_kind: 'reference',
    summary: 'Heavyweight black hooded sweatshirt, gold crest embroidered at left chest.',
    garment_type: 'Hooded sweatshirt',
    silhouette: 'Boxy, dropped shoulder, ribbed cuff and hem',
    construction: [
      { feature: 'shoulder', observation: 'Dropped shoulder, set-in sleeve', inferred: true },
      { feature: 'cuff', observation: '2x1 rib, approximately 7cm', inferred: true },
    ],
    fabric: { description: 'Brushed-back fleece', weight_range_gsm: '340-380', inferred: true },
    decoration: [
      { placement: 'Left chest', method: 'embroidery', evidence: 'Raised thread with visible satin sheen and slight ground pucker', size_note: 'approx 70mm wide' },
    ],
    colours: [{ name: 'Onyx', hex_estimate: '#0B0C11', house_colour: 'Onyx', confidence: 'high' }],
    flags: [{ severity: 'note', issue: 'Weight is inferred from drape, not measured', suggestion: 'Confirm against a physical swatch before costing' }],
    confidence: 0.72,
  }),
};

const DESIGN = {
  name: 'design',
  title: 'Design',
  model: 'claude-opus-5',
  effort: 'high',
  maxTokens: 12000,
  schema: schemas.DESIGN,
  reviewRequired: true,
  stub: () => ({
    name: 'Regent Embroidered Hoodie',
    category: 'apparel',
    one_line: 'Heavyweight fleece with the house crest embroidered in metallic gold.',
    silhouette: { description: 'Boxy body, dropped shoulder, 2x1 rib cuff and hem', rationale: 'Carries a heavy fleece without collapsing at the shoulder' },
    fabric: { composition: '80% cotton / 20% polyester brushed-back fleece', weight_gsm: '360-380', finish: 'Enzyme washed', estimated: true },
    construction: ['Flatlock shoulder seam', 'Bartack at pocket mouth', 'Twill tape neck reinforcement'],
    decoration: [
      {
        placement: 'Left chest',
        method: 'embroidery',
        artwork: 'House crest',
        size_mm: '70 x 70',
        thread_or_ink: 'Metallic gold',
        stitch_count_estimate: 9500,
        rationale: 'Gold must be thread — print renders metallic as flat mustard on a dark ground.',
      },
    ],
    colourway: [{ part: 'Body', colour: 'Onyx', hex: '#0B0C11' }],
    sizes: ['S', 'M', 'L', 'XL', '2XL'],
    run_size_suggestion: 100,
    concerns: [],
    flags: [{ severity: 'warning', issue: 'Fabric weight is an estimate, not from a spec sheet', suggestion: 'Confirm with the mill before the tech pack goes out' }],
    confidence: 0.78,
  }),
};

const TECHPACK = {
  name: 'techpack',
  title: 'Tech-Pack',
  model: 'claude-opus-5',
  effort: 'xhigh',   // the most expensive mistake in the pipeline lives here
  maxTokens: 32000,
  schema: schemas.TECHPACK,
  reviewRequired: true,
  exampleLimit: 4,   // tech packs are long; four examples is already a lot of tokens
  stub: () => ({
    header: { style_name: 'Regent Embroidered Hoodie', style_code: 'SML-AP-001', category: 'Apparel', season: 'A/W 26', base_size: 'L' },
    bill_of_materials: [
      { component: 'Shell', specification: '80/20 CVC brushed-back fleece, 360-380gsm', placement: 'Body, sleeves, hood', quantity: '2.1m @ 180cm', supplier: 'UNKNOWN — mill not yet appointed', colour_standard: 'UNKNOWN — Pantone TCX required; hex #0B0C11 supplied, must be matched to a physical swatch' },
      { component: 'Rib', specification: '2x1 rib, 320gsm, matching shell', placement: 'Cuff, hem', quantity: '0.3m', colour_standard: 'Match shell' },
      { component: 'Embroidery thread', specification: 'UNKNOWN — metallic gold; Madeira FS 40 recommended, code to be confirmed against physical standard', placement: 'Left chest crest', quantity: '1 cone' },
    ],
    measurements: {
      grade_rule: '2cm chest, 1cm body length per size step',
      points: [
        { point: 'Chest, 2.5cm below armhole', how_to_measure: 'Laid flat, across, doubled', tolerance_cm: '±1.0', sizes: { S: '56', M: '58', L: '60', XL: '62', '2XL': '64' } },
        { point: 'Body length from HPS', how_to_measure: 'High point of shoulder to hem', tolerance_cm: '±1.5', sizes: { S: '68', M: '70', L: '72', XL: '74', '2XL': '76' } },
        { point: 'Cuff rib height', how_to_measure: 'Finished, folded', tolerance_cm: '±0.5', sizes: { S: '7.0', M: '7.0', L: '7.0', XL: '7.0', '2XL': '7.0' } },
      ],
    },
    construction: [
      { operation: 'Shoulder seam', specification: 'Flatlock, 4-thread', stitch_type: '607', spi: '10-12' },
      { operation: 'Neck', specification: 'Bound, twill tape reinforcement shoulder to shoulder', stitch_type: '406', spi: '10-12' },
    ],
    decoration: [
      {
        placement: 'Left chest crest',
        method: 'Embroidery, metallic thread',
        position_from_landmark: '18cm down from HPS, 12cm from centre front, size L; graded proportionally',
        dimensions_mm: '70 x 70',
        stitch_count: 'approx 9,500 — to be confirmed on digitising',
        thread: 'UNKNOWN — metallic gold, code to be confirmed',
        backing: 'Cut-away, 2.5oz',
        underlay: 'Edge walk plus zigzag under all satin areas',
        pull_compensation: '0.2mm on satin columns',
        approval_required: 'Digitised DST file approved in writing by the house before bulk. Factory-side digitising without approval is a rejection.',
      },
    ],
    labelling: [
      { item: 'Main label', specification: 'Woven, satin, gold on black', placement: 'Centre back neck' },
      { item: 'Care label', specification: 'UNKNOWN — content and care wording must match final fabric and destination market law', placement: 'Left side seam, 10cm up from hem' },
    ],
    quality_standard: [
      'AQL 2.5 major / 4.0 minor on final random inspection',
      'No thread ends over 3mm',
      'Embroidery must not distort the ground fabric',
    ],
    open_questions: [
      { question: 'Pantone TCX for Onyx — hex supplied, physical standard required', blocks: 'sampling', who_answers: 'House, with the dye house' },
      { question: 'Metallic thread brand and colour code', blocks: 'sampling', who_answers: 'Factory to propose, house to approve against physical' },
      { question: 'Mill and fabric supplier not appointed', blocks: 'costing', who_answers: 'House' },
      { question: 'Care content wording for destination markets', blocks: 'bulk', who_answers: 'House, with compliance' },
    ],
    flags: [
      { severity: 'blocker', issue: 'No Pantone standard — a dye house cannot work from a hex value', suggestion: 'Send a physical swatch before requesting a sample' },
      { severity: 'warning', issue: 'Fabric weight carried through from an estimate, not a spec sheet', suggestion: 'Confirm with the mill' },
    ],
    confidence: 0.64,
  }),
};

const ROUTING = {
  name: 'routing',
  title: 'Order Routing',
  model: 'claude-sonnet-5',   // matching an order against a capability table; not a judgement call
  effort: 'medium',
  maxTokens: 6000,
  schema: schemas.ROUTING,
  reviewRequired: false,      // routes at scale; exceptions surface via flags
  stub: (input) => ({
    route: {
      shipments: [{
        manufacturer: 'sandbox-mfg',
        distributor: 'lefty',
        line_items: (input?.order?.line_items || []).map((l) => l.sku || 'UNKNOWN'),
        service_level: input?.order?.service_level || 'standard',
        estimated_ship_date: '2026-09-08',
        estimated_delivery_window: '2026-09-11 to 2026-09-15',
        crosses_border: false,
      }],
      meets_promised_date: true,
    },
    checked: ['Embroidery capability at sandbox-mfg', 'Lefty accepting domestic US', 'Lead time 7d + transit 3-5d against standard'],
    reasoning: 'Single manufacturer covers every line. Domestic route, no border crossing, comfortably inside the promised window.',
    flags: [],
    confidence: 0.88,
  }),
};

/* ── sprint two ─────────────────────────────────────────────────────────── */

const QA = {
  name: 'qa',
  title: 'QA',
  model: 'claude-opus-5',
  effort: 'high',
  maxTokens: 12000,
  schema: schemas.QA,
  reviewRequired: true,     // a rejection costs a factory relationship
  stub: () => ({
    verdict: 'approve_with_corrections',
    sample_ref: 'SMP-001',
    against_techpack: 'SML-AP-001 rev A',
    measured: [
      { point: 'Chest, 2.5cm below armhole', spec: '60', actual: '61.2', tolerance: '±1.0', deviation: '+1.2', status: 'out_of_tolerance' },
      { point: 'Body length from HPS', spec: '72', actual: '72.4', tolerance: '±1.5', deviation: '+0.4', status: 'in_tolerance' },
      { point: 'Cuff rib height', spec: '7.0', actual: '6.8', tolerance: '±0.5', deviation: '-0.2', status: 'in_tolerance' },
    ],
    defects: [
      { classification: 'minor', description: 'Thread end 5mm at left cuff bartack', location: 'Left cuff', likely_cause: 'Trimming missed at final press', remedy: 'Add to final QC sweep; no pattern change' },
    ],
    aql_position: 'One minor on a single sample says nothing about a 2.5/4.0 AQL. That is judged on a lot, not a sample.',
    corrections_required: ['Chest 1.2cm over tolerance at L — recut the front and back panels, do not ease it in'],
    flags: [{ severity: 'warning', issue: 'Only one size sampled; grading is unverified', suggestion: 'Request S and 2XL before approving the grade' }],
    confidence: 0.81,
  }),
};

const CAD = {
  name: 'cad',
  title: '3D / CAD',
  model: 'claude-opus-5',
  effort: 'high',
  maxTokens: 16000,
  schema: schemas.CAD,
  reviewRequired: true,
  stub: () => ({
    deliverable: 'pattern_brief',
    software_target: 'CLO3D',
    base_size: 'L',
    panels: [
      { name: 'Front body', quantity: '1 on fold', grain_line: 'Parallel to centre front', seam_allowance_cm: '1.0', notes: 'No centre front seam' },
      { name: 'Back body', quantity: '1 on fold', grain_line: 'Parallel to centre back', seam_allowance_cm: '1.0', notes: 'Yoke optional; not in this rev' },
      { name: 'Sleeve', quantity: '2', grain_line: 'Parallel to sleeve centre', seam_allowance_cm: '1.0', notes: 'Dropped shoulder — sleeve head is shallow, do not use a set-in block' },
    ],
    grading: '2cm chest, 1cm body length per step, sleeve length graded 0.5cm',
    fit_intent: 'Sits away from the body through the chest and falls straight. It should not follow the waist.',
    materials_for_simulation: [
      { component: 'Shell fleece', physical_properties: 'UNKNOWN — 360-380gsm estimated; bend and stretch not measured', measured: false },
    ],
    open_questions: ['Fabric physicals have never been measured, so any simulation is indicative only'],
    flags: [{ severity: 'warning', issue: 'Simulating on estimated physicals predicts a drape the real cloth may not have', suggestion: 'Send 1m to the studio for a fabric scan before trusting the render' }],
    confidence: 0.66,
  }),
};

const COSTING = {
  name: 'costing',
  title: 'Costing',
  // Arithmetic against quoted numbers. The judgement is in labelling what is
  // quoted versus guessed, and that is instruction-following, not reasoning.
  model: 'claude-sonnet-5',
  effort: 'medium',
  maxTokens: 8000,
  schema: schemas.COSTING,
  reviewRequired: true,     // a wrong margin is invisible until the season ends
  stub: () => ({
    currency: 'USD',
    quantity: 100,
    lines: [
      { category: 'material', description: 'CVC fleece 360gsm, 2.1m', unit_cost: 14.7, basis: 'benchmark', source: 'Mill not appointed; benchmark from comparable 2026 quotes' },
      { category: 'decoration', description: 'Chest crest, 9.5k stitches metallic', unit_cost: 3.2, basis: 'estimated' },
      { category: 'labour', description: 'Cut, make, trim', unit_cost: 11.0, basis: 'benchmark' },
      { category: 'packaging', description: 'Rigid box, dust bag, numbered card', unit_cost: 6.4, basis: 'estimated' },
      { category: 'freight', description: 'Air, per unit at 100', unit_cost: 4.1, basis: 'estimated' },
    ],
    unit_cost: 39.4,
    suggested_wholesale: 98.0,
    suggested_retail: 450.0,
    margin_at_retail: '91.2% gross at MSRP; 59.8% at wholesale',
    breakeven_units: 0,
    assumptions: [
      'No mill appointed — every material line is a benchmark, not a quote',
      'Run size 100; below 100 the labour line roughly doubles',
      'No duty modelled; assumes domestic make',
      'Packaging at $6.40 is a guess and is the second largest line after material',
    ],
    sensitivity: 'Run size. At 25 units the unit cost lands near $58 and the wholesale margin stops working.',
    flags: [{ severity: 'blocker', issue: 'Not one line here is a real quote', suggestion: 'This is a planning model, not a price. Do not set MSRP from it until a factory has quoted.' }],
    confidence: 0.42,
  }),
};

const CATALOG = {
  name: 'catalog',
  title: 'Catalog',
  model: 'claude-opus-5',   // house voice is the product here; Sonnet writes fine, not like this
  effort: 'medium',
  maxTokens: 6000,
  schema: schemas.CATALOG,
  reviewRequired: true,     // this is the copy that goes public with a price on it
  stub: () => ({
    title: 'Golden Throne Hoodie',
    subtitle: 'Numbered 001 / 1000',
    blurb: 'Heavyweight black fleece with the house crest raised in gold at the chest and carried across the back. Numbered, and there is no second run.',
    // The numbered run is in the subtitle. Repeating it here is what the
    // scarcity_not_repeated eval exists to stop — it caught this stub.
    bullets: ['400 GSM brushed fleece', 'Raised gold embroidery, chest and back', 'Ribbed cuff and hem', 'Cold wash inside out'],
    materials_statement: '80% cotton / 20% polyester brushed-back fleece',
    care_statement: 'Cold wash inside out. Hang dry. Do not iron the crest.',
    alt_text: 'A black heavyweight hoodie with a gold crowned lion crest embroidered at the left chest.',
    seo: {
      meta_title: 'Golden Throne Hoodie — Self-Made Legends',
      meta_description: 'Heavyweight black fleece, gold embroidered crest, numbered 001 / 1000. Not given. Earned.',
      keywords: ['luxury hoodie', 'numbered edition', 'gold embroidered hoodie'],
    },
    claims_basis: [
      { claim: '400 GSM brushed fleece', supported_by: 'Tech pack BOM, shell line' },
      { claim: 'Numbered 001 / 1000', supported_by: 'Run size declared in the design brief' },
    ],
    flags: [{ severity: 'note', issue: 'Fabric weight comes from a tech pack line still marked estimated', suggestion: 'If the mill quotes differently, this copy is a false claim and must change' }],
    confidence: 0.74,
  }),
};

const FULFILLMENT = {
  name: 'fulfillment',
  title: 'Fulfillment',
  model: 'claude-sonnet-5',  // instruction assembly against a partner contract
  effort: 'medium',
  maxTokens: 6000,
  schema: schemas.FULFILLMENT,
  reviewRequired: false,     // runs per order; exceptions surface as flags
  stub: (input) => ({
    action: 'dispatch',
    shipments: [{
      distributor: 'lefty',
      line_items: (input?.order?.line_items || []).map((l) => l.sku || 'UNKNOWN'),
      service_level: 'standard',
      packaging: 'Rigid gold-foil box, dust bag, numbered authenticity card',
      insured_value: 450,
      signature_required: true,
      customs: 'Domestic US — no customs entry',
    }],
    customer_message: 'Your order is with our distributor and ships within two business days. You will get a tracking number the moment it moves.',
    exception_plan: 'If Lefty has not scanned it in 48 hours, the order is re-cut from the same run and the original is written off. The buyer is told on day two, not day nine.',
    flags: [],
    confidence: 0.86,
  }),
};

const CX = {
  name: 'cx',
  title: 'Customer Experience',
  model: 'claude-opus-5',   // the failure mode is tone, and tone is the brand
  effort: 'medium',
  maxTokens: 6000,
  schema: schemas.CX,
  reviewRequired: true,     // NEVER auto-send. See the schema note.
  stub: () => ({
    intent: 'order_status',
    sentiment: 'neutral',
    requires_human: false,
    draft_reply: 'It shipped on Tuesday and the tracking number is in your confirmation email. If it has not moved by Friday, reply here and I will re-cut it from the same run.',
    facts_used: [
      { fact: 'Shipped Tuesday', source: 'fulfillment event, order SML-1042' },
      { fact: 'Tracking number issued', source: 'Lefty dispatch webhook' },
    ],
    suggested_resolution: 'Send tracking. No further action unless it stalls.',
    flags: [],
    confidence: 0.83,
  }),
};

/**
 * Nothing is "planned" any more — all ten are defined. The list is kept so
 * the dashboard can still distinguish sprint one from sprint two, and so
 * adding an eleventh has an obvious place to go.
 */
const PLANNED = [];

const AGENTS = {
  vision: VISION, design: DESIGN, techpack: TECHPACK, routing: ROUTING,
  qa: QA, cad: CAD, costing: COSTING, catalog: CATALOG,
  fulfillment: FULFILLMENT, cx: CX,
};

const SPRINT_ONE = ['vision', 'design', 'techpack', 'routing'];
const SPRINT_TWO = ['qa', 'cad', 'costing', 'catalog', 'fulfillment', 'cx'];

module.exports = {
  AGENTS, PLANNED, SPRINT_ONE, SPRINT_TWO,
  VISION, DESIGN, TECHPACK, ROUTING,
  QA, CAD, COSTING, CATALOG, FULFILLMENT, CX,
};
