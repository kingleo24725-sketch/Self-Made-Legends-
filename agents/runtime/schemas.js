/**
 * Self-Made Legends — agent output schemas
 * Copyright (c) 2026 Self-Made Legends LLC. All Rights Reserved.
 *
 * These are passed to the API as structured-output schemas, so the model is
 * constrained to produce them rather than asked nicely. That removes a whole
 * class of failure — no parse errors, no missing fields, no prose wrapped
 * around the JSON.
 *
 * Every schema carries `flags` and `confidence`. That is deliberate and it is
 * the load-bearing part of the whole design: an agent that cannot express
 * doubt will express certainty instead, and certainty is what gets a wrong
 * number onto a factory floor.
 */

'use strict';

/** Shared: how sure the agent is, and what it wants a human to look at. */
const flags = {
  type: 'array',
  description: 'Anything a human should look at before this is used. Empty is a claim that nothing is wrong.',
  items: {
    type: 'object',
    additionalProperties: false,
    required: ['severity', 'issue'],
    properties: {
      severity: { type: 'string', enum: ['blocker', 'warning', 'note'] },
      issue: { type: 'string' },
      suggestion: { type: 'string' },
    },
  },
};

const confidence = {
  type: 'number',
  minimum: 0,
  maximum: 1,
  description: 'How much you would bet on this being right. Be honest; a low score that proves correct is worth more here than a high one that does not.',
};

const VISION = {
  type: 'object',
  additionalProperties: false,
  required: ['image_kind', 'summary', 'construction', 'decoration', 'colours', 'flags', 'confidence'],
  properties: {
    image_kind: { type: 'string', enum: ['reference', 'sample', 'artwork', 'unclear'] },
    summary: { type: 'string' },
    garment_type: { type: 'string' },
    silhouette: { type: 'string' },
    construction: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['feature', 'observation'],
        properties: {
          feature: { type: 'string', description: 'e.g. shoulder, cuff, hem, seam finish, pocket' },
          observation: { type: 'string' },
          inferred: { type: 'boolean', description: 'true if read from the photo rather than known' },
        },
      },
    },
    fabric: {
      type: 'object',
      additionalProperties: false,
      properties: {
        description: { type: 'string' },
        weight_range_gsm: { type: 'string', description: 'A RANGE, e.g. "340-380". Never a single number from a photograph.' },
        inferred: { type: 'boolean' },
      },
    },
    decoration: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['placement', 'method'],
        properties: {
          placement: { type: 'string' },
          method: { type: 'string', enum: ['embroidery', 'print', 'applique', 'woven', 'hardware', 'foil', 'UNKNOWN'] },
          evidence: { type: 'string', description: 'What in the image tells you this. Required when method is not UNKNOWN.' },
          size_note: { type: 'string' },
        },
      },
    },
    colours: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'hex_estimate'],
        properties: {
          name: { type: 'string' },
          hex_estimate: { type: 'string' },
          house_colour: { type: 'string', description: 'Onyx / Bone / Oxblood / gold, if it maps' },
          confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
        },
      },
    },
    sample_deltas: {
      type: 'array',
      description: 'Only when image_kind is "sample": observed differences from spec. Observations, not verdicts.',
      items: { type: 'string' },
    },
    flags,
    confidence,
  },
};

const DESIGN = {
  type: 'object',
  additionalProperties: false,
  required: ['name', 'category', 'silhouette', 'fabric', 'construction', 'decoration', 'colourway', 'sizes', 'flags', 'confidence'],
  properties: {
    name: { type: 'string', description: 'House register — Regent, Heir, Dynasty, Throne, Crown. Not a slogan.' },
    category: { type: 'string', enum: ['apparel', 'footwear', 'heels', 'jewellery', 'underwear', 'hats', 'accessories'] },
    one_line: { type: 'string' },
    silhouette: {
      type: 'object',
      additionalProperties: false,
      required: ['description', 'rationale'],
      properties: { description: { type: 'string' }, rationale: { type: 'string' } },
    },
    fabric: {
      type: 'object',
      additionalProperties: false,
      required: ['composition', 'weight_gsm', 'estimated'],
      properties: {
        composition: { type: 'string' },
        weight_gsm: { type: 'string' },
        finish: { type: 'string' },
        estimated: { type: 'boolean', description: 'true unless taken from a real spec sheet' },
      },
    },
    construction: { type: 'array', items: { type: 'string' } },
    decoration: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['placement', 'method', 'artwork', 'rationale'],
        properties: {
          placement: { type: 'string' },
          method: { type: 'string', enum: ['embroidery', 'print', 'applique', 'woven', 'hardware', 'foil'] },
          artwork: { type: 'string' },
          size_mm: { type: 'string' },
          thread_or_ink: { type: 'string' },
          stitch_count_estimate: { type: 'integer', description: 'Required for every embroidered area. The costing agent needs this more than any other number.' },
          rationale: { type: 'string', description: 'Why this method and not another.' },
        },
      },
    },
    colourway: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['part', 'colour', 'hex'],
        properties: { part: { type: 'string' }, colour: { type: 'string' }, hex: { type: 'string' } },
      },
    },
    sizes: { type: 'array', items: { type: 'string' } },
    run_size_suggestion: { type: 'integer' },
    concerns: {
      type: 'array',
      description: 'Where you changed or pushed back on the brief, and why.',
      items: { type: 'string' },
    },
    flags,
    confidence,
  },
};

