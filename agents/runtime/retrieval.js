/**
 * Self-Made Legends — example retrieval
 * Copyright (c) 2026 Self-Made Legends LLC. All Rights Reserved.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  THIS IS THE "VECTOR DATABASE", AND IT IS NOT ONE.
 *
 *  The plan asks for a vector DB. At this volume that would be the wrong
 *  tool, and saying so is more useful than installing one:
 *
 *    - The corpus is approved examples. There are tens of them, and there
 *      will be hundreds, not millions. BM25 beats embeddings on small,
 *      jargon-heavy corpora — "2x1 rib" and "cut-away backing" are exact
 *      terms, and exact-term matching is what BM25 is for.
 *    - An embedding index needs a model call per document per re-index, a
 *      service to host, and a second thing that can be stale or down. For
 *      a few hundred JSON files that is cost and failure surface with no
 *      recall to show for it.
 *    - It runs in-process with no dependency, so it cannot be the reason a
 *      tech pack failed to generate at 2am.
 *
 *  THE POINT IS THE INTERFACE, NOT THE SCORER. `search()` takes a query and
 *  returns ranked examples. When the corpus is large enough that term
 *  overlap genuinely stops working — realistically past a few thousand
 *  documents, or when queries and examples stop sharing vocabulary — swap
 *  the body of `score()` for an embedding lookup. Every caller is unchanged.
 *
 *  Do not swap it before then. "We have a vector database" is not a
 *  capability; retrieving the right example is, and this does that today.
 * ─────────────────────────────────────────────────────────────────────────
 */

'use strict';

/* BM25 constants. k1 controls how fast term frequency saturates, b how much
   document length is penalised. These are the standard defaults and there is
   no reason to tune them until there is a measurement saying to. */
const K1 = 1.5;
const B = 0.75;

/** Terms that appear in every garment document and therefore separate nothing. */
const STOP = new Set([
  'the', 'a', 'an', 'and', 'or', 'of', 'to', 'in', 'on', 'at', 'for', 'with',
  'is', 'are', 'be', 'as', 'by', 'from', 'that', 'this', 'it', 'its',
  // house words — on every single document, so they carry no signal here
  'sml', 'self', 'made', 'legends', 'gold', 'black',
]);

function tokenise(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter((t) => t.length > 1 && t.length < 40 && !STOP.has(t));
}

/**
 * Flatten an example into the text it should be matched on.
 *
 * Deliberately weights the INPUT over the output. You are looking for an
 * example whose brief resembles this brief — an output that happens to share
 * vocabulary with the new request is a coincidence, not a precedent.
 */
function documentText(example) {
  const input = JSON.stringify(example.input || {});
  const output = JSON.stringify(example.output || {});
  return `${input} ${input} ${output}`;   // input counted twice
}

/**
 * Build an index over a set of examples.
 *
 * Cheap enough to rebuild per call at this size; kept as an explicit step so
 * that when it stops being cheap, there is one obvious place to cache it.
 */
function index(examples) {
  const docs = examples.map((ex) => {
    const terms = tokenise(documentText(ex));
    const tf = new Map();
    for (const t of terms) tf.set(t, (tf.get(t) || 0) + 1);
    return { ex, tf, length: terms.length };
  });

  const df = new Map();
  for (const d of docs) {
    for (const t of d.tf.keys()) df.set(t, (df.get(t) || 0) + 1);
  }

  const avgLength = docs.length
    ? docs.reduce((sum, d) => sum + d.length, 0) / docs.length
    : 0;

  return { docs, df, avgLength, size: docs.length };
}

/**
 * BM25 relevance of one document to one query.
 *
 * Swap this body for a cosine distance over embeddings when the corpus
 * outgrows term matching. Nothing outside this function needs to know.
 */
function score(doc, queryTerms, idx) {
  const N = idx.size;
  let total = 0;

  for (const term of queryTerms) {
    const f = doc.tf.get(term);
    if (!f) continue;

    const n = idx.df.get(term) || 0;
    // Robertson/Sparck-Jones IDF, floored at zero so a term present in every
    // document cannot push a score negative.
    const idf = Math.max(0, Math.log(1 + (N - n + 0.5) / (n + 0.5)));

    const norm = idx.avgLength > 0 ? doc.length / idx.avgLength : 1;
    total += idf * ((f * (K1 + 1)) / (f + K1 * (1 - B + B * norm)));
  }

  return total;
}

/**
 * Rank examples against a query.
 *
 * `editedBoost` exists because a human-edited example teaches more than a
 * rubber-stamped one — the edit is the correction, and the correction is the
 * signal. It is a multiplier rather than a sort key so a highly relevant
 * approved example can still beat a barely relevant edited one.
 */
function search(examples, query, { limit = 8, editedBoost = 1.35 } = {}) {
  if (!Array.isArray(examples) || examples.length === 0) return [];

  const queryTerms = tokenise(typeof query === 'string' ? query : JSON.stringify(query || {}));
  if (queryTerms.length === 0) return examples.slice(0, limit);

  const idx = index(examples);

  const ranked = idx.docs.map((d) => {
    const base = score(d, queryTerms, idx);
    const boosted = d.ex.verdict === 'edited' ? base * editedBoost : base;
    return { example: d.ex, score: boosted };
  });

  ranked.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    // Nothing matched, or a genuine tie: fall back to the old behaviour so
    // the caller still gets the most recent useful examples rather than none.
    return String(b.example.approved_at || '').localeCompare(String(a.example.approved_at || ''));
  });

  return ranked.slice(0, limit).map((r) => r.example);
}

/** Exposed for the dashboard, so a human can see why an example was chosen. */
function explain(examples, query, { limit = 8 } = {}) {
  const queryTerms = tokenise(typeof query === 'string' ? query : JSON.stringify(query || {}));
  const idx = index(examples);
  return idx.docs
    .map((d) => ({
      id: d.ex.id,
      verdict: d.ex.verdict,
      score: Number(score(d, queryTerms, idx).toFixed(3)),
      matched: queryTerms.filter((t) => d.tf.has(t)).slice(0, 12),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

module.exports = { search, explain, index, tokenise };
