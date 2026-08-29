#!/usr/bin/env node
/**
 * Self-Made Legends — product image prep
 * Copyright (c) 2026 Self-Made Legends LLC. All Rights Reserved.
 *
 * One command per product image. It:
 *
 *   1. finds a corner badge sitting on a flat studio background and clears it
 *   2. resizes to web size
 *   3. writes a WebP and a JPEG fallback
 *
 * Usage:
 *   node website/tools/prep-product-image.js <input> <output-name> [--keep-badge]
 *
 *   node website/tools/prep-product-image.js ~/Downloads/shoe.png regent-low-onyx
 *   → website/assets/img/concepts/regent-low-onyx.webp  (+ .jpg)
 *
 * The badge is cleared by painting over it with the background colour sampled
 * from the image's own corner — not by cropping, which would change the
 * composition, and not by blurring, which looks like a smudge.
 *
 * ── ONE THING TO KNOW ────────────────────────────────────────────────────
 *  Re-encoding drops the file's metadata, which for an AI-generated image
 *  includes its Content Credentials. That means Instagram, TikTok and
 *  Facebook will no longer detect and label it automatically.
 *
 *  On your own site that does not matter — the page says what these are, in
 *  plainer words than any badge. On social it does: those platforms require
 *  you to disclose AI content yourself, and the FTC cares about it in an ad.
 *  The tool removed the automatic disclosure; it did not remove the duty.
 * ─────────────────────────────────────────────────────────────────────────
 */

'use strict';

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const WEB_WIDTH = 1200;
const OUT_DIR = path.join(__dirname, '..', 'assets', 'img', 'concepts');

/** How far a pixel can stray from the ground before it counts as "something". */
const TOLERANCE = 14;

/**
 * Where a watermark is allowed to be, as a fraction of the image.
 *
 * Kept deliberately tight. A wider box caught the badge on the first pass but
 * reached within ~20px of the shoe's tongue — fine on that image, and one
 * badly-framed photo away from painting over the product.
 */
const SEARCH = { top: 0, height: 0.13, left: 0.70, width: 0.30 };

/**
 * Refuse if the found region fills more than this share of THE SEARCH BOX.
 *
 * Measured against the box, not the whole image — that distinction is the
 * entire guard. The box is about 4% of the image, so a region filling all of
 * it still scores ~4% of the image and sails under any image-relative
 * threshold. Tested with the product deliberately placed in the corner: the
 * image-relative version painted straight over it and reported success.
 *
 * A badge fills a corner of the box. A product intruding fills most of it.
 */
const MAX_REGION = 0.45;

/**
 * Ignore anything narrower than this share of the image width.
 *
 * The badge is text in a pill — about 16% of the width on every file seen so
 * far. Without a floor, a sliver of product clipping the corner reads as a
 * tiny "badge" and gets painted over: caught on an image with no badge at
 * all, where a 37px edge of the shoe was found and cleared. 37px was 3% of
 * the width, so the two are not close.
 */
const MIN_WIDTH = 0.08;

/**
 * The background colour, taken as the MEDIAN of the search area itself.
 *
 * Not a patch from the far corner, which was the first approach and broke on
 * the first image with a gradient background: the corner read as mid-grey,
 * every pixel near the badge then differed from it, and the whole box came
 * back as "badge".
 *
 * The median works because a badge is a minority of the box by definition —
 * so the middle value is the background it sits on, gradient and all. If the
 * product ever does fill most of the box, the median becomes the product and
 * MAX_REGION catches it.
 *
 * The stride is read from info.channels, never assumed to be 3. A PNG with an
 * alpha channel gives 4, and walking an RGBA buffer three bytes at a time
 * reads red, green, blue, alpha, red... as if it were RGB.
 */
async function groundColour(img, box) {
  const { data, info } = await img.clone().extract(box).raw().toBuffer({ resolveWithObject: true });
  const ch = info.channels;

  const hist = [new Uint32Array(256), new Uint32Array(256), new Uint32Array(256)];
  let count = 0;
  for (let i = 0; i < data.length; i += ch) {
    hist[0][data[i]]++; hist[1][data[i + 1]]++; hist[2][data[i + 2]]++;
    count++;
  }

  const median = (h) => {
    let seen = 0;
    for (let v = 0; v < 256; v++) { seen += h[v]; if (seen >= count / 2) return v; }
    return 255;
  };

  return { r: median(hist[0]), g: median(hist[1]), b: median(hist[2]) };
}

function searchBox(meta) {
  return {
    left: Math.floor(meta.width * SEARCH.left),
    top: Math.floor(meta.height * SEARCH.top),
    width: Math.floor(meta.width * SEARCH.width),
    height: Math.floor(meta.height * SEARCH.height),
  };
}

/**
 * The badge's box, grown inward from the top-right corner.
 *
 * NOT a bounding box over every deviating pixel in the strip — that was the
 * first approach, and it merged the badge with anything else up there
 * (a shadow, a gradient edge, the top of the shoe), producing one huge region
 * spanning both. A corner-anchored scan walks left from the right edge while
 * columns still have content and stops at a run of empty ones, so a separate
 * blob further left is simply never reached.
 */