const TECHPACK = {
  type: 'object',
  additionalProperties: false,
  required: ['header', 'bill_of_materials', 'measurements', 'construction', 'decoration', 'labelling', 'quality_standard', 'open_questions', 'flags', 'confidence'],
  properties: {
    header: {
      type: 'object',
      additionalProperties: false,
      required: ['style_name', 'style_code', 'category', 'season'],
      properties: {
        style_name: { type: 'string' },
        style_code: { type: 'string' },
        category: { type: 'string' },
        season: { type: 'string' },
        base_size: { type: 'string' },
      },
    },
    bill_of_materials: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['component', 'specification', 'placement', 'quantity'],
        properties: {
          component: { type: 'string' },
          specification: { type: 'string', description: 'Exact. "UNKNOWN — [what is needed]" if you do not have it.' },
          placement: { type: 'string' },
          quantity: { type: 'string' },
          supplier: { type: 'string' },
          colour_standard: { type: 'string', description: 'Pantone TCX/TPG, or "UNKNOWN — Pantone required".' },
        },
      },
    },
    measurements: {
      type: 'object',
      additionalProperties: false,
      required: ['grade_rule', 'points'],
      properties: {
        grade_rule: { type: 'string' },
        points: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['point', 'how_to_measure', 'tolerance_cm', 'sizes'],
            properties: {
              point: { type: 'string' },
              how_to_measure: { type: 'string', description: 'From a fixed landmark. HPS, centre front, side seam.' },
              tolerance_cm: { type: 'string' },
              sizes: { type: 'object', additionalProperties: { type: 'string' } },
            },
          },
        },
      },
    },
    construction: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['operation', 'specification'],
        properties: {
          operation: { type: 'string' },
          specification: { type: 'string' },
          stitch_type: { type: 'string' },
          spi: { type: 'string', description: 'Stitches per inch' },
        },
      },
    },
    decoration: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['placement', 'method', 'position_from_landmark', 'dimensions_mm'],
        properties: {
          placement: { type: 'string' },
          method: { type: 'string' },
          position_from_landmark: { type: 'string' },
          dimensions_mm: { type: 'string' },
          stitch_count: { type: 'string' },
          thread: { type: 'string' },
          backing: { type: 'string' },
          underlay: { type: 'string' },
          pull_compensation: { type: 'string' },
          approval_required: { type: 'string', description: 'e.g. digitised DST approved by the house before bulk' },
        },
      },
    },
    labelling: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['item', 'specification', 'placement'],
        properties: { item: { type: 'string' }, specification: { type: 'string' }, placement: { type: 'string' } },
      },
    },
    quality_standard: { type: 'array', items: { type: 'string' } },
    open_questions: {
      type: 'array',
      description: 'Everything you would have had to guess. Never empty in a first draft.',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['question', 'blocks', 'who_answers'],
        properties: {
          question: { type: 'string' },
          blocks: { type: 'string', enum: ['sampling', 'bulk', 'costing', 'nothing'] },
          who_answers: { type: 'string' },
        },
      },
    },
    flags,
    confidence,
  },
};

const ROUTING = {
  type: 'object',
  additionalProperties: false,
  required: ['route', 'reasoning', 'flags', 'confidence'],
  properties: {
    route: {
      type: ['object', 'null'],
      description: 'null when the order cannot be routed. That is a valid, useful answer.',
      additionalProperties: false,
      required: ['shipments'],
      properties: {
        shipments: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['manufacturer', 'distributor', 'line_items', 'service_level'],
            properties: {
              manufacturer: { type: 'string' },
              distributor: { type: 'string' },
              line_items: { type: 'array', items: { type: 'string' } },
              service_level: { type: 'string' },
              estimated_ship_date: { type: 'string' },
              estimated_delivery_window: { type: 'string' },
              crosses_border: { type: 'boolean' },
            },
          },
        },
        split_reason: { type: 'string', description: 'Required when there is more than one shipment.' },
        meets_promised_date: { type: 'boolean' },
      },
    },
    unroutable_reason: { type: 'string' },
    checked: { type: 'array', description: 'What you evaluated, so a human can see your working.', items: { type: 'string' } },
    reasoning: { type: 'string' },
    flags,
    confidence,
  },
};

