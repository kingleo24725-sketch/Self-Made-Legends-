/**
 * Self-Made Legends — partner adapters
 * Copyright (c) 2026 Self-Made Legends LLC. All Rights Reserved.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  READ THIS BEFORE TRUSTING THE LEFTY ADAPTER.
 *
 *  As of 27 August 2026 no public API documentation for Lefty Distribution
 *  could be found. The adapter below is written against the shape these
 *  integrations almost always take, and it is NOT verified against their
 *  real service. Treat every field name in it as a guess until someone has
 *  the actual docs in front of them.
 *
 *  This is why partners sit behind an interface. When the real
 *  documentation arrives, one file changes and nothing upstream moves.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Every adapter implements the same three methods:
 *
 *   capabilities()        what they can make or ship, and their lead times
 *   quote(order)          what a route would cost and when it would land
 *   submit(order)         place the job; returns a partner reference
 *
 * The routing agent is given the output of capabilities() and nothing else.
 * It never calls a partner directly — an agent that can place orders is an
 * agent that can place a wrong order at three in the morning.
 */

'use strict';

const lefty = require('./lefty');
const sandbox = require('./sandbox');

const PARTNERS = { lefty, 'sandbox-mfg': sandbox };

/** The partner state handed to the routing agent. Never let it fetch this itself. */
async function partnerState() {
  const state = [];
  for (const [id, partner] of Object.entries(PARTNERS)) {
    try {
      state.push({ id, ...(await partner.capabilities()) });
    } catch (err) {
      // A partner that cannot be reached is reported as unavailable rather
      // than omitted. An agent that never sees a partner cannot flag that
      // it is missing; one that sees "unavailable" can.
      state.push({ id, available: false, error: err.message });
    }
  }
  return state;
}

function get(id) {
  const partner = PARTNERS[id];
  if (!partner) throw new Error(`Unknown partner "${id}". Known: ${Object.keys(PARTNERS).join(', ')}`);
  return partner;
}

module.exports = { PARTNERS, partnerState, get };
