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
 * ─────────────────────────────────────────────────────────────────────────
 *  WHY THE FIRST ONE FAILED
 *
 *  It came back a mascot. Worth writing down what actually caused that,
 *  because every one of these is a decision anyone redrawing it could
 *  quietly make again:
 *
 *    a round face          — a circle is a baby's head. Skulls are angular:
 *                            wide at the temple, tapered to a jaw.
 *    oval eyes             — a wide round eye is the single strongest
 *                            "harmless" signal there is. Predators squint.
 *    a curved mouth        — it was, unmistakably, a smile.
 *    petal-shaped locks    — quadratic bulges on both edges are a leaf. A
 *                            ring of leaves is a flower, and it read as one.
 *    separated locks       — locks radiating from a small centre read as a
 *                            SUN. The mane has to be one solid mass whose
 *                            EDGE is jagged.
 *    a hairline crown      — an outlined crown floating clear of the head
 *                            is a wire prop, not a weight being carried.
 *
 *  This version inverts all six. It is also built to be STAMPED: no stroke
 *  is thinner than the knockout gap, because foil fills in anything under
 *  about 0.3mm at print size and a die cannot cut finer than its metal.
 * ─────────────────────────────────────────────────────────────────────────
 */

'use strict';

const P = (n) => Number(n.toFixed(2));
const RAD = (deg) => (deg * Math.PI) / 180;

/**
 * Half the mane, as one closed outline with a flame edge.
 *
 * `profile` is the whole idea. It gives the mane's radius as a function of
 * angle, so the silhouette can be a SHIELD — cropped over the head, carried
 * wide at the cheek, driven to a point below the chin. Earlier versions set
 * one constant radius and hung locks off it, and a ring of points at a
 * constant radius is a sun whatever is drawn in the middle of it. That was
 * the single hardest thing to see and the single biggest fix.
 *
 * `notch` is how deep the gap between two locks cuts, in absolute units.
 * `hook` swings every tip off its own angle, so the locks lean instead of
 * radiating. `rhythm` scales successive locks so the outline never repeats.
 * `squash` narrows the whole shape horizontally; a circle is a disc, and
 * something slightly taller than it is wide is a head.
 */
function mane({ cx, cy, profile, count, notch = 20, hook = 8, rhythm = [1], squash = 0.9 }) {
  // Radius as a function of angle, linearly interpolated between the stops.
  // 0deg is due right, +90 straight down. The table runs -90 (straight up)
  // to +90 (straight down) and is mirrored across the vertical, because the
  // mark is symmetrical.
  const rAt = (deg) => {
    let a = ((((deg + 180) % 360) + 360) % 360) - 180;   // into (-180, 180]
    if (a > 90) a = 180 - a;
    else if (a < -90) a = -180 - a;
    const t = profile;
    for (let i = 0; i < t.length - 1; i++) {
      const [d0, r0] = t[i], [d1, r1] = t[i + 1];
      if (a >= d0 && a <= d1) return r0 + ((r1 - r0) * (a - d0)) / (d1 - d0);
    }
    return a < t[0][0] ? t[0][1] : t[t.length - 1][1];
  };

  const at = (deg, r) => [cx + r * squash * Math.cos(RAD(deg)), cy + r * Math.sin(RAD(deg))];
  const step = 360 / count;
  const d = [];

  // Only the RIGHT half is generated; the caller mirrors it. Walking the
  // whole ring in one pass made each side different — the rhythm landed on
  // different angles left and right, and the hook leaned every lock the same
  // way round. That does not read as character, it reads as a drawing that
  // went wrong. Half plus a mirror is symmetrical by construction.
  for (let i = 0; i <= count / 2; i++) {
    const tip = -90 + i * step;
    const rt = rAt(tip) * rhythm[i % rhythm.length];

    const [tx, ty] = at(tip + hook, rt);
    d.push(i === 0 ? `M ${P(tx)} ${P(ty)}` : `L ${P(tx)} ${P(ty)}`);

    if (i === count / 2) break;
    const valley = tip + step / 2;
    // The notch is a FIXED depth, not a fraction of the radius. As a
    // fraction, the long locks under the chin got proportionally deeper
    // gaps and the bottom of the mane thinned out into spindles while the
    // top stayed solid.
    const [vx, vy] = at(valley, Math.max(rAt(valley) - notch, 30));
    // Control point swung past the tip, which makes the trailing edge of
    // each lock concave — a flame rather than a spike.
    const [c1x, c1y] = at(tip + hook + step * 0.34, rt * 0.82);
    d.push(`Q ${P(c1x)} ${P(c1y)} ${P(vx)} ${P(vy)}`);
  }

  // Close back through the centre. The two halves overlap on the centre
  // line, which is what welds them into one mass.
  return d.join(' ') + ` L ${cx} ${cy} Z`;
}

