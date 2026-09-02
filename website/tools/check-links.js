/**
 * Self-Made Legends — check the Stripe Payment Links.
 * Copyright (c) 2026 Self-Made Legends LLC. All Rights Reserved.
 *
 * Usage:  node website/tools/check-links.js
 *
 * Run this after pasting any link, and again before you flip shopOpen.
 *
 * It catches the three ways a link goes wrong, none of which the site shows
 * you at a glance:
 *
 *   1. A malformed URL. The page silently falls back to "Claim a Number",
 *      so a typo looks exactly like a product you have not linked yet.
 *   2. The same URL on two products. Somebody pays $32 for a $125 hoodie
 *      and every page still looks perfectly correct.
 *   3. A link on a product with no price, which cannot be bought anyway.
 *
 * It reads shop.js as text rather than executing it, so it works without a
 * browser and cannot be fooled by anything the file does at runtime.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const SHOP = path.resolve(__dirname, '../assets/js/shop.js');

// The same expression isStripeLink() uses in shop.js. If one changes, change
// both — a checker that is more lenient than the page is worse than none.
const VALID = /^https:\/\/(buy\.stripe\.com|checkout\.stripe\.com|[a-z0-9-]+\.stripe\.com)\//i;

const src = fs.readFileSync(SHOP, 'utf8');
const open = /shopOpen:\s*true/.test(src);

const products = [];
let name = '', price = null;
for (const line of src.split('\n')) {
  let m = line.match(/^\s*name: '([^']+)'/);
  if (m) { name = m[1]; price = null; }
  m = line.match(/^\s*price: (\d+)/);
  if (m) price = Number(m[1]) / 100;
  m = line.match(/^\s*paymentLink: '([^']*)'/);
  if (m) products.push({ name, price, url: m[1] });
}

const problems = [];
const seen = new Map();
let live = 0, waiting = 0;

console.log('');
for (const p of products) {
  const money = p.price ? '$' + p.price.toFixed(2) : '—';
  let state;

  if (p.url === '') {
    waiting++;
    state = 'waiting';
  } else if (!VALID.test(p.url)) {
    state = '*** INVALID — the page will show "Claim a Number"';
    problems.push(`${p.name}: not a Stripe link — ${p.url}`);
  } else if (!p.price) {
    state = '*** LINKED BUT UNPRICED — cannot be bought';
    problems.push(`${p.name}: has a link but no price, so it can never go live`);
  } else {
    live++;
    state = 'LIVE  …' + p.url.slice(-12);
    if (seen.has(p.url)) problems.push(`${p.name} and ${seen.get(p.url)} share one link — one of them charges the wrong price`);
    seen.set(p.url, p.name);
  }

  console.log('  ' + p.name.padEnd(26) + money.padStart(8) + '  ' + state);
}

console.log('');
console.log(`  ${live} linked, ${waiting} waiting.  shopOpen is ${open ? 'TRUE — linked products are buyable' : 'false — nothing can be bought yet'}`);

if (problems.length) {
  console.log('');
  problems.forEach(p => console.log('  ! ' + p));
  console.log('');
  process.exitCode = 1;
} else {
  console.log('');
}
