/**
 * Dad + Daughter Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 * Proprietary and confidential. Unauthorized copying, distribution,
 * or use of this file, via any medium, is strictly prohibited.
 *
 * The Legacy Vault, Letters Forward and the Healing Journal.
 *
 * docs/api-reference.md:595-608 specified six routes here. Four were never
 * built, and the tables behind them had never been written to. This is the
 * emotional core of the product (docs/architecture.md:398) and it was the
 * least finished thing in it.
 *
 * Module rules that are load-bearing, not decoration:
 *   - Delivery of an already-recorded letter is NEVER gated. It is in
 *     ALWAYS_FREE and delivery reads status only, never a subscription.
 *   - A sealed letter yields metadata only. No content before its date.
 *   - Journal entries arrive as ciphertext the server cannot read, are never
 *     scanned, and have no guardian-read path at any age. models/Memory.js:92
 *     documents why, and there is deliberately no route to add one.
 *   - Vault content is never deleted for non-payment; over-limit is read-only
 *     (docs/stripe-flow.md:781).
 */
const express = require('express');
const db = require('../../config/db');
const { requireAuth } = require('../../middleware/auth');
const Memory = require('../../models/Memory');
const legacy = require('../../services/legacyService');
const { capabilitiesFor } = require('../../services/entitlements');

const router = express.Router();

/** The profiles whose legacy content this caller may see: self + guardian + siblings. */
async function familyProfileIds(profile) {
  const rows = await db.query(
    `SELECT id FROM profiles
      WHERE deleted_at IS NULL
        AND (id = $1
             OR id = $2
             OR guardian_id = $1
             OR ($2::uuid IS NOT NULL AND guardian_id = $2))`,
    [profile.id, profile.guardian_id ?? null]);
  return rows.map((r) => r.id);
}

/* ── Legacy people ────────────────────────────────────────────────── */

router.get('/people', requireAuth, async (req, res, next) => {
  try {
    const family = await familyProfileIds(req.profile);
    const people = await db.query(
      `SELECT p.*, (SELECT count(*)::int FROM legacy_items i
                     WHERE i.legacy_person_id = p.id) AS item_count
         FROM legacy_people p
        WHERE p.family_profile_id = ANY($1)
        ORDER BY p.name`, [family]);

    res.json({
      people: people.map((p) => ({
        id: p.id,
        name: p.name,
        bornYear: p.born_year,
        passedYear: p.passed_year,
        quote: p.quote,
        photoUrl: p.photo_url,
        itemCount: p.item_count,
      })),
    });
  } catch (err) { next(err); }
});

router.post('/people', requireAuth, async (req, res, next) => {
  try {
    const { name, bornYear, passedYear, quote, photoUrl } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'name_required' });

    const row = await db.one(
      `INSERT INTO legacy_people
         (family_profile_id, name, born_year, passed_year, quote, photo_url)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [req.profile.id, name.trim(), bornYear ?? null, passedYear ?? null,
       quote ?? null, photoUrl ?? null]);

    res.status(201).json({
      id: row.id, name: row.name, bornYear: row.born_year,
      passedYear: row.passed_year, quote: row.quote, photoUrl: row.photo_url,
      itemCount: 0,
    });
  } catch (err) { next(err); }
});

/* ── The Vault ────────────────────────────────────────────────────── */

const VAULT_KINDS = ['voice', 'photo', 'recipe', 'routine', 'shade'];

router.get('/items', requireAuth, async (req, res, next) => {
  try {
    const family = await familyProfileIds(req.profile);
    const items = await db.query(
      `SELECT i.* FROM legacy_items i
         JOIN legacy_people p ON p.id = i.legacy_person_id
        WHERE p.family_profile_id = ANY($1)
          AND ($2::uuid IS NULL OR i.legacy_person_id = $2)
        ORDER BY i.created_at DESC`,
      [family, req.query.personId ?? null]);

    const caps = await capabilitiesFor(req.profile.id);
    const limit = caps.vaultItems ?? 3;

    res.json({
      items: items.map((i) => ({
        id: i.id,
        legacyPersonId: i.legacy_person_id,
        kind: i.kind,
        caption: i.caption,
        storageKey: i.storage_key,
        contributedBy: i.contributed_by,
        createdAt: i.created_at,
      })),
      limit,
      // Over the limit the vault goes READ-ONLY. Nothing is ever deleted for
      // non-payment — docs/stripe-flow.md:781.
      readOnly: limit !== 'unlimited' && items.length >= limit,
    });
  } catch (err) { next(err); }
});

router.post('/items', requireAuth, async (req, res, next) => {
  try {
    const { legacyPersonId, kind, storageKey, caption } = req.body;
    if (!VAULT_KINDS.includes(kind)) {
      return res.status(400).json({ error: 'unknown_kind', allowed: VAULT_KINDS });
    }
    if (!storageKey) return res.status(400).json({ error: 'storage_key_required' });

    const family = await familyProfileIds(req.profile);
    const person = await db.one(
      'SELECT * FROM legacy_people WHERE id = $1 AND family_profile_id = ANY($2)',
      [legacyPersonId, family]).catch(() => null);
    if (!person) return res.status(404).json({ error: 'legacy_person_not_found' });

    const existing = await db.one(
      `SELECT count(*)::int AS n FROM legacy_items i
         JOIN legacy_people p ON p.id = i.legacy_person_id
        WHERE p.family_profile_id = ANY($1)`, [family]);

    const caps = await capabilitiesFor(req.profile.id);
    const limit = caps.vaultItems ?? 3;
    if (limit !== 'unlimited' && existing.n >= limit) {
      return res.status(402).json({ error: 'vault_full', limit, have: existing.n });
    }

    const row = await db.one(
      `INSERT INTO legacy_items
         (legacy_person_id, kind, storage_key, caption, contributed_by)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [person.id, kind, storageKey, caption ?? null, req.profile.id]);

    res.status(201).json({
      id: row.id, legacyPersonId: row.legacy_person_id, kind: row.kind,
      caption: row.caption, storageKey: row.storage_key,
      contributedBy: row.contributed_by, createdAt: row.created_at,
    });
  } catch (err) { next(err); }
});

