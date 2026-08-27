/**
 * Self-Made Legends — manufacturer sandbox
 * Copyright (c) 2026 Self-Made Legends LLC. All Rights Reserved.
 *
 * A fake factory that behaves like a real one, so the whole pipeline can be
 * tested end to end before any real manufacturer exists.
 *
 * It is deliberately awkward. A sandbox that always says yes teaches you
 * nothing and hides every bug in your error handling — so this one refuses
 * work it cannot do, rejects tech packs with open blockers, and can be told
 * to fail on demand. Those are the paths that actually break in production.
 */

'use strict';

const CAPABILITIES = {
  name: 'Sandbox Manufacturer',
  role: 'manufacturer',
  available: true,
  sandbox: true,
  makes: ['apparel', 'hats', 'accessories', 'underwear'],
  cannot_make: ['footwear', 'heels', 'jewellery'],
  decoration: ['embroidery', 'print', 'applique', 'woven'],
  max_stitch_count: 25000,
  min_order_units: 25,
  lead_time_days: { sampling: 14, bulk: 21 },
  country: 'US',
};

async function capabilities() {
  if (process.env.SML_SANDBOX_DOWN === '1') {
    throw new Error('Sandbox manufacturer is unreachable (SML_SANDBOX_DOWN=1)');
  }
  return CAPABILITIES;
}

async function quote(order) {
  const units = (order.line_items || []).reduce((n, l) => n + (l.quantity || 0), 0);
  if (units < CAPABILITIES.min_order_units) {
    return { partner: 'sandbox-mfg', accepted: false, reason: `Below minimum of ${CAPABILITIES.min_order_units} units` };
  }
  return { partner: 'sandbox-mfg', accepted: true, currency: 'USD', unit_cost: 22.5, units, lead_time_days: 21, sandbox: true };
}

/**
 * Accept a tech pack, or reject it the way a real factory would.
 *
 * A factory does not silently guess at a missing Pantone — it stops and asks,
 * and the pack sits on someone's desk for a week. Reproducing that here is
 * the point: it is what proves the open_questions field is doing its job.
 */
async function submitTechPack(techPack) {
  const blockers = (techPack.open_questions || []).filter((q) => q.blocks === 'sampling' || q.blocks === 'bulk');
  const unknowns = countUnknowns(techPack);

  if (blockers.length) {
    return {
      partner: 'sandbox-mfg',
      accepted: false,
      status: 'held_for_clarification',
      questions: blockers.map((b) => b.question),
      note: `Held. ${blockers.length} question(s) must be answered before sampling. This is what a real factory does, not a bug.`,
    };
  }

  if (unknowns > 0) {
    return {
      partner: 'sandbox-mfg',
      accepted: false,
      status: 'held_for_clarification',
      questions: [`${unknowns} specification field(s) read UNKNOWN and were not raised as open questions.`],
      note: 'An UNKNOWN that is not in open_questions is worse than one that is — nobody is tracking it.',
    };
  }

  return {
    partner: 'sandbox-mfg',
    accepted: true,
    status: 'accepted_for_sampling',
    reference: 'SBX-' + Date.now().toString(36).toUpperCase(),
    sample_eta_days: CAPABILITIES.lead_time_days.sampling,
  };
}

async function submit(order) {
  if (process.env.SML_SANDBOX_DOWN === '1') throw new Error('Sandbox manufacturer is unreachable');
  return { partner: 'sandbox-mfg', accepted: true, reference: 'SBX-' + Date.now().toString(36).toUpperCase(), status: 'in_production' };
}

function countUnknowns(obj) {
  let n = 0;
  const walk = (v) => {
    if (typeof v === 'string') { if (v.includes('UNKNOWN')) n++; return; }
    if (Array.isArray(v)) return v.forEach(walk);
    if (v && typeof v === 'object') return Object.values(v).forEach(walk);
  };
  // open_questions legitimately describes unknowns; don't count those twice.
  const { open_questions, ...rest } = obj || {};
  walk(rest);
  return n;
}

module.exports = { capabilities, quote, submit, submitTechPack, CAPABILITIES };
