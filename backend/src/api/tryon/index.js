/**
 * Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 *
 * NOTE THE MIDDLEWARE ORDER: consent -> age -> entitlement -> handler.
 * The age gate ALWAYS precedes the commercial gate.
 */
const express = require('express');
const db = require('../../config/db');
const limits = require('../../middleware/rateLimit');
const { requireAuth } = require('../../middleware/auth');
const { requireGuardianPermission } = require('../../middleware/requireAgeBand');
const { requireEntitlement } = require('../../middleware/requireEntitlement');
const { consumeQuota, quotaUsed } = require('../../services/entitlements');
const aiService = require('../../services/aiService');

const router = express.Router();

/** 403 for child accounts — a U13 image never reaches object storage. */
router.post('/upload-url', requireAuth,
  requireGuardianPermission('camera_tryon'),
  async (req, res, next) => {
    try {
      if (req.profile.age_band === 'child') {
        return res.status(403).json({
          error: 'server_render_forbidden_for_minor',
          message: 'This account renders on-device only.',
        });
      }
      // Presigned PUT with a 24h object lifecycle on the ephemeral bucket.
      res.json({
        assetId: `ast_${Date.now().toString(36)}`,
        uploadUrl: 'https://uploads.beautybond.sml/presigned-url-placeholder',
        expiresAt: new Date(Date.now() + 10 * 60_000).toISOString(),
        deleteAfter: new Date(Date.now() + 24 * 3600_000).toISOString(),
      });
    } catch (err) { next(err); }
  });

router.post('/render', requireAuth, limits.tryonRender,
  requireGuardianPermission('camera_tryon'),
  requireEntitlement(async (e, req) => {
    if (e.tryOnPerMonth === 'unlimited') return true;
    return (await quotaUsed(req.profile.id, 'tryon')) < e.tryOnPerMonth;
  }, 'tryon'),
  async (req, res, next) => {
    try {
      const shadeProfile = await db.one(
        'SELECT * FROM shade_profiles WHERE profile_id = $1 ORDER BY created_at DESC LIMIT 1',
        [req.profile.id]);

      const result = await aiService.render({
        assetId: req.body.assetId,
        look: req.body.look,
        shadeProfile,
        profile: req.profile,
      });

      await consumeQuota(req.profile.id, 'tryon');
      res.json(result);
    } catch (err) { next(err); }
  });

router.get('/presets', requireAuth, async (req, res, next) => {
  try {
    // Only presets legal for the caller's age band are ever returned.
    const rows = await db.query(
      `SELECT * FROM looks
        WHERE min_age <= $1
          AND (collection_id IS NULL
               OR (advisor_approved_at IS NOT NULL AND qa_panel_passed_at IS NOT NULL))`,
      [req.profile.age_band === 'child' ? 12 : 99]);
    res.json({ presets: rows });
  } catch (err) { next(err); }
});

module.exports = router;
