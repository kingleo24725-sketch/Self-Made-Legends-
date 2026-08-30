/**
 * Self-Made Legends — prompt and example registry
 * Copyright (c) 2026 Self-Made Legends LLC. All Rights Reserved.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  THIS IS THE "MODEL REGISTRY", AND IT DELIBERATELY HOLDS NO MODELS.
 *
 *  You cannot fine-tune Claude. There are no weights to version. What an
 *  agent actually is, here, is three things:
 *
 *      1. a versioned prompt          prompts/<agent>.v<N>.md
 *      2. a set of approved examples  data/examples/<agent>/*.json
 *      3. a model id and settings     definitions/<agent>.js
 *
 *  Change any of those and you have changed the agent, so all three are
 *  content-hashed together into a single version fingerprint that gets
 *  stamped on every event. That fingerprint is what lets you say "quality
 *  dropped on Tuesday" and know exactly what changed on Tuesday.
 * ─────────────────────────────────────────────────────────────────────────
 */

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const retrieval = require('./retrieval');

const ROOT = path.join(__dirname, '..');
const PROMPT_DIR = path.join(ROOT, 'prompts');
const EXAMPLE_DIR = process.env.SML_EXAMPLE_DIR || path.join(ROOT, 'data', 'examples');

/**
 * Load the highest-numbered version of a prompt, or a specific one.
 *
 * Prompts are files, not database rows, so they diff in git, review in a
 * pull request, and roll back with git revert. A prompt change is a code
 * change — it should go through the same gate.
 */
function loadPrompt(agent, version) {
  const files = fs.readdirSync(PROMPT_DIR)
    .filter((f) => f.startsWith(agent + '.v') && f.endsWith('.md'));

  if (files.length === 0) {
    throw new Error(`No prompt found for agent "${agent}" in ${PROMPT_DIR}`);
  }

  const byVersion = files
    .map((f) => ({ file: f, n: parseInt(f.slice(agent.length + 2), 10) }))
    .filter((x) => Number.isFinite(x.n))
    .sort((a, b) => b.n - a.n);

  const chosen = version
    ? byVersion.find((x) => x.n === version)
    : byVersion[0];

  if (!chosen) throw new Error(`Prompt ${agent}.v${version}.md not found`);

  return {
    version: chosen.n,
    file: chosen.file,
    text: fs.readFileSync(path.join(PROMPT_DIR, chosen.file), 'utf8'),
  };
}

/** The brand rules every agent shares. Big, stable, and therefore cached. */
function loadBrand() {
  return fs.readFileSync(path.join(PROMPT_DIR, 'brand.md'), 'utf8');
}

/**
 * Approved examples for an agent, newest first.
 *
 * These are written by the review UI when a human approves or edits an
 * output. They are the entire learning mechanism: an edited output is
 * worth more than an approved one, because the edit encodes exactly what
 * the agent got wrong.
 *
 * `limit` matters. Every example is tokens on every call, and past roughly
 * a dozen the marginal one stops teaching and starts costing. Prefer
 * replacing a weak example over appending a new one.
 */
function loadExamples(agent, { limit = 8, query = null } = {}) {
  const dir = path.join(EXAMPLE_DIR, agent);
  let files;
  try {
    files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }

  const examples = [];
  for (const f of files) {
    try {
      const ex = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
      if (ex && ex.input && ex.output) examples.push(ex);
    } catch {
      process.stderr.write(`[registry] skipping unreadable example ${agent}/${f}\n`);
    }
  }

  // With a query, rank by relevance to THIS request — an example of a hoodie
  // teaches nothing about a heel. Without one, fall back to the old
  // behaviour: edited first, then most recent.
  if (query) return retrieval.search(examples, query, { limit });

  examples.sort((a, b) => {
    const w = (e) => (e.verdict === 'edited' ? 1 : 0);
    if (w(b) !== w(a)) return w(b) - w(a);
    return String(b.approved_at || '').localeCompare(String(a.approved_at || ''));
  });

  return examples.slice(0, limit);
}

/** Write an approved output into the example store. Called by the review UI. */
function saveExample(agent, example) {
  const dir = path.join(EXAMPLE_DIR, agent);
  fs.mkdirSync(dir, { recursive: true });
  const id = example.id || crypto.randomBytes(8).toString('hex');
  const file = path.join(dir, `${id}.json`);
  fs.writeFileSync(file, JSON.stringify({ ...example, id }, null, 2), 'utf8');
  return file;
}

/**
 * The fingerprint stamped on every event.
 *
 * Covers the prompt text, the model settings, and the exact set of
 * examples in play — because a new example changes behaviour just as
 * surely as a new prompt does, and a version that ignored them would lie
 * to you about why quality moved.
 */
function fingerprint({ agent, promptText, promptVersion, model, settings, examples }) {
  const material = JSON.stringify({
    agent,
    promptVersion,
    prompt: crypto.createHash('sha256').update(promptText).digest('hex'),
    model,
    settings,
    examples: (examples || []).map((e) => e.id).sort(),
  });
  const digest = crypto.createHash('sha256').update(material).digest('hex').slice(0, 12);
  return `${agent}.v${promptVersion}+${digest}`;
}

module.exports = { loadPrompt, loadBrand, loadExamples, saveExample, fingerprint, retrieval, PROMPT_DIR, EXAMPLE_DIR };
