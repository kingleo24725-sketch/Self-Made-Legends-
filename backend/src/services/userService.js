/**
 * Dad + Daughter Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 * Proprietary and confidential. Unauthorized copying, distribution,
 * or use of this file, via any medium, is strictly prohibited.
 */
const argon2 = require('argon2');
const jwt = require('jsonwebtoken');
const config = require('../config');
const db = require('../config/db');
const { ageFromBirthDate } = require('../middleware/requireAgeBand');

function ageBandFor(birthDate) {
  const age = ageFromBirthDate(birthDate);
  if (age < 13) return 'child';
  if (age < 18) return 'teen';
  return 'adult';
}

async function createAdult({ email, password, birthDate, region, displayName }) {
  if (ageBandFor(birthDate) !== 'adult') {
    const e = new Error('adults_only_signup'); e.status = 403; throw e;
  }
  const hash = await argon2.hash(password, { type: argon2.argon2id });
  const user = await db.one(
    `INSERT INTO users (email, password_hash, region) VALUES ($1,$2,$3) RETURNING *`,
    [email.toLowerCase(), hash, region]);

  const profile = await db.one(
    `INSERT INTO profiles (user_id, display_name, birth_date, age_band)
     VALUES ($1,$2,$3,'adult') RETURNING *`,
    [user.id, displayName, birthDate]);

  return { user, profile };
}

/**
 * A child profile is provisioned ONLY after verifiable parental consent is
 * recorded. No data is collected before that. docs/wireframes.md W-02.
 */
async function createChildProfile({ guardianProfileId, displayName, birthDate, consentId }) {
  const consent = await db.one(
    'SELECT * FROM guardian_consents WHERE id = $1 AND revoked_at IS NULL', [consentId]);
  if (!consent || !consent.granted_at) {
    const e = new Error('parental_consent_required'); e.status = 403; throw e;
  }

  const band = ageBandFor(birthDate);
  const profile = await db.one(
    `INSERT INTO profiles (guardian_id, display_name, birth_date, age_band, mode)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [guardianProfileId, displayName, birthDate, band,
     band === 'child' ? 'little_legend' : 'solo_glow']);

  // Defaults are OFF for everything that touches video or strangers.
  await db.query(
    `INSERT INTO guardian_permissions
       (child_profile_id, camera_tryon, video_rooms, live_lessons, bff_rooms, notifications)
     VALUES ($1, true, false, false, false, true)`, [profile.id]);

  return profile;
}

function issueTokens(user, profile) {
  const accessToken = jwt.sign(
    { userId: user?.id, profileId: profile.id }, config.jwt.secret,
    { expiresIn: config.jwt.accessTtl });
  const refreshToken = jwt.sign(
    { userId: user?.id, profileId: profile.id, v: Date.now() }, config.jwt.refreshSecret,
    { expiresIn: `${config.jwt.refreshTtlDays}d` });
  return { accessToken, refreshToken };
}

async function verifyPassword(user, password) {
  if (!user?.password_hash) return false;
  return argon2.verify(user.password_hash, password);
}

module.exports = { createAdult, createChildProfile, issueTokens, verifyPassword, ageBandFor };
