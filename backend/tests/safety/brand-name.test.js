/**
 * Dads & Daughters Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 * Proprietary and confidential. Unauthorized use is prohibited.
 *
 * The product was renamed from "Dad + Daughter Beauty Bond" to
 * "Dads & Daughters Beauty Bond" across 125 files. A rename that wide leaks:
 * one file copied from an old template, one header pasted from memory, and the
 * old mark is back on a store listing or a trademark filing.
 *
 * These tests hold the new name and — just as importantly — hold the line
 * between the BRAND (renamed) and the MODE (not renamed). "Dad + Daughter" is
 * still the correct label for the relationship mode: one dad, one daughter.
 * Pluralizing it there would be wrong, so the retired-name check deliberately
 * only looks for the name followed by "Beauty Bond".
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../../..');

const SKIP_DIRS = new Set(['node_modules', '.git', '.expo', 'dist', 'build', 'coverage']);
const TEXT_EXT = new Set(['.js', '.jsx', '.ts', '.tsx', '.json', '.md', '.py', '.sql', '.yml', '.yaml']);

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') && entry.name !== '.env.example') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) walk(full, out);
    } else if (TEXT_EXT.has(path.extname(entry.name))) {
      out.push(full);
    }
  }
  return out;
}

const FILES = walk(ROOT);
const rel = (f) => path.relative(ROOT, f);

/** The brand, in every casing it legitimately appears in. */
const BRAND = /Dads & Daughters Beauty Bond|DADS & DAUGHTERS BEAUTY BOND/;

/** The retired brand — only ever "<name> Beauty Bond", never the bare mode label. */
const RETIRED_BRAND = /Dad ?\+ ?Daughter'?s? Beauty Bond/i;

describe('product name', () => {
  test('the retired brand name appears nowhere', () => {
    const offenders = FILES
      .filter((f) => f !== __filename)   // this file names it in order to forbid it
      .filter((f) => RETIRED_BRAND.test(fs.readFileSync(f, 'utf8')))
      .map(rel);
    expect(offenders).toEqual([]);
  });

  test('the ownership documents carry the current name', () => {
    ['README.md', 'NOTICE.md', 'LICENSE', 'BOOTSTRAP.md'].forEach((f) => {
      expect(fs.readFileSync(path.join(ROOT, f), 'utf8')).toMatch(BRAND);
    });
  });

  test('every doc under docs/ carries the SML attribution header', () => {
    fs.readdirSync(path.join(ROOT, 'docs'))
      .filter((f) => f.endsWith('.md'))
      .forEach((f) => {
        const head = fs.readFileSync(path.join(ROOT, 'docs', f), 'utf8').slice(0, 600);
        expect(head).toMatch(/DADS & DAUGHTERS BEAUTY BOND™ — A SELF-MADE LEGENDS LLC \(SML\) PRODUCT/);
      });
  });

  test('the app store name and slug match the brand', () => {
    const { expo } = JSON.parse(fs.readFileSync(path.join(ROOT, 'app/app.json'), 'utf8'));
    expect(expo.name).toBe('Dads & Daughters Beauty Bond');
    expect(expo.slug).toBe('dads-daughters-beauty-bond');
  });
});

describe('the mode label is NOT the brand and must survive the rename', () => {
  test('"Dad + Daughter" still exists as a mode label', () => {
    const constants = fs.readFileSync(path.join(ROOT, 'app/utils/constants.js'), 'utf8');
    expect(constants).toContain('Dad + Daughter Mode');
  });

  test('the dad_daughter mode key is untouched — the DB CHECK constraint reads it', () => {
    const modes = require('../../src/services/modes');
    expect(Object.values(modes.MODES)).toContain('dad_daughter');
  });
});

describe('internal identifiers are deliberately NOT renamed', () => {
  test('the Stripe product tag stays beauty_bond', () => {
    const config = require('../../src/config');
    expect(config.stripe.productTag).toBe('beauty_bond');
    expect(config.stripe.lookupKeyPrefix).toBe('bb_');
  });

  test('the iOS and Android bundle identifiers are unchanged', () => {
    const { expo } = JSON.parse(fs.readFileSync(path.join(ROOT, 'app/app.json'), 'utf8'));
    expect(expo.ios.bundleIdentifier).toBe('com.selfmadelegends.beautybond');
    expect(expo.android.package).toBe('com.selfmadelegends.beautybond');
  });
});