/* ══════════════════════════════════════════════════════════════════════════
   SPRINT TWO — the six that turn a design into a shipped, costed, listed,
   supported product. Same contract throughout: every one carries flags and
   confidence, and every one names what it does not know.
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * QA — judges a sample against the tech pack that specified it.
 *
 * Deliberately reports per measurement point rather than a verdict, because
 * "reject" with no numbers is an argument with a factory and "chest is 3cm
 * over a ±1cm tolerance at L" is a correction.
 */
const QA = {
  type: 'object',
  additionalProperties: false,
  required: ['verdict', 'measured', 'defects', 'flags', 'confidence'],
  properties: {
    verdict: { type: 'string', enum: ['approve', 'approve_with_corrections', 'reject', 'insufficient_evidence'] },
    sample_ref: { type: 'string' },
    against_techpack: { type: 'string', description: 'Style code and tech pack version this was judged against.' },
    measured: {
      type: 'array',
      description: 'One row per measurement point in the tech pack. Missing points are a finding, not an omission.',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['point', 'spec', 'status'],
        properties: {
          point: { type: 'string' },
          spec: { type: 'string' },
          actual: { type: 'string' },
          tolerance: { type: 'string' },
          deviation: { type: 'string' },
          status: { type: 'string', enum: ['in_tolerance', 'out_of_tolerance', 'not_measurable'] },
        },
      },
    },
    defects: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['classification', 'description', 'location'],
        properties: {
          classification: { type: 'string', enum: ['critical', 'major', 'minor'] },
          description: { type: 'string' },
          location: { type: 'string' },
          likely_cause: { type: 'string' },
          remedy: { type: 'string' },
        },
      },
    },
    aql_position: { type: 'string', description: 'Where this lands against the stated AQL, or why that cannot be judged from one sample.' },
    corrections_required: { type: 'array', items: { type: 'string' } },
    flags,
    confidence,
  },
};

/**
 * 3D / CAD — turns a tech pack into instructions a pattern cutter or a
 * modeller can act on. It does not produce geometry; it produces the brief
 * for whoever does, and says so.
 */
const CAD = {
  type: 'object',
  additionalProperties: false,
  required: ['deliverable', 'base_size', 'panels', 'flags', 'confidence'],
  properties: {
    deliverable: { type: 'string', enum: ['pattern_brief', 'last_brief', 'model_brief'] },
    software_target: { type: 'string', description: 'CLO3D, Browzwear, Rhino, Modo — whatever the receiving studio uses.' },
    base_size: { type: 'string' },
    panels: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'quantity', 'notes'],
        properties: {
          name: { type: 'string' },
          quantity: { type: 'string' },
          grain_line: { type: 'string' },
          seam_allowance_cm: { type: 'string' },
          notes: { type: 'string' },
        },
      },
    },
    grading: { type: 'string', description: 'The grade rule carried through from the tech pack, restated in cutting terms.' },
    fit_intent: { type: 'string', description: 'What the garment should do on a body — the thing a measurement chart cannot say.' },
    materials_for_simulation: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['component', 'physical_properties'],
        properties: {
          component: { type: 'string' },
          physical_properties: { type: 'string', description: 'Weight, drape, stretch, bend — what a simulator needs.' },
          measured: { type: 'boolean', description: 'False means estimated, and the simulation is then indicative only.' },
        },
      },
    },
    open_questions: { type: 'array', items: { type: 'string' } },
    flags,
    confidence,
  },
};

/**
 * Costing — a landed cost, itemised, with every assumption exposed.
 *
 * Refuses to produce a single number without the breakdown. A margin built
 * on an invisible assumption is how a brand sells at a loss for a season.
 */
const COSTING = {
  type: 'object',
  additionalProperties: false,
  required: ['currency', 'quantity', 'lines', 'unit_cost', 'assumptions', 'flags', 'confidence'],
  properties: {
    currency: { type: 'string' },
    quantity: { type: 'integer', description: 'Costs are meaningless without the run size they assume.' },
    lines: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['category', 'description', 'unit_cost', 'basis'],
        properties: {
          category: { type: 'string', enum: ['material', 'trim', 'labour', 'decoration', 'packaging', 'freight', 'duty', 'tooling', 'overhead', 'other'] },
          description: { type: 'string' },
          unit_cost: { type: 'number' },
          basis: { type: 'string', enum: ['quoted', 'benchmark', 'estimated'], description: 'quoted means a supplier said it. Everything else is a guess with a label.' },
          source: { type: 'string' },
        },
      },
    },
    unit_cost: { type: 'number', description: 'Landed cost per unit at the stated quantity.' },
    suggested_wholesale: { type: 'number' },
    suggested_retail: { type: 'number' },
    margin_at_retail: { type: 'string' },
    breakeven_units: { type: 'integer' },
    assumptions: { type: 'array', description: 'Every number that is not quoted, named.', items: { type: 'string' } },
    sensitivity: { type: 'string', description: 'Which single input moves the unit cost most, and by how much.' },
    flags,
    confidence,
  },
};

