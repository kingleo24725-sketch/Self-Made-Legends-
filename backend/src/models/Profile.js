/**
 * Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 */
const db = require('../config/db');

module.exports = {
  byId: (id) => db.one('SELECT * FROM profiles WHERE id = $1 AND deleted_at IS NULL', [id]),
  childrenOf: (guardianId) => db.query(
    'SELECT * FROM profiles WHERE guardian_id = $1 AND deleted_at IS NULL', [guardianId]),
  permissions: (childId) => db.one(
    'SELECT * FROM guardian_permissions WHERE child_profile_id = $1', [childId]),
  setMode: (id, mode) => db.one(
    'UPDATE profiles SET mode = $2 WHERE id = $1 RETURNING *', [id, mode]),
};
