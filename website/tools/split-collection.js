/**
 * Self-Made Legends — move the Golden Throne sheets to their own page.
 * Copyright (c) 2026 Self-Made Legends LLC. All Rights Reserved.
 *
 * Usage:  node website/tools/split-collection.js
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  WHY
 *
 *  The homepage measured 46,616px — 55 phone screens, 3,664 words — and the
 *  seventeen collection sheets were most of it. Everything below them, the
 *  vote and the newsletter included, sat behind a scroll almost nobody
 *  finishes.
 *
 *  This is not a deletion. The sheets are the best work on the site; they
 *  get a page of their own, which means a second address Google can rank
 *  for different words, something to put in an Instagram bio, and a
 *  homepage that reaches the shop.
 * ─────────────────────────────────────────────────────────────────────────
 *
 *  Written as a script rather than done by hand because it moves ~470 lines
 *  between two files, and because it verifies afterwards: if the sheet count
 *  on the new page does not match what came out of the old one, it says so
 *  rather than leaving you to notice a missing sheet later.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const DIR = path.resolve(__dirname, '..');
const INDEX = path.join(DIR, 'index.html');
const OUT = path.join(DIR, 'collection.html');
const SHELL = path.join(DIR, 'shipping-returns.html');

const html = fs.readFileSync(INDEX, 'utf8');

/* ── Take the section out ────────────────────────────────────────────── */

const START = '<section id="fw-teaser" class="marble">';
const startAt = html.indexOf(START);
if (startAt === -1) {
  console.error('  ! No #fw-teaser section in index.html. Already split?');
  process.exit(2);
}
const endAt = html.indexOf('\n</section>', startAt);
if (endAt === -1) {
  console.error('  ! Could not find the end of #fw-teaser. Nothing written.');
  process.exit(2);
}
const section = html.slice(startAt, endAt + '\n</section>'.length);

// Everything between the section head and the closing tag is what moves.
const inner = section
  .replace(START, '')
  .replace(/\n<\/section>$/, '')
  .replace(/^\s*<div class="shell">\n/, '')
  .replace(/\n\s*<\/div>\s*$/, '');

const sheetsMoved = (inner.match(/<figure class="sheet">/g) || []).length;
if (sheetsMoved < 10) {
  console.error(`  ! Only found ${sheetsMoved} sheets — that is not the collection. Nothing written.`);
  process.exit(2);
}

/* ── Build the new page on the existing subpage shell ────────────────── */

const shell = fs.readFileSync(SHELL, 'utf8');
const headStart = shell.indexOf('<!DOCTYPE html>');
const bodyStart = shell.indexOf('<main id="main">');
const footStart = shell.indexOf('<footer>');
const footEnd = shell.indexOf('</html>');

let head = shell.slice(headStart, bodyStart);
head = head
  .replace(
    /<title>[\s\S]*?<\/title>/,
    '<title>The Golden Throne Collection — Self-Made Legends</title>'
  )
  .replace(
    /<meta name="description" content="[^"]*">/,
    '<meta name="description" content="The Golden Throne Collection: seventeen design sheets covering footwear, outerwear, tailoring and accessories. One house, one mark, numbered from 001.">'
  )
  .replace(
    /<link rel="canonical" href="[^"]*">/,
    '<link rel="canonical" href="https://selfmadelegendsz.com/collection.html">'
  );

// Social preview. Without these a shared link is a bare URL, and this is the
// page most likely to actually get shared.
const og = `<meta property="og:type" content="website">
<meta property="og:title" content="The Golden Throne Collection — Self-Made Legends">
<meta property="og:description" content="Seventeen sheets. Footwear, outerwear, tailoring and accessories. Numbered from 001.">
<meta property="og:url" content="https://selfmadelegendsz.com/collection.html">
<meta property="og:image" content="https://selfmadelegendsz.com/assets/img/concepts/throne-collection.jpg">
<meta name="twitter:card" content="summary_large_image">
`;
head = head.replace('</head>', og + '</head>');

const footer = shell.slice(footStart, footEnd);

const page = head +
`<main id="main">

<section class="marble" style="padding-top:3.5rem">
  <div class="shell">
    <a class="backlink" href="/">&larr; Back to the House</a>
` + inner + `
  </div>
</section>

<section>
  <div class="shell" style="text-align:center">
    <p class="lede" style="margin-bottom:1.6rem">
      Every piece above is numbered from 001 and capped at a thousand. The list
      is told the date and the time before anyone else.
    </p>
    <a class="btn btn-solid" href="/#newsletter">Claim a Number</a>
    <a class="btn" href="/#shop" style="margin-left:.6rem">See what ships now</a>
  </div>
</section>

</main>

` + footer + '</html>\n';

fs.writeFileSync(OUT, page);

/* ── Leave a teaser behind, not a hole ───────────────────────────────── */

const teaser = `<section id="fw-teaser" class="marble">
  <div class="shell">
    <div class="sec-head">
      <p class="eyebrow">The Golden Throne Collection</p>
      <h2>The crown is <em class="foil" style="font-style:italic">earned</em>.</h2>
      <p class="lede">
        One house, one mark, one number on every piece. Limited to a thousand and
        numbered from 001.
      </p>
    </div>

    <figure class="sheet">
      <picture>
        <source srcset="assets/img/concepts/throne-collection.webp" type="image/webp">
        <img src="assets/img/concepts/throne-collection.jpg" width="1200" height="1200"
             loading="lazy" decoding="async"
             alt="The Golden Throne collection sheet: six footwear styles, hoodies, tees, sweatpants, hats, socks, scarves, winter coats, gloves, face shields, jewellery, bags, fragrance and packaging — all black with the gold lion crest.">
      </picture>
      <figcaption>The Collection &mdash; footwear, apparel, accessories</figcaption>
    </figure>

    <div class="shell" style="text-align:center;padding:0">
      <p class="lede" style="margin:2rem auto 1.6rem">
        ${sheetsMoved} sheets in full &mdash; the footwear, the tailoring, the
        outerwear, and the pieces made for Grace, Cherish and Rose.
      </p>
      <a class="btn btn-solid" href="/collection.html">See the whole collection</a>
    </div>
  </div>
</section>`;

fs.writeFileSync(INDEX, html.slice(0, startAt) + teaser + html.slice(endAt + '\n</section>'.length));

/* ── Say what happened, and check it ─────────────────────────────────── */

const written = (fs.readFileSync(OUT, 'utf8').match(/<figure class="sheet">/g) || []).length;
const left = (fs.readFileSync(INDEX, 'utf8').match(/<figure class="sheet">/g) || []).length;

console.log(`  moved   ${sheetsMoved} sheets out of index.html`);
console.log(`  landed  ${written} sheets in collection.html`);
console.log(`  kept    ${left} on the homepage as the teaser`);
if (written !== sheetsMoved) {
  console.error(`\n  ! ${sheetsMoved - written} sheet(s) did not arrive. Check collection.html before shipping.`);
  process.exit(2);
}
console.log('\n  OK');
