/**
 * Dad + Daughter Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 * Proprietary and confidential. Unauthorized use is prohibited.
 *
 * The mode list exists in three places — the app, the backend, and a CHECK
 * constraint in SQL. A rename that misses one produces profiles the app
 * cannot render: an undefined mode chip and no accent colour, with nothing
 * failing loudly. That happened once; these tests are why it cannot again.
 */
const fs = require('fs');
const path = require('path');
const { VALID_MODES, defaultModeFor, isValidMode } = require('../../src/services/modes');

const read = (rel) => fs.readFileSync(path.join(__dirname, '../../..', rel), 'utf8');

/** Pull the mode values out of a source file's MODES object literal. */
function modesFrom(src) {
  const block = src.match(/MODES = \{([\s\S]*?)\}/);
  if (!block) throw new Error('no MODES object found');
  return [...block[1].matchAll(/'([a-z_]+)'/g)].map((m) => m[1]).sort();
}

describe('mode list stays in step', () => {
  test('the app and the backend agree', () => {
    expect(modesFrom(read('app/utils/constants.js')))
      .toEqual([...VALID_MODES].sort());
  });

  test('the database constraint allows exactly those modes', () => {
    const sql = read('backend/src/config/migrations/001_initial_schema.sql');
    const check = sql.match(/CONSTRAINT mode_is_known CHECK \(mode IN \(([\s\S]*?)\)\)/);
    expect(check).not.toBeNull();
    const allowed = [...check[1].matchAll(/'([a-z_]+)'/g)].map((m) => m[1]).sort();
    expect(allowed).toEqual([...VALID_MODES].sort());
  });

  test('the column default is a mode that exists', () => {
    const sql = read('backend/src/config/migrations/001_initial_schema.sql');
    const def = sql.match(/mode\s+text NOT NULL DEFAULT '([a-z_]+)'/)[1];
    expect(isValidMode(def)).toBe(true);
  });
});

describe('new profiles get a usable mode', () => {
  test.each(['child', 'teen', 'adult'])('%s', (band) => {
    expect(isValidMode(defaultModeFor(band))).toBe(true);
  });

  test('a child starts guardian-linked, which is what we actually know', () => {
    expect(defaultModeFor('child')).toBe('guardian_daughter');
  });

  test('no retired name survives as a mode', () => {
    // Checked against the MODES lists specifically, not by searching whole
    // files — 'legacy' is also a Bond section key and a route name, and a
    // blunt string search would flag those.
    const RETIRED = ['little_legend', 'solo_glow', 'legacy', 'bff', 'global_glam'];
    const appModes = modesFrom(read('app/utils/constants.js'));
    RETIRED.forEach((m) => {
      expect(appModes).not.toContain(m);
      expect(VALID_MODES).not.toContain(m);
    });
  });

  test('profile creation writes a mode from the canonical list', () => {
    const src = read('backend/src/services/userService.js');
    expect(src).toContain('defaultModeFor');
    // A literal mode string here is how the last drift got in.
    expect(src).not.toMatch(/mode\s*[:=]\s*'[a-z_]+'/);
  });
});
