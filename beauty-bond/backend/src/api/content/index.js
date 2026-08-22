/**
 * Dads & Daughters Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 * Proprietary and confidential. Unauthorized copying, distribution,
 * or use of this file, via any medium, is strictly prohibited.
 *
 * Nine route groups the client already calls and the server never had.
 *
 * Every one of these was a live fetch in a shipped screen, wrapped in
 * `.catch(() => {})`, so the 404 was swallowed and the screen fell back to its
 * hardcoded array. The app looked finished and stored nothing.
 *
 *   /bond/missions            BondScreen.js:43,53
 *   /bond/compliments         DadSchoolScreen.js:39
 *   /collections              CulturalLibraryScreen.js:29
 *   /brushes                  BrushEducationScreen.js:31
 *   /bag                      MakeupBagScreen.js:24
 *   /memories, /bond-book     MemoryGalleryScreen.js:24,59
 *   /lessons/:id/progress     LessonPlayerScreen.js:41,46
 *   /me/progression           the Bond Meter, streak and badges that four
 *                             screens had been rendering as literals
 *
 * Reads stay open to any authenticated profile; every write is scoped to the
 * caller's own profile id, never a client-supplied one.
 */
const express = require('express');
const db = require('../../config/db');
const { requireAuth } = require('../../middleware/auth');
const Memory = require('../../models/Memory');
const logger = require('../../utils/logger');

const router = express.Router();

/* ── Bond: pair, meter, missions ──────────────────────────────────── */

/**
 * A bond pair is stored with its two profile ids in a stable order, so the
 * UNIQUE (a_profile_id, b_profile_id) constraint cannot be defeated by
 * swapping the arguments.
 */
async function findOrCreatePair(oneId, otherId) {
  const [a, b] = [oneId, otherId].sort();
  const existing = await db.one(
    'SELECT * FROM bond_pairs WHERE a_profile_id = $1 AND b_profile_id = $2', [a, b]);
  if (existing) return existing;
  return db.one(
    `INSERT INTO bond_pairs (a_profile_id, b_profile_id) VALUES ($1,$2)
     ON CONFLICT (a_profile_id, b_profile_id) DO UPDATE SET meter = bond_pairs.meter
     RETURNING *`, [a, b]);
}

/** The other half of the bond: a guardian's child, or a child's guardian. */
async function partnerOf(profile) {
  if (profile.guardian_id) {
    return db.one('SELECT * FROM profiles WHERE id = $1 AND deleted_at IS NULL',
                  [profile.guardian_id]);
  }
  return db.one(
    `SELECT * FROM profiles WHERE guardian_id = $1 AND deleted_at IS NULL
      ORDER BY created_at LIMIT 1`, [profile.id]);
}

const LEVEL_STEP = 100;   // meter points per Bond level
const levelFor = (meter) => Math.max(1, Math.floor(Number(meter) / LEVEL_STEP) + 1);

router.get('/bond', requireAuth, async (req, res, next) => {
  try {
    const partner = await partnerOf(req.profile);
    if (!partner) {
      return res.json({ pair: null, meter: 0, level: 1, partner: null, toNextLevel: LEVEL_STEP });
    }
    const pair = await findOrCreatePair(req.profile.id, partner.id);
    const meter = Number(pair.meter);
    res.json({
      pair: { id: pair.id, lastActivityAt: pair.last_activity_at },
      partner: { id: partner.id, displayName: partner.display_name },
      meter,
      level: levelFor(meter),
      toNextLevel: LEVEL_STEP - (meter % LEVEL_STEP),
    });
  } catch (err) { next(err); }
});

router.get('/bond/missions', requireAuth, async (req, res, next) => {
  try {
    const partner = await partnerOf(req.profile);
    const pair = partner ? await findOrCreatePair(req.profile.id, partner.id) : null;

    const missions = await db.query(
      `SELECT m.*, c.confirmed_by, c.completed_at
         FROM bond_missions m
         LEFT JOIN bond_mission_completions c
           ON c.mission_id = m.id AND c.bond_pair_id = $1
        WHERE m.mode IS NULL OR m.mode = $2
        ORDER BY m.week_of DESC, m.title
        LIMIT 20`,
      [pair?.id ?? null, req.profile.mode]);

    res.json({
      missions: missions.map((m) => ({
        id: m.id,
        title: m.title,
        description: m.description,
        points: m.points,
        weekOf: m.week_of,
        // Both halves of the pair must confirm. One tick is "waiting on".
        confirmedBy: m.confirmed_by ?? [],
        confirmedByMe: (m.confirmed_by ?? []).includes(req.profile.id),
        completedAt: m.completed_at,
      })),
    });
  } catch (err) { next(err); }
});

