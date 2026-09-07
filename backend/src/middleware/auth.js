/**
 * Dad + Daughter Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 * Proprietary and confidential. Unauthorized copying, distribution,
 * or use of this file, via any medium, is strictly prohibited.
 */
const jwt = require('jsonwebtoken');
const config = require('../config');
const db = require('../config/db');

async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'unauthorized' });

  try {
    const payload = jwt.verify(token, config.jwt.secret);
    req.user = await db.one('SELECT * FROM users WHERE id = $1 AND deleted_at IS NULL',
                            [payload.userId]);
    req.profile = await db.one('SELECT * FROM profiles WHERE id = $1 AND deleted_at IS NULL',
                               [payload.profileId]);
    if (!req.profile) return res.status(401).json({ error: 'unauthorized' });
    // The profile named by the token must belong to the account named by
    // the token: the user's own, or a child of one of the user's profiles.
    if (req.user && req.profile.user_id !== req.user.id) {
      const ownsGuardian = req.profile.guardian_id && await db.one(
        'SELECT 1 FROM profiles WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL',
        [req.profile.guardian_id, req.user.id]);
      if (!ownsGuardian) return res.status(401).json({ error: 'unauthorized' });
    }
    return next();
  } catch {
    return res.status(401).json({ error: 'unauthorized' });
  }
}

/** Purchases are adults-only. A child account can never reach a billing route. */
function requireAdult(req, res, next) {
  if (req.profile?.age_band !== 'adult') {
    return res.status(403).json({ error: 'adults_only' });
  }
  return next();
}

function requireGuardianOf(paramName) {
  return async (req, res, next) => {
    const childId = req.params[paramName.replace(':', '')];
    const child = await db.one('SELECT guardian_id FROM profiles WHERE id = $1', [childId]);
    if (!child || child.guardian_id !== req.profile.id) {
      return res.status(403).json({ error: 'not_guardian' });
    }
    return next();
  };
}

module.exports = { requireAuth, requireAdult, requireGuardianOf };
