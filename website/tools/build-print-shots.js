/**
 * Self-Made Legends — product shots for the wall-art line.
 * Copyright (c) 2026 Self-Made Legends LLC. All Rights Reserved.
 *
 * Usage:  node website/tools/build-print-shots.js
 * Writes: website/assets/img/products/p-print-*.{webp,jpg}
 *
 * The artwork already exists — these are the design sheets. What does not
 * exist is a picture of one hanging on a wall, and that is the whole
 * difference between "here is a JPEG" and "here is something you would pay
 * $145 for". A shop card showing the raw sheet again tells a customer
 * nothing about what arrives in the box.
 *
 * Three treatments, because the three formats are genuinely different
 * objects and a customer choosing between them needs to see that:
 *
 *   poster   bare paper, a hairline edge, sitting on the wall
 *   canvas   wrapped over a stretcher, so it stands off the wall with a
 *            lit top edge and a shadowed side
 *   framed   gold frame, dark mat, glass sheen
 *
 * Everything is composed at 3:2 to match .prod-shot exactly, because the
 * card crops with object-fit cover and anything else loses its edges.
 */
'use strict';

const sharp = require('sharp');
const path = require('path');

const ART = path.resolve(__dirname, '../assets/img/concepts');
const OUT = path.resolve(__dirname, '../assets/img/products');
const W = 1200, H = 800;

/* The house palette, so the wall belongs to the same building as the site. */
const VOID = '#040706', MARBLE = '#101A16';
const GOLD = '#CFA529', GOLD_DP = '#8F6E15', GOLD_ASH = '#725D24';

const PRINTS = [
  { sheet: 'throne-collection',  out: 'p-print-collection', style: 'poster' },
  { sheet: 'throne-signature',   out: 'p-print-signature',  style: 'canvas' },
  { sheet: 'throne-commander',   out: 'p-print-commander',  style: 'framed' },

  // The two personal pieces, added at the owner's word. Both are framed or
  // canvas rather than bare paper: these are the ones somebody hangs and
  // keeps, and a poster in a tube is the wrong object for them.
  //
  // throne-momdaughter is the corrected sheet — garnet for Grace, amethyst
  // for Cherish, and no memorial line over a living child. Print from this
  // one, never from an older copy.
  { sheet: 'throne-momdaughter', out: 'p-print-gracecherish', style: 'framed' },
  { sheet: 'throne-rose',        out: 'p-print-rose',         style: 'canvas' },
];

/** The wall: a dark room, lit from the upper left the way the site is. */
function wall() {
  return `
    <defs>
      <radialGradient id="lit" cx="34%" cy="16%" r="86%">
        <stop offset="0%"  stop-color="${MARBLE}"/>
        <stop offset="62%" stop-color="${VOID}"/>
        <stop offset="100%" stop-color="#010302"/>
      </radialGradient>
      <linearGradient id="frame" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%"   stop-color="${GOLD_DP}"/>
        <stop offset="26%"  stop-color="${GOLD}"/>
        <stop offset="52%"  stop-color="#F6E4A6"/>
        <stop offset="74%"  stop-color="${GOLD}"/>
        <stop offset="100%" stop-color="${GOLD_DP}"/>
      </linearGradient>
      <linearGradient id="glass" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%"   stop-color="#FFFFFF" stop-opacity=".10"/>
        <stop offset="34%"  stop-color="#FFFFFF" stop-opacity=".02"/>
        <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0"/>
      </linearGradient>
      <filter id="drop" x="-30%" y="-30%" width="180%" height="180%">
        <feDropShadow dx="10" dy="16" stdDeviation="18" flood-color="#000" flood-opacity=".72"/>
      </filter>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#lit)"/>`;
}

/**
 * Geometry per style. The art is always square — these sheets are 1:1 — so
 * the layout is decided by how tall the object can be without touching the
 * top and bottom of a 3:2 frame.
 */
// Sized so all three objects occupy roughly the same share of the frame.
// The first pass gave them equal geometry, which looked wrong: the framed
// print has a bright gold edge pulling the eye and the bare poster does not,
// so at card size the poster read as smaller and emptier than it was. The
// unframed pieces are given more of the wall to compensate.
const LAYOUT = {
  poster: { art: 684, mat: 0,  frame: 0  },
  canvas: { art: 668, mat: 0,  frame: 0  },
  framed: { art: 548, mat: 32, frame: 14 },
};

