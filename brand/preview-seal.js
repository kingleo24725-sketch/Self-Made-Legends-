/**
 * Self-Made Legends — look at the seal before shipping it.
 *
 * Renders it large and then at the sizes it is actually printed at. Both
 * matter and for opposite reasons: the lions' faces only exist at the top
 * of that range, and the founding year is only legible enough to check
 * there too — while the whole point of the bottom of the range is to see
 * what survives when it does not.
 *
 * Usage: node brand/preview-seal.js out.png [--one]
 */

'use strict';

const path = require('path');
const { chromium } = require('playwright');
const { seal } = require('./seal');
const { GROUND } = require('./palette');

const OUT = process.argv[2] || path.join(__dirname, 'out', '_seal.png');

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const page = await browser.newPage();

  // Every seal defines id="gf"/"arcTop"/"arcBot". Put two in one HTML
  // document and href="#arcBot" resolves to the FIRST match for both, so
  // they render identically. That is not hypothetical: it is how a
  // side-by-side comparison once hid the very arc bug it was checking for.
  // Written files keep the plain ids; only this contact sheet renames them.
  // url(#gf) counts too. Renaming only id= and href=# left every gradient
  // fill pointing at an id that no longer existed, and the gradient seal
  // rendered as an empty ring — which looks like a drawing fault rather
  // than a preview fault, and cost a round of chasing the wrong thing.
  let n = 0;
  const ns = (svg) => {
    const tag = `s${++n}`;
    return svg.replace(/(id="|href="#|url\(#)(gf|arcTop|arcBot)/g, `$1$2${tag}`);
  };

  const pose = process.argv.includes('--front') ? 'front' : 'guardant';
  const gold = ns(seal({ variant: 'gold', pose }));
  const grad = ns(seal({ variant: 'gradient', pose }));
  const black = ns(seal({ variant: 'black', ground: '#FFFFFF', pose }));

  if (process.argv.includes('--one')) {
    await page.setViewportSize({ width: 900, height: 900 });
    await page.setContent(
      `<style>html,body{margin:0;height:100%;display:grid;place-items:center;background:${GROUND}}
       svg{width:840px;height:auto}</style>${gold}`
    );
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(400);
    await page.screenshot({ path: OUT });
    await browser.close();
    return console.log(OUT);
  }

  // Both poses side by side, at the size the decision is actually made at.
  if (process.argv.includes('--poses')) {
    await page.setViewportSize({ width: 1040, height: 620 });
    const a = ns(seal({ variant: 'gold', pose: 'guardant' }));
    const b = ns(seal({ variant: 'gold', pose: 'front' }));
    await page.setContent(`<style>
      html,body{margin:0;background:${GROUND};font:12px/1.5 monospace;color:#8a8f8c}
      .row{display:flex;gap:44px;padding:24px 30px}
      figure{margin:0;text-align:center}
      figcaption{margin-top:10px;letter-spacing:.09em}
      .sm{margin-top:16px}
    </style><div class="row">
      <figure><div style="width:430px">${a}</div>
        <div class="sm" style="width:94px;margin:16px auto 0">${a}</div>
        <figcaption>GUARDANT — body side on, head to you</figcaption></figure>
      <figure><div style="width:430px">${b}</div>
        <div class="sm" style="width:94px;margin:16px auto 0">${b}</div>
        <figcaption>AFFRONTE — square on to you</figcaption></figure>
    </div>`);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(500);
    await page.screenshot({ path: OUT, fullPage: true });
    await browser.close();
    return console.log(OUT);
  }

  // 96px = 1in, so a millimetre is 96/25.4 px.
  const mm = (n) => (n * 96) / 25.4;
  const sizes = [58, 40, 25, 15];

  await page.setViewportSize({ width: 1260, height: 860 });
  await page.setContent(`<style>
    html,body{margin:0;background:${GROUND};font:11px/1.4 monospace;color:#8a8f8c}
    .row{display:flex;align-items:flex-end;gap:34px;padding:24px 30px}
    .white{background:#fff;padding:18px}
    figure{margin:0;text-align:center}
    figcaption{margin-top:9px;letter-spacing:.08em}
    .white figcaption{color:#666}
    figure > div > svg{width:100%;height:auto;display:block}
  </style>
  <div class="row">
    <figure><div style="width:380px">${grad}</div><figcaption>GRADIENT</figcaption></figure>
    <figure><div style="width:380px">${gold}</div><figcaption>FLAT GOLD (foil)</figcaption></figure>
    <figure class="white"><div style="width:330px">${black}</div><figcaption>BLACK ON WHITE</figcaption></figure>
  </div>
  <div class="row">
    ${sizes.map((s) => `<figure><div style="width:${mm(s).toFixed(1)}px">${gold}</div><figcaption>${s}mm</figcaption></figure>`).join('')}
  </div>`);

  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(500);
  await page.screenshot({ path: OUT, fullPage: true });
  await browser.close();
  console.log(OUT);
})();
