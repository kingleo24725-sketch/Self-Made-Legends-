/**
 * Dad + Daughter Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 * Proprietary and confidential. Unauthorized copying, distribution,
 * or use of this file, via any medium, is strictly prohibited.
 *
 * Confirms every splash / icon / store asset exists at the right size, and
 * REFUSES to pass while the placeholder cover is still in place.
 *
 *   node scripts/verify-assets.js            # report
 *   node scripts/verify-assets.js --release  # also fail on the placeholder
 */
const fs = require('fs');
const path = require('path');

const APP = path.resolve(__dirname, '..');
const IMAGES = path.join(APP, 'assets', 'images');
const GEN = path.join(IMAGES, 'generated');
const RELEASE = process.argv.includes('--release');

/** Minimal PNG header reader — avoids pulling in an image dependency. */
function pngSize(file) {
  const fd = fs.openSync(file, 'r');
  const buf = Buffer.alloc(24);
  fs.readSync(fd, buf, 0, 24, 0);
  fs.closeSync(fd);
  if (buf.toString('ascii', 1, 4) !== 'PNG') throw new Error('not a PNG');
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

const EXPECT = [
  ['cover.png',                                    1024, 1536, 'source artwork'],
  ['generated/splash.png',                         1024, 1536, 'splash (contain)'],
  ['generated/icon.png',                           1024, 1024, 'app icon'],
  ['generated/adaptive-icon-foreground.png',       1024, 1024, 'android adaptive'],
  ['generated/android/mdpi/splash.png',             320,  480, 'android mdpi'],
  ['generated/android/hdpi/splash.png',             480,  720, 'android hdpi'],
  ['generated/android/xhdpi/splash.png',            640,  960, 'android xhdpi'],
  ['generated/android/xxhdpi/splash.png',           960, 1440, 'android xxhdpi'],
  ['generated/android/xxxhdpi/splash.png',         1280, 1920, 'android xxxhdpi'],
  ['generated/ios/splash@1x.png',                   414,  621, 'ios @1x'],
  ['generated/ios/splash@2x.png',                   828, 1242, 'ios @2x'],
  ['generated/ios/splash@3x.png',                  1242, 1863, 'ios @3x'],
  ['generated/splash-phone-portrait.png',          1284, 2778, 'full-bleed phone'],
  ['generated/splash-phone-landscape.png',         2778, 1284, 'full-bleed phone ls'],
  ['generated/splash-tablet-portrait.png',         2048, 2732, 'full-bleed tablet'],
  ['generated/splash-tablet-landscape.png',        2732, 2048, 'full-bleed tablet ls'],
  ['generated/store/ios-app-icon.png',             1024, 1024, 'App Store icon'],
  ['generated/store/play-icon.png',                 512,  512, 'Play icon'],
  ['generated/store/play-feature-graphic.png',     1024,  500, 'Play feature graphic'],
  ['generated/store/ios-screenshot-6.7.png',       1290, 2796, 'iPhone 6.7" shot'],
  ['generated/store/ios-screenshot-6.5.png',       1242, 2688, 'iPhone 6.5" shot'],
  ['generated/store/ipad-screenshot-12.9.png',     2048, 2732, 'iPad 12.9" shot'],
  ['generated/store/play-screenshot-phone.png',    1080, 1920, 'Play phone shot'],
];

let failures = 0;
let warnings = 0;

console.log('\nDad + Daughter Beauty Bond™ — asset verification');
console.log('Self-Made Legends LLC (SML)\n');
console.log(`${'asset'.padEnd(46)} ${'expected'.padEnd(12)} status`);
console.log('-'.repeat(78));

for (const [rel, w, h, label] of EXPECT) {
  const file = path.join(IMAGES, rel);
  const expected = `${w}x${h}`;

  if (!fs.existsSync(file)) {
    console.log(`${rel.padEnd(46)} ${expected.padEnd(12)} MISSING  (${label})`);
    failures++;
    continue;
  }
  try {
    const { width, height } = pngSize(file);
    if (width !== w || height !== h) {
      console.log(`${rel.padEnd(46)} ${expected.padEnd(12)} WRONG SIZE ${width}x${height}`);
      failures++;
    } else {
      console.log(`${rel.padEnd(46)} ${expected.padEnd(12)} ok`);
    }
  } catch (err) {
    console.log(`${rel.padEnd(46)} ${expected.padEnd(12)} UNREADABLE (${err.message})`);
    failures++;
  }
}

/* ── Placeholder gate ───────────────────────────────────────────────── */

const marker = path.join(IMAGES, '.cover-is-placeholder');
if (fs.existsSync(marker)) {
  const msg = 'cover.png is still the generated PLACEHOLDER, not the real artwork';
  if (RELEASE) {
    console.log(`\nFAIL: ${msg}.`);
    console.log('      Replace app/assets/images/cover.png with the real cover,');
    console.log('      delete app/assets/images/.cover-is-placeholder,');
    console.log('      then re-run: npm run assets:generate && npm run assets:verify');
    failures++;
  } else {
    console.log(`\nWARNING: ${msg}.`);
    warnings++;
  }
}

/* ── Splash background must match app.json, or the handoff flashes ──── */

const appJson = JSON.parse(fs.readFileSync(path.join(APP, 'app.json'), 'utf8'));
const configured = appJson.expo?.splash?.backgroundColor;
const component = fs.readFileSync(path.join(APP, 'screens', 'SplashScreen.js'), 'utf8');
const declared = component.match(/export const SPLASH_BG = '([^']+)'/)?.[1];

console.log('');
if (configured && declared && configured.toLowerCase() !== declared.toLowerCase()) {
  console.log(`FAIL: splash background mismatch — app.json ${configured} vs component ${declared}.`);
  console.log('      A mismatch shows as a colour flash at the native-to-JS handoff.');
  failures++;
} else {
  console.log(`splash background matches across app.json and component: ${configured}`);
}

console.log('');
if (failures) {
  console.log(`${failures} failure(s), ${warnings} warning(s).`);
  process.exit(1);
}
console.log(`All assets verified. ${warnings} warning(s).`);