/**
 * The head, and the mane behind it. Angular, front-facing, symmetrical.
 *
 * The two masses have to be balanced against each other: when the face was
 * drawn wider than the mane's own radius the mane stopped reading as a mane
 * and turned into a fringe stuck on behind the ears.
 */
function head({ cx, cy, ink, hole }) {
  const s = [];

  // Wider than it is tall, and finished with a BROAD FLAT CHIN — a face that
  // tapers to a single point at the bottom reads as a fox.
  //
  // Only the cheek is curved. Rounding the temple and the jaw as well turned
  // the head into a bar of soap; the corners are what carry the weight, and
  // a skull has exactly two of them per side.
  const FACE =
    `M ${P(cx - 25)} ${P(cy - 41)} L ${P(cx + 25)} ${P(cy - 41)} ` +                 // flat crown of the skull
    `L ${P(cx + 44)} ${P(cy - 24)} ` +                                                // temple, a corner
    `Q ${P(cx + 48)} ${P(cy - 4)} ${P(cx + 44)} ${P(cy + 10)} ` +                    // cheekbone, widest point
    `L ${P(cx + 33)} ${P(cy + 29)} ` +                                                // jaw, a corner
    `Q ${P(cx + 26)} ${P(cy + 38)} ${P(cx + 13)} ${P(cy + 39)} ` +
    `L ${P(cx - 13)} ${P(cy + 39)} ` +                                                // chin, broad and flat
    `Q ${P(cx - 26)} ${P(cy + 38)} ${P(cx - 33)} ${P(cy + 29)} ` +
    `L ${P(cx - 44)} ${P(cy + 10)} ` +
    `Q ${P(cx - 48)} ${P(cy - 4)} ${P(cx - 44)} ${P(cy - 24)} Z`;

  // One closed shield with a flame edge, drawn as a half and mirrored.
  //
  // The first stop sits INSIDE the face outline on purpose, so the crown
  // rests on a clean skull. Any higher and the topmost locks poke a few
  // units above the forehead, leaving a row of dark slivers between crown
  // and head that reads as a broken comb.
  const half = mane({
    cx, cy, count: 20, notch: 19, hook: 7, rhythm: [1, 0.87, 0.98, 0.84, 0.94, 0.9],
    profile: [[-90, 38], [-62, 58], [-30, 86], [0, 100], [30, 106], [58, 106], [78, 102], [90, 100]],
  });
  s.push(`<path fill="${ink}" d="${half}"/>`);
  s.push(`<path fill="${ink}" d="${half}" transform="translate(${2 * cx},0) scale(-1,1)"/>`);

  // Lock separations knocked out of the mane's interior. Without them the
  // whole area below the chin is one unbroken field of ink and reads as a
  // bib rather than as hair — the jagged outline alone is not enough once
  // the mane is deeper than it is wide.
  for (const dir of [-1, 1]) {
    // Nothing near 90 degrees. A mirrored pair that close to straight down
    // lands as two parallel bars either side of the centre line, and the
    // bottom of the mane read as a necktie.
    for (const [deg, r0, r1] of [[8, 56, 92], [38, 58, 96], [68, 54, 90]]) {
      const a = RAD(deg);
      const pt = (r) => `${P(cx + dir * r * 0.9 * Math.cos(a))} ${P(cy + r * Math.sin(a))}`;
      s.push(
        `<path fill="none" stroke="${hole}" stroke-width="4.2" stroke-linecap="round" ` +
        `d="M ${pt(r0)} L ${pt(r1)}"/>`
      );
    }
  }

  // Ears at the top corners of the skull, with the same knocked-out edge as
  // the face. Without that gap they disappear into the mane behind them.
  for (const dir of [-1, 1]) {
    // A sharp tip with only the back edge curved. Curving both edges, as the
    // last pass did, produced a leaf.
    const e = `M ${P(cx + dir * 28)} ${P(cy - 38)} L ${P(cx + dir * 55)} ${P(cy - 56)} ` +
              `Q ${P(cx + dir * 55)} ${P(cy - 32)} ${P(cx + dir * 44)} ${P(cy - 19)} Z`;
    s.push(`<path d="${e}" fill="${ink}" stroke="${hole}" stroke-width="4" stroke-linejoin="round"/>`);
  }

  // The face. In one ink there is no colour difference between face and
  // mane, so the only thing that can separate them is a gap — this stroke
  // IS that gap.
  s.push(`<path d="${FACE}" fill="${ink}" stroke="${hole}" stroke-width="3.2" stroke-linejoin="round"/>`);

  return s.join('\n  ');
}

