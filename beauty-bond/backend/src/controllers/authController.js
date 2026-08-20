/**
 * Dad + Daughter Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 */
const jwt = require('jsonwebtoken');
const config = require('../config');
const db = require('../config/db');
const userService = require('../services/userService');
const { isEmail } = require('../utils/validators');

/**
 * POST /api/auth/register
 *
 * Adults only. A child account is never self-registered — it is provisioned
 * by a guardian after verifiable parental consent (POST /api/guardian/children).
 */
async function register(req, res, next) {
  try {
    const { email, password, birthDate, region, displayName } = req.body;

    if (!isEmail(email)) return res.status(400).json({ error: 'invalid_email' });
    if (!password || password.length < 10) {
      return res.status(400).json({
        error: 'weak_password',
        message: 'Use at least 10 characters.',
      });
    }
    if (!birthDate) return res.status(400).json({ error: 'birth_date_required' });

    const existing = await db.one(
      'SELECT id FROM users WHERE email = $1 AND deleted_at IS NULL',
      [String(email).toLowerCase()]);
    if (existing) return res.status(409).json({ error: 'email_in_use' });

    const { user, profile } = await userService.createAdult({
      email, password, birthDate, region: region ?? 'US',
      displayName: displayName ?? email.split('@')[0],
    });

    const tokens = userService.issueTokens(user, profile);
    res.status(201).json({ ...tokens, user: publicUser(user), profile: publicProfile(profile) });
  } catch (err) { next(err); }
}

/** POST /api/auth/login */
async function login(req, res, next) {
  try {
    const user = await db.one(
      'SELECT * FROM users WHERE email = $1 AND deleted_at IS NULL',
      [String(req.body.email || '').toLowerCase()]);

    const ok = await userService.verifyPassword(user, req.body.password);
    // Same response for unknown email and wrong password — no account enumeration.
    if (!ok) return res.status(401).json({ error: 'invalid_credentials' });

    const profile = await db.one(
      'SELECT * FROM profiles WHERE user_id = $1 AND deleted_at IS NULL ORDER BY created_at LIMIT 1',
      [user.id]);

    const tokens = userService.issueTokens(user, profile);
    res.json({ ...tokens, user: publicUser(user), profile: publicProfile(profile) });
  } catch (err) { next(err); }
}

/**
 * GET /api/auth/me
 * Current user, active profile, linked children, and plan status.
 */
async function me(req, res, next) {
  try {
    const { effectiveTierFor, ENTITLEMENTS } = require('../services/entitlements');
    const tier = await effectiveTierFor(req.profile.id);

    const children = req.user
      ? await db.query(
          'SELECT * FROM profiles WHERE guardian_id = $1 AND deleted_at IS NULL',
          [req.profile.id])
      : [];

    res.json({
      user: req.user ? publicUser(req.user) : null,
      profile: publicProfile(req.profile),
      children: children.map(publicProfile),
      subscription: { tier, entitlements: ENTITLEMENTS[tier] },
    });
  } catch (err) { next(err); }
}

/** POST /api/auth/refresh — rotating refresh tokens. */
async function refresh(req, res) {
  try {
    const payload = jwt.verify(req.body.refreshToken, config.jwt.refreshSecret);
    const user = payload.userId
      ? await db.one('SELECT * FROM users WHERE id = $1', [payload.userId]) : null;
    const profile = await db.one('SELECT * FROM profiles WHERE id = $1', [payload.profileId]);
    if (!profile) return res.status(401).json({ error: 'unauthorized' });
    res.json(userService.issueTokens(user, profile));
  } catch {
    res.status(401).json({ error: 'unauthorized' });
  }
}

function logout(req, res) { res.json({ ok: true }); }

/* ── Serializers: never leak a password hash or a Stripe customer id ── */

function publicUser(u) {
  return { id: u.id, email: u.email, region: u.region, createdAt: u.created_at };
}

function publicProfile(p) {
  if (!p) return null;
  return {
    id: p.id,
    displayName: p.display_name,
    ageBand: p.age_band,
    birthDate: p.birth_date,
    mode: p.mode,
    avatarUrl: p.avatar_url,
    culturalModes: p.cultural_modes,
    remembranceMode: p.remembrance_mode,
    guardianId: p.guardian_id,
    isVerifiedCreator: p.is_verified_creator,
  };
}

module.exports = { register, login, me, refresh, logout, publicUser, publicProfile };
