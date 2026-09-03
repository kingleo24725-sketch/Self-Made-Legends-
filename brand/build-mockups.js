/**
 * Self-Made Legends — business cards and packaging.
 * Copyright (c) 2026 Self-Made Legends LLC. All Rights Reserved.
 *
 * Usage:  node brand/build-mockups.js
 * Writes: brand/out/mockups/   presentation sheet, for looking at
 *         brand/out/print/     the actual files a printer needs
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  A MOCKUP IS NOT A PRINT FILE
 *
 *  The sheet in mockups/ is for deciding. The PDFs in print/ are what a
 *  printer runs, and they are different objects:
 *
 *    bleed        artwork runs 3mm past every edge, because guillotines
 *                 drift by a millimetre or two and a background that stops
 *                 exactly at the trim line comes back with white slivers.
 *    safe area    nothing that must survive sits within 4mm of the trim.
 *    real size    the page IS 91x61mm, not a picture of one. Send a printer
 *                 a PNG of a card and they will ask for this instead.
 *
 *  The foil layer is supplied SEPARATELY as solid black on white. A foil
 *  die is cut from a one-bit image: black is where metal goes. Handing a
 *  stamper the gold-on-black visual and asking them to work it out is how
 *  you get a die that includes the background.
 * ─────────────────────────────────────────────────────────────────────────
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { seal } = require('./seal');
const { GOLD, GROUND } = require('./palette');

const OUT_M = path.join(__dirname, 'out', 'mockups');
const OUT_P = path.join(__dirname, 'out', 'print');
const CHROME = '/opt/pw-browsers/chromium';

/* Jason's own details, kept identical to the ones on the factory RFQ. */
const NAME = 'Jason D. Brown Jr.';
const ROLE = 'Founder';
const MAIL = 'ceo@selfmadelegendsz.com';
const TEL = '+1 (816) 466-3083';
const SITE = 'selfmadelegendsz.com';

/**
 * How big the seal is on each piece, in mm.
 *
 * MIN is the documented floor and the build ENFORCES it rather than
 * trusting the numbers below. The first pass put a 24mm seal on the hang
 * tag one commit after writing 25mm into the README — the guidance and the
 * artwork drifted apart inside a single sitting, which is exactly how the
 * gold ended up with two values.
 */
const MIN = 25;
const AT = {
  card: 30,
  hangtag: 30,
  box: 46,
  bag: 34,
  sticker: 40,
};
for (const [piece, size] of Object.entries(AT)) {
  if (size < MIN) throw new Error(`${piece}: seal at ${size}mm is under the ${MIN}mm minimum`);
}

/**
 * Namespace a seal's internal ids.
 *
 * Every seal defines id="gf"/"arcTop"/"arcBot". Two on one page and every
 * href="#arcBot" resolves to the first match, so they render identically —
 * and url(#gf) has to be rewritten too, or the gradient fills point at an
 * id that no longer exists and the seal comes out as an empty ring.
 */
