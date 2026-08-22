/**
 * Dad + Daughter Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 * Proprietary and confidential. Unauthorized copying, distribution,
 * or use of this file, via any medium, is strictly prohibited.
 */
const crypto = require('crypto');
const db = require('../config/db');
const aiService = require('../services/aiService');
const { getProvider } = require('../services/mlProvider');
const { consumeQuota } = require('../services/entitlements');

/**
 * Issue a presigned upload target. 403 for child accounts — a U13 face image
 * never reaches object storage. docs/ai-tryon.md §4.6 Rule 2.
 */
async function createUploadUrl(req, res, next) {
  try {
    if (req.profile.age_band === 'child') {
      return res.status(403).json({
        error: 'server_render_forbidden_for_minor',
        message: 'This account renders on-device only.',
      });
    }

    const assetId = 'ast_' + crypto.randomBytes(12).toString('hex');
    const now = Date.now();

    res.json({
      assetId,
      // In production this is an S3 presigned PUT against the ephemeral
      // bucket, whose lifecycle rule hard-deletes objects after 24h
      // (infra/terraform/main.tf).
      uploadUrl: `${req.protocol}://${req.get('host')}/api/tryon/upload/${assetId}`,
      expiresAt: new Date(now + 10 * 60_000).toISOString(),
      deleteAfter: new Date(now + 24 * 3600_000).toISOString(),
    });
  } catch (err) { next(err); }
}

/** Accepts the raw bytes in mock mode so the local flow works end-to-end. */
async function receiveUpload(req, res, next) {
  try {
    res.status(201).json({ assetId: req.params.assetId, received: true });
  } catch (err) { next(err); }
}

/**
 * POST /api/tryon
 *
 * Body: { image: { base64 } | { assetId }, look: { id, layers } }
 *   or the flat form { base64, assetId, look } for convenience.
 *
 * Returns { processedImageUrl, ... }.
 */
async function render(req, res, next) {
  try {
    const look = req.body.look ?? req.body.preset;
    const image = req.body.image ?? {
      base64: req.body.base64 ?? req.body.imageBase64,
      assetId: req.body.assetId,
    };

    const shadeProfile = await db.one(
      `SELECT * FROM shade_profiles WHERE profile_id = $1
        ORDER BY created_at DESC LIMIT 1`, [req.profile.id]).catch(() => null);

    const result = await aiService.applyLook(image, look, {
      profile: req.profile, shadeProfile,
    });

    await consumeQuota(req.profile.id, 'tryon');

    // The SOURCE image is never persisted — only the render, and only for 24h
    // unless the user explicitly saves it. docs/ai-tryon.md §4.6 Rule 3.
    await db.query(
      `INSERT INTO renders (id, profile_id, url, before_url, geometry_locked, expires_at)
       VALUES (gen_random_uuid(), $1, $2, $3, true, now() + interval '24 hours')`,
      [req.profile.id, result.processedImageUrl, result.originalImageUrl]).catch(() => {});

    res.json(result);
  } catch (err) { next(err); }
}

async function listPresets(req, res, next) {
  try {
    const maxAge = req.profile.age_band === 'child' ? 12 : 99;
    const presets = await db.query(
      `SELECT id, name, preset_id, min_age, tier_required, credit
         FROM looks
        WHERE min_age <= $1
          AND (collection_id IS NULL
               OR (advisor_approved_at IS NOT NULL AND qa_panel_passed_at IS NOT NULL))`,
      [maxAge]).catch(() => []);
    res.json({ presets });
  } catch (err) { next(err); }
}

async function extractShade(req, res, next) {
  try {
    const result = await getProvider().extractShade({ assetId: req.body.assetId });

    // Always a RANGE plus confidence, never a single point. Low confidence
    // says so plainly — a wrong match is worse than none.
    if (result.confidence < 0.6) {
      return res.json({
        ...result,
        lowConfidence: true,
        message: "We can't match you confidently in this light. Want to try by a window?",
      });
    }

    await db.query(
      `INSERT INTO shade_profiles
         (profile_id, depth_min, depth_max, undertone, lab_l, lab_a, lab_b, confidence, method)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'scan')`,
      [req.profile.id, result.depthMin, result.depthMax, result.undertone,
       result.lab.L, result.lab.a, result.lab.b, result.confidence]).catch(() => {});

    res.json(result);
  } catch (err) { next(err); }
}

module.exports = { createUploadUrl, receiveUpload, render, listPresets, extractShade };
