/**
 * Self-Made Legends — agent runtime
 * Copyright (c) 2026 Self-Made Legends LLC. All Rights Reserved.
 *
 * One function, `runAgent`, that every agent goes through. Centralising it
 * is what makes the rest of the system possible: caching, cost accounting,
 * retries and event logging are written once here rather than four times
 * badly.
 *
 * Runs without an API key in stub mode (SML_AGENTS_STUB=1), which is how
 * the pipeline and the eval harness are tested end to end without spending
 * money or needing credentials.
 */

'use strict';

const events = require('./events');
const registry = require('./registry');

/* ── pricing, USD per million tokens ─────────────────────────────────────
   Verified against the Anthropic pricing page, 27 August 2026. Cache reads
   bill at 0.1x input; cache writes at 1.25x. Batch halves the whole thing.
   Keep this table honest — every cost number in the dashboard comes from
   it, and a stale price here is a budget that quietly lies to you. */
const PRICES = {
  'claude-opus-5':   { in: 5.00, out: 25.00 },
  'claude-sonnet-5': { in: 2.00, out: 10.00 },
  'claude-haiku-4-5': { in: 1.00, out: 5.00 },
};

const CACHE_READ_MULTIPLIER = 0.10;
const CACHE_WRITE_MULTIPLIER = 1.25;

function priceOf(model) {
  const p = PRICES[model];
  if (!p) {
    process.stderr.write(`[runtime] no price for model "${model}" — cost will read 0\n`);
    return { in: 0, out: 0 };
  }
  return p;
}

function costOf(model, usage = {}) {
  const p = priceOf(model);
  const fresh = usage.input_tokens || 0;
  const read = usage.cache_read_input_tokens || 0;
  const write = usage.cache_creation_input_tokens || 0;
  const out = usage.output_tokens || 0;

  return (
    (fresh * p.in) / 1e6 +
    (read * p.in * CACHE_READ_MULTIPLIER) / 1e6 +
    (write * p.in * CACHE_WRITE_MULTIPLIER) / 1e6 +
    (out * p.out) / 1e6
  );
}

let _client = null;
function anthropic() {
  if (_client) return _client;
  let Anthropic;
  try {
    Anthropic = require('@anthropic-ai/sdk');
  } catch {
    throw new Error(
      'The Anthropic SDK is not installed. Run: npm install @anthropic-ai/sdk\n' +
      'Or set SML_AGENTS_STUB=1 to run the pipeline without calling the API.'
    );
  }
  _client = new Anthropic();
  return _client;
}

/**
 * Build the request.
 *
 * Block order is the whole caching strategy and it is not arbitrary:
 * caching is a prefix match, so anything that changes per request must
 * come after everything that does not.
 *
 *   1. brand rules          identical on every call, every agent  ← cached
 *   2. the agent's prompt   changes only when you edit the file   ← cached
 *   3. approved examples    changes only when review adds one     ← cached
 *   4. this request's input changes every single time             ← not cached
 *
 * Put the input above the examples and the cache never hits, the bill is
 * roughly ten times higher, and nothing visibly breaks — which is why the
 * order is spelled out here rather than left to be rediscovered.
 */
function buildRequest({ agent, def, input, promptText, promptVersion, examples }) {
  const brand = registry.loadBrand();

  const system = [
    { type: 'text', text: brand },
    { type: 'text', text: promptText },
  ];

  if (examples.length) {
    const rendered = examples.map((ex, i) =>
      `### Approved example ${i + 1}` +
      (ex.verdict === 'edited' ? ' (a human corrected the agent here — study the correction)' : '') +
      `\nInput:\n${JSON.stringify(ex.input, null, 2)}\n` +
      `Approved output:\n${JSON.stringify(ex.output, null, 2)}` +
      (ex.notes ? `\nWhy:\n${ex.notes}` : '')
    ).join('\n\n');

    system.push({ type: 'text', text: `## Work approved by the house\n\n${rendered}` });
  }

  // The last stable block carries the breakpoint, so everything above it
  // is cached and the per-request input below it is not.
  system[system.length - 1].cache_control = { type: 'ephemeral' };

  const request = {
    model: def.model,
    max_tokens: def.maxTokens || 8000,
    system,
    messages: [{ role: 'user', content: renderInput(input) }],
    output_config: { effort: def.effort || 'high' },
  };

  if (def.schema) {
    request.output_config.format = { type: 'json_schema', schema: def.schema };
  }

  return request;
}

