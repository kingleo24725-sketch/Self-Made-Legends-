/**
 * Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 *
 * Source of truth: docs/branding.md §7.4.
 * Fraunces for emotional/headline only — never body, it tires at length.
 */

export const families = {
  display: 'Fraunces',   // variable serif, SOFT 30 / WONK 0
  body: 'Inter',
  child: 'Nunito',       // rounded terminals, friendlier for early readers
};

export const scale = {
  display:  { fontSize: 48, lineHeight: 52, fontWeight: '600', fontFamily: families.display },
  h1:       { fontSize: 32, lineHeight: 38, fontWeight: '600', fontFamily: families.display },
  h2:       { fontSize: 24, lineHeight: 30, fontWeight: '600', fontFamily: families.display },
  h3:       { fontSize: 20, lineHeight: 26, fontWeight: '600', fontFamily: families.body },
  bodyLg:   { fontSize: 18, lineHeight: 28, fontWeight: '400', fontFamily: families.body },
  body:     { fontSize: 16, lineHeight: 24, fontWeight: '400', fontFamily: families.body },
  bodySm:   { fontSize: 14, lineHeight: 20, fontWeight: '400', fontFamily: families.body },
  caption:  { fontSize: 12, lineHeight: 16, fontWeight: '500', fontFamily: families.body },
  overline: { fontSize: 11, lineHeight: 14, fontWeight: '600', letterSpacing: 0.88,
              textTransform: 'uppercase', fontFamily: families.body },
};

/**
 * Little Legend mode: every size +2pt, line-height +2, family -> Nunito,
 * minimum body 18pt. docs/branding.md §7.4.
 */
export function forChildMode(style) {
  return {
    ...style,
    fontSize: style.fontSize + 2,
    lineHeight: style.lineHeight + 2,
    fontFamily: families.child,
  };
}

/** Pick the right variant for the active mode. */
export function type(name, mode) {
  const base = scale[name];
  if (!base) throw new Error(`unknown type token: ${name}`);
  return mode === 'little_legend' ? forChildMode(base) : base;
}

export default { families, scale, type, forChildMode };
