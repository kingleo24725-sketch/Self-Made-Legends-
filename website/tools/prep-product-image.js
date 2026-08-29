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

async function groundColour(img, meta) {
  // A 40px block from the top-left: clear of a top-right badge and, in a
  // studio product shot, clear of the product.
  //
  // The stride is read from info.channels rather than assumed to be 3. A PNG
  // with an alpha channel gives 4, and walking an RGBA buffer three bytes at
  // a time reads red, green, blue, alpha, red... as if it were RGB — the
  // "ground colour" then comes out as garbage and nothing is ever detected.
  // Most PNGs carry alpha, so this was not an edge case.
  const { data, info } = await img.clone()
    .extract({ left: 4, top: 4, width: 40, height: 40 })
    .raw().toBuffer({ resolveWithObject: true });

  const ch = info.channels;
  let r = 0, g = 0, b = 0;
  const n = data.length / ch;
  for (let i = 0; i < data.length; i += ch) { r += data[i]; g += data[i + 1]; b += data[i + 2]; }
  return { r: Math.round(r / n), g: Math.round(g / n), b: Math.round(b / n) };
}

/** Bounding box of everything in the search area that is not the ground. */
async function findBadge(img, meta, ground) {
  const box = {
    left: Math.floor(meta.width * SEARCH.left),
    top: Math.floor(meta.height * SEARCH.top),
    width: Math.floor(meta.width * SEARCH.width),
    height: Math.floor(meta.height * SEARCH.height),
  };

  const { data, info } = await img.clone().extract(box).raw().toBuffer({ resolveWithObject: true });

  let minX = Infinity, minY = Infinity, maxX = -1, maxY = -1;
  const ch = info.channels;

  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const i = (y * info.width + x) * ch;
      const off = Math.abs(data[i] - ground.r) + Math.abs(data[i + 1] - ground.g) + Math.abs(data[i + 2] - ground.b);
      if (off > TOLERANCE) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < 0) return null; // nothing there — no badge to clear

  // A few pixels of margin, so no anti-aliased edge survives.
  const pad = 6;
  const region = {
    left: Math.max(0, box.left + minX - pad),
    top: Math.max(0, box.top + minY - pad),
    width: Math.min(meta.width, box.left + maxX + pad) - Math.max(0, box.left + minX - pad),
    height: Math.min(meta.height, box.top + maxY + pad) - Math.max(0, box.top + minY - pad),
  };

  const share = (region.width * region.height) / (box.width * box.height);
  return { region, share };
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
    const ground = await groundColour(img, meta);
    const found = await findBadge(img, meta, ground);

    if (!found) {
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
