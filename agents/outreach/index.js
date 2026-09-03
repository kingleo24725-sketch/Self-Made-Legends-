/**
 * Self-Made Legends — supplier outreach tracker
 * Copyright (c) 2026 Self-Made Legends LLC. All Rights Reserved.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  WHY THIS IS NOT A BOT THAT SENDS EMAILS
 *
 *  The obvious version of this file blasts a cold template at fifty
 *  factories. It would be easy to write and it would cost the house the one
 *  thing it cannot buy back: there is no second first impression with a
 *  supplier.
 *
 *  There are three factories to contact, not five hundred. Automation
 *  answers a volume problem, and volume is not the problem here. Bulk mail
 *  from selfmadelegendsz.com would also put the domain in spam filters,
 *  which breaks the customer mail that the shop depends on.
 *
 *  What actually kills a supplier deal is silence. An enquiry sent, a reply
 *  that asks one question, and nobody follows up for three weeks. So this
 *  tracks who owes whom an answer and what is still unknown, and it never
 *  sends anything. The founder writes the emails. This makes sure they get
 *  written.
 * ─────────────────────────────────────────────────────────────────────────
 */

'use strict';

const fs = require('fs');
const path = require('path');

const STORE = path.join(__dirname, '..', 'data', 'outreach.json');

/**
 * The five answers from the RFQ. A supplier is not comparable until all
 * five are known, and the whole point of tracking is to see the gaps.
 *
 * `terms` sits fourth in the document and matters first here. A small
 * company placing a first order loses more to a bad deposit than to a bad
 * price, so an unanswered `terms` is treated as a blocker rather than a
 * detail.
 */
const ANSWERS = {
  moq: 'MOQ on tooling they already own',
  sample: 'Sample cost, lead time, credited or not',
  tooling: 'What is moulded vs upper-only on our designs',
  terms: 'Payment terms and what is inspected before the balance',
  lead: 'Lead time from approved sample to Missouri',
};

const STAGES = ['found', 'contacted', 'replied', 'quoted', 'sampling', 'ordered', 'passed'];

function load() {
  if (!fs.existsSync(STORE)) return { suppliers: [] };
  try {
    return JSON.parse(fs.readFileSync(STORE, 'utf8'));
  } catch (e) {
    throw new Error(`outreach.json is not readable JSON (${e.message}). Fix or delete it; nothing else writes this file.`);
  }
}

function save(db) {
  fs.mkdirSync(path.dirname(STORE), { recursive: true });
  fs.writeFileSync(STORE, JSON.stringify(db, null, 2) + '\n');
}

const today = () => new Date().toISOString().slice(0, 10);
const daysSince = (iso) => (iso ? Math.floor((Date.now() - Date.parse(iso)) / 86400000) : null);

function add(name, opts = {}) {
  const db = load();
  const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  if (db.suppliers.some((s) => s.id === id)) throw new Error(`"${id}" is already tracked.`);
  db.suppliers.push({
    id,
    name,
    contact: opts.contact || '',
    country: opts.country || '',
    stage: 'found',
    added: today(),
    last_touch: null,
    waiting_on: null,        // 'them' or 'us' — the only field that decides what to do next
    answers: {},
    notes: [],
  });
  save(db);
  return id;
}

function get(db, id) {
  const s = db.suppliers.find((x) => x.id === id || x.name.toLowerCase() === String(id).toLowerCase());
  if (!s) throw new Error(`No supplier "${id}". Known: ${db.suppliers.map((x) => x.id).join(', ') || '(none yet)'}`);
  return s;
}

/** Record something that happened. This is the only way a date moves. */
function note(id, text, opts = {}) {
  const db = load();
  const s = get(db, id);
  s.notes.push({ at: today(), text });
  s.last_touch = today();
  if (opts.stage) {
    if (!STAGES.includes(opts.stage)) throw new Error(`Unknown stage "${opts.stage}". One of: ${STAGES.join(', ')}`);
    s.stage = opts.stage;
  }
  if (opts.waiting) {
    if (!['them', 'us'].includes(opts.waiting)) throw new Error("waiting must be 'them' or 'us'");
    s.waiting_on = opts.waiting;
  }
  save(db);
  return s;
}

/** Record one of the five answers. */
function answer(id, key, value) {
  if (!ANSWERS[key]) throw new Error(`Unknown answer "${key}". One of: ${Object.keys(ANSWERS).join(', ')}`);
  const db = load();
  const s = get(db, id);
  s.answers[key] = { value, at: today() };
  s.last_touch = today();
  save(db);
  return s;
}

/**
 * What to do today, and nothing else.
 *
 * A supplier appears here for exactly one of three reasons, in this order:
 * the ball is in your court, they have gone quiet past the chase window, or
 * they have answered enough to be worth a decision. Anything else is noise
 * and is deliberately not listed.
 */
function due(chaseAfterDays = 7) {
  const db = load();
  const out = [];
  for (const s of db.suppliers) {
    if (s.stage === 'passed' || s.stage === 'ordered') continue;
    const idle = daysSince(s.last_touch);

    if (s.waiting_on === 'us') {
      out.push({ s, why: 'They are waiting on YOU', urgency: 0 });
    } else if (s.stage === 'found') {
      out.push({ s, why: 'Never contacted', urgency: 1 });
    } else if (s.waiting_on === 'them' && idle !== null && idle >= chaseAfterDays) {
      out.push({ s, why: `Quiet ${idle} days — chase once, politely`, urgency: 2 });
    }

    const missing = Object.keys(ANSWERS).filter((k) => !s.answers[k]);
    if (s.stage !== 'found' && missing.length === 0) {
      out.push({ s, why: 'All five answered — comparable, make a call', urgency: 3 });
    }
  }
  return out.sort((a, b) => a.urgency - b.urgency);
}

function gaps(s) {
  return Object.keys(ANSWERS).filter((k) => !s.answers[k]);
}

module.exports = { ANSWERS, STAGES, load, save, add, note, answer, due, get, gaps, daysSince, STORE };
