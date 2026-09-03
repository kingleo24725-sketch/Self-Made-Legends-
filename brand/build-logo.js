/**
 * Self-Made Legends — build the logo pack.
 * Copyright (c) 2026 Self-Made Legends LLC. All Rights Reserved.
 *
 * Usage:  node brand/build-logo.js
 * Writes: brand/out/
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  FOUR VERSIONS, BECAUSE PRINT IS NOT A SCREEN
 *
 *  The seal on the website is a gold GRADIENT. That is right on a screen and
 *  wrong almost everywhere a business card or a box is concerned:
 *
 *    foil stamping   is one flat colour of metal pressed into the stock.
 *                    A gradient cannot be foiled. It has to be flattened.
 *    embossing       is no colour at all — only the shape matters, so the
 *                    mark has to hold up as a silhouette.
 *    one-colour      is what most box printers quote cheapest.
 *
 *  So the pack ships gradient for screen, flat gold for foil, solid black
 *  for stamping and one-colour work, and white for reversing out of a dark
 *  box. Handing a printer only the gradient is how a logo comes back looking
 *  like a photocopy of itself.
 *
 *  PDF is the file to send. Chromium prints it as vector with the fonts
 *  embedded, so the printer needs nothing installed. The .ttf files ship
 *  alongside anyway, for anyone who has to set the wordmark themselves.
 * ─────────────────────────────────────────────────────────────────────────
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { crest } = require('./lion');

const OUT = path.join(__dirname, 'out');
const CHROME = '/opt/pw-browsers/chromium';

/* The house gold. Hex is authoritative; everything else a printer matches. */
const GOLD = '#CFA529';
const GOLD_DP = '#8F6E15';
const GOLD_LT = '#F6E4A6';

/**
 * One seal, four inks.
 *
 * `ink` is what every stroke and fill resolves to. Only the 'gradient'
 * variant uses more than one value, and only it is unsuitable for foil.
 */
