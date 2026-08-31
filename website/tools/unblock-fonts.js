/**
 * Self-Made Legends — stop Google Fonts from holding up the first paint.
 * Copyright (c) 2026 Self-Made Legends LLC. All Rights Reserved.
 *
 * Usage:  node website/tools/unblock-fonts.js
 *
 * A plain <link rel="stylesheet"> to fonts.googleapis.com is render-blocking:
 * the browser paints NOTHING until that request finishes. It is a third-party
 * host on someone else's network, so every visitor's first impression is
 * hostage to it. Measured on this site with the request stalled — a corporate
 * proxy, a national block, a Google outage — first contentful paint landed at
 * 8308ms, tracking the stall exactly. Eight seconds of black screen.
 *
 * The fix is the standard one: request the sheet with media="print", which the
 * browser does not consider render-blocking, then flip it to media="all" the
 * moment it lands. The page paints immediately in the fallback stack —
 * Bodoni 72, Didot, Georgia — and upgrades to Bodoni Moda when it arrives.
 * &display=swap was already on the URL, so the swap itself is invisible.
 *
 * The <noscript> copy keeps the fonts for a visitor with JavaScript off, who
 * would otherwise never get the flip. It is render-blocking for them, which is
 * correct: they have no other way to receive it.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const DIR = path.resolve(__dirname, '..');
const PAGES = ['index.html', '404.html', 'privacy.html', 'terms.html', 'shipping-returns.html'];

// Matches the existing blocking link, capturing the href so each page keeps
// whatever font set it actually asks for rather than being given index's.
const BLOCKING = /<link rel="stylesheet" href="(https:\/\/fonts\.googleapis\.com\/css2\?[^"]+)">/;

let changed = 0;
for (const page of PAGES) {
  const file = path.join(DIR, page);
  const html = fs.readFileSync(file, 'utf8');

  if (html.includes("this.media='all'")) {
    console.log(`  --  ${page} already non-blocking`);
    continue;
  }

  const m = html.match(BLOCKING);
  if (!m) {
    console.log(`  !!  ${page} has no blocking font link to fix — check it by hand`);
    continue;
  }
  const href = m[1];

  const replacement =
    `<!-- Non-render-blocking. media="print" is not blocking; onload promotes it\n` +
    `     to the real sheet once it lands. The page paints in the fallback stack\n` +
    `     immediately instead of waiting on a third-party host. -->\n` +
    `<link rel="preload" as="style" href="${href}">\n` +
    `<link rel="stylesheet" href="${href}" media="print" onload="this.media='all'">\n` +
    `<noscript><link rel="stylesheet" href="${href}"></noscript>`;

  fs.writeFileSync(file, html.replace(BLOCKING, replacement));
  console.log(`  OK  ${page}`);
  changed++;
}

console.log(`\n${changed} page${changed === 1 ? '' : 's'} changed.`);
