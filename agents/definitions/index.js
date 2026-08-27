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

/**
 * Declared but not built. They appear in the dashboard as "not implemented"
 * rather than being absent, so the gap between the plan and the system is
 * visible instead of quietly forgotten.
 */
const PLANNED = ['qa', 'cad', 'costing', 'catalog', 'fulfillment', 'cx'].map((name) => ({
  name,
  title: name.toUpperCase(),
  planned: true,
}));

const AGENTS = { vision: VISION, design: DESIGN, techpack: TECHPACK, routing: ROUTING };

module.exports = { AGENTS, PLANNED, VISION, DESIGN, TECHPACK, ROUTING };