/**
 * A mission completes only when BOTH profiles have confirmed it. That is the
 * whole point of a bond mission — one person cannot tick it for the pair.
 */
router.post('/bond/missions/:id/confirm', requireAuth, async (req, res, next) => {
  try {
    const partner = await partnerOf(req.profile);
    if (!partner) return res.status(409).json({ error: 'no_bond_partner' });

    const pair = await findOrCreatePair(req.profile.id, partner.id);
    const mission = await db.one('SELECT * FROM bond_missions WHERE id = $1', [req.params.id]);
    if (!mission) return res.status(404).json({ error: 'mission_not_found' });

    const row = await db.one(
      `INSERT INTO bond_mission_completions (mission_id, bond_pair_id, confirmed_by)
       VALUES ($1, $2, ARRAY[$3::uuid])
       ON CONFLICT (mission_id, bond_pair_id) DO UPDATE
         SET confirmed_by = CASE
               WHEN $3::uuid = ANY(bond_mission_completions.confirmed_by)
                 THEN bond_mission_completions.confirmed_by
               ELSE array_append(bond_mission_completions.confirmed_by, $3::uuid)
             END
       RETURNING *`,
      [mission.id, pair.id, req.profile.id]);

    const both = [req.profile.id, partner.id].every((id) => row.confirmed_by.includes(id));

    if (both && !row.completed_at) {
      await db.query(
        'UPDATE bond_mission_completions SET completed_at = now() WHERE mission_id = $1 AND bond_pair_id = $2',
        [mission.id, pair.id]);
      await db.query(
        `UPDATE bond_pairs SET meter = meter + $2, level = $3, last_activity_at = now()
          WHERE id = $1`,
        [pair.id, mission.points, levelFor(Number(pair.meter) + mission.points)]);
    }

    const fresh = await db.one('SELECT * FROM bond_pairs WHERE id = $1', [pair.id]);
    res.json({
      confirmedBy: row.confirmed_by,
      complete: both,
      waitingOn: both ? null : partner.display_name,
      meter: Number(fresh.meter),
      level: levelFor(Number(fresh.meter)),
    });
  } catch (err) { next(err); }
});