/**
 * Catalog — product copy and listing data from a tech pack.
 *
 * Constrained hard: it may only claim what the tech pack states. Marketing
 * copy that invents a fibre content is a compliance problem, not a style one.
 */
const CATALOG = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'blurb', 'bullets', 'claims_basis', 'flags', 'confidence'],
  properties: {
    title: { type: 'string' },
    subtitle: { type: 'string' },
    blurb: { type: 'string', description: 'Two sentences at most. House voice: plain, declarative, no superlatives it cannot support.' },
    bullets: { type: 'array', items: { type: 'string' } },
    materials_statement: { type: 'string', description: 'Verbatim from the tech pack. Never paraphrased — this is a legal statement.' },
    care_statement: { type: 'string' },
    alt_text: { type: 'string', description: 'For the product photograph, written for someone who cannot see it.' },
    seo: {
      type: 'object',
      additionalProperties: false,
      properties: {
        meta_title: { type: 'string' },
        meta_description: { type: 'string' },
        keywords: { type: 'array', items: { type: 'string' } },
      },
    },
    claims_basis: {
      type: 'array',
      description: 'Each claim in the copy, mapped to the tech pack line that supports it. A claim with no line is a claim to delete.',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['claim', 'supported_by'],
        properties: {
          claim: { type: 'string' },
          supported_by: { type: 'string' },
        },
      },
    },
    flags,
    confidence,
  },
};

/**
 * Fulfillment — turns a routed order into the instruction a distributor acts
 * on, and states what happens when it goes wrong before it goes wrong.
 */
const FULFILLMENT = {
  type: 'object',
  additionalProperties: false,
  required: ['action', 'shipments', 'flags', 'confidence'],
  properties: {
    action: { type: 'string', enum: ['dispatch', 'hold', 'partial_dispatch', 'cancel'] },
    shipments: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['distributor', 'line_items', 'service_level'],
        properties: {
          distributor: { type: 'string' },
          line_items: { type: 'array', items: { type: 'string' } },
          service_level: { type: 'string' },
          packaging: { type: 'string', description: 'The presentation box is part of the product at this price point.' },
          insured_value: { type: 'number' },
          signature_required: { type: 'boolean' },
          customs: { type: 'string', description: 'HS code and declared value, or why neither is needed.' },
        },
      },
    },
    hold_reason: { type: 'string' },
    customer_message: { type: 'string', description: 'What the buyer is told, in the house voice. Plain about delay; never apologetic-and-vague.' },
    exception_plan: { type: 'string', description: 'What is done if this shipment is late, lost or refused.' },
    flags,
    confidence,
  },
};

/**
 * CX — drafts a reply to a customer. Never sends one.
 *
 * `requires_human` defaults to the safe answer: anything touching money,
 * a legal threat, or a named person's grief goes to a person.
 */
const CX = {
  type: 'object',
  additionalProperties: false,
  required: ['intent', 'sentiment', 'requires_human', 'draft_reply', 'flags', 'confidence'],
  properties: {
    intent: { type: 'string', enum: ['order_status', 'sizing', 'return', 'refund', 'damage', 'wholesale', 'press', 'complaint', 'legal', 'other'] },
    sentiment: { type: 'string', enum: ['positive', 'neutral', 'frustrated', 'angry'] },
    requires_human: { type: 'boolean', description: 'True for anything involving a refund, a legal threat, a health claim, or a named person. When unsure, true.' },
    escalation_reason: { type: 'string' },
    draft_reply: { type: 'string', description: 'A draft. Nothing here is sent without a person reading it.' },
    facts_used: {
      type: 'array',
      description: 'Every factual statement in the draft and where it came from. An unsourced fact is an invented one.',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['fact', 'source'],
        properties: { fact: { type: 'string' }, source: { type: 'string' } },
      },
    },
    suggested_resolution: { type: 'string' },
    flags,
    confidence,
  },
};

module.exports = {
  VISION, DESIGN, TECHPACK, ROUTING,
  QA, CAD, COSTING, CATALOG, FULFILLMENT, CX,
  flags, confidence,
};
