/**
 * Dad + Daughter Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
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