function seal({ variant }) {
  const gradient = variant === 'gradient';
  const ink = { gradient: 'url(#gf)', gold: GOLD, black: '#000000', white: '#FFFFFF' }[variant];
  // The inner ring is a half-tone of the main ink on the website. On a
  // one-colour job there is no half-tone, so it takes the same ink.
  const faint = gradient ? GOLD_DP : ink;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <title>Self-Made Legends</title>
  <defs>
    ${gradient ? `<linearGradient id="gf" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%"   stop-color="${GOLD_DP}"/>
      <stop offset="22%"  stop-color="${GOLD}"/>
      <stop offset="44%"  stop-color="${GOLD_LT}"/>
      <stop offset="64%"  stop-color="${GOLD}"/>
      <stop offset="84%"  stop-color="${GOLD_DP}"/>
      <stop offset="100%" stop-color="#DFC15C"/>
    </linearGradient>` : ''}
    <path id="arcTop" d="M 100,100 m -84,0 a 84,84 0 1,1 168,0" fill="none"/>
    <!-- Sweep 0 from the left point. The other direction traverses the
         bottom right-to-left, and a textPath follows its path's direction —
         which rendered EST. MMXXVI backwards and upside down for a while. -->
    <path id="arcBot" d="M 100,100 m -84,0 a 84,84 0 0,0 168,0" fill="none"/>
  </defs>

  <circle cx="100" cy="100" r="97" fill="none" stroke="${ink}" stroke-width="1.6"/>
  <circle cx="100" cy="100" r="92" fill="none" stroke="${faint}" stroke-width=".7"${gradient ? ' opacity=".85"' : ''}/>
  <circle cx="100" cy="100" r="72" fill="none" stroke="${ink}" stroke-width="1.1"/>

  <text font-family="DM Mono" font-size="10.5" letter-spacing="3.4" fill="${ink}">
    <textPath href="#arcTop" startOffset="50%" text-anchor="middle">SELF-MADE LEGENDS</textPath>
  </text>
  <text font-family="DM Mono" font-size="8.5" letter-spacing="3" fill="${faint}">
    <textPath href="#arcBot" startOffset="50%" text-anchor="middle">EST. MMXXVI</textPath>
  </text>

  <g transform="translate(100,52) scale(.62)">
    <path d="M-40 26 L-32 -2 L-14 12 L0 -12 L14 12 L32 -2 L40 26 Z"
          fill="none" stroke="${ink}" stroke-width="3.4" stroke-linejoin="round"/>
    <circle cx="-32" cy="-5"  r="4"   fill="${ink}"/>
    <circle cx="0"   cy="-15" r="4.6" fill="${ink}"/>
    <circle cx="32"  cy="-5"  r="4"   fill="${ink}"/>
    <rect x="-40" y="30" width="80" height="6" fill="${ink}"/>
  </g>

  <text x="100" y="112" text-anchor="middle" fill="${ink}"
        font-family="Bodoni Moda" font-size="30" letter-spacing="5">SML</text>

  <g stroke="${ink}" stroke-width="1.5" fill="none">
    <path d="M74 128 q-11 12 -9 27"/>
    <path d="M126 128 q11 12 9 27"/>
  </g>
  <g fill="${ink}"${gradient ? ' opacity=".95"' : ''}>
    <ellipse cx="69"  cy="133" rx="5" ry="2.4" transform="rotate(-32 69 133)"/>
    <ellipse cx="65"  cy="141" rx="5" ry="2.4" transform="rotate(-18 65 141)"/>
    <ellipse cx="64"  cy="149" rx="5" ry="2.4" transform="rotate(-4 64 149)"/>
    <ellipse cx="131" cy="133" rx="5" ry="2.4" transform="rotate(32 131 133)"/>
    <ellipse cx="135" cy="141" rx="5" ry="2.4" transform="rotate(18 135 141)"/>
    <ellipse cx="136" cy="149" rx="5" ry="2.4" transform="rotate(4 136 149)"/>
  </g>
  <g fill="${ink}">
    <circle cx="92"  cy="150" r="1.9"/>
    <circle cx="100" cy="150" r="1.9"/>
    <circle cx="108" cy="150" r="1.9"/>
  </g>
</svg>`;
}

const VARIANTS = [
  { id: 'gradient', label: 'Gradient gold — screens and full-colour digital print', bg: '#0B0F0D' },
  { id: 'gold',     label: 'Flat gold — foil stamping, one-colour print',            bg: '#0B0F0D' },
  { id: 'black',    label: 'Solid black — embossing, stamping, light stock',         bg: '#FFFFFF' },
  { id: 'white',    label: 'Reverse white — dark boxes and dust bags',               bg: '#0B0F0D' },
];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ executablePath: CHROME });

  // Three marks, four inks each. The seal is the house mark; the lion is the
  // crest that goes on product; the lockup is the crest with the wordmark and
  // real clear space beneath it, which the crest on its own must never have
  // crammed under it.
  const MARKS = [
    { name: 'seal', make: (v) => seal({ variant: v }) },
    { name: 'lion', make: (v, ink, hole) => crest({ ink, hole }) },
    { name: 'lion-lockup', make: (v, ink, hole) => crest({ ink, hole, wordmark: true }) },
  ];

  const INK = { gradient: 'url(#gf)', gold: GOLD, black: '#000000', white: '#FFFFFF' };

  for (const v of VARIANTS) {
  for (const m of MARKS) {
    // The lion has no gradient build: its face detail is knocked out in the
    // background colour, and a gradient version would need a second ink that
    // does not exist on a foil die.
    if (m.name !== 'seal' && v.id === 'gradient') continue;

    const hole = v.id === 'black' ? '#FFFFFF' : '#0B0F0D';
    const svg = m.name === 'seal' ? m.make(v.id) : m.make(v.id, INK[v.id], hole);
    const stem = m.name === 'seal' ? `sml-seal-${v.id}` : `sml-${m.name}-${v.id}`;
    fs.writeFileSync(path.join(OUT, `${stem}.svg`), svg);

    // Aspect comes from the artwork's own viewBox, never from a number kept
    // here. The crest was redrawn taller and every canvas in this file went
    // on cropping it to the old ratio until the two were tied together.
    const box = svg.match(/viewBox="0 0 (\d+(?:\.\d+)?) (\d+(?:\.\d+)?)"/);
    if (!box) throw new Error(`${stem}: no viewBox to take the aspect from`);
    const h = Number(box[2]) / Number(box[1]);

    const page = await browser.newPage();

    // 4000px square. Big enough that the seal can be printed at any size a
    // card or a box needs without the raster ever being the limit.
    await page.setViewportSize({ width: 1000, height: Math.round(1000 * h) });
    await page.setContent(
      `<style>html,body{margin:0;height:100%;display:grid;place-items:center;background:${v.bg}}
       svg{width:920px;height:auto}</style>${svg}`
    );
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(400);
    await page.screenshot({
      path: path.join(OUT, `${stem}.png`),
      omitBackground: false,
      scale: 'css',
      clip: { x: 0, y: 0, width: 1000, height: Math.round(1000 * h) },
    });

    // Transparent PNG as well — what a designer actually places.
    await page.setContent(
      `<style>html,body{margin:0;height:100%;display:grid;place-items:center;background:transparent}
       svg{width:920px;height:auto}</style>${svg}`
    );
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(300);
    await page.screenshot({
      path: path.join(OUT, `${stem}-transparent.png`),
      omitBackground: true,
    });

    // PDF: vector, fonts embedded. This is the file that goes to a printer.
    await page.setContent(
      `<style>@page{size:120mm ${(120 * h).toFixed(0)}mm;margin:0}
       html,body{margin:0;height:${(120 * h).toFixed(0)}mm;display:grid;place-items:center;background:${v.bg}}
       svg{width:100mm;height:auto}</style>${svg}`
    );
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(300);
    await page.pdf({
      path: path.join(OUT, `${stem}.pdf`),
      width: '120mm', height: `${(120 * h).toFixed(0)}mm`, printBackground: true, margin: { top: 0, bottom: 0, left: 0, right: 0 },
    });

    await page.close();
    console.log(`  ${stem.padEnd(26)} svg png png-alpha pdf`);
  }
  }

  await browser.close();

  // The typefaces, so nobody has to hunt for them or substitute one.
  for (const f of ['BodoniModa.ttf', 'DMMono.ttf']) {
    const src = path.join('/tmp/fonts', f);
    if (fs.existsSync(src)) fs.copyFileSync(src, path.join(OUT, f));
  }
  console.log('\n  fonts copied alongside');
})();
