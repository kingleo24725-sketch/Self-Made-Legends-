/**
 * Dad + Daughter Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 * Proprietary and confidential. Unauthorized use is prohibited.
 *
 * v1 ships FREE: no Stripe keys, so nothing commercial is gated.
 *
 * The rest of the suite runs with dummy Stripe keys in tests/setup.js, which
 * means it exercises the PAID ladder — the opposite of what actually ships.
 * This file loads the modules with billing unconfigured, so the shipping path
 * is covered too.
 *
 * The distinction that must hold: opening the commercial gates must not open
 * an age or safety gate. Those are separate middleware and are not reachable
 * from entitlements at all.
 */

describe('with billing unconfigured, as v1 ships', () => {
  let entitlements;
  let config;

  beforeAll(() => {
    jest.resetModules();
    delete process.env.STRIPE_SECRET_KEY_BB;
    delete process.env.STRIPE_WEBHOOK_SECRET_BB;
    config = require('../../src/config');
    entitlements = require('../../src/services/entitlements');
  });

  afterAll(() => {
    // Restore what tests/setup.js provides, so suite order cannot matter.
    process.env.STRIPE_SECRET_KEY_BB = 'sk_test_dummy_beauty_bond';
    process.env.STRIPE_WEBHOOK_SECRET_BB = 'whsec_test_dummy';
    jest.resetModules();
  });

  test('billing reports as disabled', () => {
    expect(config.enabled.billing).toBe(false);
  });

  test('the Legacy module is ungated — there is nothing to buy', () => {
    const { V1_UNGATED } = entitlements;
    expect(V1_UNGATED.lettersForward).toBe(true);
    expect(V1_UNGATED.vaultItems).toBe('unlimited');
  });

  test('the price catalogue is untouched, so turning billing on restores it', () => {
    const { PLANS, ENTITLEMENTS } = entitlements;
    expect(PLANS.basic.monthly).toBe(699);
    expect(PLANS.premium.monthly).toBe(999);
    expect(PLANS.family.monthly).toBe(1299);

    // The ladder itself must not have been edited to fake a free v1.
    expect(ENTITLEMENTS.free.lettersForward).toBe(false);
    expect(ENTITLEMENTS.premium.lettersForward).toBe(true);
    expect(ENTITLEMENTS.free.vaultItems).toBe(3);
  });

  test('opening commercial gates does not touch safety guarantees', () => {
    const { ALWAYS_FREE } = entitlements;
    ['safety.panic_button', 'safety.report', 'safety.block',
     'guardian.console', 'privacy.data_export', 'privacy.account_delete',
     'legacy.letter_delivery',
    ].forEach((cap) => expect(ALWAYS_FREE.has(cap)).toBe(true));
  });

  test('v1 grants ONLY the Legacy module, not try-on or room limits', () => {
    // Both features are switched off in the app; silently unlocking their
    // quotas would be a lie in the payload and a surprise when they return.
    const { V1_UNGATED } = entitlements;
    expect(V1_UNGATED).not.toHaveProperty('tryOnPerMonth');
    expect(V1_UNGATED).not.toHaveProperty('familyRoomMinutesPerMonth');
    expect(V1_UNGATED).not.toHaveProperty('globalRooms');
  });
});

