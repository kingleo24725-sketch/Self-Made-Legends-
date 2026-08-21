/**
 * Dads & Daughters Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 * Proprietary and confidential. Unauthorized use is prohibited.
 *
 * The canonical mode list. MUST stay identical to MODES in
 * app/utils/constants.js — tests/safety/modes.test.js fails if they drift.
 *
 * `profiles.mode` is free text in Postgres with a CHECK constraint, so an
 * unknown value is rejected at the database rather than surfacing in the app
 * as an undefined mode chip and a missing accent colour.
 */
const MODES = {
  DAD_DAUGHTER: 'dad_daughter',
  MOM_DAUGHTER: 'mom_daughter',
  GUARDIAN_DAUGHTER: 'guardian_daughter',
  SOLO_GIRL: 'solo_girl',
  BEST_FRIEND_GLAM: 'best_friend_glam',
  GLOBAL_ROOMS: 'global_rooms',
};

const VALID_MODES = Object.values(MODES);

/**
 * The mode a newly provisioned profile starts in. Everyone can switch
 * immediately from mode selection; this only decides the first screen.
 *
 * A child is guardian-linked by definition, so Guardian + Daughter is the
 * honest default rather than presuming which parent set them up. Child-safe
 * UI is driven by age band, not by mode, so this choice carries no safety
 * weight either way.
 */
function defaultModeFor(ageBand) {
  return ageBand === 'adult' ? MODES.SOLO_GIRL : MODES.GUARDIAN_DAUGHTER;
}

const isValidMode = (m) => VALID_MODES.includes(m);

module.exports = { MODES, VALID_MODES, defaultModeFor, isValidMode };
