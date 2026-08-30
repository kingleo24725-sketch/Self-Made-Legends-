/**
 * Dad + Daughter Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 * Proprietary and confidential. Unauthorized copying, distribution,
 * or use of this file, via any medium, is strictly prohibited.
 *
 * MIDDLEWARE ORDER IS LOAD-BEARING:
 *   consent -> AGE gate -> ENTITLEMENT gate -> handler
 * The age gate is a compliance boundary and always runs first.
 */
const express = require('express');
const limits = require('../../middleware/rateLimit');
const { requireAuth } = require('../../middleware/auth');
const { requireGuardianPermission } = require('../../middleware/requireAgeBand');
const { requireEntitlement } = require('../../middleware/requireEntitlement');
const { quotaUsed } = require('../../services/entitlements');
const ctrl = require('../../controllers/tryonController');

const router = express.Router();

router.post('/upload-url', requireAuth,
  requireGuardianPermission('camera_tryon'),
  ctrl.createUploadUrl);

// Mock-mode upload sink so the local flow runs end-to-end.
router.put('/upload/:assetId', requireAuth,
  express.raw({ type: '*/*', limit: '12mb' }),
  ctrl.receiveUpload);

// POST /api/tryon  (and /api/tryon/render — same handler)
router.post('/', requireAuth, limits.tryonRender,
  requireGuardianPermission('camera_tryon'),
  requireEntitlement(async (e, req) => {
    if (e.tryOnPerMonth === 'unlimited') return true;
    return (await quotaUsed(req.profile.id, 'tryon')) < e.tryOnPerMonth;
  }, 'tryon'),
  ctrl.render);

router.post('/render', requireAuth, limits.tryonRender,
  requireGuardianPermission('camera_tryon'),
  requireEntitlement(async (e, req) => {
    if (e.tryOnPerMonth === 'unlimited') return true;
    return (await quotaUsed(req.profile.id, 'tryon')) < e.tryOnPerMonth;
  }, 'tryon'),
  ctrl.render);

router.get('/presets', requireAuth, ctrl.listPresets);

router.post('/shade', requireAuth,
  requireGuardianPermission('camera_tryon'),
  ctrl.extractShade);

module.exports = router;