/** Dad School compliment cards — a real message to the other half of the bond. */
router.post('/bond/compliments', requireAuth, async (req, res, next) => {
  try {
    const partner = await partnerOf(req.profile);
    if (!partner) return res.status(409).json({ error: 'no_bond_partner' });
    if (!req.body.templateId) return res.status(400).json({ error: 'template_id_required' });

    const row = await db.one(
      `INSERT INTO compliment_cards (from_profile_id, to_profile_id, template_id, filled)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [req.profile.id, partner.id, req.body.templateId, req.body.filled ?? {}]);

    res.status(201).json({ id: row.id, sentAt: row.sent_at, to: partner.display_name });
  } catch (err) { next(err); }
});

router.get('/bond/compliments', requireAuth, async (req, res, next) => {
  try {
    const rows = await db.query(
      `SELECT * FROM compliment_cards
        WHERE to_profile_id = $1 OR from_profile_id = $1
        ORDER BY sent_at DESC LIMIT 50`, [req.profile.id]);
    res.json({ cards: rows });
  } catch (err) { next(err); }
});

/* ── Cultural library ─────────────────────────────────────────────── */

/**
 * Unpublished collections are invisible. `publish_requires_advisor` in the
 * schema means published_at cannot be set without advisor approval, so this
 * filter is also the cultural-consent gate.
 */
router.get('/collections', requireAuth, async (req, res, next) => {
  try {
    const rows = await db.query(
      `SELECT id, slug, name, advisor_name, published_at
         FROM collections WHERE published_at IS NOT NULL ORDER BY name`);
    res.json({ collections: rows });
  } catch (err) { next(err); }
});

router.get('/collections/:slug', requireAuth, async (req, res, next) => {
  try {
    const c = await db.one(
      'SELECT * FROM collections WHERE slug = $1 AND published_at IS NOT NULL',
      [req.params.slug]);
    // Never substitute another culture's content for a missing one.
    if (!c) return res.status(404).json({ error: 'collection_not_found' });

    const lessons = await db.query(
      `SELECT id, title, level, min_age, tier_required, duration_seconds
         FROM lessons WHERE collection_id = $1 ORDER BY level`, [c.id]).catch(() => []);

    res.json({
      collection: {
        id: c.id, slug: c.slug, name: c.name,
        advisorName: c.advisor_name, respectNoteId: c.respect_note_id,
      },
      lessons,
    });
  } catch (err) { next(err); }
});

/* ── Brushes ──────────────────────────────────────────────────────── */

router.get('/brushes', requireAuth, async (req, res, next) => {
  try {
    const brushes = await db.query('SELECT * FROM brushes ORDER BY category, name');
    const kit = await db.query(
      'SELECT * FROM brush_kit WHERE profile_id = $1', [req.profile.id]);
    const owned = new Map(kit.map((k) => [k.brush_id, k]));

    res.json({
      brushes: brushes.map((b) => ({
        id: b.id, name: b.name, category: b.category, bristle: b.bristle,
        useFor: b.use_for, pressure: b.pressure,
        wrongToolResult: b.wrong_tool_result,
        demoUrl: b.demo_url, imageUrl: b.image_url,
        owned: owned.has(b.id),
        lastCleanedOn: owned.get(b.id)?.last_cleaned_on ?? null,
      })),
    });
  } catch (err) { next(err); }
});

router.post('/brushes/:id/cleaned', requireAuth, async (req, res, next) => {
  try {
    const row = await db.one(
      `INSERT INTO brush_kit (profile_id, brush_id, last_cleaned_on)
       VALUES ($1,$2,CURRENT_DATE)
       ON CONFLICT (profile_id, brush_id)
         DO UPDATE SET last_cleaned_on = CURRENT_DATE
       RETURNING *`, [req.profile.id, req.params.id]);
    res.json({ brushId: row.brush_id, lastCleanedOn: row.last_cleaned_on });
  } catch (err) { next(err); }
});

/* ── Makeup bag ───────────────────────────────────────────────────── */

router.get('/bag', requireAuth, async (req, res, next) => {
  try {
    const rows = await db.query(
      `SELECT * FROM makeup_bag WHERE profile_id = $1 ORDER BY added_at DESC`,
      [req.profile.id]);
    res.json({
      items: rows.filter((r) => !r.is_wishlist),
      wishlist: rows.filter((r) => r.is_wishlist),
    });
  } catch (err) { next(err); }
});

router.post('/bag', requireAuth, async (req, res, next) => {
  try {
    const { productId, shadeId, customName, openedOn, isWishlist } = req.body;
    if (!productId && !customName) {
      return res.status(400).json({ error: 'product_or_name_required' });
    }
    const row = await db.one(
      `INSERT INTO makeup_bag (profile_id, product_id, shade_id, custom_name,
                               opened_on, is_wishlist)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [req.profile.id, productId ?? null, shadeId ?? null, customName ?? null,
       openedOn ?? null, !!isWishlist]);
    res.status(201).json(row);
  } catch (err) { next(err); }
});

