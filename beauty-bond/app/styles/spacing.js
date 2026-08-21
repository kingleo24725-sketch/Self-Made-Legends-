/**
 * Dads & Daughters Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 * Proprietary and confidential. Unauthorized copying, distribution,
 * or use of this file, via any medium, is strictly prohibited.
 *
 * Source of truth: docs/branding.md §7.5 and §7.7.
 */

/** 8pt grid. Index by step, not by raw number. */
export const space = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 24, 6: 32, 7: 48, 8: 64 };

export const radius = { sm: 8, md: 14, lg: 16, xl: 20, sheet: 28, pill: 999 };

/** Two elevation levels only. Soft, warm-tinted — never neutral grey. */
export const elevation = {
  1: { shadowColor: '#3D2645', shadowOpacity: 0.06, shadowRadius: 8,
       shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  2: { shadowColor: '#3D2645', shadowOpacity: 0.10, shadowRadius: 24,
       shadowOffset: { width: 0, height: 8 }, elevation: 8 },
};

export const gutter = { default: 16, child: 20 };

/** 44px minimum, 56px in Little Legend mode. docs/wireframes.md W-C1. */
export const tapTarget = { default: 44, child: 56 };

export const controlHeight = { button: 52, buttonChild: 60, input: 56, chip: 32 };

/** Nothing exceeds 900ms. docs/branding.md §7.5. */
export const motion = {
  tap: 100, screen: 300, sheet: 350,
  meter: 600, celebrate: 900,
  legacy: 400,   // fade only — no celebratory motion near grief
};

export default { space, radius, elevation, gutter, tapTarget, controlHeight, motion };