async function findBadge(img, box, ground) {
  const { data, info } = await img.clone().extract(box).raw().toBuffer({ resolveWithObject: true });
  const ch = info.channels;

  const differs = (x, y) => {
    const i = (y * info.width + x) * ch;
    return Math.abs(data[i] - ground.r) + Math.abs(data[i + 1] - ground.g) + Math.abs(data[i + 2] - ground.b) > TOLERANCE;
  };

  const colHas = (x) => { for (let y = 0; y < info.height; y++) if (differs(x, y)) return true; return false; };
  const rowHas = (y, fromX) => { for (let x = fromX; x < info.width; x++) if (differs(x, y)) return true; return false; };

  // A badge has internal gaps — the space between letters. Tolerate a short
  // run of empty columns before deciding the badge has ended.
  const GAP = Math.max(8, Math.round(info.width * 0.03));

  let x = info.width - 1;
  while (x >= 0 && !colHas(x)) x--;          // skip the margin to the right of it
  if (x < 0) return null;                     // nothing in the corner at all

  let left = x, empty = 0;
  for (let cx = x; cx >= 0; cx--) {
    if (colHas(cx)) { left = cx; empty = 0; } else if (++empty > GAP) break;
  }

  let bottom = 0;
  for (let y = info.height - 1; y >= 0; y--) if (rowHas(y, left)) { bottom = y; break; }

  const pad = 6;
  const region = {
    left: Math.max(0, box.left + left - pad),
    top: box.top,
    width: (box.left + Math.min(info.width - 1, x + pad)) - Math.max(0, box.left + left - pad),
    height: Math.min(info.height - 1, bottom + pad) + 1,
  };

  const share = (region.width * region.height) / (box.width * box.height);
  const tooNarrow = region.width < box.width / SEARCH.width * MIN_WIDTH;
  return { region, share, tooNarrow };
}

async function main() {
  const [input, name, ...flags] = process.argv.slice(2);

  if (!input || !name) {
    console.error(`
  Usage:  node website/tools/prep-product-image.js <input> <output-name> [--keep-badge]

  Example:
    node website/tools/prep-product-image.js ~/Downloads/hoodie.png regent-hoodie-onyx
`);
    process.exit(1);
  }
  if (!fs.existsSync(input)) {
    console.error(`\n  No such file: ${input}\n`);
    process.exit(1);
  }
  if (!/^[a-z0-9-]+$/.test(name)) {
    console.error(`\n  Output name must be lowercase letters, digits and dashes: "${name}"\n`);
    process.exit(1);
  }

  const keepBadge = flags.includes('--keep-badge');
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const img = sharp(input);
  const meta = await img.metadata();
  const before = fs.statSync(input).size;

  console.log(`\n  ${path.basename(input)}  ${meta.width}×${meta.height}  ${(before / 1024).toFixed(0)}KB`);

  let pipeline = img;

  if (!keepBadge) {
    const box = searchBox(meta);
    const ground = await groundColour(img, box);
    const found = await findBadge(img, box, ground);

    if (!found || found.tooNarrow) {
      console.log('  · no corner badge found — nothing to clear');
    } else if (found.share > MAX_REGION) {
      // Loud, and it does not silently proceed. Better to ship the badge than
      // to paint over part of the product without anyone noticing.
      console.log(`  ! the area found fills ${(found.share * 100).toFixed(0)}% of the corner — too much for a badge.`);
      console.log('    That is probably the product, not a watermark, so nothing was painted over.');
      console.log('    Crop the badge off by hand, or re-run with --keep-badge.');
    } else {
      const { region } = found;
      const fill = await sharp({
        create: {
          width: Math.round(region.width), height: Math.round(region.height),
          channels: 3, background: ground,
        },
      }).png().toBuffer();

      pipeline = sharp(await img.clone()
        .composite([{ input: fill, left: Math.round(region.left), top: Math.round(region.top) }])
        .toBuffer());

      console.log(`  · cleared a ${Math.round(region.width)}×${Math.round(region.height)} badge ` +
                  `at ${Math.round(region.left)},${Math.round(region.top)} ` +
                  `using the image's own ground rgb(${ground.r},${ground.g},${ground.b})`);
    }
  }

  const webp = path.join(OUT_DIR, name + '.webp');
  const jpg = path.join(OUT_DIR, name + '.jpg');

  await pipeline.clone().resize({ width: WEB_WIDTH, withoutEnlargement: true })
    .webp({ quality: 82 }).toFile(webp);
  await pipeline.clone().resize({ width: WEB_WIDTH, withoutEnlargement: true })
    .jpeg({ quality: 84, mozjpeg: true }).toFile(jpg);

  fs.chmodSync(webp, 0o644);
  fs.chmodSync(jpg, 0o644);

  const w = fs.statSync(webp).size, j = fs.statSync(jpg).size;
  console.log(`  → assets/img/concepts/${name}.webp  ${(w / 1024).toFixed(0)}KB`);
  console.log(`  → assets/img/concepts/${name}.jpg   ${(j / 1024).toFixed(0)}KB`);
  console.log(`    ${(before / 1024).toFixed(0)}KB → ${(w / 1024).toFixed(0)}KB, ` +
              `${(100 - (w / before) * 100).toFixed(0)}% smaller\n`);

  if (!keepBadge) {
    console.log('  Re-encoding drops the file\'s Content Credentials, so Instagram and');
    console.log('  TikTok will not label this automatically any more. On your own site the');
    console.log('  page already says what these are. On social, that disclosure is now');
    console.log('  yours to make.\n');
  }
}

main().catch((err) => { console.error('\n  ' + err.message + '\n'); process.exit(1); });
