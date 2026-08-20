/**
 * Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 */
const express = require('express');
const jwt = require('jsonwebtoken');
const config = require('../../config');
const db = require('../../config/db');
const limits = require('../../middleware/rateLimit');
const { requireAuth } = require('../../middleware/auth');
const userService = require('../../services/userService');

const router = express.Router();

router.post('/signup', limits.auth, async (req, res, next) => {
  try {
    const { email, password, birthDate, region, displayName } = req.body;
    const { user, profile } = await userService.createAdult({
      email, password, birthDate, region, displayName });
    res.status(201).json(userService.issueTokens(user, profile));
  } catch (err) { next(err); }
});

router.post('/login', limits.auth, async (req, res, next) => {
  try {
    const user = await db.one(
      'SELECT * FROM users WHERE email = $1 AND deleted_at IS NULL',
      [String(req.body.email || '').toLowerCase()]);
    const ok = await userService.verifyPassword(user, req.body.password);
    if (!ok) return res.status(401).json({ error: 'invalid_credentials' });

    const profile = await db.one(
      'SELECT * FROM profiles WHERE user_id = $1 ORDER BY created_at LIMIT 1', [user.id]);
    res.json(userService.issueTokens(user, profile));
  } catch (err) { next(err); }
});

router.post('/refresh', async (req, res) => {
  try {
    const payload = jwt.verify(req.body.refreshToken, config.jwt.refreshSecret);
    const user = payload.userId
      ? await db.one('SELECT * FROM users WHERE id = $1', [payload.userId]) : null;
    const profile = await db.one('SELECT * FROM profiles WHERE id = $1', [payload.profileId]);
    if (!profile) return res.status(401).json({ error: 'unauthorized' });
    res.json(userService.issueTokens(user, profile));   // rotating refresh
  } catch {
    res.status(401).json({ error: 'unauthorized' });
  }
});

router.post('/logout', requireAuth, (req, res) => res.json({ ok: true }));

module.exports = router;
