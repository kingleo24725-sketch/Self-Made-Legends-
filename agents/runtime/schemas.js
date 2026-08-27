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

module.exports = { VISION, DESIGN, TECHPACK, ROUTING, flags, confidence };
