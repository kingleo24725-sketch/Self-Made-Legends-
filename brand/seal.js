/**
 * Self-Made Legends — the house seal.
 * Copyright (c) 2026 Self-Made Legends LLC. All Rights Reserved.
 *
 * This is THE logo: the full name, the founding year, the crown, the
 * monogram, and two lions rampant supporting it. It is what goes on a
 * business card, a box, a letterhead.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  DO NOT HAND-EDIT THE RENDERED SVGs
 *
 *  This function is the only source. `brand/out/` and the two standalone
 *  files under `website/assets/brand/` are both written from it, because
 *  they were kept separately for a while and drifted — an older gold, and
 *  the founding year set reversed and upside down.
 *
 *  That second one is the trap to know about. The arc text runs on two
 *  SEMICIRCULAR paths, and a textPath follows its own path's direction. A
 *  semicircle makes the large-arc flag meaningless, which leaves the sweep
 *  flag as the only thing holding the year the right way up. Flip it and
 *  nothing errors, nothing warns, the file still opens — EST. MMXXVI just
 *  quietly sets backwards. At the size a seal is normally looked at, that
 *  is eight characters across a few dozen pixels, and it shipped.
 * ─────────────────────────────────────────────────────────────────────────
 */

'use strict';

const { rampant } = require('./lion');
const { GOLD, GOLD_DP, GOLD_LT, GOLD_HI } = require('./palette');

const INK = { gradient: 'url(#gf)', gold: GOLD, black: '#000000', white: '#FFFFFF' };

/**
 * The monogram's stack, naming the SAME face twice on purpose.
 *
 * Google Fonts serves it as "Bodoni Moda". The TTF installed on this machine
 * declares its family as "Bodoni Moda 11pt". A stack naming only the first
 * renders correctly on the website and silently falls through to the generic
 * `serif` in every file this repo builds — which is Liberation Serif, a
 * Times clone with none of a Didone's contrast.
 *
 * It went unnoticed because a serif SML at seal size still looks like a
 * serif SML. It only showed up in a PDF's embedded-font list. Naming both
 * resolves in either place; a browser skips whichever it cannot find.
 */
const DIDOT = "Bodoni Moda, 'Bodoni Moda 11pt', Didot, serif";

/**
 * The pair of lions under the monogram, and the three dots between them.
 *
 * Exported on its own because the homepage carries an inline copy of the
 * seal rather than loading the file, and that copy is written by the build
 * from this same function. Six hand-kept copies of the seal is how the
 * founding year came to be reversed on the live site while the print pack
 * was correct.
 *
 * Supporters, so the bodies turn IN toward the monogram and the tails sweep
 * outward. The pair is one drawing mirrored — which is why only one lion
 * exists in lion.js.
 */
function supporters({ ink, hole, pose = 'guardant', face = true, indent = '  ' }) {
  const one = rampant({ ink, hole, pose, face });
  return [
    `${indent}<g transform="translate(76,161) scale(.85)">`,
    `${indent}  ${one}`,
    `${indent}</g>`,
    `${indent}<g transform="translate(124,161) scale(-.85,.85)">`,
    `${indent}  ${one}`,
    `${indent}</g>`,
    `${indent}<g fill="${ink}">`,
    `${indent}  <circle cx="94"  cy="156" r="1.5"/>`,
    `${indent}  <circle cx="100" cy="156" r="1.5"/>`,
    `${indent}  <circle cx="106" cy="156" r="1.5"/>`,
    `${indent}</g>`,
  ].join('\n');
}

/**
 * One seal, four inks.
 *
 * `ink` is what every stroke and fill resolves to. Only the 'gradient'
 * variant uses more than one value, and only it is unsuitable for foil.
 */
function seal({ variant, ground = '#0B0F0D', pose = 'guardant' }) {
  const gradient = variant === 'gradient';
  const ink = INK[variant];
  // The inner ring is a half-tone of the main ink on the website. On a
  // one-colour job there is no half-tone, so it takes the same ink.
  const faint = gradient ? GOLD_DP : ink;
  // What the lions' faces are knocked out in. There is only ever one ink on
  // a foil die, so the detail has to be the ABSENCE of the mark.
  const hole = variant === 'black' ? '#FFFFFF' : ground;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200" role="img" aria-label="Self-Made Legends seal">
  <title>Self-Made Legends</title>
  <defs>
    ${gradient ? `<linearGradient id="gf" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%"   stop-color="${GOLD_DP}"/>
      <stop offset="22%"  stop-color="${GOLD}"/>
      <stop offset="44%"  stop-color="${GOLD_LT}"/>
      <stop offset="64%"  stop-color="${GOLD}"/>
      <stop offset="84%"  stop-color="${GOLD_DP}"/>
      <stop offset="100%" stop-color="${GOLD_HI}"/>
    </linearGradient>` : ''}
    <path id="arcTop" d="M 100,100 m -84,0 a 84,84 0 1,1 168,0" fill="none"/>
    <!-- Sweep 0, starting from the LEFT point. See the header: the other
         way round sets EST. MMXXVI reversed and upside down, silently. -->
    <path id="arcBot" d="M 100,100 m -84,0 a 84,84 0 0,0 168,0" fill="none"/>
  </defs>

  <circle cx="100" cy="100" r="97" fill="none" stroke="${ink}" stroke-width="1.6"/>
  <circle cx="100" cy="100" r="92" fill="none" stroke="${faint}" stroke-width=".7"${gradient ? ' opacity=".85"' : ''}/>
  <circle cx="100" cy="100" r="72" fill="none" stroke="${ink}" stroke-width="1.1"/>

  <text font-family="DM Mono, monospace" font-size="10.5" letter-spacing="3.4" fill="${ink}">
    <textPath href="#arcTop" startOffset="50%" text-anchor="middle">SELF-MADE LEGENDS</textPath>
  </text>
  <text font-family="DM Mono, monospace" font-size="8.5" letter-spacing="3" fill="${faint}">
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
        font-family="${DIDOT}" font-size="30" letter-spacing="5">SML</text>

  <!-- Two lions rampant, where the laurel sprigs used to be. -->
${supporters({ ink, hole, pose })}
</svg>`;
}

module.exports = { seal, supporters, INK };
