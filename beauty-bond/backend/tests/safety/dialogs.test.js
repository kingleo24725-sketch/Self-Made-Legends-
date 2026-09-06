/**
 * Dad + Daughter Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 * Proprietary and confidential. Unauthorized use is prohibited.
 *
 * React Native's Alert is not cross-platform in the two ways that matter:
 *
 *   - Alert.prompt exists only on iOS. "Add someone" in the Vault — the whole
 *     point of v1 — used it, and on Android and web fell through to a message
 *     that said "arrives in the next update". A dead button, dressed as a plan.
 *   - Alert.alert on react-native-web is `static alert() {}`. Every error and
 *     every confirmation silently did nothing in a browser, and one Promise
 *     that waited for its button hung forever.
 *
 * So the app has exactly one way to ask a person something — utils/dialog.js,
 * rendered by DialogHost — and these tests keep Alert from creeping back.
 */
const fs = require('fs');
const path = require('path');

const APP = path.join(__dirname, '../../../app');
const read = (rel) => fs.readFileSync(path.join(APP, rel), 'utf8');

const SKIP = new Set(['node_modules', '.expo', 'android', 'ios', '_disabled']);
function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.') || SKIP.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith('.js')) out.push(p);
  }
  return out;
}
const sources = walk(APP);

/** Source with block and line comments removed — prose must never trip a guard. */
const code = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

/** An `Alert` named in an import from react-native — comments don't count. */
const importsAlert = (src) =>
  /import\s*\{[^}]*\bAlert\b[^}]*\}\s*from\s*'react-native'/.test(src);

describe('the app never reaches for React Native Alert', () => {
  test('the walk found the app', () => {
    expect(sources.length).toBeGreaterThan(50);
  });

  test('no file in the bundle graph imports Alert from react-native', () => {
    const offenders = sources
      .filter((f) => importsAlert(fs.readFileSync(f, 'utf8')))
      .map((f) => path.relative(APP, f));
    expect(offenders).toEqual([]);
  });

  test('Alert.prompt — iOS only — appears nowhere reachable', () => {
    const offenders = sources
      .filter((f) => /Alert\.prompt/.test(code(fs.readFileSync(f, 'utf8'))))
      .map((f) => path.relative(APP, f));
    expect(offenders).toEqual([]);
  });

  test('the "arrives in the next update" dead-end copy is gone', () => {
    const offenders = sources
      .filter((f) => /arrives in the next update|arrives with shade matching/.test(code(fs.readFileSync(f, 'utf8'))))
      .map((f) => path.relative(APP, f));
    expect(offenders).toEqual([]);
  });
});

describe('the replacement is actually wired', () => {
  test('DialogHost is mounted once, in App.js, after the navigator', () => {
    const app = read('App.js');
    expect(app).toMatch(/import DialogHost from '\.\/components\/Modals\/DialogHost'/);
    const nav = app.indexOf('<AppNavigator />');
    const host = app.indexOf('<DialogHost />');
    expect(nav).toBeGreaterThan(-1);
    expect(host).toBeGreaterThan(nav);
    expect(app.match(/<DialogHost \/>/g)).toHaveLength(1);
  });

  test('the host is built on Modal, which web implements — not Alert', () => {
    const host = read('components/Modals/DialogHost.js');
    expect(host).toMatch(/\bModal\b/);
    expect(importsAlert(host)).toBe(false);
  });

  test('the Vault and the journal use a real prompt', () => {
    const legacy = read('screens/LegacyScreen.js');
    expect(legacy).toMatch(/await dialog\.prompt\(\s*'Who are we remembering\?'/);
    expect(legacy).toMatch(/await dialog\.prompt\(\s*'Write it down'/);
    // The irreversibility notice must gate the FIRST entry as a real await,
    // not a Promise around a callback that web never fires.
    expect(legacy).toMatch(/const understood = await dialog\.confirm\(/);
  });
});

/**
 * A detector that cannot fire is decoration. The archived LiveKit screen is
 * the known positive — it really does import Alert — and it is excluded from
 * the walk, so it proves both halves.
 */
describe('the detector works', () => {
  test('it fires on a file that does import Alert', () => {
    const archived = read('screens/_disabled/LiveRoomScreen.livekit.js');
    expect(importsAlert(archived)).toBe(true);
  });

  test('and that file is not in the walk', () => {
    expect(sources.some((f) => f.includes('_disabled'))).toBe(false);
  });
});