describe('the app ships with try-on and rooms switched off', () => {
  const fs = require('fs');
  const path = require('path');
  const APP = path.join(__dirname, '../../../app');
  const read = (rel) => fs.readFileSync(path.join(APP, rel), 'utf8');

  test('app.json declares the v1 scope', () => {
    const { expo } = JSON.parse(read('app.json'));
    expect(expo.extra.features).toEqual({
      tryOn: false, rooms: false, billing: false,
    });
  });

  test('the home sections are filtered by the flag, not hardcoded', () => {
    const constants = read('utils/constants.js');
    expect(constants).toContain('visibleHomeSections');
    // The full catalogue survives so nothing is rewritten when a flag flips.
    expect(constants).toContain("route: 'TryOn'");
    expect(constants).toContain("route: 'LiveRoom'");
  });

  test('the gated tabs and screens are conditional, not deleted', () => {
    const nav = read('navigation/AppNavigator.js');
    expect(nav).toMatch(/featureOn\('tryOn'\)/);
    expect(nav).toMatch(/featureOn\('rooms'\)/);
    // Still imported: hidden, not removed.
    expect(nav).toContain('TryOnScreen');
    expect(nav).toContain('LiveRoomScreen');
  });

  test('Legacy is a tab — it is the centre of v1', () => {
    expect(read('navigation/AppNavigator.js'))
      .toMatch(/<Tab\.Screen name="Legacy"/);
  });

  test('no visible screen still navigates into a hidden feature', () => {
    // LegacyScreen used to send people to try-on for "her signature look";
    // ProfileScreen to ShadeMatch. Both must be closed or flag-guarded.
    const legacy = read('screens/LegacyScreen.js');
    expect(legacy).not.toMatch(/navigate\('TryOn'/);

    const profile = read('screens/ProfileScreen.js');
    if (/navigate\('ShadeMatch'/.test(profile)) {
      expect(profile).toMatch(/featureOn\('tryOn'\)[\s\S]{0,60}navigate\('ShadeMatch'/);
    }
  });
});

/**
 * The app is ESM and this suite is CommonJS, so — like navigation.test.js and
 * modes.test.js — these read the source rather than importing it.
 */
describe('Remembrance Mode actually changes the app', () => {
  const fs = require('fs');
  const path = require('path');
  const APP = path.join(__dirname, '../../../app');
  const read = (rel) => fs.readFileSync(path.join(APP, rel), 'utf8');

  test('the theme takes it as an input', () => {
    const theme = read('styles/theme.js');
    expect(theme).toMatch(/remembrance\s*=\s*false/);
    expect(theme).toContain('suppressStreaks');
  });

  test('the profile flag is actually plumbed into the theme', () => {
    // It was stored, toggleable and PATCHable, and read by nothing at all.
    expect(read('context/ThemeContext.js')).toContain('remembranceMode');
  });

  test('the screens that show streaks honour it', () => {
    ['screens/HomeScreen.js', 'screens/ProfileScreen.js'].forEach((f) => {
      expect(read(f)).toContain('suppressStreaks');
    });
  });

  test('helplines are region-aware, not one hardcoded global URL', () => {
    const constants = read('utils/constants.js');
    expect(constants).toContain('HELPLINES');
    ['US', 'GB', 'AU', 'DEFAULT'].forEach((r) => expect(constants).toContain(`${r}:`));
    expect(read('screens/LegacyScreen.js')).toContain('HELPLINES[profile?.region]');
  });
});

/* ── Unconfigured features must fail closed, and say so ───────────── */

describe('an unconfigured feature is not an outage', () => {
  const fs = require('fs');
  const path = require('path');
  let app;
  let request;

  beforeAll(() => {
    jest.resetModules();
    delete process.env.STRIPE_SECRET_KEY_BB;
    delete process.env.STRIPE_WEBHOOK_SECRET_BB;
    delete process.env.LIVEKIT_API_KEY;
    delete process.env.LIVEKIT_API_SECRET;
    delete process.env.LIVEKIT_WS_URL;
    delete process.env.ML_SERVICE_URL;
    request = require('supertest');
    app = require('../../src/server');
  });

  afterAll(async () => {
    const db = require('../../src/config/db');
    await db.pool.end().catch(() => { /* pool may be unused in this suite */ });

    process.env.STRIPE_SECRET_KEY_BB = 'sk_test_dummy_beauty_bond';
    process.env.STRIPE_WEBHOOK_SECRET_BB = 'whsec_test_dummy';
    process.env.LIVEKIT_API_KEY = 'test-livekit-key';
    process.env.LIVEKIT_API_SECRET = 'test-livekit-secret';
    process.env.LIVEKIT_WS_URL = 'wss://test.livekit.local';
    process.env.ML_SERVICE_URL = 'http://localhost:9000';
    jest.resetModules();
  });

  test('/health reports the credential-backed features as off', async () => {
    const res = await request(app).get('/health');
    expect(res.body.ok).toBe(true);
    expect(res.body.features.billing).toBe(false);
    expect(res.body.features.video).toBe(false);
  });

  test('ml is forced on outside production, and only there', () => {
    // config/index.js:46 — the mock provider runs locally so the try-on
    // pipeline is exercisable without an ML service. In production the flag
    // follows ML_SERVICE_URL, which is why a real deploy reports ml:false.
    const cfg = fs.readFileSync(
      path.join(__dirname, '../../src/config/index.js'), 'utf8');
    expect(cfg).toMatch(/if \(!isProd\) enabled\.ml = true/);
  });

  test('a 503 carries its real reason, not "internal_error"', () => {
    // A deploy with no ML_SERVICE_URL used to answer try-on with a 500 and
    // "Our side, not yours." — indistinguishable from the server being broken,
    // and it buried real outages in the same message as a missing setting.
    const handler = fs.readFileSync(
      path.join(__dirname, '../../src/middleware/errorHandler.js'), 'utf8');
    expect(handler).toMatch(/status === 503 && err\.publicMessage/);
  });

  test('all three services fail closed the same way', () => {
    const src = (rel) => fs.readFileSync(path.join(__dirname, '../../src', rel), 'utf8');
    // mlProvider had no guard at all; video and stripe already had one.
    expect(src('services/mlProvider.js')).toContain('requireMlConfigured');
    expect(src('services/mlProvider.js')).toMatch(/status = 503/);
    expect(src('services/videoService.js')).toMatch(/status = 503/);
    expect(src('services/stripeService.js')).toMatch(/status = 503/);
  });

  test('the v1 module works with nothing configured beyond the database', async () => {
    // This is exactly a fresh Railway deploy: DATABASE_URL and the two secrets.
    const res = await request(app).get('/api/legacy/people');
    // 401 (needs auth), not 503 or 500 — the feature itself is live.
    expect(res.status).toBe(401);
  });
});
