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
const { seal, supporters, INK } = require('./seal');
const { GROUND } = require('./palette');

const OUT = path.join(__dirname, 'out');
const CHROME = '/opt/pw-browsers/chromium';

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
    { name: 'seal', make: (v, _ink, _hole, bg) => seal({ variant: v, ground: bg }) },
    { name: 'lion', make: (v, ink, hole) => crest({ ink, hole }) },
    { name: 'lion-lockup', make: (v, ink, hole) => crest({ ink, hole, wordmark: true }) },
  ];

  for (const v of VARIANTS) {
  for (const m of MARKS) {
    // The lion has no gradient build: its face detail is knocked out in the
    // background colour, and a gradient version would need a second ink that
    // does not exist on a foil die.
    if (m.name !== 'seal' && v.id === 'gradient') continue;

    const hole = v.id === 'black' ? '#FFFFFF' : '#0B0F0D';
    const svg = m.make(v.id, INK[v.id], hole, v.bg);
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

  // The website's two standalone seal files are written from this same
  // function rather than kept by hand.
  //
  // They had drifted badly: an older gold ramp, and EST. MMXXVI reversed and
  // upside down because their bottom arc ran the other way round. Nothing
  // catches that — it is valid SVG, it renders without complaint, and at the
  // size a seal is usually looked at the year is eight characters across a
  // few dozen pixels. It survived on the live site until the file was pasted
  // back and read at full size.
  const SITE = path.join(__dirname, '..', 'website', 'assets', 'brand');
  if (fs.existsSync(SITE)) {
    fs.writeFileSync(path.join(SITE, 'sml-seal-gold.svg'), seal({ variant: 'gradient' }));
    fs.writeFileSync(path.join(SITE, 'sml-seal-solid.svg'), seal({ variant: 'gold' }));
    console.log('  website/assets/brand   sml-seal-gold.svg sml-seal-solid.svg');
  }

  // And the homepage's own inline copy — it defines <g id="seal"> and five
  // places <use> it, so it cannot just load the file. The lions go in
  // between the markers; the face knockouts are skipped there because they
  // are drawn in the BACKGROUND colour and that seal sits on more than one
  // background. At web sizes those three marks are invisible anyway.
  const HOME = path.join(__dirname, '..', 'website', 'index.html');
  if (fs.existsSync(HOME)) {
    const START = '<!-- SML:SUPPORTERS start';
    const END = '<!-- SML:SUPPORTERS end -->';
    let html = fs.readFileSync(HOME, 'utf8');
    const a = html.indexOf(START);
    const b = html.indexOf(END);
    if (a === -1 || b === -1) throw new Error('index.html: SML:SUPPORTERS markers missing');
    const keep = html.slice(a, html.indexOf('-->', a) + 3);
    html = html.slice(0, a) + keep + '\n' +
      supporters({ ink: 'url(#gf)', hole: GROUND, face: false, indent: '      ' }) +
      '\n      ' + html.slice(b);
    fs.writeFileSync(HOME, html);
    console.log('  website/index.html     inline seal supporters');
  }

  // The typefaces, so nobody has to hunt for them or substitute one.
  for (const f of ['BodoniModa.ttf', 'DMMono.ttf']) {
    const src = path.join('/tmp/fonts', f);
    if (fs.existsSync(src)) fs.copyFileSync(src, path.join(OUT, f));
  }
  console.log('\n  fonts copied alongside');
})();
