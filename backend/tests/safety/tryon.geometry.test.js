/**
 * Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 *
 * RELEASE BLOCKER. These tests must never be deleted or skipped.
 * docs/ai-tryon.md §4.6.
 */
const { sanitizeLook, ALLOWED_LAYERS } = require('../../src/services/aiService');

describe('try-on safety: cosmetics only, never geometry', () => {
  test('rejects any layer type outside the closed enum', () => {
    const evil = { layers: [
      { type: 'lip' },
      { type: 'reshape', jaw: -0.2 },      // face slimming
      { type: 'skin_smooth' },              // retouching
      { type: 'skin_lighten' },             // tone alteration
    ] };
    const out = sanitizeLook(evil, 'adult');
    expect(out.layers).toHaveLength(1);
    expect(out.layers[0].type).toBe('lip');
  });

  test('the allowed layer enum contains no geometry or skin-tone operations', () => {
    const forbidden = ['reshape', 'slim', 'smooth', 'lighten', 'whiten', 'warp', 'retouch'];
    forbidden.forEach((f) => expect(ALLOWED_LAYERS).not.toContain(f));
  });
});

describe('try-on safety: minors', () => {
  test('child accounts get stylized, low-opacity pigment only', () => {
    const look = { layers: [
      { type: 'lip', opacity: 1 },
      { type: 'eye', opacity: 0.9 },       // not permitted for U13
      { type: 'liner', opacity: 0.9 },     // not permitted for U13
      { type: 'cheek', opacity: 0.9 },
    ] };
    const out = sanitizeLook(look, 'child');

    expect(out.style).toBe('playful');
    expect(out.layers.map((l) => l.type).sort()).toEqual(['cheek', 'lip']);
    out.layers.forEach((l) => {
      expect(l.opacity).toBeLessThanOrEqual(0.5);
      expect(l.finish).toBe('sheer');
    });
  });

  test('adults keep realistic rendering', () => {
    const out = sanitizeLook({ layers: [{ type: 'lip', opacity: 0.9 }] }, 'adult');
    expect(out.style).toBe('realistic');
    expect(out.layers[0].opacity).toBe(0.9);
  });
});
