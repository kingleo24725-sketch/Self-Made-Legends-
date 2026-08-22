/**
 * Dad + Daughter Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 * Proprietary and confidential. Unauthorized copying, distribution,
 * or use of this file, via any medium, is strictly prohibited.
 */
const db = require('../config/db');

module.exports = {
  byId: (id) => db.one('SELECT * FROM rooms WHERE id = $1', [id]),
  participants: (roomId) => db.query(
    'SELECT * FROM room_participants WHERE room_id = $1 AND left_at IS NULL', [roomId]),
  freeze: (id, reason) => db.query(
    'UPDATE rooms SET frozen_at = now(), freeze_reason = $2 WHERE id = $1', [id, reason]),
};
