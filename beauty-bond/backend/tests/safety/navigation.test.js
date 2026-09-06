/**
 * Dad + Daughter Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 * Proprietary and confidential. Unauthorized use is prohibited.
 *
 * A navigate() to an unregistered screen does not fail at build time — it
 * throws at the moment a person taps it. One shipped that way (the Respect
 * note, reachable from the Cultural Library), so this checks every literal
 * navigation target and every route named in the shared constants.
 */
const fs = require('fs');
const path = require('path');

const APP = path.join(__dirname, '../../../app');
const read = (rel) => fs.readFileSync(path.join(APP, rel), 'utf8');

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== 'node_modules') walk(p, out); }
    else if (p.endsWith('.js')) out.push(p);
  }
  return out;
}

const nav = read('navigation/AppNavigator.js');
const registered = new Set(
  [...nav.matchAll(/<(?:Stack|Tab)\.Screen\s+name="(\w+)"/g)].map((m) => m[1]));

describe('every navigation target is registered', () => {
  test('literal navigate() calls', () => {
    const missing = new Set();
    walk(APP).forEach((f) => {
      const src = fs.readFileSync(f, 'utf8');
      for (const m of src.matchAll(/navigation\.navigate\(\s*'(\w+)'/g)) {
        if (!registered.has(m[1])) missing.add(`${m[1]}  (${path.relative(APP, f)})`);
      }
    });
    expect([...missing]).toEqual([]);
  });

  test('routes named in HOME_SECTIONS', () => {
    const constants = read('utils/constants.js');
    const block = constants.match(/HOME_SECTIONS = \[([\s\S]*?)\n\];/)[1];
    const routes = [...block.matchAll(/route:\s*'(\w+)'/g)].map((m) => m[1]);
    expect(routes.length).toBeGreaterThan(0);
    routes.forEach((r) => expect(registered.has(r)).toBe(true));
  });

  /**
   * Registered-somewhere is not enough. The stack is swapped by auth status,
   * so a screen in the authed group simply does not exist while anon. The age
   * gate navigated to ModeSelection — authed-only — which threw for every new
   * user at the last step of onboarding, and the test above could not see it
   * because ModeSelection *is* registered, just not there.
   */
  describe('the anonymous stack is self-contained', () => {
    const groupFor = (label) => {
      const i = nav.indexOf(`status === '${label}'`);
      if (i === -1) return '';
      // Up to the start of the next status group, or the end of the navigator.
      const rest = nav.slice(i);
      const next = rest.slice(1).search(/status === '/);
      return next === -1 ? rest : rest.slice(0, next + 1);
    };

    const anonGroup = groupFor('anon');
    const anonScreens = new Set(
      [...anonGroup.matchAll(/<Stack\.Screen\s+name="(\w+)"/g)].map((m) => m[1]));

    test('the anon group registers the screens onboarding needs', () => {
      ['Welcome', 'AgeGate', 'SignIn', 'SignUp', 'GuardianHandoff']
        .forEach((name) => expect(anonScreens.has(name)).toBe(true));
    });

    test('no anon screen navigates somewhere only an authed user can reach', () => {
      const authedOnly = new Set(
        [...groupFor('authed').matchAll(/<Stack\.Screen\s+name="(\w+)"/g)]
          .map((m) => m[1])
          .filter((n) => !anonScreens.has(n)));

      const escapes = [];
      anonScreens.forEach((screen) => {
        const file = path.join(APP, 'screens', `${screen}Screen.js`);
        if (!fs.existsSync(file)) return;
        const src = fs.readFileSync(file, 'utf8');
        for (const m of src.matchAll(/navigation\.navigate\(\s*'(\w+)'/g)) {
          if (authedOnly.has(m[1])) escapes.push(`${screen} -> ${m[1]}`);
        }
      });
      expect(escapes).toEqual([]);
    });
  });

  test('every screen file is actually mounted somewhere', () => {
    // SplashScreen is mounted in App.js rather than the navigator, since it
    // has to render before the providers are ready. Both count as wired.
    const appEntry = read('App.js');
    const orphans = fs.readdirSync(path.join(APP, 'screens'))
      .filter((f) => f.endsWith('Screen.js'))
      .map((f) => f.replace('.js', ''))
      .filter((name) => !nav.includes(name) && !appEntry.includes(name));
    expect(orphans).toEqual([]);
  });
});

/**
 * A navigator with zero screens is not an empty screen — React Navigation
 * throws, and the app dies before its first paint. AuthContext starts in
 * status 'loading' while it reads the refresh token, and the navigator had
 * groups for 'anon', 'consent_pending' and 'authed' only. On web, where the
 * splash did not mask the window, every fresh load crashed with "Couldn't
 * find any screens for the navigator".
 *
 * So: every status AuthContext can set must reach at least one screen, and
 * the fallback must actually be exercised by the real initial state.
 */
describe('every auth status maps to at least one screen', () => {
  const auth = read('context/AuthContext.js');
  // Every quoted word passed to setStatus — INCLUDING inside a ternary, which
  // is how consent_pending/authed are set. A literal-argument regex missed
  // both and under-counted, which is a test that passes while lying.
  const statuses = new Set([
    ...[...auth.matchAll(/setStatus\(([^)]*)\)/g)]
      .flatMap((m) => [...m[1].matchAll(/'(\w+)'/g)].map((q) => q[1])),
    ...[...auth.matchAll(/useState\('(\w+)'\)/g)].map((m) => m[1]),
  ]);
  const routed = new Set(
    (nav.match(/ROUTED_STATUSES = \[([^\]]*)\]/) || ['', ''])[1]
      .match(/'(\w+)'/g)?.map((q) => q.replace(/'/g, '')) ?? []);

  test('AuthContext statuses were actually found', () => {
    expect(statuses.size).toBeGreaterThanOrEqual(4);
    expect(statuses.has('loading')).toBe(true);
  });

  test('every routed status has a group with at least one screen', () => {
    routed.forEach((st) => {
      const group = nav.slice(nav.indexOf(`status === '${st}'`));
      expect(/<Stack\.Screen\s+name="\w+"/.test(group)).toBe(true);
    });
  });

  test('a status the navigator does not route falls back to a screen, never to nothing', () => {
    expect(nav).toMatch(/const booting = !ROUTED_STATUSES\.includes\(status\)/);
    expect(nav).toMatch(/\{booting && \(\s*<Stack\.Screen\s+name="Booting"/);
  });

  test("the real initial state ('loading') takes that fallback", () => {
    // The detector proving itself: if 'loading' were ever added to
    // ROUTED_STATUSES without a group, the test above would still pass while
    // the app broke. Pin it to the fallback instead.
    expect(routed.has('loading')).toBe(false);
  });

  test('no AuthContext status is unreachable by either route', () => {
    const unreached = [...statuses].filter((st) =>
      !routed.has(st) && !nav.includes('name="Booting"'));
    expect(unreached).toEqual([]);
  });
});
