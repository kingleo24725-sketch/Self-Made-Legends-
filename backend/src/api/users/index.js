/**
 * Dads & Daughters Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 * Proprietary and confidential. Unauthorized copying, distribution,
 * or use of this file, via any medium, is strictly prohibited.
 */
const express = require('express');
const db = require('../../config/db');
const { requireAuth, requireAdult, requireGuardianOf } = require('../../middleware/auth');
const {
  effectiveTierFor, ENTITLEMENTS, quotaUsed,
} = require('../../services/entitlements');
const userService = require('../../services/userService');
const config = require('../../config');
const { publicUser, publicProfile } = require('../../controllers/authController');
const { isValidMode } = require('../../services/modes');

const router = express.Router();

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const profiles = await db.query(
      `SELECT * FROM profiles
        WHERE (user_id = $1 OR guardian_id = $2) AND deleted_at IS NULL`,
      [req.user?.id ?? null, req.profile.id]);

    // requireAuth loads `SELECT *`, so req.user carries password_hash and
    // stripe_customer_id. Both serializers exist for exactly this reason —
    // never return a raw row. The client also reads camelCase (profile.ageBand),
    // which the raw snake_case row does not provide.
    const consentPending = req.user
      ? (await db.query(
          `SELECT 1 FROM guardian_consents
            WHERE guardian_user_id = $1 AND granted_at IS NULL AND revoked_at IS NULL
              AND (expires_at IS NULL OR expires_at > now()) LIMIT 1`,
          [req.user.id])).length > 0
      : false;

    res.json({
      user: publicUser(req.user),
      profile: publicProfile(req.profile),
      profiles: profiles.map(publicProfile),
      consentPending,
    });
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
    if (mode !== undefined && !isValidMode(mode)) {
      return res.status(400).json({ error: 'unknown_mode', mode });
    }
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

/**
 * Consent runs in two steps, and the order is not negotiable: the guardian is
 * verified BEFORE any child data is collected. Step 1 stores no child data at
 * all — only that this adult asked to add a child.
 *
 * requireAuth/requireAdult: an unauthenticated writer here would let anyone
 * mint consent rows against any email address.
 */
router.post('/guardian/consent/start', requireAuth, requireAdult, async (req, res, next) => {
  try {
    const { consentId, token, expiresAt } = await userService.startConsent({
      guardianUserId: req.user.id,
      guardianEmail: req.body.guardianEmail,
    });

    // The link goes to the guardian's inbox. It is returned in the response
    // ONLY outside production, so the flow is testable without a mail service.
    const payload = { consentId, status: 'pending', expiresAt };
    if (config.env !== 'production') payload.verificationToken = token;
    res.status(202).json(payload);
  } catch (err) { next(err); }
});

/** Step 2 — the guardian follows the emailed link. This is what sets granted_at. */
router.post('/guardian/consent/:id/verify', async (req, res, next) => {
  try {
    const consent = await userService.grantConsent({
      consentId: req.params.id,
      token: req.body.token,
    });
    res.json({ consentId: consent.id, status: 'granted', grantedAt: consent.granted_at });
  } catch (err) { next(err); }
});

router.get('/guardian/consent/:id', requireAuth, requireAdult, async (req, res, next) => {
  try {
    const row = await db.one(
      'SELECT * FROM guardian_consents WHERE id = $1 AND guardian_user_id = $2',
      [req.params.id, req.user.id]).catch(() => null);
    if (!row) return res.status(404).json({ error: 'consent_not_found' });
    res.json({
      consentId: row.id,
      status: row.revoked_at ? 'revoked' : row.granted_at ? 'granted' : 'pending',
      grantedAt: row.granted_at,
      expiresAt: row.expires_at,
      childProfileId: row.child_profile_id,
    });
  } catch (err) { next(err); }
});

router.post('/guardian/children', requireAuth, requireAdult, async (req, res, next) => {
  try {
    const profile = await userService.createChildProfile({
      guardianProfileId: req.profile.id,
      guardianUserId: req.user.id,
      displayName: req.body.displayName,
      birthDate: req.body.birthDate,
      consentId: req.body.consentId,
    });
    res.status(201).json(publicProfile(profile));
  } catch (err) { next(err); }
});

router.get('/guardian/children', requireAuth, requireAdult, async (req, res, next) => {
  try {
    const rows = await db.query(
      `SELECT * FROM profiles WHERE guardian_id = $1 AND deleted_at IS NULL
        ORDER BY created_at`, [req.profile.id]);
    res.json({ children: rows.map(publicProfile) });
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

/**
 * Export returns the data inline rather than promising an email nobody sends.
 * A guardian's export includes their children's profiles, because a parent
 * exercising a data right on a minor's behalf is the whole point.
 */
router.get('/privacy/export', requireAuth, async (req, res, next) => {
  try {
    const profiles = await db.query(
      `SELECT * FROM profiles
        WHERE (user_id = $1 OR guardian_id = $2) AND deleted_at IS NULL`,
      [req.user?.id ?? null, req.profile.id]);

    const ids = profiles.map((p) => p.id);
    const [subscriptions, consents, permissions] = await Promise.all([
      req.user
        ? db.query(`SELECT tier, status, source, price_lookup_key,
                           current_period_end, cancel_at_period_end
                      FROM subscriptions WHERE user_id = $1`, [req.user.id])
        : [],
      req.user
        ? db.query(`SELECT id, method, granted_at, revoked_at, child_profile_id
                      FROM guardian_consents WHERE guardian_user_id = $1`, [req.user.id])
        : [],
      db.query('SELECT * FROM guardian_permissions WHERE child_profile_id = ANY($1)', [ids]),
    ]);

    res.setHeader('Content-Disposition', 'attachment; filename="beauty-bond-export.json"');
    res.json({
      exportedAt: new Date().toISOString(),
      product: 'beauty-bond',
      user: publicUser(req.user),
      profiles: profiles.map(publicProfile),
      subscriptions,
      guardianConsents: consents,
      guardianPermissions: permissions,
    });
  } catch (err) { next(err); }
});

/**
 * Deleting an account takes the guardian's children with it — leaving a child
 * profile parented by a deleted adult would orphan a minor's data with nobody
 * authorised to manage it.
 */
router.delete('/privacy/account', requireAuth, async (req, res, next) => {
  try {
    await db.query(
      `UPDATE profiles SET deleted_at = now()
        WHERE (id = $1 OR guardian_id = $1 OR user_id = $2) AND deleted_at IS NULL`,
      [req.profile.id, req.user?.id ?? null]);
    if (req.user) {
      await db.query('UPDATE users SET deleted_at = now() WHERE id = $1', [req.user.id]);
    }
    res.json({ ok: true, deletedAt: new Date().toISOString() });
  } catch (err) { next(err); }
});

module.exports = router;