/**
 * Face detail, knocked OUT of the head — so it survives in any single ink.
 *
 * Every element here slopes down toward the centre line. That one rule is
 * what the whole expression rests on.
 */
function features({ cx, cy, ink, hole }) {
  const s = [];

  // Brows: two steep wedges, and NOT a bar across the whole head.
  //
  // The previous attempt ran one continuous brow the full width of the face,
  // and it stopped being a brow — it was a bandit's mask over the top half
  // of the head. A brow belongs directly above the eye and nowhere else; the
  // forehead above it is what gives a skull height.
  for (const dir of [-1, 1]) {
    s.push(
      `<path fill="${hole}" d="M ${P(cx + dir * 8)} ${P(cy - 11)} L ${P(cx + dir * 40)} ${P(cy - 27)} ` +
      `L ${P(cx + dir * 40)} ${P(cy - 18)} L ${P(cx + dir * 9)} ${P(cy - 2)} Z"/>`
    );
  }

  // Eyes: narrowed wedges under the brow, pointed toward the nose. A round
  // eye is the difference between a predator and a plush toy. The gold gap
  // between brow and eye has to survive — closed up, the two merge into one
  // slash and the face turns into a visor.
  for (const dir of [-1, 1]) {
    s.push(
      `<path fill="${hole}" d="M ${P(cx + dir * 12)} ${P(cy + 4)} L ${P(cx + dir * 36)} ${P(cy - 7)} ` +
      `L ${P(cx + dir * 37)} ${P(cy + 3)} Z"/>`
    );
  }

  // Muzzle: nose, philtrum, the two curves of the top lip, and fangs hanging
  // off it. There is deliberately NO open mouth. An open mouth here needs a
  // filled dark shape, and a filled dark shape in the lower third of a face
  // is a grin no matter how the corners are angled — which is what the last
  // two attempts kept producing.
  s.push(`<path fill="${hole}" d="M ${P(cx - 19)} ${P(cy + 7)} L ${P(cx + 19)} ${P(cy + 7)} L ${cx} ${P(cy + 21)} Z"/>`);
  s.push(`<rect x="${P(cx - 2.6)}" y="${P(cy + 20)}" width="5.2" height="5" fill="${hole}"/>`);

  for (const dir of [-1, 1]) {
    s.push(
      `<path fill="none" stroke="${hole}" stroke-width="4.6" stroke-linecap="round" ` +
      `d="M ${cx} ${P(cy + 25)} q ${P(dir * 11)} ${10} ${P(dir * 26)} ${1}"/>`
    );
    // Wide-based and short. A long thin fang is the first thing a foil die
    // fills in, and a fang that closes up is just a smudge on the chin.
    s.push(
      `<path fill="${hole}" d="M ${P(cx + dir * 4)} ${P(cy + 28)} L ${P(cx + dir * 17)} ${P(cy + 29)} ` +
      `L ${P(cx + dir * 10)} ${P(cy + 38)} Z"/>`
    );
  }

  return s.join('\n  ');
}

/**
 * The crown. SOLID, and sunk into the mane.
 *
 * The first one was an outlined wire hovering in clear space above the
 * head. A crown reads as authority only when it has mass and when it is
 * plainly being worn rather than hung above.
 */
function crown({ cx, y, scale, ink, hole }) {
  return `<g transform="translate(${cx},${y}) scale(${scale})">
    <path d="M-46 30 L-46 -14 L-23 10 L0 -42 L23 10 L46 -14 L46 30 Z" fill="${ink}"/>
    <rect x="-53" y="26" width="106" height="18" fill="${ink}"/>
    <circle cx="-26" cy="35" r="4.6" fill="${hole}"/>
    <circle cx="0"   cy="35" r="4.6" fill="${hole}"/>
    <circle cx="26"  cy="35" r="4.6" fill="${hole}"/>
  </g>`;
}

/**
 * The crest.
 *
 * `hole` is the colour the detail is knocked out in. On a foil or an emboss
 * there is only one ink, so the detail has to be the ABSENCE of the mark —
 * which is why it takes the background colour rather than a second ink that
 * would not exist on the die.
 */
