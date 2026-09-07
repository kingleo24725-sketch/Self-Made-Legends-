/**
 * Dad + Daughter Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 * Proprietary and confidential. Unauthorized copying, distribution,
 * or use of this file, via any medium, is strictly prohibited.
 */
const express = require('express');
const db = require('../../config/db');
const { requireAuth, requireAdult, requireGuardianOf } = require('../../middleware/auth');
const {
  capabilitiesFor, quotaUsed,
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
    /**
     * "Consent pending" is a property of a CHILD profile: she may not use
     * the app until a guardian has granted it. It used to be computed from
     * the guardian's side — any open, ungranted consent row on the account —
     * which walled the DAD out of his own account behind "Let's get a
     * grown-up" the moment he tapped "Not now" on the consent dialog, for as
     * long as that row took to expire. An adult is never consent-pending.
     */
    const consentPending = req.profile.age_band === 'adult'
      ? false
      : (await db.query(
          `SELECT 1 FROM guardian_consents
            WHERE child_profile_id = $1 AND granted_at IS NOT NULL AND revoked_at IS NULL
            LIMIT 1`,
          [req.profile.id])).length === 0;

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
    // capabilitiesFor, not ENTITLEMENTS[tier] — v1 ships with billing off and
    // nothing commercial gated. See entitlements.js.
    const caps = await capabilitiesFor(req.profile.id);
    res.json({
      entitlements: caps,
      usage: {
        tryon: await quotaUsed(req.profile.id, 'tryon'),
        room_minutes: await quotaUsed(req.profile.id, 'room_minutes'),
      },
    });
  } catch (err) { next(err); }
});

/**
 * A profile may be edited by the person it belongs to, or by their guardian.
 * Nobody else — this used to update by id with no ownership check at all, so
 * any authenticated account could rename or re-mode any profile in the system,
 * including a stranger's child.
 */
router.patch('/profiles/:id', requireAuth, async (req, res, next) => {
  try {
    const { mode, remembranceMode, culturalModes, displayName } = req.body;
    if (mode !== undefined && !isValidMode(mode)) {
      return res.status(400).json({ error: 'unknown_mode', mode });
    }

    const target = await db.one(
      'SELECT * FROM profiles WHERE id = $1 AND deleted_at IS NULL',
      [req.params.id]).catch(() => null);
    if (!target) return res.status(404).json({ error: 'profile_not_found' });

    const isSelf = target.id === req.profile.id;
    const isMyChild = target.guardian_id && target.guardian_id === req.profile.id;
    if (!isSelf && !isMyChild) return res.status(403).json({ error: 'not_your_profile' });

    const row = await db.one(
      `UPDATE profiles SET
         mode = COALESCE($2, mode),
         remembrance_mode = COALESCE($3, remembrance_mode),
         cultural_modes = COALESCE($4, cultural_modes),
         display_name = COALESCE($5, display_name)
       WHERE id = $1 RETURNING *`,
      [req.params.id, mode ?? null, remembranceMode ?? null,
       culturalModes ?? null, displayName ?? null]);

    // Serialized, like every other profile the client receives — a raw row is
    // snake_case, and the client reads ageBand.
    res.json(publicProfile(row));
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

    /**
     * HOW THE TOKEN REACHES THE GUARDIAN.
     *
     * With a mail provider configured, it goes to their inbox and the app says
     * "check your email". Without one — which is every deployment so far, since
     * no mail service exists in this codebase — it is returned here, to the
     * authenticated adult who just created this consent row, and the app
     * presents the consent statement for them to affirm in place.
     *
     * This used to be keyed on NODE_ENV !== 'production'. In production that
     * meant the token was dropped AND never emailed, so no guardian could ever
     * verify, so no child could ever be added. The core relationship of the app
     * was unreachable in the one environment that matters.
     *
     * Returning it in-app is not a weakening beyond what the session already
     * grants: the route is requireAuth + requireAdult, the consent row is bound
     * to req.user.id, and anyone who can read this response already holds that
     * guardian's session. What the email link proves — control of the inbox —
     * is exactly what signing in as that account already proved. The consent
     * statement itself, and the explicit affirmation, are what COPPA's notice
     * and affirmative act require; the link was only ever the delivery.
     *
     * `delivery` tells the app which path it is on, so it never guesses.
     */
    const payload = { consentId, status: 'pending', expiresAt };
    if (config.enabled.mail) {
      payload.delivery = 'email';
      // TODO(mail): send the link. No provider is wired yet; when one is, this
      // is the only place that changes.
    } else {
      payload.delivery = 'in_app';
      payload.verificationToken = token;
    }
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

/**
 * A guardian deleting a child's account. requireGuardianOf makes it their own
 * child and nobody else's. Soft delete, matching /privacy/account.
 */
router.delete('/guardian/children/:childId', requireAuth, requireAdult,
  requireGuardianOf('childId'), async (req, res, next) => {
    try {
      await db.query(
        'UPDATE profiles SET deleted_at = now() WHERE id = $1 AND guardian_id = $2',
        [req.params.childId, req.profile.id]);
      res.json({ ok: true });
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
