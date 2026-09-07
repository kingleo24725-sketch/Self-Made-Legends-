/**
 * Dad + Daughter Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 * Proprietary and confidential. Unauthorized use is prohibited.
 *
 * A control that does nothing when tapped is a defect, not a placeholder.
 * Fourteen shipped that way — Settings rows, a lesson list, a "Start a
 * lesson" call to action, a wash coach, a share button — each reading as
 * "the app is broken" to the person pressing it. This refuses the pattern
 * in any screen that v1 actually shows.
 */
const fs = require('fs');
const path = require('path');

const SCREENS = path.join(__dirname, '../../../app/screens');

/**
 * Screens behind a feature flag that is OFF in v1 (utils/config.js). They
 * are unreachable, so their remaining stubs are not shipped defects — but
 * they must be finished before the flag is flipped, and this list is where
 * that debt is recorded.
 */
const GATED_OFF = new Set(['TryOnScreen.js', 'ShadeMatchScreen.js']);

const DEAD = /onPress=\{\s*\(\)\s*=>\s*\{\s*\}\s*\}/g;

describe('no shipped screen has a control wired to nothing', () => {
  const files = fs.readdirSync(SCREENS)
    .filter((f) => f.endsWith('Screen.js') && !GATED_OFF.has(f));

  test('the scan covers the screens', () => {
    expect(files.length).toBeGreaterThan(20);
  });

  test.each(files)('%s', (file) => {
    const src = fs.readFileSync(path.join(SCREENS, file), 'utf8');
    const hits = [...src.matchAll(DEAD)].map((m) => {
      const line = src.slice(0, m.index).split('\n').length;
      return `${file}:${line}`;
    });
    expect(hits).toEqual([]);
  });

  test('the gated-off list only names screens that are actually gated', () => {
    const nav = fs.readFileSync(path.join(SCREENS, '../navigation/AppNavigator.js'), 'utf8');
    GATED_OFF.forEach((f) => {
      const name = f.replace('Screen.js', '');
      // Registered only inside a featureOn(...) guard.
      const re = new RegExp(`featureOn\\('\\w+'\\) && \\([\\s\\S]{0,200}name="${name}"`);
      expect(nav).toMatch(re);
    });
  });
});
