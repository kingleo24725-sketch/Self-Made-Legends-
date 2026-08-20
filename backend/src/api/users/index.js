/**
 * Dad + Daughter Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 */
const express = require('express');
const db = require('../../config/db');
const { requireAuth, requireAdult, requireGuardianOf } = require('../../middleware/auth');
const {
  effectiveTierFor, ENTITLEMENTS, quotaUsed,
} = require('../../services/entitlements');
const userService = require('../../services/userService');

const router = express.Router();

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const profiles = await db.query(
      `SELECT * FROM profiles
        WHERE (user_id = $1 OR guardian_id = $2) AND deleted_at IS NULL`,
      [req.user?.id ?? null, req.profile.id]);
    res.json({ user: req.user, profiles });
  } catch (err) { next(err); }
});

router.get('/me/entitlements', requireAuth, async (req, res, next) => {
  try {
    const tier = await effectiveTierFor(req.profile.id);
    res.json({
      entitlements: { tier, ...ENTITLEMENTS[tier] },
      usage: {
        tryon: await quotaUsed(req.profile.id, 'tryon'),
        room_minutes: await quotaUsed(req.profile.id, 'room_minutes'),
      },
    });
  } catch (err) { next(err); }
});

router.patch('/profiles/:id', requireAuth, async (req, res, next) => {
  try {
    const { mode, remembranceMode, culturalModes, displayName } = req.body;
    const row = await db.one(
      `UPDATE profiles SET
         mode = COALESCE($2, mode),
         remembrance_mode = COALESCE($3, remembrance_mode),
         cultural_modes = COALESCE($4, cultural_modes),
         display_name = COALESCE($5, display_name)
       WHERE id = $1 RETURNING *`,
      [req.params.id, mode ?? null, remembranceMode ?? null,
       culturalModes ?? null, displayName ?? null]);
    res.json(row);
  } catch (err) { next(err); }
});

/* ── Guardian console ────────────────────────────────────────────── */

router.post('/guardian/consent/start', async (req, res, next) => {
  try {
    // No child data is stored yet — only the pending consent request.
    const row = await db.one(
      `INSERT INTO guardian_consents (child_profile_id, guardian_user_id, method, evidence_ref)
       VALUES (NULL, NULL, 'email_pending', $1) RETURNING id`,
      [req.body.guardianEmail]);
    res.status(202).json({ consentId: row.id, status: 'pending' });
  } catch (err) { next(err); }
});

router.post('/guardian/children', requireAuth, requireAdult, async (req, res, next) => {
  try {
    const profile = await userService.createChildProfile({
      guardianProfileId: req.profile.id,
      displayName: req.body.displayName,
      birthDate: req.body.birthDate,
      consentId: req.body.consentId,
    });
    res.status(201).json(profile);
  } catch (err) { next(err); }
});

router.patch('/guardian/permissions/:childId', requireAuth, requireAdult,
  requireGuardianOf('childId'), async (req, res, next) => {
    try {
      const allowed = ['camera_tryon', 'video_rooms', 'live_lessons', 'bff_rooms',
                       'notifications', 'daily_limit_min'];
      const updates = Object.entries(req.body).filter(([k]) => allowed.includes(k));
      if (updates.length === 0) return res.status(400).json({ error: 'no_valid_fields' });

      const sets = updates.map(([k], i) => `${k} = $${i + 2}`).join(', ');
      const row = await db.one(
        `UPDATE guardian_permissions SET ${sets}, updated_at = now()
          WHERE child_profile_id = $1 RETURNING *`,
        [req.params.childId, ...updates.map(([, v]) => v)]);
      res.json(row);
    } catch (err) { next(err); }
  });

/* ── Privacy: always free, every tier, every region ──────────────── */

router.get('/privacy/export', requireAuth, async (req, res, next) => {
  try {
    res.json({ status: 'queued', message: "We'll email you a link shortly." });
  } catch (err) { next(err); }
});

router.delete('/privacy/account', requireAuth, async (req, res, next) => {
  try {
    await db.query('UPDATE profiles SET deleted_at = now() WHERE id = $1', [req.profile.id]);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
