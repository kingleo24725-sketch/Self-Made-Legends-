/**
 * Dad + Daughter Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 * Proprietary and confidential. Unauthorized copying, distribution,
 * or use of this file, via any medium, is strictly prohibited.
 */
import { AGE_BANDS, TRYON_LAYERS } from './constants';

export const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || '').trim());

/** Age band from a birth date. Drives every feature gate in the app. */
export function ageFromBirthDate(birthDate) {
  const d = new Date(birthDate);
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
  return age;
}

export function ageBandFor(birthDate) {
  const age = ageFromBirthDate(birthDate);
  if (age < 13) return AGE_BANDS.CHILD;
  if (age < 18) return AGE_BANDS.TEEN;
  return AGE_BANDS.ADULT;
}

/**
 * Strip any layer the age band disallows BEFORE building a try-on request.
 * The server re-applies the identical rules — a client can be patched.
 * docs/ai-tryon.md §4.6.
 */
export function sanitizeLook(look, ageBand) {
  const layers = (look.layers || []).filter((l) => TRYON_LAYERS.includes(l.type));

  if (ageBand === AGE_BANDS.CHILD) {
    // Little Legends get stylized pigment only — no liner, no photoreal cosmetics.
    return {
      ...look,
      layers: layers
        .filter((l) => ['lip', 'cheek', 'glow'].includes(l.type))
        .map((l) => ({ ...l, opacity: Math.min(l.opacity ?? 0.5, 0.5), finish: 'sheer' })),
      style: 'playful',
    };
  }
  return { ...look, layers, style: 'realistic' };
}

export const isStrongEnough = (pw) => String(pw || '').length >= 10;

/**
 * A date typed by a person on a phone, made into ISO — or null if it isn't
 * one. Accepts 2016-01-20, 2016/01/20 and 01/20/2016. Used wherever a prompt
 * asks for a date (adding a daughter, dating a Letter Forward), so the rule
 * for what counts as a date lives in one place.
 */
export function normaliseDate(raw) {
  const t = String(raw ?? '').trim();
  let m = t.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  m = t.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (m) return `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`;
  return null;
}
