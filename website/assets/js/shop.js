/* ==========================================================================
   Self-Made Legends — Shop
   Copyright (c) 2026 Self-Made Legends LLC. All Rights Reserved.

   ┌──────────────────────────────────────────────────────────────────────┐
   │  THIS IS THE ONLY FILE YOU EDIT TO PUT PRODUCTS ON SALE.             │
   │                                                                      │
   │  1. Create a Payment Link in Stripe (see README).                    │
   │  2. Paste the link into `paymentLink` below.                         │
   │  3. Set `price` in CENTS — 6500 means $65.00.                        │
   │  4. Save, upload this one file. The product is live.                 │
   │                                                                      │
   │  A product with an empty paymentLink shows a "Notify Me" button      │
   │  instead of "Buy". Nothing breaks, and you never advertise           │
   │  something a customer cannot actually receive.                       │
   └──────────────────────────────────────────────────────────────────────┘

   Payment Links are public URLs by design. There are no secret keys in
   this file and none belong here — your Stripe secret key must never
   appear in anything you upload to a web server.
   ========================================================================== */

window.SML_SHOP = {

  products: [

    {
      id: 'regent-hoodie',
      name: 'Regent Embroidered Hoodie',
      sku: 'SML·AP·001',
      price: 6500,                    // $65.00 — in cents
      blurb: 'Heavyweight fleece with the house crest embroidered in metallic gold thread.',
      details: [
        'Heavyweight brushed fleece',
        'Gold metallic embroidered crest',
        'Unisex fit, ribbed cuff and hem'
      ],
      colors: [
        { name: 'Onyx', hex: '#0B0C11' },
        { name: 'Bone', hex: '#E7E1D4' }
      ],
      paymentLink: ''                 // ← paste your Stripe Payment Link
    },

    {
      id: 'crown-cap',
      name: 'Crown Embroidered Cap',
      sku: 'SML·AC·003',
      price: 3500,                    // $35.00
      blurb: 'Structured six-panel cap with the crown emblem raised in gold.',
      details: [
        'Structured six-panel, mid profile',
        '3D gold embroidered crown',
        'Adjustable strap-back, one size'
      ],
      colors: [
        { name: 'Onyx', hex: '#0B0C11' }
      ],
      paymentLink: ''
    },

    {
      id: 'heir-tee',
      name: 'Heir Embroidered Tee',
      sku: 'SML·AP·003',
      price: 3800,                    // $38.00
      blurb: 'The foundation piece. Tonal crown at the nape, crest at the chest.',
      details: [
        'Combed ring-spun cotton',
        'Embroidered chest crest',
        'Boxy cut, dropped shoulder'
      ],
      colors: [
        { name: 'Onyx', hex: '#0B0C11' },
        { name: 'Bone', hex: '#E7E1D4' },
        { name: 'Oxblood', hex: '#3A1020' }
      ],
      paymentLink: ''
    }

  ]
};

/* ────────────────────────────────────────────────────────────────────────
   Renderer. You should not need to change anything below this line.
   ──────────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  if (!window.SML_SHOP) return;

  function esc(str) {
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function money(cents) {
    if (typeof cents !== 'number' || !isFinite(cents) || cents < 0) return '';
    return '$' + (cents / 100).toFixed(2).replace(/\.00$/, '');
  }

  // Only genuine Stripe checkout URLs are turned into Buy buttons. A typo or
  // a pasted tracking link then degrades to "Notify Me" rather than sending
  // a paying customer somewhere unintended.
  function isStripeLink(url) {
    if (typeof url !== 'string' || url === '') return false;
    return /^https:\/\/(buy\.stripe\.com|checkout\.stripe\.com|[a-z0-9-]+\.stripe\.com)\//i.test(url.trim());
  }

  var liveCount = 0;

  function card(p) {
    var live = isStripeLink(p.paymentLink);
    if (live) liveCount++;

    var swatches = (p.colors || []).map(function (c) {
      return '<span class="sw"><i style="background:' + esc(c.hex) + '"></i>' + esc(c.name) + '</span>';
    }).join('');

    var details = (p.details || []).map(function (d) {
      return '<li>' + esc(d) + '</li>';
    }).join('');

    var action = live
      ? '<a class="btn btn-solid" href="' + esc(p.paymentLink.trim()) + '" ' +
        'rel="noopener">Buy &mdash; ' + esc(money(p.price)) + '</a>'
      : '<button class="btn btn-ghost" type="button" data-notify="1">Notify Me</button>';

    return '' +
      '<article class="prod">' +
        '<div class="prod-head">' +
          '<span class="prod-sku">' + esc(p.sku || '') + '</span>' +
          (live ? '' : '<span class="prod-badge">Not yet released</span>') +
        '</div>' +
        '<h3>' + esc(p.name) + '</h3>' +
        '<p class="prod-price">' + esc(money(p.price)) + '</p>' +
        '<p class="prod-blurb">' + esc(p.blurb || '') + '</p>' +
        (details ? '<ul class="prod-details">' + details + '</ul>' : '') +
        (swatches ? '<p class="prod-colors">' + swatches + '</p>' : '') +
        '<div class="prod-action">' + action + '</div>' +
      '</article>';
  }

  // "Notify Me" sends people to the newsletter — the list is the asset while
  // there is nothing to sell yet.
  function onNotify(e) {
    var btn = e.target.closest('[data-notify]');
    if (!btn) return;
    var field = document.getElementById('news_email');
    var target = document.getElementById('newsletter');
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (field) setTimeout(function () { field.focus(); }, 420);
  }

  // A grid whose mount point is missing or whose list is empty is skipped
  // rather than throwing, so the page never breaks over a removed section.
  function renderInto(mountId, list) {
    var mount = document.getElementById(mountId);
    if (!mount || !Array.isArray(list) || list.length === 0) return;
    mount.innerHTML = list.map(card).join('');
    mount.addEventListener('click', onNotify);
  }

  renderInto('shop-grid', window.SML_SHOP.products);

  // Tell the owner, not the customer, when nothing is purchasable yet.
  if (liveCount === 0 && window.console && console.info) {
    console.info(
      '[SML] No Stripe Payment Links are set, so nothing can be bought yet.\n' +
      'Add them in assets/js/shop.js — see README.md.'
    );
  }
})();
