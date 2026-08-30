/**
 * Dad + Daughter Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 * Proprietary and confidential. Unauthorized use is prohibited.
 *
 * Makes the web export installable on an iPhone.
 *
 * `expo export --platform web` emits <meta name="theme-color"> and nothing
 * else Apple reads. Without apple-mobile-web-app-capable, "Add to Home Screen"
 * produces an icon that opens Safari WITH the address bar and tab strip — it
 * looks like a bookmark, not an app. Those three tags are the whole difference,
 * and iOS ignores the web manifest's `display: standalone` that app.json sets.
 *
 * So this runs after the export and injects them. It is idempotent: running it
 * twice changes nothing, which matters because CI re-exports on every push.
 *
 * Usage (see docs/get-it-on-your-phone.md):
 *   npx expo export --platform web --output-dir ../backend/public/web
 *   node scripts/finish-web-export.js ../backend/public/web
 */
const fs = require('fs');
const path = require('path');

const OUT = path.resolve(process.argv[2] || '../backend/public/web');
const html = path.join(OUT, 'index.html');

if (!fs.existsSync(html)) {
  console.error(`No index.html in ${OUT}. Run the export first.`);
  process.exit(1);
}

// The same square icon the native app uses, so the home screen matches.
const ICON_SRC = path.join(__dirname, '../assets/images/generated/icon.png');
fs.copyFileSync(ICON_SRC, path.join(OUT, 'apple-touch-icon.png'));

const manifest = {
  name: 'Dad + Daughter Beauty Bond',
  short_name: 'Beauty Bond',
  start_url: '/',
  display: 'standalone',
  orientation: 'portrait',
  background_color: '#E9B78E',
  theme_color: '#E9B78E',
  description: 'Dad + Daughter Beauty Bond™ — a Self-Made Legends LLC (SML) product.',
  icons: [{ src: '/apple-touch-icon.png', sizes: '1024x1024', type: 'image/png' }],
};
fs.writeFileSync(path.join(OUT, 'manifest.webmanifest'),
                 `${JSON.stringify(manifest, null, 2)}\n`);

const MARKER = '<!-- sml:web-app-meta -->';
let source = fs.readFileSync(html, 'utf8');

if (source.includes(MARKER)) {
  console.log('index.html already carries the home-screen tags — nothing to do.');
  process.exit(0);
}

const TAGS = `${MARKER}
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="Beauty Bond" />
    <meta name="mobile-web-app-capable" content="yes" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
    <link rel="manifest" href="/manifest.webmanifest" />
    <meta name="description" content="Dad + Daughter Beauty Bond™ — a Self-Made Legends LLC (SML) product." />`;

if (!source.includes('</head>')) {
  console.error('index.html has no </head> — Expo changed its template. Not guessing.');
  process.exit(1);
}
source = source.replace('</head>', `  ${TAGS}\n  </head>`);
fs.writeFileSync(html, source);

console.log('Added the iPhone home-screen tags, apple-touch-icon.png and manifest.webmanifest.');
