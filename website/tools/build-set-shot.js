/**
 * Build the product shot for The Legacy Set.
 * Copyright (c) 2026 Self-Made Legends LLC. All Rights Reserved.
 *
 * Usage:  node website/tools/build-set-shot.js
 * Writes: website/assets/img/products/p-set.{webp,jpg}
 *
 * The Set is three pieces sold as one, so its card has to show three pieces.
 * Reusing the hoodie's photograph put the same picture on two cards standing
 * side by side, which reads as a bug and undercuts the one product on the
 * page worth the most.
 *
 * Laid out 3:2 to match .prod-shot exactly. The card crops with object-fit
 * cover, so anything that is not 3:2 loses its edges — and a composite that
 * loses its edges loses the socks.
 */
'use strict';

const sharp = require('sharp');
const path = require('path');

const DIR = path.resolve(__dirname, '../assets/img/products');
const W = 1200, H = 800;      // 3:2, the aspect .prod-shot declares
const GAP = 4;                // shows the ground through as a hairline rule
const LEFT = 656;             // the hoodie leads; it is the piece people know
const RIGHT = W - LEFT - GAP;
const ROW = (H - GAP) / 2;

// The gap colour IS the rule. Gold-ash, the same token the cards use for
// their own borders, so the seams belong to the page rather than sitting on it.
const GROUND = { r: 0x72, g: 0x5D, b: 0x24 };

async function tile(name, w, h, position) {
  return sharp(path.join(DIR, name))
    .resize(Math.round(w), Math.round(h), { fit: 'cover', position })
    .toBuffer();
}

(async () => {
  const [hoodie, pants, socks] = await Promise.all([
    // Bias up: the crest sits high on the chest and centre-cropping cuts it.
    tile('p-hoodie.jpg', LEFT, H, 'top'),
    tile('p-sweatpants.jpg', RIGHT, ROW, 'centre'),
    tile('p-socks.jpg', RIGHT, ROW, 'centre'),
  ]);

  const composed = await sharp({
    create: { width: W, height: H, channels: 3, background: GROUND },
  })
    .composite([
      { input: hoodie, left: 0, top: 0 },
      { input: pants, left: LEFT + GAP, top: 0 },
      { input: socks, left: LEFT + GAP, top: Math.round(ROW + GAP) },
    ])
    .png()
    .toBuffer();

  // Two stages: sharp runs resize BEFORE composite within one pipeline, so a
  // chained resize here would scale the tiles and then paste them, not the
  // other way round. The buffer round-trip is what makes the order explicit.
  await Promise.all([
    sharp(composed).jpeg({ quality: 88, chromaSubsampling: '4:4:4' }).toFile(path.join(DIR, 'p-set.jpg')),
    sharp(composed).webp({ quality: 86 }).toFile(path.join(DIR, 'p-set.webp')),
  ]);

  const meta = await sharp(path.join(DIR, 'p-set.jpg')).metadata();
  console.log(`  OK  p-set.jpg  ${meta.width}x${meta.height}  (${(meta.width / meta.height).toFixed(3)}:1, wants 1.500)`);
})();