router.delete('/items/:id', requireAuth, async (req, res, next) => {
  try {
    // A person may remove what they contributed. Nothing here deletes on
    // anyone else's behalf, and non-payment never reaches this path.
    await db.query(
      'DELETE FROM legacy_items WHERE id = $1 AND contributed_by = $2',
      [req.params.id, req.profile.id]);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

/* ── Letters Forward ──────────────────────────────────────────────── */

/**
 * Sealing a new letter is a paid capability (`legacy.letters`). Reading a
 * delivered one is not, and never will be.
 */
router.post('/letters', requireAuth, async (req, res, next) => {
  try {
    const { toProfileId, occasion, deliverOn, storageKey, legacyPersonId } = req.body;
    if (!occasion?.trim()) return res.status(400).json({ error: 'occasion_required' });
    if (!deliverOn) return res.status(400).json({ error: 'deliver_on_required' });
    if (!storageKey) return res.status(400).json({ error: 'storage_key_required' });

    const caps = await capabilitiesFor(req.profile.id);
    if (!caps.lettersForward) {
      return res.status(402).json({ error: 'upgrade_required', capability: 'legacy.letters' });
    }

    const family = await familyProfileIds(req.profile);
    const recipient = toProfileId ?? family.find((id) => id !== req.profile.id);
    if (!recipient || !family.includes(recipient)) {
      return res.status(400).json({ error: 'recipient_not_in_family' });
    }

    const row = await db.one(
      `INSERT INTO letters_forward
         (legacy_person_id, to_profile_id, occasion, deliver_on, storage_key)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [legacyPersonId ?? null, recipient, occasion.trim(), deliverOn, storageKey]);

    res.status(201).json(legacy.sealedMetadata(row));
  } catch (err) { next(err); }
});

/**
 * Sealed letters return metadata only; delivered ones return the body.
 *
 * The sweep runs on read as well as on a schedule, so a letter that came due
 * overnight opens the moment she looks — she never waits on a cron job for
 * her own birthday.
 */
router.get('/letters', requireAuth, async (req, res, next) => {
  try {
    await legacy.deliverDueLetters({ toProfileId: req.profile.id });

    const rows = await db.query(
      `SELECT * FROM letters_forward
        WHERE to_profile_id = $1
        ORDER BY deliver_on`, [req.profile.id]);

    res.json({
      sealed: rows.filter((r) => r.status === 'sealed').map(legacy.sealedMetadata),
      delivered: rows.filter((r) => r.status === 'delivered').map(legacy.deliveredLetter),
    });
  } catch (err) { next(err); }
});

/** Letters this profile has recorded FOR someone else. Always metadata only. */
router.get('/letters/outbox', requireAuth, async (req, res, next) => {
  try {
    const family = await familyProfileIds(req.profile);
    const rows = await db.query(
      `SELECT * FROM letters_forward
        WHERE to_profile_id = ANY($1) AND to_profile_id <> $2
        ORDER BY deliver_on`, [family, req.profile.id]);
    res.json({ letters: rows.map(legacy.sealedMetadata) });
  } catch (err) { next(err); }
});

/* ── The Healing Journal ──────────────────────────────────────────── */

/**
 * Ciphertext in, ciphertext out. The server holds no key and never will.
 * There is no route here that reads another profile's entries — not for a
 * guardian, not at any age. That absence is the feature.
 */
router.post('/journal', requireAuth, async (req, res, next) => {
  try {
    const { ciphertext, promptId } = req.body;
    if (!ciphertext) return res.status(400).json({ error: 'ciphertext_required' });

    const row = await Memory.addJournalEntry({
      profileId: req.profile.id,
      ciphertext: Buffer.from(ciphertext, 'base64'),
      promptId,
    });
    res.status(201).json(row);
  } catch (err) { next(err); }
});

/**
 * "Just sit with it" — presence without words. Writes an entry with an empty
 * body, so showing up is recorded and nothing is demanded.
 * docs/wireframes.md:919 [R5].
 */
router.post('/journal/presence', requireAuth, async (req, res, next) => {
  try {
    const row = await Memory.logJournalPresence({
      profileId: req.profile.id,
      promptId: req.body.promptId,
    });
    res.status(201).json(row);
  } catch (err) { next(err); }
});

router.get('/journal', requireAuth, async (req, res, next) => {
  try {
    const rows = await Memory.listJournalEntries(req.profile.id);
    res.json({
      entries: rows.map((r) => ({
        id: r.id,
        ciphertext: r.ciphertext ? Buffer.from(r.ciphertext).toString('base64') : '',
        promptId: r.prompt_id,
        createdAt: r.created_at,
        // An empty body is a presence log, not a lost entry.
        presenceOnly: !r.ciphertext || r.ciphertext.length === 0,
      })),
    });
  } catch (err) { next(err); }
});

router.delete('/journal/:id', requireAuth, async (req, res, next) => {
  try {
    await Memory.removeJournalEntry(req.params.id, req.profile.id);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
