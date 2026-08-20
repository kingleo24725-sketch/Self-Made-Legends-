/**
 * Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 */

export const APP_NAME = 'Beauty Bond';
export const OWNER = 'Self-Made Legends LLC (SML)';
export const ATTRIBUTION = 'from Self-Made Legends';

export const AGE_BANDS = { CHILD: 'child', TEEN: 'teen', ADULT: 'adult' };

export const MODES = {
  DAD_DAUGHTER: 'dad_daughter',
  LEGACY: 'legacy',
  LITTLE_LEGEND: 'little_legend',
  SOLO_GLOW: 'solo_glow',
  BFF: 'bff',
  GLOBAL_GLAM: 'global_glam',
};

export const MODE_META = {
  [MODES.DAD_DAUGHTER]:  { title: 'Dad + Daughter', subtitle: 'Learn together, level up together.', minAge: 0 },
  [MODES.LEGACY]:        { title: 'Mom & Me / Legacy', subtitle: 'Her routine, her shades, her voice.', minAge: 0 },
  [MODES.LITTLE_LEGEND]: { title: 'Little Legend', subtitle: 'Pretend play, real skills.', minAge: 0, maxAge: 12 },
  [MODES.SOLO_GLOW]:     { title: 'Solo Glow', subtitle: 'Just for you.', minAge: 0 },
  [MODES.BFF]:           { title: 'Best Friend Glam', subtitle: 'Glam with your person.', minAge: 13 },
  [MODES.GLOBAL_GLAM]:   { title: 'Global Glam', subtitle: 'Beauty from everywhere.', minAge: 16 },
};

export const TIERS = { SPARKLE: 'sparkle', BOND: 'bond', LEGACY: 'legacy', STUDIO: 'studio' };

export const ROOM_TYPES = { FAMILY: 'family', LESSON: 'lesson', BFF: 'bff', GLOBAL: 'global' };

/** Closed enum. An unknown layer type is rejected. docs/ai-tryon.md §4.6 Rule 5. */
export const TRYON_LAYERS = ['lip', 'cheek', 'eye', 'brow', 'lash', 'glow', 'liner'];

/** Period-after-opening defaults, in months. docs/wireframes.md W-80. */
export const PAO_MONTHS = { mascara: 3, liquid_liner: 3, foundation: 12, powder: 24 };

/** Copy that must never drift — docs/branding.md §7.6. */
export const COPY = {
  streakBroken: 'Life gets busy. Five minutes puts you right back.',
  lowConfidenceMatch: "We can't match you confidently in this light. Want to try by a window?",
  panicConfirmed: "You're out. We've let your grown-up know. You did the right thing.",
  childTimeLimit: 'Time to put the brushes down. See you tomorrow ✨',
  paymentFailed: "That card didn't go through. Nothing was charged.",
  legacyEntry: "Whenever you're ready.",
  letterDelivered: 'She left this for today.',
  errorGeneric: 'Our side, not yours.',
  offline: "You're offline. Downloaded lessons still work.",
  safetyAlwaysFree: 'Safety features are free, always.',
};
