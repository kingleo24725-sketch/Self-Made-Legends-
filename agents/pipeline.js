/**
 * Self-Made Legends — the pipeline
 * Copyright (c) 2026 Self-Made Legends LLC. All Rights Reserved.
 *
 * Two flows:
 *
 *   concept(brief, image?)   reference → design → tech pack → factory
 *   order(order)             a paid order → a route → a partner
 *
 * The orchestration is plain code, not an agent deciding what to do next.
 * The sequence is known, so there is nothing for a model to work out, and a
 * deterministic pipeline is one you can test, replay and reason about when
 * it goes wrong at 2am.
 *
 * Every stage stops on a blocker rather than pressing on. A tech pack built
 * on a design a human would have rejected is worse than no tech pack — it
 * looks finished.
 */

'use strict';

const { runAgent } = require('./runtime/client');
const events = require('./runtime/events');
const { AGENTS } = require('./definitions');
const partners = require('./partners');
const sandbox = require('./partners/sandbox');

function blockers(output) {
  return (output?.flags || []).filter((f) => f.severity === 'blocker');
}

/**
 * Brief in, tech pack out.
 *
 * `stopOnBlocker` defaults true. Turning it off is for exploring, never for
 * anything that will be sent to a factory.
 */
async function concept(brief, { image, stopOnBlocker = true, runId } = {}) {
  const run = runId || events.newId('run');
  const result = { runId: run, stages: {}, cost_usd: 0, halted: null };

  events.emit(events.TYPES.RUN_START, { run_id: run, kind: 'concept', brief });

  const record = (name, output, meta) => {
    result.stages[name] = output;
    result.cost_usd += meta.cost_usd || 0;
  };

  // ── 1. Vision, only if there is something to look at ──────────────────
  let visionOut = null;
  if (image) {
    const { output, meta } = await runAgent(AGENTS.vision, buildImageInput(image, brief), { runId: run });
    visionOut = output;
    record('vision', output, meta);
    if (stopOnBlocker && blockers(output).length) return halt(result, 'vision', blockers(output));
  }

  // ── 2. Design ─────────────────────────────────────────────────────────
  const { output: designOut, meta: designMeta } = await runAgent(
    AGENTS.design,
    { brief, reference: visionOut },
    { runId: run }
  );
  record('design', designOut, designMeta);
  if (stopOnBlocker && blockers(designOut).length) return halt(result, 'design', blockers(designOut));

  // ── 3. Tech pack ──────────────────────────────────────────────────────
  const { output: packOut, meta: packMeta } = await runAgent(
    AGENTS.techpack,
    { design: designOut, reference: visionOut },
    { runId: run }
  );
  record('techpack', packOut, packMeta);

  // Deliberately NOT halted on a blocker. A tech pack whose blocker is "no
  // Pantone standard yet" is correct and useful — the blocker is the work,
  // not a failure. It is the factory's job to hold it, and the sandbox does.
  const factory = await sandbox.submitTechPack(packOut);
  result.stages.factory = factory;
  events.emit(events.TYPES.PARTNER_RESPONSE, { run_id: run, partner: 'sandbox-mfg', response: factory });

  events.emit(events.TYPES.RUN_END, { run_id: run, kind: 'concept', cost_usd: result.cost_usd, halted: null });
  return result;
}

async function order(orderInput, { runId } = {}) {
  const run = runId || events.newId('run');
  events.emit(events.TYPES.ORDER_RECEIVED, { run_id: run, order: orderInput });

  const state = await partners.partnerState();

  const { output, meta } = await runAgent(
    AGENTS.routing,
    { order: orderInput, partners: state },
    { runId: run }
  );

  events.emit(events.TYPES.ORDER_ROUTED, {
    run_id: run,
    order_id: orderInput.id,
    route: output.route,
    routable: output.route !== null,
    flags: output.flags,
  });

  return { runId: run, routing: output, cost_usd: meta.cost_usd, partners: state };
}

function halt(result, stage, found) {
  result.halted = { stage, blockers: found };
  events.emit(events.TYPES.RUN_END, { run_id: result.runId, kind: 'concept', cost_usd: result.cost_usd, halted: stage });
  return result;
}

/** An image plus the brief, as content blocks. */
function buildImageInput(image, brief) {
  const source = image.startsWith('http')
    ? { type: 'url', url: image }
    : { type: 'base64', media_type: guessMedia(image), data: require('fs').readFileSync(image).toString('base64') };

  return [
    { type: 'image', source },
    { type: 'text', text: `Brief for context:\n${typeof brief === 'string' ? brief : JSON.stringify(brief, null, 2)}` },
  ];
}

function guessMedia(file) {
  const ext = file.toLowerCase().split('.').pop();
  return { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif' }[ext] || 'image/png';
}

module.exports = { concept, order };
