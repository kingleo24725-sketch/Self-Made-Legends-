/**
 * Dad + Daughter Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 * Proprietary and confidential. Unauthorized use is prohibited.
 *
 * The mark is "Dad + Daughter Beauty Bond™" and it spans 134 files. It was
 * briefly "Dads & Daughters Beauty Bond" and was changed back, so both a stale
 * template and a half-finished rename are live risks: one file copied from the
 * wrong source and the wrong mark lands on a store listing or a trademark
 * filing.
 *
 * The plural form is what these tests forbid. Note the brand and the MODE label
 * share a prefix — "Dad + Daughter Mode" is correct and must survive — so the
 * checks below always anchor on the words "Beauty Bond", never on the bare
 * prefix.
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

/**
 * The brand, in both casings it legitimately appears in. The `+` is escaped —
 * unescaped it is a quantifier, so the pattern would silently match
 * "Dad  Daughter Beauty Bond" while missing the real mark.
 */
const BRAND = /Dad \+ Daughter Beauty Bond|DAD \+ DAUGHTER BEAUTY BOND/;

/** The retired plural mark. Anchored on "Beauty Bond" so no mode label matches. */
const RETIRED_BRAND = /Dads ?& ?Daughters Beauty Bond/i;

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
        // Literal, not a pattern: an unescaped + here is a quantifier.
        expect(head).toContain(
          'DAD + DAUGHTER BEAUTY BOND™ — A SELF-MADE LEGENDS LLC (SML) PRODUCT');
      });
  });

  test('the app store name and slug match the brand', () => {
    const { expo } = JSON.parse(fs.readFileSync(path.join(ROOT, 'app/app.json'), 'utf8'));
    expect(expo.name).toBe('Dad + Daughter Beauty Bond');
    expect(expo.slug).toBe('dad-daughter-beauty-bond');
  });
});

describe('the mode label shares the brand prefix and must not be caught by it', () => {
  test('"Dad + Daughter Mode" still exists as a mode label', () => {
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
