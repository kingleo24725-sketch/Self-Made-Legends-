/**
 * Self-Made Legends — the lion crest, drawn.
 * Copyright (c) 2026 Self-Made Legends LLC. All Rights Reserved.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  WHY THIS IS DRAWN AND NOT TRACED
 *
 *  The lion on the product sheets is a generated raster. Tracing it would
 *  carry across whatever it happens to resemble, and a crowned lion is
 *  among the most common devices in both heraldry and fashion — which is
 *  the worst possible starting point for something about to be filed as a
 *  trademark.
 *
 *  So the mark is constructed here from geometry, the same as the seal.
 *  Every curve is a number in this file. If anyone ever asks where it came
 *  from, the answer is this function rather than a prompt nobody kept.
 *
 *  It is also built to be STAMPED. The mane is a ring of separate lobes
 *  with real gaps between them, the face reads at 15mm, and there are no
 *  hairlines thinner than the crown's stroke — because a die cannot press
 *  a line finer than the metal that cuts it, and foil fills in anything
 *  narrower than about 0.3mm at print size.
 * ─────────────────────────────────────────────────────────────────────────
 */

'use strict';

const P = (n) => Number(n.toFixed(2));

/**
 * The mane: `count` lobes swept around a circle.
 *
 * Generated rather than hand-placed so the rhythm is exact. A mane drawn
 * lobe by lobe by eye wobbles, and at foil sizes a wobble reads as a
 * mistake rather than as character.
 */
function mane({ cx, cy, inner, outer, count, startDeg = -90, spread = 1.0, vary = 0 }) {
  const step = 360 / count;
  const parts = [];
  for (let i = 0; i < count; i++) {
    const mid = startDeg + i * step;
    const half = (step / 2) * spread;
    const a1 = ((mid - half) * Math.PI) / 180;
    const a2 = ((mid + half) * Math.PI) / 180;
    const am = (mid * Math.PI) / 180;

    // Alternating lock length. Equal lobes all round made a rosette — the
    // eye counted the petals and read a flower. Uneven ones read as hair.
    const r = outer * (1 - (i % 2 ? vary : 0));

    const x1 = cx + inner * Math.cos(a1), y1 = cy + inner * Math.sin(a1);
    const x2 = cx + inner * Math.cos(a2), y2 = cy + inner * Math.sin(a2);
    const tx = cx + r * Math.cos(am), ty = cy + r * Math.sin(am);
    const bulge = (inner + r) / 2 + (r - inner) * 0.3;
    const c1x = cx + bulge * Math.cos(a1 + (am - a1) * 0.4);
    const c1y = cy + bulge * Math.sin(a1 + (am - a1) * 0.4);
    const c2x = cx + bulge * Math.cos(a2 + (am - a2) * 0.4);
    const c2y = cy + bulge * Math.sin(a2 + (am - a2) * 0.4);

    parts.push(
      `M ${P(x1)} ${P(y1)} Q ${P(c1x)} ${P(c1y)} ${P(tx)} ${P(ty)} ` +
      `Q ${P(c2x)} ${P(c2y)} ${P(x2)} ${P(y2)} Z`
    );
  }
  return parts.join(' ');
}

/**
 * The head. Front-facing, symmetrical, and deliberately spare.
 *
 * A heraldic lion carries authority through symmetry and weight, not
 * through detail. Everything here is mirrored about the centre line, and
 * anything that survived only at large sizes has been taken out.
 */
function head({ cx, cy, ink, hole }) {
  const s = [];
  const FACE =
    `M ${cx} ${P(cy - 40)} ` +
    `C ${P(cx + 26)} ${P(cy - 40)} ${P(cx + 35)} ${P(cy - 25)} ${P(cx + 35)} ${P(cy - 2)} ` +
    `C ${P(cx + 35)} ${P(cy + 24)} ${P(cx + 21)} ${P(cy + 43)} ${cx} ${P(cy + 43)} ` +
    `C ${P(cx - 21)} ${P(cy + 43)} ${P(cx - 35)} ${P(cy + 24)} ${P(cx - 35)} ${P(cy - 2)} ` +
    `C ${P(cx - 35)} ${P(cy - 25)} ${P(cx - 26)} ${P(cy - 40)} ${cx} ${P(cy - 40)} Z`;

  // Mane behind everything, two rings, locks of uneven length.
  s.push(`<path d="${mane({ cx, cy, inner: 34, outer: 76, count: 13, startDeg: -90, spread: 1.45, vary: 0.17 })}" fill="${ink}"/>`);
  s.push(`<path d="${mane({ cx, cy, inner: 30, outer: 58, count: 13, startDeg: -90 + 360 / 26, spread: 1.55, vary: 0.12 })}" fill="${ink}"/>`);

  // Ears. Drawn against the mane and then given the same knocked-out edge
  // as the face, or they vanish into it — which is what happened twice.
  for (const dir of [-1, 1]) {
    const e = `M ${P(cx + dir * 22)} ${P(cy - 32)} q ${P(dir * 17)} ${-13} ${P(dir * 20)} ${3} ` +
              `q ${P(dir * 2)} ${12} ${P(-dir * 17)} ${12} Z`;
    s.push(`<path d="${e}" fill="${ink}" stroke="${hole}" stroke-width="3.2" stroke-linejoin="round"/>`);
  }

  // The face, with a knocked-out edge. In one ink there is no colour
  // difference between face and mane, so the only thing that separates them
  // is a gap — this stroke IS that gap.
  s.push(`<path d="${FACE}" fill="${ink}" stroke="${hole}" stroke-width="3.6" stroke-linejoin="round"/>`);

  return s.join('\n  ');
}