/** Text input passes through; anything else is rendered as JSON. Images pass through as content blocks. */
function renderInput(input) {
  if (typeof input === 'string') return input;
  if (Array.isArray(input)) return input; // caller built content blocks (e.g. an image + text)
  return JSON.stringify(input, null, 2);
}

/**
 * Run one agent.
 *
 * Returns { output, meta }. Throws only on an unrecoverable error, and
 * logs an agent.error event first either way — a failure that leaves no
 * trace is a failure you cannot fix.
 */
async function runAgent(def, input, opts = {}) {
  const agent = def.name;
  const runId = opts.runId || events.newId('run');
  const started = Date.now();

  const prompt = registry.loadPrompt(agent, opts.promptVersion);
  // The input IS the query. Ranking examples against the actual request beats
  // handing over the eight most recent, which teach whatever happened to be
  // approved last week rather than whatever resembles this job.
  const examples = registry.loadExamples(agent, {
    limit: def.exampleLimit ?? 8,
    query: input,
  });
  const version = registry.fingerprint({
    agent,
    promptText: prompt.text,
    promptVersion: prompt.version,
    model: def.model,
    settings: { effort: def.effort, maxTokens: def.maxTokens },
    examples,
  });

  const request = buildRequest({ agent, def, input, promptText: prompt.text, promptVersion: prompt.version, examples });

  let raw, usage, output;
  try {
    if (process.env.SML_AGENTS_STUB === '1') {
      ({ raw, usage } = await stubCall(def, input));
    } else {
      ({ raw, usage } = await liveCall(request));
    }
    output = def.parse ? def.parse(raw) : parseJson(raw, agent);
  } catch (err) {
    events.emit(events.TYPES.AGENT_ERROR, {
      run_id: runId,
      agent,
      version,
      context: opts.context || 'production',
      input_hash: events.hash(input),
      latency_ms: Date.now() - started,
      status: 'error',
      error: err.message,
    });
    throw err;
  }

  const cost = costOf(def.model, usage);

  events.emit(events.TYPES.AGENT_CALL, {
    run_id: runId,
    agent,
    version,
    model: def.model,
    input_hash: events.hash(input),
    input,
    output,
    tokens: {
      in: usage.input_tokens || 0,
      out: usage.output_tokens || 0,
      cache_read: usage.cache_read_input_tokens || 0,
      cache_write: usage.cache_creation_input_tokens || 0,
    },
    cost_usd: Number(cost.toFixed(6)),
    latency_ms: Date.now() - started,
    status: 'ok',
    // Where this call came from. An eval run is a real agent call and is
    // logged like one — but it must never enter the human review queue, or
    // every CI run buries the operator in work nobody asked for.
    context: opts.context || 'production',
    // Everything a human needs to judge this without rerunning it.
    review: { needed: def.reviewRequired !== false && opts.context !== 'eval', verdict: null },
  });

  return { output, meta: { runId, agent, version, model: def.model, cost_usd: cost, usage } };
}

async function liveCall(request) {
  const client = anthropic();
  // Streaming: max_tokens here is large enough that a non-streaming request
  // can hit the SDK's HTTP timeout on a long tech pack.
  const stream = await client.messages.stream(request);
  const message = await stream.finalMessage();

  if (message.stop_reason === 'refusal') {
    throw new Error(`Model declined: ${message.stop_details?.category || 'unknown'}`);
  }

  const text = message.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
  return { raw: text, usage: message.usage || {} };
}

/**
 * Stub mode.
 *
 * Returns the agent's own declared sample output. This is not a toy — it
 * is what lets the pipeline, the partner adapters, the review UI and the
 * eval harness all be exercised end to end in CI with no API key and no
 * spend. Anything that only works against the live API is untested code.
 */
async function stubCall(def, input) {
  const sample = typeof def.stub === 'function' ? def.stub(input) : def.stub;
  if (sample === undefined) {
    throw new Error(`Agent "${def.name}" has no stub output; cannot run in stub mode.`);
  }
  return {
    raw: typeof sample === 'string' ? sample : JSON.stringify(sample),
    usage: { input_tokens: 1200, output_tokens: 800, cache_read_input_tokens: 9000, cache_creation_input_tokens: 0 },
  };
}

function parseJson(raw, agent) {
  try {
    return JSON.parse(raw);
  } catch {
    // Structured outputs make this rare, but a truncated response is the
    // usual cause and the raw text is what you need to diagnose it.
    const err = new Error(`${agent} returned unparseable JSON`);
    err.raw = raw.slice(0, 2000);
    throw err;
  }
}

module.exports = { runAgent, costOf, PRICES, buildRequest };