function crest({ ink, hole, wordmark = false }) {
  const cx = 100;
  const cy = 126;
  const h = wordmark ? 270 : 238;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 ${h}" width="200" height="${h}">
  <title>Self-Made Legends — lion crest</title>
  ${head({ cx, cy, ink, hole })}
  ${crown({ cx, y: cy - 84, scale: 0.7, ink, hole })}
  ${features({ cx, cy, ink, hole })}
  ${wordmark
    ? `<text x="${cx}" y="258" text-anchor="middle" fill="${ink}"
        font-family="Bodoni Moda, 'Bodoni Moda 11pt', Didot, serif" font-size="26" letter-spacing="7">SML</text>`
    : ''}
</svg>`;
}

/**
 * A lion RAMPANT — up on its hind legs, forepaws raised, facing the viewer.
 *
 * Drawn in its own coordinates: the origin is on the ground between the back
 * feet, and the animal grows upward into negative y. It stands about 41 tall
 * and 30 wide, so the seal can place a pair of them with one transform each.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  THIS ONE IS DRAWN FOR ITS SIZE, NOT FOR THE SCREEN
 *
 *  Two of these flank the monogram inside a 200-unit seal. On a business
 *  card printed at 15mm that makes each lion about 3mm tall — roughly the
 *  height of the text you are reading. Nothing survives at 3mm except the
 *  SILHOUETTE, so this is built as one:
 *
 *    limbs are STROKES with round caps, not filled outlines. A filled limb
 *      needs two edges and a gap between them; at 3mm the gap closes and
 *      you get a blob. One stroke has one weight and degrades cleanly.
 *    the mane is BIGGER than the head and the paws stand CLEAR of the body,
 *      because separation is the only thing the eye has left at this size.
 *    the face is knocked out in three marks and no more. They fill in when
 *      it is stamped small, which is the correct way for detail to die —
 *      the head simply becomes solid rather than becoming mud.
 *
 *  `tail` is +1 or -1 for which side the tail sweeps. The pair mirrors, so
 *  each lion's tail goes to the OUTSIDE of the seal.
 * ─────────────────────────────────────────────────────────────────────────
 */
/** A small spiked disc: the mane, at a size where nothing else fits. */
function maneDisc({ cx, cy, r, count, ink }) {
  const step = 360 / count;
  const pts = [];
  for (let i = 0; i < count; i++) {
    const at = (deg, rr) => `${P(cx + rr * Math.cos(RAD(deg)))} ${P(cy + rr * Math.sin(RAD(deg)))}`;
    const mid = -90 + i * step;
    const out = r * (i % 2 ? 1.12 : 1.26);
    pts.push(`M ${at(mid - step * 0.44, r * 0.92)} L ${at(mid, out)} L ${at(mid + step * 0.44, r * 0.92)} Z`);
  }
  // Points, not overlapping circles. Circles gave a curly wig.
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${ink}"/>` +
         `<path d="${pts.join(' ')}" fill="${ink}"/>`;
}

/** The face, in three knocked-out marks. Any more closes up when stamped. */
function tinyFace({ cx, cy, hole }) {
  return `<circle cx="${P(cx - 2.5)}" cy="${P(cy - 1.4)}" r="1.05" fill="${hole}"/>` +
         `<circle cx="${P(cx + 2.5)}" cy="${P(cy - 1.4)}" r="1.05" fill="${hole}"/>` +
         `<path d="M ${P(cx - 1.8)} ${P(cy + 1.9)} L ${P(cx + 1.8)} ${P(cy + 1.9)} ` +
         `L ${cx} ${P(cy + 4.3)} Z" fill="${hole}"/>`;
}

