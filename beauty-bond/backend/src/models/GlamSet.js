/**
 * Dad + Daughter Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 * Proprietary and confidential. Unauthorized copying, distribution,
 * or use of this file, via any medium, is strictly prohibited.
 *
 * Cultural glam sets. A preset without advisor sign-off AND a passing 16-tone
 * QA panel CANNOT be published — enforced by a DB CHECK constraint too.
 * docs/ai-tryon.md §4.5.
 */
const db = require('../config/db');

module.exports = {
  publishable: () => db.query(
    `SELECT * FROM looks
      WHERE collection_id IS NULL
         OR (advisor_approved_at IS NOT NULL AND qa_panel_passed_at IS NOT NULL)`),

  forAgeBand: (ageBand) => db.query(
    'SELECT * FROM looks WHERE min_age <= $1', [ageBand === 'child' ? 12 : 99]),

  byCollection: (collectionId) => db.query(
    `SELECT * FROM looks
      WHERE collection_id = $1
        AND advisor_approved_at IS NOT NULL AND qa_panel_passed_at IS NOT NULL`,
    [collectionId]),
};
