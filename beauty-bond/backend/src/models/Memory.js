/**
 * Dad + Daughter Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 * Proprietary and confidential. Unauthorized copying, distribution,
 * or use of this file, via any medium, is strictly prohibited.
 *
 * Memory covers three kinds of keepsake:
 *   1. BONDING MOMENTS  — completed challenges, room recaps, compliment cards
 *   2. SAVED LOOKS      — try-on renders the user chose to keep
 *   3. JOURNAL ENTRIES  — Healing Journal, client-encrypted
 *
 * Journal entries are stored as ciphertext the server cannot read, are never
 * scanned or analyzed, and are NOT guardian-visible for 13+ profiles.
 * docs/architecture.md M08.
 */
const db = require('../config/db');

const KINDS = {
  BONDING_MOMENT: 'bonding_moment',
  SAVED_LOOK: 'saved_look',
  ROOM_RECAP: 'room_recap',
  BEFORE_AFTER: 'before_after',
};

/* ── Bonding moments & saved looks ────────────────────────────────── */

function listFor(profileId, kind) {
  return kind
    ? db.query(
        `SELECT * FROM memories WHERE profile_id = $1 AND kind = $2
          ORDER BY occurred_on DESC NULLS LAST, created_at DESC`, [profileId, kind])
    : db.query(
        `SELECT * FROM memories WHERE profile_id = $1
          ORDER BY occurred_on DESC NULLS LAST, created_at DESC`, [profileId]);
}

/**
 * A shared look enters `pending_consent` — it appears in nobody's gallery
 * until the other party (or their guardian) approves.
 */
function create({ profileId, kind, renderId, caption, occurredOn, sharedWith = [] }) {
  return db.one(
    `INSERT INTO memories (profile_id, kind, render_id, caption, occurred_on,
                           shared_with, consent_status)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [profileId, kind, renderId ?? null, caption ?? null, occurredOn ?? null,
     sharedWith, sharedWith.length > 0 ? 'pending_consent' : 'ok']);
}

function approveShare(memoryId, approverProfileId) {
  return db.one(
    `UPDATE memories SET consent_status = 'ok'
      WHERE id = $1 AND $2 = ANY(shared_with) RETURNING *`,
    [memoryId, approverProfileId]);
}

/** Visible = mine, plus shared-with-me that everyone has consented to. */
function visibleTo(profileId) {
  return db.query(
    `SELECT * FROM memories
      WHERE (profile_id = $1 OR $1 = ANY(shared_with))
        AND consent_status = 'ok'
      ORDER BY occurred_on DESC NULLS LAST, created_at DESC`, [profileId]);
}

/**
 * Real delete. The media-cleanup job purges the source, derived thumbnails,
 * recap frames, and the CDN cache within 24h. docs/wireframes.md W-91.
 */
function remove(id, profileId) {
  return db.query('DELETE FROM memories WHERE id = $1 AND profile_id = $2',
                  [id, profileId]);
}

/* ── Journal entries ──────────────────────────────────────────────── */

/**
 * @param {Buffer} ciphertext encrypted client-side; the server holds no key
 */
function addJournalEntry({ profileId, ciphertext, promptId }) {
  return db.one(
    `INSERT INTO journal_entries (profile_id, ciphertext, prompt_id)
     VALUES ($1,$2,$3) RETURNING id, prompt_id, created_at`,
    [profileId, ciphertext, promptId ?? null]);
}

/**
 * Only ever returns the caller's OWN entries. There is deliberately no
 * "read my child's journal" function — for 13+ that would break the trust the
 * feature depends on, and no product requirement justifies adding one.
 */
function listJournalEntries(profileId) {
  return db.query(
    `SELECT id, ciphertext, prompt_id, created_at FROM journal_entries
      WHERE profile_id = $1 ORDER BY created_at DESC`, [profileId]);
}

/** "Just sit with it" — logs presence without requiring any words. */
function logJournalPresence({ profileId, promptId }) {
  return db.one(
    `INSERT INTO journal_entries (profile_id, ciphertext, prompt_id)
     VALUES ($1, ''::bytea, $2) RETURNING id, created_at`,
    [profileId, promptId ?? null]);
}

function removeJournalEntry(id, profileId) {
  return db.query('DELETE FROM journal_entries WHERE id = $1 AND profile_id = $2',
                  [id, profileId]);
}

module.exports = {
  KINDS,
  listFor, create, approveShare, visibleTo, remove,
  addJournalEntry, listJournalEntries, logJournalPresence, removeJournalEntry,
};
