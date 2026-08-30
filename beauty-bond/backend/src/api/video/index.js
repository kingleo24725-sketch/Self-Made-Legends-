/**
 * Dad + Daughter Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 * Proprietary and confidential. Unauthorized copying, distribution,
 * or use of this file, via any medium, is strictly prohibited.
 *
 * Mounted at /api/video. docs/video-rooms.md §5.10.
 */
const express = require('express');
const limits = require('../../middleware/rateLimit');
const { requireAuth, requireGuardianOf } = require('../../middleware/auth');
const { requireEntitlement } = require('../../middleware/requireEntitlement');
const ctrl = require('../../controllers/videoController');

const router = express.Router();

/** The endpoint the client calls to join: POST /api/video/token */
router.post('/token', requireAuth, ctrl.issueToken);

router.get('/rooms', requireAuth, ctrl.listRooms);
router.post('/rooms/:id/leave', requireAuth, ctrl.leaveRoom);
router.post('/rooms', requireAuth, ctrl.createRoom);

router.get('/rooms/:id/glam', requireAuth, ctrl.getGlam);
router.post('/rooms/:id/glam', requireAuth, ctrl.setGlam);

/**
 * PANIC — ALWAYS_FREE short-circuits the entitlement gate entirely.
 * One tap, no confirmation, never billed, never rate-limited into uselessness.
 */
router.post('/rooms/:id/panic', requireAuth, limits.panic,
  requireEntitlement(() => true, 'safety.panic_button'),
  ctrl.panic);

router.post('/rooms/:id/report', requireAuth,
  requireEntitlement(() => true, 'safety.report'),
  ctrl.report);

router.post('/rooms/:id/eject/:profileId', requireAuth,
  requireGuardianOf('profileId'), ctrl.eject);

router.post('/rooms/:id/recording', requireAuth, ctrl.startRecording);

module.exports = router;
