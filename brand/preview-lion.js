/**
 * Self-Made Legends — look at the crest before shipping it.
 *
 * Renders the mark large, and then at the sizes it will actually be made
 * at, on one sheet. The first crest went out as a mascot because it was
 * only ever judged at 920px, where a smile looks like character.
 *
 * Usage: node brand/preview-lion.js [outfile.png]
 */

'use strict';

const path = require('path');
const { chromium } = require('playwright');
const { crest } = require('./lion');

const OUT = process.argv[2] || path.join(__dirname, 'out', '_preview.png');
const GOLD = '#CFA529';
const GROUND = '#0B0F0D';

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1240, height: 900 });

  const big = crest({ ink: GOLD, hole: GROUND });
  const lock = crest({ ink: GOLD, hole: GROUND, wordmark: true });
  const onWhite = crest({ ink: '#000000', hole: '#FFFFFF' });

  // `--one` renders nothing but the crest, filling the frame. Judging a mark
  // only on a contact sheet hides exactly the faults that matter — the first
  // version shipped as a mascot because it was never looked at large.
  if (process.argv.includes('--one')) {
    await page.setViewportSize({ width: 760, height: 900 });
    await page.setContent(
      `<style>html,body{margin:0;height:100%;display:grid;place-items:center;background:${GROUND}}
       svg{width:700px;height:auto}</style>${big}`
    );
    await page.waitForTimeout(300);
    await page.screenshot({ path: OUT });
    await browser.close();
    return console.log(OUT);
  }

  // 96px = 1in, so a millimetre is 96/25.4 px.
  const mm = (n) => (n * 96) / 25.4;
  const sizes = [58, 30, 20, 15];

  await page.setContent(`<style>
    html,body{margin:0;background:${GROUND};font:11px/1.4 monospace;color:#8a8f8c}
    .row{display:flex;align-items:flex-end;gap:34px;padding:24px 30px}
    .white{background:#fff}
    figure{margin:0;text-align:center}
    figcaption{margin-top:8px;letter-spacing:.08em}
    .white figcaption{color:#666}
  </style>
  <div class="row">
    <figure><div style="width:420px">${big}</div><figcaption>CREST</figcaption></figure>
    <figure><div style="width:330px">${lock}</div><figcaption>LOCKUP</figcaption></figure>
    <figure class="white" style="padding:18px"><div style="width:250px">${onWhite}</div><figcaption>BLACK ON WHITE</figcaption></figure>
  </div>
  <div class="row">
    ${sizes.map((s) => `<figure><div style="width:${mm(s).toFixed(1)}px">${big}</div><figcaption>${s}mm</figcaption></figure>`).join('')}
  </div>`);

  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
  await page.screenshot({ path: OUT, fullPage: true });
  await browser.close();
  console.log(OUT);
})();
