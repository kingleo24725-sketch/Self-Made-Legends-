/**
 * Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 */
const db = require('../config/db');

module.exports = {
  listFor: (profileId) => db.query(
    'SELECT * FROM memories WHERE profile_id = $1 ORDER BY occurred_on DESC', [profileId]),

  create: ({ profileId, kind, renderId, caption, occurredOn, sharedWith = [] }) => db.one(
    `INSERT INTO memories (profile_id, kind, render_id, caption, occurred_on,
                           shared_with, consent_status)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [profileId, kind, renderId, caption, occurredOn, sharedWith,
     // A shared look needs the other party's consent before it appears anywhere.
     sharedWith.length > 0 ? 'pending_consent' : 'ok']),

  /**
   * Real delete: source, derived thumbs, recap frames, and CDN cache are
   * purged within 24h by the media-cleanup job. docs/wireframes.md W-91.
   */
  remove: (id, profileId) => db.query(
    'DELETE FROM memories WHERE id = $1 AND profile_id = $2', [id, profileId]),
};
