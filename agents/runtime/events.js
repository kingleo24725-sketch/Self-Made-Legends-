/**
 * Self-Made Legends — the event log
 * Copyright (c) 2026 Self-Made Legends LLC. All Rights Reserved.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  THIS FILE IS THE WHOLE POINT OF THE SYSTEM.
 *
 *  Agents do not learn from being clever. They learn because every single
 *  thing they did, and every human judgement on it, was written down in a
 *  form you can query later. That is this file.
 *
 *  Write events from day one, even at zero orders. You cannot go back and
 *  collect the history of a month you did not record.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Storage is append-only JSONL, one file per UTC day. That is deliberate:
 * it costs nothing, it survives a crash mid-write (you lose at most the
 * last line), it is readable with a text editor, and every warehouse on
 * earth ingests JSONL. When volume justifies Postgres or S3 + DuckDB, the
 * loader reads these same files — the schema does not change.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const EVENT_DIR = process.env.SML_EVENT_DIR || path.join(__dirname, '..', 'data', 'events');

/**
 * Every event carries these. Anything agent-specific goes in `data`.
 *
 * Adding a field is always safe. Renaming or removing one is not — old
 * files keep the old shape forever, so readers must tolerate both.
 */
const ENVELOPE_VERSION = 1;

const TYPES = {
  // an agent produced something
  AGENT_CALL: 'agent.call',
  AGENT_ERROR: 'agent.error',
  // a person judged it — this is the training signal
  REVIEW_DECISION: 'review.decision',
  // the outside world
  ORDER_RECEIVED: 'order.received',
  ORDER_ROUTED: 'order.routed',
  PARTNER_RESPONSE: 'partner.response',
  // a full pipeline run
  RUN_START: 'run.start',
  RUN_END: 'run.end',
};

function newId(prefix) {
  return prefix + '_' + crypto.randomBytes(9).toString('hex');
}

/** Stable hash of any JSON value — used to tell "same input" from "same-ish input". */
function hash(value) {
  return crypto.createHash('sha256').update(stableStringify(value)).digest('hex').slice(0, 16);
}

/**
 * JSON.stringify with sorted keys.
 *
 * Object key order is insertion order in JS, so two identical inputs built
 * in a different order would otherwise hash differently — which would
 * silently defeat every cache and every duplicate check downstream.
 */
function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(stableStringify).join(',') + ']';
  const keys = Object.keys(value).sort();
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + stableStringify(value[k])).join(',') + '}';
}

function fileForToday() {
  const day = new Date().toISOString().slice(0, 10);
  return path.join(EVENT_DIR, `events-${day}.jsonl`);
}

/**
 * Append one event. Returns the event as written.
 *
 * Never throws. A failure to log must not take down the thing being logged
 * about — but it is reported on stderr rather than swallowed, because a
 * silently empty event log is the one failure that destroys the whole
 * learning loop without anything looking broken.
 */
function emit(type, fields = {}) {
  const event = {
    v: ENVELOPE_VERSION,
    event_id: newId('ev'),
    ts: new Date().toISOString(),
    type,
    ...fields,
  };

  try {
    fs.mkdirSync(EVENT_DIR, { recursive: true });
    fs.appendFileSync(fileForToday(), JSON.stringify(event) + '\n', 'utf8');
  } catch (err) {
    process.stderr.write(`[events] FAILED TO LOG ${type}: ${err.message}\n`);
  }

  return event;
}

/**
 * Read events back.
 *
 * `filter` is applied per event. A malformed line is skipped rather than
 * throwing — a half-written final line from a crash must not make the
 * entire history unreadable.
 */
function read({ since, until, filter } = {}) {
  let files = [];
  try {
    files = fs.readdirSync(EVENT_DIR).filter((f) => f.startsWith('events-') && f.endsWith('.jsonl')).sort();
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }

  const out = [];
  for (const file of files) {
    const day = file.slice(7, 17);
    if (since && day < since.slice(0, 10)) continue;
    if (until && day > until.slice(0, 10)) continue;

    const text = fs.readFileSync(path.join(EVENT_DIR, file), 'utf8');
    for (const line of text.split('\n')) {
      if (!line.trim()) continue;
      let event;
      try {
        event = JSON.parse(line);
      } catch {
        continue; // torn final line from a crash
      }
      if (filter && !filter(event)) continue;
      out.push(event);
    }
  }
  return out;
}

/**
 * The numbers the monitoring dashboard is built from.
 *
 * Computed from the log rather than from counters kept alongside it: a
 * counter can drift away from the events it claims to summarise, a
 * reduction over the events cannot.
 */
function summarise({ since, until } = {}) {
  const events = read({ since, until });

  const agents = {};
  let costTotal = 0;

  for (const e of events) {
    if (e.type === TYPES.AGENT_CALL || e.type === TYPES.AGENT_ERROR) {
      const key = e.agent || 'unknown';
      const a = (agents[key] ||= {
        calls: 0, errors: 0, cost_usd: 0, tokens_in: 0, tokens_out: 0,
        cache_read: 0, latency_ms_total: 0,
        reviewed: 0, approved: 0, edited: 0, rejected: 0,
      });
      a.calls++;
      if (e.type === TYPES.AGENT_ERROR) a.errors++;
      a.cost_usd += e.cost_usd || 0;
      a.tokens_in += e.tokens?.in || 0;
      a.tokens_out += e.tokens?.out || 0;
      a.cache_read += e.tokens?.cache_read || 0;
      a.latency_ms_total += e.latency_ms || 0;
      costTotal += e.cost_usd || 0;
    }

    if (e.type === TYPES.REVIEW_DECISION) {
      const a = (agents[e.agent] ||= {
        calls: 0, errors: 0, cost_usd: 0, tokens_in: 0, tokens_out: 0,
        cache_read: 0, latency_ms_total: 0,
        reviewed: 0, approved: 0, edited: 0, rejected: 0,
      });
      a.reviewed++;
      if (e.verdict === 'approved') a.approved++;
      if (e.verdict === 'edited') a.edited++;
      if (e.verdict === 'rejected') a.rejected++;
    }
  }

  for (const a of Object.values(agents)) {
    a.avg_latency_ms = a.calls ? Math.round(a.latency_ms_total / a.calls) : 0;
    a.error_rate = a.calls ? a.errors / a.calls : 0;
    // The number that matters. "Approved without edits, out of everything a
    // human actually looked at." If this is not climbing week over week,
    // the loop is not learning and something is wrong.
    a.first_pass_rate = a.reviewed ? a.approved / a.reviewed : null;
    a.cache_hit_rate = (a.tokens_in + a.cache_read)
      ? a.cache_read / (a.tokens_in + a.cache_read)
      : 0;
    delete a.latency_ms_total;
  }

  return { events: events.length, cost_usd: Number(costTotal.toFixed(4)), agents };
}

module.exports = { TYPES, emit, read, summarise, hash, stableStringify, newId, EVENT_DIR };
