/**
 * Dad + Daughter Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 * Proprietary and confidential. Unauthorized copying, distribution,
 * or use of this file, via any medium, is strictly prohibited.
 *
 * Mounted at /api/auth.
 */
const express = require('express');
const limits = require('../../middleware/rateLimit');
const { requireAuth } = require('../../middleware/auth');
const ctrl = require('../../controllers/authController');

const router = express.Router();

router.post('/register', limits.auth, ctrl.register);
router.post('/signup', limits.auth, ctrl.register);   // alias
router.post('/login', limits.auth, ctrl.login);
router.get('/me', requireAuth, ctrl.me);
router.post('/refresh', ctrl.refresh);
router.post('/logout', requireAuth, ctrl.logout);

module.exports = router;
