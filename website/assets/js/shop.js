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

   ┌──────────────────────────────────────────────────────────────────────┐
   │  TO PUT A PICTURE ON A PRODUCT                                       │
   │                                                                      │
   │  1. node website/tools/prep-product-image.js <your-photo> <name>     │
   │     That writes assets/img/products/<name>.webp and .jpg.            │
   │  2. Add   image: '<name>'   to the product below. Just the name —    │
   │     no folder, no .jpg.                                              │
   │  3. Add   imageAlt: '...'   describing it for a blind visitor and    │
   │     for Google. One plain sentence.                                  │
   │                                                                      │
   │  Leave `image` off and the card renders exactly as it does today.    │
   │  A product never breaks for want of a photo.                         │
   └──────────────────────────────────────────────────────────────────────┘

   Payment Links are public URLs by design. There are no secret keys in
   this file and none belong here — your Stripe secret key must never
   appear in anything you upload to a web server.
   ========================================================================== */

window.SML_SHOP = {

  /* ══════════════════════════════════════════════════════════════════════
     THE MASTER SWITCH.

       false = nothing on the site can be bought. Every product shows
               "Notify Me" and sends the visitor to the newsletter, even
               ones with a working Stripe link pasted in.

       true  = products with a valid Stripe link become buyable. Ones
               without a link still show "Notify Me".

     Set this to false whenever you are not ready to take money — a
     holiday, a supply problem, a drop that sold out. It is one word, and
     it beats deleting your Stripe links and pasting them back later.

     A customer who can pay for something you cannot ship costs you a
     refund and their trust. This switch is cheaper.
     ══════════════════════════════════════════════════════════════════════ */
  shopOpen: false,

  // Shown in place of the shop note while the shop is closed.
  closedNote: 'The shop is not open yet. Join the list and you will hear first when it is.',

  products: [

    {
      id: 'throne-hoodie',
      name: 'Golden Throne Hoodie',
      sku: 'SML·GT·001',
      price: 6500,                    // $65.00 — in cents
      blurb: 'Heavyweight black fleece. The lion crest carried large across the ' +
             'back, small at the chest, and NOT GIVEN. EARNED. below it.',
      details: [
        'Heavyweight brushed fleece',
        'Gold embroidered lion crest',
        'Crest at chest, full crest at back',
        'Numbered 001 / 1000'
      ],
      colors: [
        { name: 'Onyx', hex: '#0B0C11' }
      ],
      paymentLink: ''                 // ← paste your Stripe Payment Link
    },

    {
      id: 'throne-tee',
      name: 'Golden Throne Tee',
      sku: 'SML·GT·002',
      price: 3800,                    // $38.00
      blurb: 'The foundation piece. Crest at the chest, LEAD THE KINGDOM down the sleeve.',
      details: [
        'Combed ring-spun cotton',
        'Gold crest at the chest',
        'Sleeve text, tonal',
        'Numbered 001 / 1000'
      ],
      colors: [
        { name: 'Onyx', hex: '#0B0C11' }
      ],
      paymentLink: ''
    },

    {
      id: 'throne-suit',
      name: 'Golden Throne Suit',
      sku: 'SML·GT·010',
      price: 0,                       // ← PRICE NOT SET. Tailoring is priced
                                      //   after the factory quotes; a made-up
                                      //   number here would be a promise.
      blurb: 'Three cuts, four colourways. Crest embroidered at the chest and again ' +
             'across the back, 24k gold lapel pin, engraved crest buttons.',
      details: [
        'Royal Black Gold · Empire Midnight · Legacy Ivory Gold',
        'Sizes 36 to 52',
        'Silk-blend lining, message inside the pocket',
        'Numbered 001 / 1000'
      ],
      colors: [
        { name: 'Midnight Black', hex: '#0B0C11' },
        { name: 'Royal Navy',     hex: '#141C33' },
        { name: 'Empire Purple',  hex: '#2A1440' },
        { name: 'Ivory Gold',     hex: '#E7E1D4' }
      ],
      paymentLink: ''
    },

    {
      id: 'throne-dress-shoe',
      name: 'Golden Throne Dress Shoe',
      sku: 'SML·GT·020',
      price: 0,                       // ← PRICE NOT SET. See above.
      blurb: 'Leather, embossed crest, gold at the toe and the heel. The sole ' +
             'carries the mark, so you leave it behind you.',
      details: [
        'Premium leather, comfort insole',
        'Embossed crest, gold toe plate',
        'US 6 to 13',
        'Numbered 001 / 1000'
      ],
      colors: [
        { name: 'Royal Black Gold', hex: '#0B0C11' },
        { name: 'Empire Wine Gold', hex: '#4A1220' },
        { name: 'Stealth All Black', hex: '#08090C' },
        { name: 'Ivory Gold',       hex: '#E7E1D4' }
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

  // Zero is "not priced yet", not "free". Tailoring and dress shoes get their
  // price after a factory quotes them, and a card reading "$0" until then is
  // worse than a card that says so.
  function hasPrice(cents) {
    return typeof cents === 'number' && isFinite(cents) && cents > 0;
  }

  function money(cents) {
    if (!hasPrice(cents)) return '';
    return '$' + (cents / 100).toFixed(2).replace(/\.00$/, '');
  }

  // Only genuine Stripe checkout URLs are turned into Buy buttons. A typo or
  // a pasted tracking link then degrades to "Notify Me" rather than sending
  // a paying customer somewhere unintended.
  function isStripeLink(url) {
    if (typeof url !== 'string' || url === '') return false;
    return /^https:\/\/(buy\.stripe\.com|checkout\.stripe\.com|[a-z0-9-]+\.stripe\.com)\//i.test(url.trim());
  }

  var IMG_DIR = 'assets/img/products/';

  // Only a bare filename is accepted — no slashes, no dots, no scheme. The
  // field is owner-edited, so this is not about a hostile input; it is about
  // a typed 'products/duffle.jpg' or a pasted URL silently producing a
  // broken image on the live shop. It either matches the tool's output or it
  // is ignored and the card renders without a picture.
  function imageName(value) {
    return typeof value === 'string' && /^[a-z0-9][a-z0-9-]{0,60}$/.test(value.trim())
      ? value.trim()
      : '';
  }

  // WebP first with a JPEG fallback — prep-product-image.js writes both, and
  // every browser reads at least one of them.
  //
  // A product with no photo still gets a panel of the same height, carrying the
  // house seal. Without it the cards with photos and the cards without stopped
  // lining up across the row — the title on one sat level with the picture on
  // its neighbour — and a shop that does not line up reads as broken rather
  // than as a shop that is missing two photographs.
  function picture(p) {
    var name = imageName(p.image);

    if (!name) {
      return '' +
        '<div class="prod-shot is-empty" aria-hidden="true">' +
          '<svg viewBox="0 0 200 200"><use href="#seal"/></svg>' +
        '</div>';
    }

    // Never leave alt empty on a product shot: a screen reader then announces
    // the filename, and the image is the product.
    var alt = esc(p.imageAlt || p.name || '');

    return '' +
      '<div class="prod-shot">' +
        '<picture>' +
          '<source srcset="' + IMG_DIR + name + '.webp" type="image/webp">' +
          '<img src="' + IMG_DIR + name + '.jpg" alt="' + alt + '" ' +
               'width="1200" height="800" loading="lazy" decoding="async">' +
        '</picture>' +
      '</div>';
  }

  var liveCount = 0;

  function card(p) {
    // The master switch overrides everything. A product cannot be sold
    // while the shop is shut, whatever its payment link says.
    var live = window.SML_SHOP.shopOpen !== false &&
               hasPrice(p.price) && isStripeLink(p.paymentLink);
    if (live) liveCount++;

    // A colourway with its own photograph becomes a button that swaps the shot.
    // One without stays a plain label — a control that looks clickable and does
    // nothing is worse than no control, so the affordance only appears where
    // there is something behind it.
    var first = true;
    var swatches = (p.colors || []).map(function (c) {
      var img = imageName(c.image);
      var dot = '<i style="background:' + esc(c.hex) + '"></i>' + esc(c.name);

      if (!img) return '<span class="sw">' + dot + '</span>';

      var on = first; first = false;
      return '<button type="button" class="sw sw-btn" ' +
             'data-img="' + esc(img) + '" ' +
             'data-alt="' + esc(c.imageAlt || (p.name + ' in ' + c.name)) + '" ' +
             'aria-pressed="' + (on ? 'true' : 'false') + '">' + dot + '</button>';
    }).join('');

    var details = (p.details || []).map(function (d) {
      return '<li>' + esc(d) + '</li>';
    }).join('');

    var action = live
      ? '<a class="btn btn-solid" href="' + esc(p.paymentLink.trim()) + '" ' +
        'rel="noopener">Buy &mdash; ' + esc(money(p.price)) + '</a>'
      : '<button class="btn btn-ghost" type="button" data-notify="1">Notify Me</button>';

    return '' +
      '<article class="prod has-shot">' +
        picture(p) +
        '<div class="prod-head">' +
          '<span class="prod-sku">' + esc(p.sku || '') + '</span>' +
          (live ? '' : '<span class="prod-badge">' +
          (window.SML_SHOP.shopOpen === false ? 'Coming soon' : 'Not yet released') + '</span>') +
        '</div>' +
        '<h3>' + esc(p.name) + '</h3>' +
        (hasPrice(p.price)
          ? '<p class="prod-price">' + esc(money(p.price)) + '</p>'
          : '<p class="prod-price is-tbd">Price on request</p>') +
        '<p class="prod-blurb">' + esc(p.blurb || '') + '</p>' +
        (details ? '<ul class="prod-details">' + details + '</ul>' : '') +
        (swatches ? '<p class="prod-colors">' + swatches + '</p>' : '') +
        '<div class="prod-action">' + action + '</div>' +
      '</article>';
  }

  // Swap the card's photograph when a colourway is chosen.
  //
  // Both the <source> and the <img> have to change. Setting only the img src
  // leaves the WebP source matching, so a modern browser keeps showing the old
  // colour and nothing appears to happen — on Chrome and Safari, which is most
  // of your visitors.
  function onSwatch(e) {
    var btn = e.target.closest('.sw-btn');
    if (!btn) return;

    var card = btn.closest('.prod');
    var img = card && card.querySelector('.prod-shot img');
    var src = card && card.querySelector('.prod-shot source');
    if (!img) return;

    var name = btn.getAttribute('data-img');
    if (src) src.srcset = IMG_DIR + name + '.webp';
    img.src = IMG_DIR + name + '.jpg';
    img.alt = btn.getAttribute('data-alt') || '';

    var all = card.querySelectorAll('.sw-btn');
    for (var i = 0; i < all.length; i++) {
      all[i].setAttribute('aria-pressed', all[i] === btn ? 'true' : 'false');
    }
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
    mount.addEventListener('click', onSwatch);
  }

  renderInto('shop-grid', window.SML_SHOP.products);

  // Swap the shop note while the shop is shut, so the page does not promise
  // free shipping over $150 on something nobody can buy.
  if (window.SML_SHOP.shopOpen === false) {
    var note = document.querySelector('#shop .shop-note');
    if (note && window.SML_SHOP.closedNote) note.textContent = window.SML_SHOP.closedNote;
  }

  // Tell the owner, not the customer, what state the shop is in.
  if (window.console && console.info) {
    if (window.SML_SHOP.shopOpen === false) {
      console.info('[SML] shopOpen is false — nothing can be bought. Set it to true in assets/js/shop.js when you are ready.');
    } else if (liveCount === 0) {
      console.info('[SML] The shop is open but no Stripe Payment Links are set, so nothing can be bought yet.');
    }
  }
})();
