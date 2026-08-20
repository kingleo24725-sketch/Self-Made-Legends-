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
  MOM_DAUGHTER: 'mom_daughter',
  GUARDIAN_DAUGHTER: 'guardian_daughter',
  SOLO_GIRL: 'solo_girl',
  BEST_FRIEND_GLAM: 'best_friend_glam',
  GLOBAL_ROOMS: 'global_rooms',
};

export const MODE_META = {
  [MODES.DAD_DAUGHTER]: {
    title: 'Dad + Daughter Mode', icon: '\u{1F468}\u200D\u{1F467}',
    subtitle: 'Learn together, level up together.', minAge: 0,
  },
  [MODES.MOM_DAUGHTER]: {
    title: 'Mom + Daughter Mode', icon: '\u{1F469}\u200D\u{1F467}',
    subtitle: 'Her routine, her shades, her voice.', minAge: 0,
  },
  [MODES.GUARDIAN_DAUGHTER]: {
    title: 'Guardian + Daughter Mode', icon: '\u{1F91D}',
    subtitle: 'Grandma, auntie, foster parent, chosen family.', minAge: 0,
  },
  [MODES.SOLO_GIRL]: {
    title: 'Solo Girl Mode', icon: '\u2728',
    subtitle: 'Just for you, at your own pace.', minAge: 0,
  },
  [MODES.BEST_FRIEND_GLAM]: {
    title: 'Best Friend Glam Mode', icon: '\u{1F46F}',
    subtitle: 'Glam with your person.', minAge: 13,
  },
  [MODES.GLOBAL_ROOMS]: {
    title: 'Global Beauty Bond Rooms', icon: '\u{1F30D}',
    subtitle: 'Beauty from everywhere.', minAge: 16,
  },
};

/** Modes that pair two people. Drives the dual-avatar header and Bond Meter. */
export const RELATIONAL_MODES = [
  MODES.DAD_DAUGHTER, MODES.MOM_DAUGHTER,
  MODES.GUARDIAN_DAUGHTER, MODES.BEST_FRIEND_GLAM,
];

/**
 * HomeScreen sections — docs/wireframes.md W-11.
 */
export const HOME_SECTIONS = [
  { key: 'safe_learning', title: 'Safe Makeup Learning', icon: '\u{1F9FC}',
    blurb: 'Brushes, shades, and skin — the safe way.', route: 'SafeLearning' },
  { key: 'cultural', title: 'Cultural Beauty Library', icon: '\u{1F30D}',
    blurb: 'Beauty has roots. Learn them.', route: 'CulturalLibrary' },
  { key: 'bonding', title: 'Bonding & Memories', icon: '\u{1F49B}',
    blurb: 'Challenges, memories, and legacy looks.', route: 'Bond' },
  { key: 'tryon', title: 'AI Try-On', icon: '\u{1F484}',
    blurb: 'See a look before you wear it.', route: 'TryOn' },
  { key: 'rooms', title: 'Live Glam Rooms', icon: '\u{1F3A5}',
    blurb: 'Get ready together, anywhere.', route: 'LiveRoom' },
];

/** SafeLearningScreen topics. */
export const SAFE_LEARNING_TOPICS = [
  { key: 'brush_basics', title: 'Brush Basics', icon: '\u{1F58C}', minAge: 5,
    blurb: 'What each brush does, how to hold it, how to clean it.' },
  { key: 'shade_matching_kids', title: 'Shade Matching for Kids', icon: '\u{1F3A8}', minAge: 6,
    blurb: 'Finding your depth and undertone — no wrong answers.' },
  { key: 'blush_powder_safety', title: 'Blush & Powder Safety', icon: '\u{1F338}', minAge: 6,
    blurb: 'Light hands, clean tools, and never near the eyes.' },
  { key: 'eye_safety', title: 'Eye Safety', icon: '\u{1F441}', minAge: 8,
    blurb: 'Never share mascara. Never the waterline. Know the warning signs.' },
  { key: 'skin_care_basics', title: 'Skin Care Basics', icon: '\u{1F9F4}', minAge: 5,
    blurb: 'Cleanse, moisturize, SPF, and how to patch test.' },
];

/** CulturalLibraryScreen collections. */
export const CULTURAL_COLLECTIONS = [
  { slug: 'black_beauty', name: 'Black Beauty',
    blurb: 'Deep-shade matching, edge artistry, bold lip, ashy-cast fixes.' },
  { slug: 'latina_beauty', name: 'Latina Beauty',
    blurb: 'Olive undertones, brow architecture, glossy lip traditions.' },
  { slug: 'middle_eastern_beauty', name: 'Middle Eastern Beauty',
    blurb: 'Kohl history and safe modern liner, henna, bridal traditions.' },
  { slug: 'south_asian_beauty', name: 'South Asian Beauty',
    blurb: 'Bridal and festival glam, gold pigment work, colorism addressed.' },
  { slug: 'east_asian_beauty', name: 'East Asian Beauty',
    blurb: 'Skincare-first layering, straight brow, gradient lip, monolid liner.' },
  { slug: 'indigenous_mixed_beauty', name: 'Indigenous & Mixed-Race Beauty',
    blurb: 'Nation-credited traditions and multiheritage shade matching.' },
];

/** BondScreen sections. */
export const BOND_SECTIONS = [
  { key: 'dad_learns', title: 'Dad Learns Makeup', icon: '\u{1F393}',
    blurb: '60-second skills, zero jargon, no shame.' },
  { key: 'daughter_teaches', title: 'Daughter Teaches Dad', icon: '\u{1F9D1}\u200D\u{1F3EB}',
    blurb: 'She runs the lesson. He follows.' },
  { key: 'challenges', title: 'Bonding Challenges', icon: '\u{1F3AF}',
    blurb: 'Weekly missions you finish together.' },
  { key: 'memories', title: 'Memory Gallery', icon: '\u{1F5BC}',
    blurb: 'Your looks, your year, your keepsake.' },
  { key: 'journal', title: 'Healing Journal', icon: '\u{1F4D3}',
    blurb: 'Private. Yours. No streaks, no pressure.' },
  { key: 'legacy', title: "Mom's Legacy Looks", icon: '\u{1F49B}',
    blurb: 'Her signature look, her voice, her letters forward.' },
];

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
