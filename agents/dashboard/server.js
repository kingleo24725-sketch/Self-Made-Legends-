/**
 * Self-Made Legends — monitoring dashboard
 * Copyright (c) 2026 Self-Made Legends LLC. All Rights Reserved.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  FOUR NUMBERS, AND ONLY ONE OF THEM MATTERS.
 *
 *    Review backlog     how many outputs are waiting on a person
 *    First-pass rate    approved without edits, of everything reviewed
 *    Cost per accepted  what it costs to get one output a human keeps
 *    Error rate         calls that failed outright
 *
 *  FIRST-PASS RATE IS THE ONE. It is the only number that says whether the
 *  loop is learning. Cost falls on its own as caching warms; latency is
 *  irrelevant at this volume; error rate should be flat at zero. If
 *  first-pass rate is not climbing week over week, the examples are not
 *  teaching and something needs changing.
 *
 *  Deliberately NOT here: a wall of sparklines nobody reads. Every chart on
 *  a dashboard is a claim that someone will act on it, and a dashboard of
 *  charts nobody acts on trains people to ignore the one that matters.
 * ─────────────────────────────────────────────────────────────────────────
 *
 *  Run:  node agents/dashboard/server.js   → http://localhost:4200
 *
 *  Localhost only, no auth — same rule as the review UI. It is read-only,
 *  but it displays customer messages and order data, so it is not for the
 *  open internet.
 */

'use strict';

const express = require('express');
const path = require('path');
const events = require('../runtime/events');
const { AGENTS, SPRINT_ONE, SPRINT_TWO } = require('../definitions');

const PORT = process.env.SML_DASHBOARD_PORT || 4200;
const HOST = '127.0.0.1';

const app = express();
app.use(express.static(path.join(__dirname, 'public')));

/**
 * Everything the page needs, in one call.
 *
 * One request rather than five: the page is a snapshot of a moment, and
 * five calls give you five slightly different moments stitched together.
 */
app.get('/api/overview', (req, res) => {
  const since = typeof req.query.since === 'string' ? req.query.since : undefined;

  const summary = events.summarise({ since });
  const weekly = events.trend({ since, weeks: 12 });
  const queue = events.pending({ since });

  // Cost per ACCEPTED output, not per call. Cost per call flatters a system
  // that produces cheap rubbish; this one only counts work a human kept.
  const perAgent = Object.entries(summary.agents).map(([name, a]) => {
    const def = AGENTS[name];
    const kept = a.approved + a.edited;
    return {
      name,
      title: def?.title || name,
      model: def?.model || 'unknown',
      sprint: SPRINT_ONE.includes(name) ? 1 : SPRINT_TWO.includes(name) ? 2 : null,
      review_required: def ? def.reviewRequired !== false : null,
      calls: a.calls,
      errors: a.errors,
      error_rate: a.error_rate,
      cost_usd: Number(a.cost_usd.toFixed(4)),
      cache_hit_rate: a.cache_hit_rate,
      avg_latency_ms: a.avg_latency_ms,
      reviewed: a.reviewed,
      approved: a.approved,
      edited: a.edited,
      rejected: a.rejected,
      first_pass_rate: a.first_pass_rate,
      cost_per_accepted: kept ? Number((a.cost_usd / kept).toFixed(4)) : null,
    };
  }).sort((x, y) => y.calls - x.calls);

  // Agents that exist but have never run. Absent from the event log is not
  // the same as healthy, and a dashboard that only shows what ran hides the
  // six agents nobody has tried.
  const never = Object.keys(AGENTS).filter((n) => !summary.agents[n]);

  res.json({
    generated_at: new Date().toISOString(),
    totals: {
      events: summary.events,
      cost_usd: summary.cost_usd,
      backlog: queue.length,
      agents_defined: Object.keys(AGENTS).length,
      agents_never_run: never,
    },
    agents: perAgent,
    weekly,
    backlog: queue.slice(0, 20).map((e) => ({
      event_id: e.event_id,
      ts: e.ts,
      agent: e.agent,
      version: e.version,
      run_id: e.run_id,
      // Enough to triage, not the whole payload — the review UI shows that.
      confidence: e.output?.confidence ?? null,
      blockers: (e.output?.flags || []).filter((f) => f.severity === 'blocker').length,
    })),
  });
});

/** Liveness, for whatever ends up watching this. */
app.get('/api/health', (_req, res) => res.json({ ok: true }));

if (require.main === module) {
  app.listen(PORT, HOST, () => {
    process.stdout.write(
      `\n  Self-Made Legends — dashboard\n` +
      `  http://${HOST}:${PORT}\n\n` +
      `  Localhost only. Do not expose it.\n\n`
    );
  });
}

module.exports = app;