function rampant({ ink, hole, pose = 'guardant', face = true }) {
  const s = [];
  const limb = (d, w) =>
    `<path d="${d}" fill="none" stroke="${ink}" stroke-width="${w}" stroke-linecap="round"/>`;

  if (pose === 'front') {
    // AFFRONTÉ — square on to the reader, both forelegs raised.
    //
    // Kept because it is the literal reading of "facing the person looking
    // at them", but it is the weaker of the two and the reason is
    // structural: a symmetrical biped with both arms up is the silhouette
    // of a standing BEAR, and no amount of mane fixes that. It is drawn
    // lean here, with the paws reaching forward rather than straight up,
    // which is as far from a teddy bear as this pose goes.
    s.push(limb('M 6 -14 Q 15 -17 13.5 -28', 2.4));
    s.push(`<circle cx="13.5" cy="-30.2" r="2.6" fill="${ink}"/>`);

    for (const d of [-1, 1]) {
      s.push(limb(`M ${P(d * 4.2)} -14 Q ${P(d * 8)} -8 ${P(d * 5.6)} -3`, 4));
      s.push(limb(`M ${P(d * 8.6)} -2 L ${P(d * 3)} -2`, 3.2));
    }

    s.push(
      `<path fill="${ink}" d="M -6.4 -12 C -4.6 -18 -4.8 -23 -5.6 -28 ` +
      `L 5.6 -28 C 4.8 -23 4.6 -18 6.4 -12 Z"/>`
    );

    // Forward and slightly down, not up in the air.
    for (const d of [-1, 1]) {
      s.push(limb(`M ${P(d * 4.4)} -26 Q ${P(d * 9.5)} -28.5 ${P(d * 12)} -31.5`, 3.6));
      s.push(`<circle cx="${P(d * 13)}" cy="-32.4" r="2.4" fill="${ink}"/>`);
    }

    for (const d of [-1, 1]) s.push(`<circle cx="${P(d * 4.4)}" cy="-38.6" r="2.1" fill="${ink}"/>`);
    s.push(maneDisc({ cx: 0, cy: -33.4, r: 6.4, count: 11, ink }));
    if (face) s.push(tinyFace({ cx: 0, cy: -33.4, hole }));
    return s.join('\n    ');
  }

  // RAMPANT GUARDANT — body in profile facing right, head turned full-face
  // to the reader. This is the heraldic answer to "facing the person
  // looking at them", and it is the one that survives being 3mm tall: the
  // long diagonal of the back and the two forepaws reaching out ahead of
  // the chest are what say LION at a glance. Square on, that diagonal
  // disappears and the animal loses the one line that identifies it.

  // Everything here is DELIBERATELY HEAVY. The first attempt drew the limbs
  // as thin strokes and the animal came out spindly — a dog on its back
  // legs. At 30 units inside a 200-unit seal there is no room for anatomy,
  // only for weight, so the haunch and shoulder are solid masses and no
  // limb is thinner than 3.
  s.push(limb('M -8 -18 Q -17 -24 -14 -34', 3.2));
  s.push(`<path fill="${ink}" d="M -14 -33 Q -18.4 -38 -13.6 -41.6 Q -10.6 -37.4 -14 -33 Z"/>`);

  // Hind leg: short, thick, with a real haunch above it. The haunch is what
  // says the animal is pushing up rather than merely standing.
  s.push(limb('M -5.5 -14 Q -9 -8.5 -7 -3', 5.4));
  s.push(limb('M -10 -1.7 L -2.4 -1.7', 3.6));
  s.push(`<ellipse cx="-6.2" cy="-15" rx="6.6" ry="7.2" fill="${ink}"/>`);

  // The torso, steeply upright. Nearly horizontal it reads as a quadruped
  // leaning on something; at about sixty degrees it reads as rampant.
  s.push(
    `<path fill="${ink}" d="M -8.4 -13.6 C -8.4 -22 -4 -28 2 -32 ` +
    `L 8 -31 C 9.2 -27 8.4 -23 5.2 -21 ` +
    `C 1.2 -19 -1.6 -16.6 -3.2 -11.8 Z"/>`
  );
  s.push(`<circle cx="6" cy="-28" r="6.1" fill="${ink}"/>`);

  // Forepaws reaching out AHEAD of the head, one high and one low.
  //
  // They were level with the mane before and the mane's spikes swallowed
  // them — three round shapes at the same height merged into one lump. The
  // head sits back over the shoulder instead, which is where a rampant
  // lion's head belongs anyway, and the paws now clear it.
  s.push(limb('M 6.5 -30 Q 12 -33.5 15.4 -35.4', 4.4));
  s.push(`<circle cx="16.5" cy="-36.2" r="2.7" fill="${ink}"/>`);
  s.push(limb('M 6.8 -26.6 Q 11 -28 13.6 -26', 3.9));
  s.push(`<circle cx="14.6" cy="-25.2" r="2.4" fill="${ink}"/>`);

  for (const d of [-1, 1]) s.push(`<circle cx="${P(5 + d * 4.7)}" cy="-46.2" r="2.2" fill="${ink}"/>`);
  s.push(maneDisc({ cx: 5, cy: -40.4, r: 7.4, count: 11, ink }));
  // Skippable, and skipped on the website. The face is three knockouts in
  // the BACKGROUND colour, and the seal appears on more than one background
  // there; at web sizes it is invisible anyway, so a solid head is both
  // safer and identical to look at.
  if (face) s.push(tinyFace({ cx: 5, cy: -40.4, hole }));

  return s.join('\n    ');
}

module.exports = { crest, mane, crown, rampant };