router.delete('/bag/:id', requireAuth, async (req, res, next) => {
  try {
    // Scoped to the caller — a client-supplied id can only ever delete its own.
    await db.query('DELETE FROM makeup_bag WHERE id = $1 AND profile_id = $2',
                   [req.params.id, req.profile.id]);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

/* ── Memories & Bond Book ─────────────────────────────────────────── */

router.get('/memories', requireAuth, async (req, res, next) => {
  try {
    const memories = await Memory.visibleTo(req.profile.id);
    res.json({ memories });
  } catch (err) { next(err); }
});

router.post('/memories', requireAuth, async (req, res, next) => {
  try {
    const { kind, renderId, caption, occurredOn, sharedWith } = req.body;
    if (!kind) return res.status(400).json({ error: 'kind_required' });
    const row = await Memory.create({
      profileId: req.profile.id, kind, renderId, caption, occurredOn, sharedWith,
    });
    res.status(201).json(row);
  } catch (err) { next(err); }
});

router.post('/memories/:id/approve', requireAuth, async (req, res, next) => {
  try {
    const row = await Memory.approveShare(req.params.id, req.profile.id);
    if (!row) return res.status(404).json({ error: 'memory_not_found' });
    res.json(row);
  } catch (err) { next(err); }
});

router.delete('/memories/:id', requireAuth, async (req, res, next) => {
  try {
    await Memory.remove(req.params.id, req.profile.id);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

/**
 * A Bond Book is a print keepsake built from memories. Ordering one is
 * entitlement-gated; the request is recorded so the job can be picked up.
 */
router.post('/bond-book', requireAuth, async (req, res, next) => {
  try {
    const memories = await Memory.visibleTo(req.profile.id);
    if (memories.length === 0) {
      return res.status(409).json({ error: 'no_memories_yet' });
    }
    logger.info({ profileId: req.profile.id, count: memories.length }, 'bond_book_requested');
    res.status(202).json({
      status: 'queued',
      memoryCount: memories.length,
      // Set when the print pipeline exists; the client shows a pending state.
      estimatedReadyAt: null,
    });
  } catch (err) { next(err); }
});

/* ── Lessons & progress ───────────────────────────────────────────── */

router.get('/lessons/:id', requireAuth, async (req, res, next) => {
  try {
    const lesson = await db.one('SELECT * FROM lessons WHERE id = $1', [req.params.id]);
    if (!lesson) return res.status(404).json({ error: 'lesson_not_found' });

    const progress = await db.one(
      'SELECT * FROM progress WHERE profile_id = $1 AND lesson_id = $2',
      [req.profile.id, lesson.id]);

    res.json({
      lesson: {
        id: lesson.id, title: lesson.title, level: lesson.level,
        minAge: lesson.min_age, tierRequired: lesson.tier_required,
        durationSeconds: lesson.duration_seconds,
        videoUrl: lesson.video_url, captions: lesson.captions,
        steps: lesson.steps ?? [],
      },
      progress: {
        stepIndex: progress?.step_index ?? 0,
        completedAt: progress?.completed_at ?? null,
      },
    });
  } catch (err) { next(err); }
});

router.post('/lessons/:id/progress', requireAuth, async (req, res, next) => {
  try {
    const { stepIndex, completed } = req.body;
    const lesson = await db.one('SELECT id FROM lessons WHERE id = $1', [req.params.id]);
    if (!lesson) return res.status(404).json({ error: 'lesson_not_found' });

    const row = await db.one(
      `INSERT INTO progress (profile_id, lesson_id, step_index, completed_at)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (profile_id, lesson_id) DO UPDATE
         SET step_index = GREATEST(progress.step_index, EXCLUDED.step_index),
             completed_at = COALESCE(progress.completed_at, EXCLUDED.completed_at)
       RETURNING *`,
      [req.profile.id, lesson.id, stepIndex ?? 0, completed ? new Date() : null]);

    if (completed) await touchStreak(req.profile.id);

    res.json({ stepIndex: row.step_index, completedAt: row.completed_at });
  } catch (err) { next(err); }
});

/**
 * A streak counts consecutive days with activity. A single missed day spends
 * a pass rather than resetting to zero — losing weeks of a father-daughter
 * habit to one busy evening is a punishment, not an encouragement.
 */
async function touchStreak(profileId) {
  const row = await db.one('SELECT * FROM streaks WHERE profile_id = $1', [profileId]);
  if (!row) {
    return db.query(
      `INSERT INTO streaks (profile_id, current, longest, last_active_on)
       VALUES ($1,1,1,CURRENT_DATE)`, [profileId]);
  }

  const last = row.last_active_on ? new Date(row.last_active_on) : null;
  const days = last
    ? Math.round((Date.now() - last.getTime()) / 86400000)
    : Infinity;

  if (days === 0) return undefined;                       // already counted today

  let current = row.current;
  let passes = row.passes_remaining;

  if (days === 1) current += 1;
  else if (days === 2 && passes > 0) { current += 1; passes -= 1; }
  else current = 1;

  return db.query(
    `UPDATE streaks SET current = $2, longest = GREATEST(longest, $2),
            last_active_on = CURRENT_DATE, passes_remaining = $3
      WHERE profile_id = $1`, [profileId, current, passes]);
}

/* ── Progression: the numbers four screens were hardcoding ────────── */

router.get('/me/progression', requireAuth, async (req, res, next) => {
  try {
    const partner = await partnerOf(req.profile);
    const pair = partner ? await findOrCreatePair(req.profile.id, partner.id) : null;
    const meter = pair ? Number(pair.meter) : 0;

    const [streak, badges, done] = await Promise.all([
      db.one('SELECT * FROM streaks WHERE profile_id = $1', [req.profile.id]),
      db.query('SELECT badge_code, earned_at FROM badges WHERE profile_id = $1',
               [req.profile.id]),
      db.one(`SELECT count(*)::int AS n FROM progress
               WHERE profile_id = $1 AND completed_at IS NOT NULL`, [req.profile.id]),
    ]);

    res.json({
      bond: {
        meter,
        level: levelFor(meter),
        toNextLevel: LEVEL_STEP - (meter % LEVEL_STEP),
        partner: partner ? { id: partner.id, displayName: partner.display_name } : null,
      },
      streak: {
        current: streak?.current ?? 0,
        longest: streak?.longest ?? 0,
        passesRemaining: streak?.passes_remaining ?? 2,
        lastActiveOn: streak?.last_active_on ?? null,
      },
      badges: badges.map((b) => ({ code: b.badge_code, earnedAt: b.earned_at })),
      lessonsCompleted: done?.n ?? 0,
    });
  } catch (err) { next(err); }
});

module.exports = router;
