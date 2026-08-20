/**
 * Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 *
 * RELEASE BLOCKER — the age gate must ALWAYS precede the entitlement gate.
 * A 9-year-old must never be able to buy access to age-restricted content.
 * docs/api-reference.md §6.6.
 */
const fs = require('fs');
const path = require('path');

const API_DIR = path.join(__dirname, '../../src/api');

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : p.endsWith('.js') ? [p] : [];
  });
}

describe('middleware ordering', () => {
  const files = walk(API_DIR);

  test.each(files)('%s puts any age gate before any entitlement gate', (file) => {
    const src = fs.readFileSync(file, 'utf8');
    const lines = src.split('\n');

    lines.forEach((line, i) => {
      if (!line.includes('requireEntitlement(')) return;
      // Scan the surrounding route registration for an age/guardian gate.
      const window = lines.slice(Math.max(0, i - 8), i).join('\n');
      const hasAgeGate = /requireAgeBand\(|requireGuardianPermission\(/.test(window);
      const laterAgeGate = lines.slice(i + 1, i + 8).join('\n');
      // If an age gate exists for this route, it must NOT come after.
      if (/requireAgeBand\(|requireGuardianPermission\(/.test(laterAgeGate) && !hasAgeGate) {
        throw new Error(
          `${file}:${i + 1} — entitlement gate precedes the age gate. ` +
          'Age gates are a compliance boundary and must run first.');
      }
    });
  });

  test('an age-restricted rejection is 403, never 402', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '../../src/middleware/requireAgeBand.js'), 'utf8');
    expect(src).toMatch(/status\(403\)/);
    expect(src).not.toMatch(/status\(402\)/);
  });
});
