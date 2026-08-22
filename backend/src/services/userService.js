/**
 * Dad + Daughter Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 * Proprietary and confidential. Unauthorized copying, distribution,
 * or use of this file, via any medium, is strictly prohibited.
 */
const crypto = require('crypto');
const argon2 = require('argon2');
const jwt = require('jsonwebtoken');
const config = require('../config');
const db = require('../config/db');
const { ageFromBirthDate } = require('../middleware/requireAgeBand');
const { defaultModeFor, MODES } = require('./modes');

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
    `INSERT INTO profiles (user_id, display_name, birth_date, age_band, mode)
     VALUES ($1,$2,$3,'adult',$4) RETURNING *`,
    [user.id, displayName, birthDate, defaultModeFor('adult')]);

  return { user, profile };
}

/* ── Verifiable parental consent (COPPA) ──────────────────────────────
 *
 * Order is fixed and cannot be rearranged: consent is started and GRANTED
 * before any child data is collected. That is why a pending consent row
 * carries no child_profile_id (migration 003).
 *
 * The token is emailed to the guardian and only its hash is stored, so a
 * leaked database row cannot be used to grant consent on a parent's behalf.
 */
const CONSENT_TTL_HOURS = 72;

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function startConsent({ guardianUserId, guardianEmail }) {
  if (!guardianEmail) {
    const e = new Error('guardian_email_required'); e.status = 400; throw e;
  }
  const token = crypto.randomBytes(32).toString('base64url');
  const row = await db.one(
    `INSERT INTO guardian_consents
       (child_profile_id, guardian_user_id, method, granted_at,
        evidence_ref, verification_token_hash, expires_at)
     VALUES (NULL, $1, 'email_link', NULL, $2, $3, now() + ($4 || ' hours')::interval)
     RETURNING id, expires_at`,
    [guardianUserId, guardianEmail, hashToken(token), String(CONSENT_TTL_HOURS)]);

  // The caller emails this. It is never stored in plaintext.
  return { consentId: row.id, token, expiresAt: row.expires_at };
}

async function grantConsent({ consentId, token }) {
  const consent = await db.one(
    'SELECT * FROM guardian_consents WHERE id = $1', [consentId]).catch(() => null);

  const bad = () => { const e = new Error('consent_invalid'); e.status = 400; return e; };
  if (!consent || consent.revoked_at) throw bad();
  if (!consent.verification_token_hash) throw bad();
  if (consent.expires_at && new Date(consent.expires_at) < new Date()) {
    const e = new Error('consent_expired'); e.status = 410; throw e;
  }

  // Constant-time compare so a wrong token cannot be found by timing.
  const given = Buffer.from(hashToken(token ?? ''));
  const stored = Buffer.from(consent.verification_token_hash);
  if (given.length !== stored.length || !crypto.timingSafeEqual(given, stored)) throw bad();

  if (consent.granted_at) return consent;   // idempotent: re-clicking the link is fine

  return db.one(
    `UPDATE guardian_consents
        SET granted_at = now(), verification_token_hash = NULL
      WHERE id = $1 RETURNING *`, [consentId]);
}

/**
 * A child profile is provisioned ONLY after verifiable parental consent is
 * recorded. No data is collected before that. docs/wireframes.md W-02.
 */
async function createChildProfile({ guardianProfileId, guardianUserId,
                                    displayName, birthDate, consentId }) {
  const consent = await db.one(
    'SELECT * FROM guardian_consents WHERE id = $1 AND revoked_at IS NULL',
    [consentId]).catch(() => null);
  if (!consent || !consent.granted_at) {
    const e = new Error('parental_consent_required'); e.status = 403; throw e;
  }
  // The consent must belong to the guardian using it, and be unspent.
  if (guardianUserId && consent.guardian_user_id !== guardianUserId) {
    const e = new Error('consent_not_yours'); e.status = 403; throw e;
  }
  if (consent.child_profile_id) {
    const e = new Error('consent_already_used'); e.status = 409; throw e;
  }

  const band = ageBandFor(birthDate);
  if (band === 'adult') {
    const e = new Error('child_profile_must_be_a_minor'); e.status = 400; throw e;
  }

  const profile = await db.one(
    `INSERT INTO profiles (guardian_id, display_name, birth_date, age_band, mode)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [guardianProfileId, displayName, birthDate, band, defaultModeFor(band)]);

  // Bind the consent to this child so it cannot be spent twice.
  await db.query(
    'UPDATE guardian_consents SET child_profile_id = $1 WHERE id = $2',
    [profile.id, consentId]);

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

module.exports = {
  createAdult, createChildProfile, startConsent, grantConsent,
  issueTokens, verifyPassword, ageBandFor,
};
