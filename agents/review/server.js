/**
 * Self-Made Legends — human review
 * Copyright (c) 2026 Self-Made Legends LLC. All Rights Reserved.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  THIS IS WHERE THE LEARNING ACTUALLY HAPPENS.
 *
 *  Every other part of this system moves data around. This is the only part
 *  that adds information the model did not already have: a person looking
 *  at an output and saying "yes", "no", or "nearly — here is the fix".
 *
 *  An APPROVED output becomes an example. An EDITED output becomes a much
 *  better example, because the edit encodes exactly what was wrong. A
 *  REJECTED output is recorded but never used as an example — you do not
 *  teach by showing bad work.
 *
 *  If nobody reviews, nothing improves. The dashboard's review backlog is
 *  therefore the single most important number on it.
 * ─────────────────────────────────────────────────────────────────────────
 *
 *  Run:  node agents/review/server.js      → http://localhost:4100
 *
 *  Binds to localhost only and has no authentication, because it is a local
 *  tool. Do not expose it. If it ever needs to be reachable from outside,
 *  it needs auth first — it can write to the example store, which steers
 *  every future output.
 */

'use strict';

const express = require('express');
const path = require('path');
const events = require('../runtime/events');
const registry = require('../runtime/registry');

const PORT = process.env.SML_REVIEW_PORT || 4100;
const HOST = '127.0.0.1';

const app = express();
app.use(express.json({ limit: '4mb' }));
app.use(express.static(path.join(__dirname, 'public')));

/** Outputs waiting on a human, oldest first — a queue, not a feed. */
app.get('/api/queue', (req, res) => {
  const decided = new Set(
    events.read({ filter: (e) => e.type === events.TYPES.REVIEW_DECISION })
      .map((e) => e.reviewed_event_id)
  );

  const queue = events
    .read({ filter: (e) => e.type === events.TYPES.AGENT_CALL && e.review?.needed && e.context !== 'eval' })
    .filter((e) => !decided.has(e.event_id))
    .map((e) => ({
      event_id: e.event_id,
      run_id: e.run_id,
      ts: e.ts,
      agent: e.agent,
      version: e.version,
      input: e.input,
      output: e.output,
      cost_usd: e.cost_usd,
      flags: e.output?.flags || [],
    }));

  // Blockers first — those are the ones that stop a run. Then oldest.
  queue.sort((a, b) => {
    const sev = (x) => (x.flags.some((f) => f.severity === 'blocker') ? 0 : 1);
    if (sev(a) !== sev(b)) return sev(a) - sev(b);
    return a.ts.localeCompare(b.ts);
  });

  res.json({ count: queue.length, queue });
});

/**
 * Record a decision.
 *
 * The order matters: the event is logged first, then the example is saved.
 * If the example write fails you still have the decision on record and can
 * replay it. The reverse would give you a training example nobody decided.
 */
app.post('/api/decide', (req, res) => {
  const { event_id, verdict, edited_output, notes, reviewer } = req.body || {};

  if (!['approved', 'edited', 'rejected'].includes(verdict)) {
    return res.status(400).json({ ok: false, error: 'verdict must be approved, edited, or rejected' });
  }

  const original = events.read({ filter: (e) => e.event_id === event_id })[0];
  if (!original) return res.status(404).json({ ok: false, error: 'No such event' });

  if (verdict === 'edited' && !edited_output) {
    return res.status(400).json({ ok: false, error: 'An edited verdict needs the corrected output — the correction is the whole value' });
  }

  events.emit(events.TYPES.REVIEW_DECISION, {
    reviewed_event_id: event_id,
    run_id: original.run_id,
    agent: original.agent,
    version: original.version,
    verdict,
    notes: notes || '',
    reviewer: reviewer || 'house',
    had_edits: verdict === 'edited',
  });

  let exampleFile = null;
  if (verdict !== 'rejected') {
    exampleFile = registry.saveExample(original.agent, {
      id: event_id,
      input: original.input,
      output: verdict === 'edited' ? edited_output : original.output,
      verdict,
      notes: notes || '',
      approved_at: new Date().toISOString(),
      source_version: original.version,
    });
  }

  res.json({
    ok: true,
    verdict,
    example_written: Boolean(exampleFile),
    note: verdict === 'rejected'
      ? 'Recorded. Rejected work is never used as an example.'
      : 'Recorded and added to the example store. It will steer the next run.',
  });
});

/** The monitoring numbers. */
app.get('/api/stats', (req, res) => {
  const summary = events.summarise({ since: req.query.since });
  const decided = new Set(
    events.read({ filter: (e) => e.type === events.TYPES.REVIEW_DECISION }).map((e) => e.reviewed_event_id)
  );
  const pending = events
    .read({ filter: (e) => e.type === events.TYPES.AGENT_CALL && e.review?.needed && e.context !== 'eval' })
    .filter((e) => !decided.has(e.event_id)).length;

  res.json({ ...summary, review_backlog: pending });
});

if (require.main === module) {
  app.listen(PORT, HOST, () => {
    console.log(`\n  Self-Made Legends — review  →  http://${HOST}:${PORT}`);
    console.log('  Local only, no auth. Do not expose this.\n');
  });
}

module.exports = app;
