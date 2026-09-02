/**
 * Self-Made Legends — replace a line of type on a design sheet.
 * Copyright (c) 2026 Self-Made Legends LLC. All Rights Reserved.
 *
 * Usage:  node website/tools/retype-sheet.js
 *
 * Built because this is the third time a sheet has needed a line changed —
 * a memorial line over a living child, a stone named wrong, and now a full
 * legal name on something sold to strangers. Doing it by hand each time is
 * how the fourth one goes wrong.
 *
 * What it makes here: a variant of the Mom Daughter Legacy sheet carrying
 * CLB where the original carries CHERISH LOVE BROWN.
 *
 *   The original stays exactly as it is. It belongs on the collection page,
 *   which is the owner's own house telling his own story. The variant is for
 *   the PRINT — a product that goes on a stranger's wall — where a nine
 *   year old's full legal name has no business being.
 *
 *   That distinction is the whole point. Do not "tidy up" by pointing both
 *   at the same file.
 *
 * Method, same as the paint-outs before it: measure the ink colour, cap
 * height and centre line off the type being replaced, fill from the panel's
 * own ground, and set the replacement at the measured size. Nothing is
 * guessed, and it refuses to run if the ground it samples is not clean.
 */
'use strict';

const sharp = require('sharp');
const path = require('path');

const DIR = path.resolve(__dirname, '../assets/img/concepts');

const JOBS = [
  {
    from: 'throne-momdaughter.jpg',
    to: 'throne-momdaughter-clb',
    lines: [
      {
        was: 'CHERISH LOVE BROWN',
        text: 'CLB',
        // Generous box: nothing else lives on this line.
        box: { left: 974, top: 661, right: 1170, bottom: 686 },
        // Clean panel above and below the line. The vertical rule at x~1172
        // and the illustration to the left are why this samples ROWS rather
        // than the margins either side.
        ground: { top: 650, bottom: 660 },
        tracking: 2.6,
      },
    ],
  },
];

const median = (a) => { a.sort((p, q) => p - q); return a[a.length >> 1]; };
const clamp = (v) => (v < 0 ? 0 : v > 255 ? 255 : v);
const lum = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;

(async () => {
  for (const job of JOBS) {
    const src = path.join(DIR, job.from);
    const { data, info } = await sharp(src).raw().toBuffer({ resolveWithObject: true });
    const { width: W, height: H, channels: ch } = info;
    const out = Buffer.from(data);
    const overlays = [];

    for (const line of job.lines) {
      const { box, ground } = line;

      // ── Refuse a dirty sample ────────────────────────────────────────
      let brightest = 0;
      const gr = [], gg = [], gb = [];
      for (let y = ground.top; y < ground.bottom; y++) {
        for (let x = box.left; x < box.right; x++) {
          const i = (y * W + x) * ch;
          brightest = Math.max(brightest, lum(data[i], data[i + 1], data[i + 2]));
          gr.push(data[i]); gg.push(data[i + 1]); gb.push(data[i + 2]);
        }
      }
      if (brightest > 70) {
        console.error(`  ! ground rows ${ground.top}..${ground.bottom} are not clean (brightest ${brightest.toFixed(0)}). Nothing written.`);
        process.exit(2);
      }
      const fill = [median(gr), median(gg), median(gb)];

      // ── Measure the type being replaced ──────────────────────────────
      let x0 = W, x1 = 0, y0 = H, y1 = 0;
      const R = [], G = [], B = [];
      for (let y = box.top; y < box.bottom; y++) {
        for (let x = box.left; x < box.right; x++) {
          const i = (y * W + x) * ch;
          const l = lum(data[i], data[i + 1], data[i + 2]);
          if (l > 85) {
            if (x < x0) x0 = x; if (x > x1) x1 = x;
            if (y < y0) y0 = y; if (y > y1) y1 = y;
          }
          if (l > 125) { R.push(data[i]); G.push(data[i + 1]); B.push(data[i + 2]); }
        }
      }
      if (!R.length) { console.error(`  ! no type found in the box. Nothing written.`); process.exit(2); }

      const ink = [median(R), median(G), median(B)];
      const centre = (x0 + x1) / 2;
      const capHeight = y1 - y0 + 1;
      const fontSize = capHeight / 0.662;   // Times cap height is 0.662em

      console.log(
        `  "${line.was}" -> "${line.text}"\n` +
        `     ink rgb(${ink.join(',')})  x ${x0}..${x1} (${x1 - x0 + 1}px)  cap ${capHeight}px  centre ${centre.toFixed(1)}`
      );

      // ── Paint out ────────────────────────────────────────────────────
      for (let y = box.top; y < box.bottom; y++) {
        for (let x = box.left; x < box.right; x++) {
          const i = (y * W + x) * ch;
          const n = ((x * 31 + y * 17) % 3) - 1;   // grain, so it is not a flat patch
          out[i] = clamp(fill[0] + n);
          out[i + 1] = clamp(fill[1] + n);
          out[i + 2] = clamp(fill[2] + n);
        }
      }

      // ── Set the replacement ──────────────────────────────────────────
      const pad = 40;
      const svgW = (box.right - box.left) + pad * 2;
      const svgH = (box.bottom - box.top) + pad * 2;
      overlays.push({
        input: Buffer.from(`<svg width="${svgW}" height="${svgH}" xmlns="http://www.w3.org/2000/svg">
          <text x="${centre - box.left + pad}" y="${y1 - box.top + pad}" text-anchor="middle"
                font-family="Liberation Serif, Times New Roman, serif"
                font-size="${fontSize.toFixed(2)}" letter-spacing="${line.tracking}"
                fill="rgb(${ink.join(',')})">${line.text}</text>
        </svg>`),
        left: box.left - pad,
        top: box.top - pad,
      });
    }

    const painted = await sharp(out, { raw: { width: W, height: H, channels: ch } }).png().toBuffer();
    const composed = await sharp(painted).composite(overlays).png().toBuffer();

    await Promise.all([
      sharp(composed).jpeg({ quality: 92, chromaSubsampling: '4:4:4' }).toFile(path.join(DIR, job.to + '.jpg')),
      sharp(composed).webp({ quality: 88 }).toFile(path.join(DIR, job.to + '.webp')),
    ]);
    console.log(`     written ${job.to}.jpg and .webp — ${job.from} is untouched\n`);
  }
})();