let nsN = 0;
const ns = (svg) =>
  svg.replace(/(id="|href="#|url\(#)(gf|arcTop|arcBot)/g, `$1$2n${++nsN}`);

const goldSeal = () => ns(seal({ variant: 'gold' }));
const foilSeal = () => ns(seal({ variant: 'black', ground: '#FFFFFF' }));

/**
 * Read back which faces a finished PDF actually embedded, and refuse to
 * ship one that fell back.
 *
 * The monogram was setting in Liberation Serif — the generic `serif` — for
 * every file this repo has ever built, because the stack named "Bodoni
 * Moda" and the installed family is "Bodoni Moda 11pt". Nothing anywhere
 * warned. A serif SML at seal size looks like a serif SML, and the only
 * place the truth appeared was this list.
 */
function checkFonts(file) {
  const d = fs.readFileSync(file);
  const faces = [...new Set([...d.toString('latin1').matchAll(/\/BaseFont\s*\/([A-Za-z0-9+\-]+)/g)]
    .map((m) => m[1].replace(/^[A-Z]{6}\+/, '')))];
  const fell = faces.filter((f) => /Liberation|DejaVu|Times|Nimbus/i.test(f));
  if (fell.length) {
    throw new Error(
      `${path.basename(file)} embedded a fallback face: ${fell.join(', ')}. ` +
      'Something in the artwork names a font that is not installed under that ' +
      'exact family. Check with: fc-match "<the family>"');
  }
  return faces.join(' + ');
}

/* Shared type rules. mm throughout, so every number is the printed number. */
const CSS = `
  *{box-sizing:border-box}
  html,body{margin:0}
  .mono{font-family:'DM Mono',monospace}
  .didot{font-family:'Bodoni Moda','Bodoni Moda 11pt',Didot,serif}
  .card{position:relative;overflow:hidden;background:${GROUND};color:${GOLD}}
  .rule{height:.25mm;background:${GOLD};opacity:.45}
`;

/** The back of the business card. Content, not decoration. */
const cardBack = (pad) => `
  <div class="card" style="width:91mm;height:61mm;padding:${pad}">
    <div style="height:100%;display:flex;flex-direction:column;justify-content:center;
                align-items:center;text-align:center;gap:2.6mm">
      <div class="mono" style="font-size:2.5mm;letter-spacing:.9mm;opacity:.92">
        SELF-MADE LEGENDS
      </div>
      <div class="rule" style="width:26mm"></div>
      <div>
        <div class="didot" style="font-size:4.4mm;letter-spacing:.25mm">${NAME}</div>
        <div class="mono" style="font-size:2.2mm;letter-spacing:.62mm;opacity:.7;margin-top:1.3mm">
          ${ROLE.toUpperCase()}
        </div>
      </div>
      <div class="rule" style="width:26mm"></div>
      <div class="mono" style="font-size:2.35mm;line-height:1.75;opacity:.86">
        ${MAIL}<br>${TEL}<br>${SITE}
      </div>
    </div>
  </div>`;

/** The front. One object, centred, and nothing else. */
const cardFront = (pad) => `
  <div class="card" style="width:91mm;height:61mm;padding:${pad}">
    <div style="height:100%;display:flex;align-items:center;justify-content:center">
      <div style="width:${AT.card}mm">${goldSeal()}</div>
    </div>
  </div>`;

(async () => {
  fs.mkdirSync(OUT_M, { recursive: true });
  fs.mkdirSync(OUT_P, { recursive: true });
  const browser = await chromium.launch({ executablePath: CHROME });

  const page = async (html, w, h) => {
    const p = await browser.newPage();
    await p.setContent(
      `<style>@page{size:${w} ${h};margin:0}${CSS}
       body{width:${w};height:${h}}
       svg{width:100%;height:auto;display:block}</style>${html}`
    );
    await p.evaluate(() => document.fonts.ready);
    await p.waitForTimeout(350);
    return p;
  };

  // ── Print files ────────────────────────────────────────────────────────
  // 85x55mm trimmed, plus 3mm bleed on every edge = 91x61mm.
  const PRINT = [
    ['sml-card-front', cardFront('3mm'), '91mm', '61mm'],
    ['sml-card-back', cardBack('3mm'), '91mm', '61mm'],
    // Foil separation: black is where the metal goes, nothing else on it.
    ['sml-card-front-FOIL', `
      <div style="width:91mm;height:61mm;background:#fff;padding:3mm">
        <div style="height:100%;display:flex;align-items:center;justify-content:center">
          <div style="width:${AT.card}mm">${foilSeal()}</div>
        </div>
      </div>`, '91mm', '61mm'],
    // A 50mm circular seal sticker for closing tissue and boxes.
    ['sml-sticker-50mm', `
      <div style="width:56mm;height:56mm;background:${GROUND};display:flex;
                  align-items:center;justify-content:center">
        <div style="width:${AT.sticker + 4}mm">${goldSeal()}</div>
      </div>`, '56mm', '56mm'],
    // Hang tag, 45x90mm trimmed, 3mm bleed.
    ['sml-hangtag', `
      <div class="card" style="width:51mm;height:96mm;padding:3mm">
        <div style="height:100%;display:flex;flex-direction:column;align-items:center;
                    justify-content:space-between;padding:9mm 0 7mm">
          <div style="width:${AT.hangtag}mm">${goldSeal()}</div>
          <div class="mono" style="font-size:2.3mm;letter-spacing:.8mm;opacity:.75;text-align:center">
            SELF-MADE<br>LEGENDS
          </div>
        </div>
      </div>`, '51mm', '96mm'],
  ];

  for (const [name, html, w, h] of PRINT) {
    const p = await page(html, w, h);
    const file = path.join(OUT_P, `${name}.pdf`);
    await p.pdf({
      path: file,
      width: w, height: h, printBackground: true,
      margin: { top: 0, bottom: 0, left: 0, right: 0 },
    });
    await p.close();
    console.log(`  print/${name}.pdf`.padEnd(40) + `${w} x ${h}  ${checkFonts(file)}`);
  }

  // ── Presentation sheet ─────────────────────────────────────────────────
  // Shown on a warm neutral, because near-black cards disappear against the
  // brand's own ground and the whole point of this sheet is to judge them.
  const shadow = 'box-shadow:0 2px 4px rgba(0,0,0,.14),0 14px 34px rgba(0,0,0,.22)';
  const sheet = `
    <div style="background:#E9E7E2;padding:54px 60px;font-family:'DM Mono',monospace">
      <div style="font-size:12px;letter-spacing:.22em;color:#8b8880;margin-bottom:34px">
        SELF-MADE LEGENDS &nbsp;·&nbsp; CARDS AND PACKAGING &nbsp;·&nbsp; ALL AT TRIM SIZE
      </div>

      <div style="display:flex;gap:34px;align-items:flex-start;flex-wrap:wrap">
        <figure style="margin:0">
          <div style="width:85mm;height:55mm;background:${GROUND};${shadow};border-radius:1.2mm;
                      display:flex;align-items:center;justify-content:center">
            <div style="width:${AT.card}mm">${goldSeal()}</div>
          </div>
          <figcaption style="font-size:11px;color:#8b8880;margin-top:11px;letter-spacing:.1em">
            CARD FRONT &nbsp;85 × 55 mm
          </figcaption>
        </figure>

        <figure style="margin:0">
          <div style="width:85mm;height:55mm;${shadow};border-radius:1.2mm;overflow:hidden">
            ${cardBack('0')}
          </div>
          <figcaption style="font-size:11px;color:#8b8880;margin-top:11px;letter-spacing:.1em">
            CARD BACK
          </figcaption>
        </figure>

        <figure style="margin:0">
          <div style="width:38mm;height:76mm;background:${GROUND};${shadow};border-radius:1.2mm;
                      display:flex;flex-direction:column;align-items:center;
                      justify-content:space-between;padding:11mm 0 8mm;position:relative">
            <div style="position:absolute;top:5mm;left:50%;transform:translateX(-50%);
                        width:3.4mm;height:3.4mm;border-radius:50%;background:#E9E7E2"></div>
            <div style="width:${AT.hangtag}mm">${goldSeal()}</div>
            <div style="font-size:2.2mm;letter-spacing:.7mm;color:${GOLD};opacity:.72;text-align:center">
              SELF-MADE<br>LEGENDS
            </div>
          </div>
          <figcaption style="font-size:11px;color:#8b8880;margin-top:11px;letter-spacing:.1em">
            HANG TAG &nbsp;45 × 90 mm
          </figcaption>
        </figure>
      </div>

      <div style="display:flex;gap:34px;align-items:flex-start;margin-top:46px;flex-wrap:wrap">
        <figure style="margin:0">
          <div style="width:150mm;height:96mm;background:${GROUND};${shadow};border-radius:1.6mm;
                      display:flex;flex-direction:column;align-items:center;justify-content:center;gap:7mm">
            <div style="width:${AT.box}mm">${goldSeal()}</div>
            <div style="font-size:3mm;letter-spacing:1.5mm;color:${GOLD};opacity:.8">
              SELF-MADE LEGENDS
            </div>
          </div>
          <figcaption style="font-size:11px;color:#8b8880;margin-top:11px;letter-spacing:.1em">
            MAILER BOX, TOP PANEL &nbsp;·&nbsp; SEAL AT ${AT.box} mm
          </figcaption>
        </figure>

        <figure style="margin:0">
          <div style="width:80mm;height:96mm;background:#14100E;${shadow};
                      border-radius:2mm 2mm 5mm 5mm;display:flex;align-items:center;
                      justify-content:center;position:relative;padding-top:9mm">
            <div style="position:absolute;top:7mm;left:5mm;right:5mm;height:.6mm;
                        background:#000;opacity:.55"></div>
            <div style="width:${AT.bag}mm">${goldSeal()}</div>
          </div>
          <figcaption style="font-size:11px;color:#8b8880;margin-top:11px;letter-spacing:.1em">
            DUST BAG &nbsp;·&nbsp; SEAL AT ${AT.bag} mm
          </figcaption>
        </figure>

        <figure style="margin:0">
          <div style="width:50mm;height:50mm;border-radius:50%;background:${GROUND};${shadow};
                      display:flex;align-items:center;justify-content:center">
            <div style="width:${AT.sticker}mm">${goldSeal()}</div>
          </div>
          <figcaption style="font-size:11px;color:#8b8880;margin-top:11px;letter-spacing:.1em">
            TISSUE STICKER &nbsp;50 mm
          </figcaption>
        </figure>
      </div>
    </div>`;

  const p = await browser.newPage();
  await p.setViewportSize({ width: 1500, height: 1200 });
  await p.setContent(
    `<style>${CSS}svg{width:100%;height:auto;display:block}</style>` +
    `<div id="sheet">${sheet}</div>`);
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(600);
  // The element, not fullPage — fullPage pads out to the viewport height and
  // left a third of the image empty.
  await (await p.$('#sheet')).screenshot({ path: path.join(OUT_M, 'sml-mockups.png') });
  await p.close();
  console.log('\n  mockups/sml-mockups.png');

  await browser.close();
})();