/** Face detail, knocked OUT of the head — so it works in any single ink. */
function features({ cx, cy, hole }) {
  const s = [];

  // Brow. Lighter and set higher than the first attempt, which put the eyes
  // low under a heavy bar and made the animal look sulky rather than regal.
  for (const dir of [-1, 1]) {
    s.push(
      `<path d="M ${P(cx + dir * 7)} ${P(cy - 17)} L ${P(cx + dir * 27)} ${P(cy - 21)} ` +
      `L ${P(cx + dir * 26)} ${P(cy - 14)} L ${P(cx + dir * 8)} ${P(cy - 11)} Z" fill="${hole}"/>`
    );
  }

  // Eyes.
  for (const dir of [-1, 1]) {
    s.push(`<ellipse cx="${P(cx + dir * 16)}" cy="${P(cy - 5)}" rx="5.6" ry="4.2" fill="${hole}"/>`);
  }

  // Muzzle: nose, philtrum, and the two curves of the mouth.
  s.push(`<path d="M ${P(cx - 8)} ${P(cy + 6)} L ${P(cx + 8)} ${P(cy + 6)} L ${cx} ${P(cy + 15)} Z" fill="${hole}"/>`);
  s.push(`<rect x="${P(cx - 1.3)}" y="${P(cy + 14)}" width="2.6" height="7" fill="${hole}"/>`);
  for (const dir of [-1, 1]) {
    s.push(
      `<path d="M ${cx} ${P(cy + 21)} q ${P(dir * 7)} ${6} ${P(dir * 12)} ${1}" ` +
      `fill="none" stroke="${hole}" stroke-width="3" stroke-linecap="round"/>`
    );
  }

  return s.join('\n  ');
}

/** The crown that sits over the mane. Same one as the seal. */
function crown({ cx, y, scale, ink }) {
  return `<g transform="translate(${cx},${y}) scale(${scale})">
    <path d="M-40 26 L-32 -2 L-14 12 L0 -12 L14 12 L32 -2 L40 26 Z"
          fill="none" stroke="${ink}" stroke-width="3.4" stroke-linejoin="round"/>
    <circle cx="-32" cy="-5"  r="4"   fill="${ink}"/>
    <circle cx="0"   cy="-15" r="4.6" fill="${ink}"/>
    <circle cx="32"  cy="-5"  r="4"   fill="${ink}"/>
    <rect x="-40" y="30" width="80" height="6" fill="${ink}"/>
  </g>`;
}

/**
 * The crest.
 *
 * `hole` is the colour the face detail is knocked out in. On a foil or an
 * emboss there is only one ink, so the detail has to be the ABSENCE of the
 * mark — which is why it takes the background colour rather than a second
 * ink that would not exist on the die.
 */
function crest({ ink, hole, wordmark = false }) {
  const cx = 100;
  const cy = wordmark ? 100 : 106;
  const h = wordmark ? 250 : 200;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 ${h}" width="200" height="${h}">
  <title>Self-Made Legends — lion crest</title>
  ${crown({ cx, y: wordmark ? 22 : 28, scale: 0.46, ink })}
  ${head({ cx, cy, ink, hole })}
  ${features({ cx, cy, hole })}
  ${wordmark
    ? `<text x="${cx}" y="234" text-anchor="middle" fill="${ink}"
        font-family="Bodoni Moda" font-size="24" letter-spacing="7">SML</text>`
    : ''}
</svg>`;
}

module.exports = { crest, mane, crown };
