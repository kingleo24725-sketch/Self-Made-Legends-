/**
 * Dad + Daughter Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 * Proprietary and confidential. Unauthorized use is prohibited.
 *
 * A native module and its Expo config plugin are ONE decision, not two.
 *
 * @stripe/stripe-react-native shipped for months with no plugin registered in
 * app.json. On Android that SDK needs its plugin to force an AppCompat theme,
 * and StripeProvider was mounted at the root of App.js — so the first real
 * Android build was set up to install and then crash on launch, for a feature
 * (billing) that is switched off. @livekit/react-native had the same shape.
 *
 * These are release blockers because the failure is invisible until a device
 * runs the binary: it cannot be caught by lint, by `expo export`, or by any
 * test that only bundles JavaScript.
 *
 * Two rules:
 *   1. A feature that is OFF does not carry its native SDK into the build.
 *   2. A feature that is ON carries BOTH the SDK and its config plugin.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../../..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const json = (rel) => JSON.parse(read(rel));

const { expo } = json('app/app.json');
const pkg = json('app/package.json');

const features = expo.extra.features;
const deps = { ...pkg.dependencies, ...pkg.devDependencies };
/** Plugin entries are either "name" or ["name", {...}]. */
const plugins = (expo.plugins ?? []).map((p) => (Array.isArray(p) ? p[0] : p));

/**
 * Every native SDK that is gated behind a feature flag, and the Expo config
 * plugin it cannot safely ship without. Add a row here when adding a gated
 * native dependency — that is the point of the file.
 */
const GATED = [
  {
    feature: 'billing',
    packages: ['@stripe/stripe-react-native'],
    plugin: '@stripe/stripe-react-native',
    restore: 'docs/stripe-flow.md §3.9',
  },
  {
    feature: 'rooms',
    packages: ['@livekit/react-native', 'livekit-client'],
    plugin: '@livekit/react-native-expo-plugin',
    restore: 'docs/video-rooms.md §5.11',
  },
];

describe.each(GATED)('$feature', ({ feature, packages, plugin, restore }) => {
  const on = features[feature] === true;

  if (!on) {
    test.each(packages)('is off, so %s is not a dependency', (name) => {
      expect({ feature, package: name, installed: name in deps, restore })
        .toEqual({ feature, package: name, installed: false, restore });
    });

    test('is off, so its config plugin is not registered either', () => {
      expect(plugins).not.toContain(plugin);
    });
  } else {
    test.each(packages)('is on, so %s must be installed', (name) => {
      expect(name in deps).toBe(true);
    });

    // The rule that would have caught the crash.
    test(`is on, so ${plugin} must be in app.json -> expo.plugins`, () => {
      expect(plugins).toContain(plugin);
    });
  }
});

/**
 * The dependency check alone is not enough. A module-scope import is what puts
 * a file in the Metro bundle, and `featureOn()` decides whether a screen is
 * REGISTERED, never whether it is BUNDLED — which is why
 * screens/LiveRoomScreen.js is a placeholder rather than the real screen.
 */
describe('nothing in the bundle graph imports a switched-off SDK', () => {
  const SKIP = new Set(['node_modules', '.expo', 'dist', 'android', 'ios',
                        '_disabled']);   // _disabled/ is archive; nothing imports it

  function walk(dir, out = []) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.name.startsWith('.') || SKIP.has(e.name)) continue;
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full, out);
      else if (e.name.endsWith('.js')) out.push(full);
    }
    return out;
  }

  const sources = walk(path.join(ROOT, 'app'));

  /** Does this source actually IMPORT the package (vs merely name it)? */
  const importsPkg = (src, p) => new RegExp(
    String.raw`(?:from|require\s*\()\s*['"]${p.replace(/[/\-]/g, '\\$&')}['"]`,
  ).test(src);

  test('the walk actually found the app', () => {
    expect(sources.length).toBeGreaterThan(50);
  });

  /**
   * A detector that cannot fire is not a check. The archived screen is the
   * known-positive: it really does import LiveKit, and it really is excluded
   * from the walk above — so it proves both halves at once.
   */
  test('the detector fires on a file that does import one', () => {
    const archived = read('app/screens/_disabled/LiveRoomScreen.livekit.js');
    expect(importsPkg(archived, '@livekit/react-native')).toBe(true);
    expect(importsPkg(archived, 'livekit-client')).toBe(true);
  });

  test('the detector does NOT fire on a file that only names one in a comment', () => {
    const documented = read('app/hooks/useSubscription.js');
    expect(documented).toContain('@stripe/stripe-react-native');   // named in the restore steps
    expect(importsPkg(documented, '@stripe/stripe-react-native')).toBe(false);
  });

  test.each(GATED.filter((g) => features[g.feature] !== true))(
    '$feature is off, so no reachable file imports it', ({ packages, restore }) => {
      // Match import SYNTAX, not the package name. Quoting alone is not
      // enough — the restore procedures in these files legitimately name the
      // packages, and an earlier version of this test failed on its own
      // documentation. Only `from '…'` and `require('…')` bundle anything.
      const importing = sources
        .filter((f) => packages.some((p) => importsPkg(fs.readFileSync(f, 'utf8'), p)))
        .map((f) => path.relative(ROOT, f));

      expect({ importing, restore }).toEqual({ importing: [], restore });
    });

  test('the archived LiveKit screen is still there, and still out of the graph', () => {
    const archived = 'app/screens/_disabled/LiveRoomScreen.livekit.js';
    expect(fs.existsSync(path.join(ROOT, archived))).toBe(true);
    // Deleting the placeholder without restoring the real screen would break
    // AppNavigator's module-scope import.
    expect(fs.existsSync(path.join(ROOT, 'app/screens/LiveRoomScreen.js'))).toBe(true);
    expect(sources.some((f) => f.endsWith('_disabled/LiveRoomScreen.livekit.js')))
      .toBe(false);
  });
});