function furniture(style) {
  const L = LAYOUT[style];
  const outer = L.art + (L.mat + L.frame) * 2;
  const x = Math.round((W - outer) / 2);
  const y = Math.round((H - outer) / 2);
  const artX = x + L.mat + L.frame;
  const artY = y + L.mat + L.frame;

  if (style === 'poster') {
    // Paper: a hairline gold edge and a shadow, nothing else. Anything more
    // would be claiming a frame the customer is not being sent.
    return {
      artX, artY, size: L.art,
      under: `<rect x="${x}" y="${y}" width="${outer}" height="${outer}" fill="#0A100D" filter="url(#drop)"/>`,
      over: `<rect x="${x - .5}" y="${y - .5}" width="${outer + 1}" height="${outer + 1}"
                   fill="none" stroke="${GOLD_ASH}" stroke-width="1" opacity=".8"/>`,
    };
  }

  if (style === 'canvas') {
    // Wrapped over a stretcher: it stands off the wall, so the top edge
    // catches light and the right side falls into shadow. That depth is the
    // only thing that distinguishes a canvas from a poster in a photograph.
    const d = 13;
    return {
      artX, artY, size: L.art,
      under: `<rect x="${x}" y="${y}" width="${outer}" height="${outer}" fill="#0A100D" filter="url(#drop)"/>`,
      over: `
        <polygon points="${x},${y} ${x + outer},${y} ${x + outer - d},${y + d} ${x + d},${y + d}"
                 fill="#FFFFFF" opacity=".07"/>
        <polygon points="${x + outer},${y} ${x + outer},${y + outer} ${x + outer - d},${y + outer - d} ${x + outer - d},${y + d}"
                 fill="#000000" opacity=".42"/>
        <rect x="${x}" y="${y}" width="${outer}" height="${outer}" fill="none"
              stroke="#000" stroke-opacity=".5" stroke-width="1"/>`,
    };
  }

  // Framed: gold moulding, dark mat, and a diagonal sheen for the glass.
  return {
    artX, artY, size: L.art,
    under: `
      <rect x="${x}" y="${y}" width="${outer}" height="${outer}" fill="url(#frame)" filter="url(#drop)"/>
      <rect x="${x + L.frame}" y="${y + L.frame}" width="${outer - L.frame * 2}" height="${outer - L.frame * 2}"
            fill="#0B120F"/>`,
    over: `
      <rect x="${artX - 1}" y="${artY - 1}" width="${L.art + 2}" height="${L.art + 2}"
            fill="none" stroke="#000" stroke-opacity=".65" stroke-width="1"/>
      <rect x="${x + L.frame}" y="${y + L.frame}" width="${outer - L.frame * 2}" height="${outer - L.frame * 2}"
            fill="url(#glass)"/>
      <rect x="${x}" y="${y}" width="${outer}" height="${outer}" fill="none"
            stroke="#000" stroke-opacity=".35" stroke-width="1"/>`,
  };
}

(async () => {
  for (const p of PRINTS) {
    const f = furniture(p.style);

    // Two stages, deliberately. sharp runs resize BEFORE composite inside one
    // pipeline, so chaining them would scale the finished scene instead of
    // scaling the art into it.
    const back = await sharp(Buffer.from(
      `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">${wall()}${f.under}</svg>`
    )).png().toBuffer();

    const art = await sharp(path.join(ART, p.sheet + '.jpg'))
      .resize(f.size, f.size, { fit: 'cover' })
      .toBuffer();

    const front = Buffer.from(
      `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">${wall().split('</defs>')[0]}</defs>${f.over}</svg>`
    );

    const composed = await sharp(back)
      .composite([
        { input: art, left: f.artX, top: f.artY },
        { input: front, left: 0, top: 0 },
      ])
      .png()
      .toBuffer();

    await Promise.all([
      sharp(composed).jpeg({ quality: 88, chromaSubsampling: '4:4:4' }).toFile(path.join(OUT, p.out + '.jpg')),
      sharp(composed).webp({ quality: 86 }).toFile(path.join(OUT, p.out + '.webp')),
    ]);

    const m = await sharp(path.join(OUT, p.out + '.jpg')).metadata();
    console.log(`  OK  ${p.out}.jpg  ${m.width}x${m.height}  ${p.style}  from ${p.sheet}`);
  }
})();
