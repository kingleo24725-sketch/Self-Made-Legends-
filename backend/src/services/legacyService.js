/**
 * Dad + Daughter Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 * Proprietary and confidential. Unauthorized copying, distribution,
 * or use of this file, via any medium, is strictly prohibited.
 *
 * Letters Forward — delivery.
 *
 * This file exists to hold one guarantee, stated in docs/stripe-flow.md:778
 * and locked by a test: an already-recorded letter is delivered forever, at
 * any tier, including after full cancellation. A lapsed card must never
 * withhold a dead parent's message to their child.
 *
 * The rule that makes it true is mechanical: NOTHING IN THIS FILE MAY READ
 * SUBSCRIPTION STATE. No import of entitlements, no join to subscriptions, no
 * tier argument. Delivery is decided by status and deliver_on alone.
 */
const db = require('../config/db');
const logger = require('../utils/logger');

/**
 * Deliver every sealed letter whose date has arrived.
 *
 * Idempotent and safe to run concurrently: the UPDATE filters on
 * status = 'sealed', so a second runner finds nothing left to claim.
 *
 * @param {object} [opts]
 * @param {string} [opts.toProfileId] limit to one recipient (used on read, so
 *        a letter that came due since the last sweep still opens immediately)
 */
async function deliverDueLetters({ toProfileId = null } = {}) {
  const delivered = await db.query(
    `UPDATE letters_forward
        SET status = 'delivered', delivered_at = now()
      WHERE status = 'sealed'
        AND deliver_on <= CURRENT_DATE
        AND ($1::uuid IS NULL OR to_profile_id = $1)
      RETURNING id, to_profile_id, occasion, deliver_on, delivered_at`,
    [toProfileId]);

  if (delivered.length) {
    logger.info({ count: delivered.length }, 'letters_delivered');
  }
  return delivered;
}

/**
 * What a recipient may see of a letter that has NOT arrived yet: the occasion
 * and the date, never the content. docs/api-reference.md:600 — "sealed
 * metadata only".
 */
function sealedMetadata(row) {
  return {
    id: row.id,
    occasion: row.occasion,
    deliverOn: row.deliver_on,
    status: 'sealed',
    legacyPersonId: row.legacy_person_id,
    // storage_key is deliberately absent. A sealed letter has no readable body.
  };
}

function deliveredLetter(row) {
  return {
    id: row.id,
    occasion: row.occasion,
    deliverOn: row.deliver_on,
    status: 'delivered',
    deliveredAt: row.delivered_at,
    legacyPersonId: row.legacy_person_id,
    storageKey: row.storage_key,
  };
}

module.exports = { deliverDueLetters, sealedMetadata, deliveredLetter };
