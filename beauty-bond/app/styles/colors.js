/**
 * Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 * Proprietary and confidential.
 *
 * Source of truth: docs/branding.md §7.3 and §7.7.
 * Never hardcode a hex value in a component — import from here.
 */

export const brand = {
  roseGold: '#E8A87C',
  roseGoldDeep: '#D08A5C',
  deepPlum: '#3D2645',
  plumSoft: '#5C3D66',
  cream: '#FDF6F0',
  warmWhite: '#FFFCF9',
  cocoa: '#2A1F1C',
};

export const accent = {
  gold: '#D4AF37',
  blush: '#F4C2C2',
  terracotta: '#C1654F',
  sage: '#8FA68E',
  midnight: '#1A1523',
};

export const semantic = {
  success: { light: '#5A8F5E', dark: '#7FB183' },
  warning: { light: '#C98A3C', dark: '#E0A65C' },
  // Deliberately muted: a panic button must be findable, not frightening to a child.
  danger: { light: '#B54848', dark: '#D96A6A' },
  info: { light: '#5B7C99', dark: '#7FA3C0' },
};

export const surface = {
  ground: { light: '#FDF6F0', dark: '#1A1523' },
  raised: { light: '#FFFCF9', dark: '#2A2033' },
  textPrimary: { light: '#2A1F1C', dark: '#FDF6F0' },
  textSecondary: { light: '#6B5A54', dark: '#C4B5BD' },
  border: { light: 'rgba(42,31,28,.08)', dark: 'rgba(253,246,240,.10)' },
};

/** Mode accents — docs/branding.md §7.3. */
export const modeAccent = {
  dad_daughter:      { accent: '#E8A87C', gradient: ['#E8A87C', '#C1654F'] },
  mom_daughter:      { accent: '#D4AF37', gradient: ['#D4AF37', '#3D2645'] },
  guardian_daughter: { accent: '#8FA68E', gradient: ['#8FA68E', '#E8A87C'] },
  solo_girl:         { accent: '#5C3D66', gradient: ['#5C3D66', '#3D2645'] },
  best_friend_glam:  { accent: '#C1654F', gradient: ['#C1654F', '#F4C2C2'] },
  global_rooms:      { accent: '#8FA68E', gradient: ['#8FA68E', '#3D2645'] },
};

/**
 * 16-step depth scale for shade matching and swatches.
 * Perceptually EVEN across the full range — the deep end is never compressed.
 * docs/wireframes.md W-04 [!] and docs/branding.md §7.3.
 */
export const shadeScale = [
  '#F7E0D0', '#F2D4BF', '#EBC7AC', '#E4B998',
  '#D9A883', '#CE9871', '#C08862', '#B27953',
  '#A46B45', '#96603E', '#875637', '#764A30',
  '#5E3A26', '#4E2F1F', '#3F2519', '#2F1B12',
];

/** Resolve a themed token. `scheme` is 'light' | 'dark'. */
export const themed = (token, scheme = 'light') => token[scheme];

/**
 * Accessibility note (docs/branding.md §7.3):
 * roseGold on cream is 2.1:1 — fills, borders, and icons only, NEVER body text.
 * Text on a roseGold button is `cocoa`, not white (white fails at 2.4:1).
 */
export const onRoseGold = brand.cocoa;

export default { brand, accent, semantic, surface, modeAccent, shadeScale, themed, onRoseGold };
