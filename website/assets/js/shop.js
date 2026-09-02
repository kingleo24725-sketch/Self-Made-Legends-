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
  shopOpen: true,

  // Shown in place of the shop note while the shop is closed.
  closedNote: 'Made to order, shipped from the printer to you. Join the list and you will hear the day it opens.',

  products: [

    /* ══════════════════════════════════════════════════════════════════════
       THE LEGACY LINE — made to order, ships now.

       Priced against what the blank can carry, not against a target margin.
       Every one of these is a premium embroidered blank: the embroidery is
       excellent, the body is a stock heavyweight, and the price says so.

       Margins live in agents/partners/pod.js. Run:
         node agents/bin/sml-agents.js margin hoodie-embroidered 125

       The hoodie is the hero and it earns least: its blank is $45, where the
       tee's is $16. At $115 it kept 60% while everything else kept 71-77%,
       so it went to $125 — still under Stussy, and worth $9.71 more a time.

       The Set is priced at the sum of its garments, NOT at a discount. The
       socks come with it instead. That costs $13.20 and reads as $32, where
       taking $25 off the price would cost $24 and read as a sale — and this
       house does not have sales. It also earns more: $132.80 against $121.72.
       ══════════════════════════════════════════════════════════════════════ */

    {
      // Leads the grid on purpose. A visitor who buys this instead of the
      // hoodie alone is worth $132.80 rather than $79.15 — the single biggest
      // difference any one change on this page can make to a day's takings.
      id: 'legacy-set',
      name: 'The Legacy Set',
      sku: 'SML·LG·000',
      price: 23500,                   // $235.00 — keeps $132.80. Socks cost $13.20 to include.
      badge: 'Socks included',
      image: 'p-set',
      imageAlt: 'The Legacy Set: the black hoodie with the gold crowned lion ' +
                'crest at the chest, shown beside the matching sweatpants and ' +
                'the gold-banded Legacy socks.',
      blurb: 'The hoodie and the sweatpants, together, with the Legacy socks ' +
             'in the box. The set price is the two garments — the socks are ours.',
      details: [
        'Legacy Hoodie — heavyweight fleece, crest at chest and back',
        'Legacy Sweatpants — crest at the hip, wordmark down the leg',
        'Legacy Socks included, worth $32',
        'Ships together in one box, free',
        'Made to order — nothing sits in a warehouse'
      ],
      colors: [{ name: 'Onyx', hex: '#0B0C11' }],
      paymentLink: 'https://buy.stripe.com/28E28sd5JeVx2mN8jV1ZS0b'
    },

    {
      id: 'legacy-hoodie',
      name: 'Legacy Hoodie',
      sku: 'SML·LG·001',
      price: 12500,                   // $125.00 — keeps $79.15, 63%. See note below.
      image: 'p-hoodie',
      imageAlt: 'The Legacy hoodie in black, with the gold crowned lion crest ' +
                'embroidered at the chest and carried across the back.',
      blurb: 'Heavyweight fleece, the crest embroidered in gold at the chest and ' +
             'again across the back. Made when you order it.',
      details: [
        'Heavyweight brushed fleece',
        'Gold embroidered crest, chest and back',
        'Unisex, XS to 4XL',
        'Made to order — nothing sits in a warehouse'
      ],
      colors: [{ name: 'Onyx', hex: '#0B0C11' }],
      paymentLink: 'https://buy.stripe.com/7sY28sghVdRt2mNgQr1ZS0c'
    },

    {
      id: 'legacy-sweatpants',
      name: 'Legacy Sweatpants',
      sku: 'SML·LG·002',
      price: 11000,                   // $110.00 — keeps $71.82, 65%
      image: 'p-sweatpants',
      imageAlt: 'The Legacy sweatpants in black, with the gold winged lion down ' +
                'one leg and the wordmark down the other.',
      blurb: 'The other half of the set. Crest at the hip, wordmark down the leg.',
      details: [
        'Heavyweight fleece jogger',
        'Gold embroidered crest at the hip',
        'Elasticated cuff, XS to 2XL'
      ],
      colors: [{ name: 'Onyx', hex: '#0B0C11' }],
      paymentLink: 'https://buy.stripe.com/aFa4gAc1FbJlaTjfMn1ZS09'
    },

    {
      id: 'legacy-cap',
      name: 'The Snapback',
      sku: 'SML·LG·003',
      price: 7000,                    // $70.00 — keeps $44.98, 64%
      image: 'p-snapback',
      imageAlt: 'The snapback in black, with the gold SML plate and crown in puff ' +
                'embroidery at the front and an embossed lion at the side.',
      blurb: 'Structured six-panel, the crest raised in 3D puff embroidery. ' +
             'The closest thing in the line to the sheets.',
      details: [
        'Structured six-panel, flat brim',
        '3D puff embroidered crest',
        'Adjustable snapback, one size'
      ],
      colors: [{ name: 'Onyx', hex: '#0B0C11' }],
      paymentLink: 'https://buy.stripe.com/5kQ14o6Hl8x9aTj2ZB1ZS0a'
    },

    {
      id: 'legacy-tee',
      name: 'Legacy Tee',
      sku: 'SML·LG·004',
      price: 6500,                    // $65.00 — keeps $42.13, 65%
      image: 'p-tee',
      imageAlt: 'The Legacy tee in black, front and back, with the gold SML at ' +
                'the chest and the crowned lion crest across the back.',
      blurb: 'The foundation piece. Crest embroidered at the chest, not printed.',
      details: [
        'Combed ring-spun cotton',
        'Gold embroidered crest',
        'Boxy cut, XS to 4XL'
      ],
      colors: [{ name: 'Onyx', hex: '#0B0C11' }],
      paymentLink: 'https://buy.stripe.com/bJe7sM6Hl7t56D3as31ZS08'
    },

    {
      id: 'legacy-beanie',
      name: 'Empire Beanie',
      sku: 'SML·LG·005',
      price: 5500,                    // $55.00 — keeps $34.41, 63%
      image: 'p-beanie',
      imageAlt: 'The Empire beanie in black ribbed knit with the gold crowned lion ' +
                'crest embroidered at the cuff.',
      blurb: 'Ribbed cuff, crest embroidered at the fold.',
      details: ['Acrylic wool blend', 'Embroidered crest', 'One size, cuffed'],
      colors: [{ name: 'Onyx', hex: '#0B0C11' }],
      paymentLink: 'https://buy.stripe.com/fZu7sMghV4gT4uV1Vx1ZS07'
    },

    {
      id: 'legacy-socks',
      name: 'Legacy Socks',
      sku: 'SML·LG·006',
      price: 3200,                    // $32.00 — keeps $15.08 alone, $17.57 in a cart
      image: 'p-socks',
      imageAlt: 'Three pairs of Legacy socks in black with gold cuff bands, gold ' +
                'toes and the crest knitted at the ankle.',
      blurb: 'Knitted, not printed — the gold band and the crest are in the yarn.',
      details: [
        'Ribbed crew, cushioned heel and toe',
        'Gold band at the cuff',
        'Knitted crest at the ankle'
      ],
      colors: [{ name: 'Onyx', hex: '#0B0C11' }],
      paymentLink: 'https://buy.stripe.com/dRm00kghVaFh6D32ZB1ZS0d'
    },

    /* ══════════════════════════════════════════════════════════════════════
       THE ARCHIVE — the design sheets, printed. Ships now.

       The highest-margin line on this page and the only one with no work
       left in it: the artwork was finished months ago. Nothing to digitise,
       no sizes to get wrong, and a print that comes back is a print rather
       than a garment somebody has worn.

         Poster $65   keeps $49.08   76%
         Canvas $125  keeps $89.84   72%
         Framed $145  keeps $104.26  72%   ← out-earns the hoodie

       Prints ship in their own parcel — rolled in a tube, or rigid and
       insured behind glass — so they never ride along with a garment at the
       add-on rate. agents/partners/pod.js accounts for that; do not "fix"
       it by treating them as a second item in the same box.

       Three sheets, chosen because none of them carries family. The Grace &
       Cherish and Rose pieces are on the collection page for anyone who
       wants to see them, and selling prints of them is your call to make,
       not a default I should set.
       ══════════════════════════════════════════════════════════════════════ */

    {
      id: 'print-collection',
      name: 'The Collection Print',
      sku: 'SML·AR·001',
      price: 6500,                    // $65.00 — keeps $49.08, 76%
      image: 'p-print-collection',
      imageAlt: 'The Golden Throne collection sheet as an 18 by 24 inch matte ' +
                'poster on a dark wall, showing the whole range in black and gold.',
      blurb: 'The whole house on one sheet — six pairs, the apparel, the ' +
             'regalia, the packaging. Printed on heavy matte art paper.',
      details: [
        '18 × 24 in, heavy matte art paper',
        'Giclée, archival inks',
        'Ships rolled in a tube',
        'Unframed'
      ],
      colors: [{ name: 'Golden Throne', hex: '#CFA529' }],
      paymentLink: 'https://buy.stripe.com/9B6bJ2d5J9Bd2mNgQr1ZS06'
    },

    {
      id: 'print-signature',
      name: 'Signature Edition Canvas',
      sku: 'SML·AR·002',
      price: 12500,                   // $125.00 — keeps $89.84, 72%
      image: 'p-print-signature',
      imageAlt: 'The Golden Throne Signature Edition sheet as a wrapped canvas ' +
                'standing off a dark wall, the black and gold trainer with ' +
                'emerald and purple wings shown large.',
      blurb: 'The Signature Edition, wrapped over a stretcher and ready to ' +
             'hang. No frame, no glass, no fixing required.',
      details: [
        '16 × 20 in on a 1.25 in stretcher',
        'Cotton canvas, archival inks',
        'Arrives ready to hang',
        'Edges wrapped, not white'
      ],
      colors: [{ name: 'Golden Throne', hex: '#CFA529' }],
      paymentLink: 'https://buy.stripe.com/fZu14oghV5kX1iJfMn1ZS05'
    },

    {
      id: 'print-commander',
      name: 'Empire Commander Framed',
      sku: 'SML·AR·003',
      price: 14500,                   // $145.00 — keeps $104.26, 72%
      image: 'p-print-commander',
      imageAlt: 'The Empire Commander and Future Legend sheet in a thin gold ' +
                'frame with a dark mount, hung on a dark wall.',
      blurb: 'Empire Commander and Future Legend, framed in thin gold behind ' +
             'a dark mount. The one that goes on the wall you walk past.',
      details: [
        '18 × 24 in, matte paper',
        'Thin gold frame, dark mount, glass',
        'Hanging hardware fitted',
        'Ships rigid and insured'
      ],
      colors: [{ name: 'Golden Throne', hex: '#CFA529' }],
      paymentLink: 'https://buy.stripe.com/6oUaEY6Hl9Bd5yZ0Rt1ZS04'
    },

    /* ── The personal two ───────────────────────────────────────────────────
       Added at the owner's word, and written plainly on purpose. These are
       about real people, so the copy says what is on the sheet and stops.
       The grief is not a selling point and must never be used as one — the
       same rule the catalog agent works under. If a line here ever starts
       reaching for the reader's feelings, it is wrong.

       Both are framed or canvas rather than paper in a tube. These are the
       ones somebody hangs and keeps. */

    {
      id: 'print-gracecherish',
      name: 'Grace & Cherish Framed',
      sku: 'SML·AR·004',
      price: 14500,                   // $145.00 — keeps $104.26, 72%
      image: 'p-print-gracecherish',
      imageAlt: 'The Mom Daughter Legacy sheet in a thin gold frame with a dark ' +
                'mount: the black and gold pair with Grace and Cherish written ' +
                'at the toe, the initials in the sole, and the two birthstones.',
      // The print carries CLB, not the full name. See build-print-shots.js —
      // this copy has to keep matching the artwork, so if one changes so does
      // the other.
      blurb: 'The Mom Daughter Legacy sheet. GW and CLB either side of the ' +
             'crest underfoot, and the two stones — garnet for Grace, born ' +
             '23 January; amethyst for Cherish, born 21 February.',
      details: [
        '18 × 24 in, matte paper',
        'Thin gold frame, dark mount, glass',
        'Hanging hardware fitted',
        'Ships rigid and insured'
      ],
      colors: [{ name: 'Golden Throne', hex: '#CFA529' }],
      paymentLink: 'https://buy.stripe.com/28E3cw2r5fZBaTjeIj1ZS03'
    },

    {
      id: 'print-rose',
      name: 'Rose Edition Canvas',
      sku: 'SML·AR·005',
      price: 12500,                   // $125.00 — keeps $89.84, 72%
      image: 'p-print-rose',
      imageAlt: 'The Rose Edition sheet as a wrapped canvas: two trainers, one ' +
                'black with red roses and one black and purple, shown with the ' +
                'messages in the tongue linings and along the midsoles.',
      blurb: 'Both Rose pairs on one sheet — the red edition and the purple ' +
             'legacy, with what is printed inside the tongue and engraved along ' +
             'the midsole of each.',
      details: [
        '16 × 20 in on a 1.25 in stretcher',
        'Cotton canvas, archival inks',
        'Arrives ready to hang',
        'Edges wrapped, not white'
      ],
      colors: [{ name: 'Golden Throne', hex: '#CFA529' }],
      paymentLink: 'https://buy.stripe.com/7sY5kE4zd5kX0eF7fR1ZS02'
    },

    /* ══════════════════════════════════════════════════════════════════════
       THE GOLDEN THRONE — cut-and-sew, numbered, not yet made.

       These stay unpriced on purpose. They are a different product made a
       different way, and the price gets set when a factory quotes it — not
       before. The Legacy line above is what funds the first sample round.
       ══════════════════════════════════════════════════════════════════════ */

    {
      id: 'throne-suit',
      name: 'Golden Throne Suit',
      sku: 'SML·GT·010',
      badge: '001 / 1000',
      price: 0,                       // priced after a factory quotes it
      image: 'p-suit',
      imageAlt: 'Three Golden Throne suits — Royal Black Gold, Empire Midnight and ' +
                'Legacy Ivory Gold — each with the gold crest at the chest.',
      blurb: 'Cut and sewn, not printed. Three cuts, four colourways, crest ' +
             'embroidered at the chest and again across the back.',
      details: [
        'Royal Black Gold · Empire Midnight · Legacy Ivory Gold',
        'Sizes 36 to 52',
        '24k gold lapel pin, engraved crest buttons',
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
      badge: '001 / 1000',
      price: 0,                       // priced after a factory quotes it
      image: 'p-dress',
      imageAlt: 'Two Golden Throne dress shoes in black leather with the embossed gold ' +
                'crest at the quarter and a gold toe plate.',
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

  /**
   * What the badge says.
   *
   * A product's own `badge` wins. Otherwise: an unpriced piece is one waiting
   * on a factory quote, and everything else on this shop is made to order.
   *
   * It deliberately does NOT default to "001 / 1000". The Legacy line is
   * print-on-demand — made when somebody buys it, with no cap and no number.
   * Printing an edition number on it would be a scarcity claim with nothing
   * behind it, which is the one thing the catalog rules forbid.
   */
  function badgeFor(p) {
    if (p.badge) return p.badge;
    if (!hasPrice(p.price)) return 'Made to order';
    return 'Made to order';
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
      : '<button class="btn" type="button" data-notify="1" ' +
        'data-name="' + esc(p.name) + '" data-id="' + esc(p.id || '') + '">Claim a Number</button>';

    return '' +
      '<article class="prod has-shot">' +
        picture(p) +
        '<div class="prod-head">' +
          '<span class="prod-sku">' + esc(p.sku || '') + '</span>' +
          (live ? '' : '<span class="prod-badge">' + esc(badgeFor(p)) + '</span>') +
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

  // The button sends people to the newsletter. Worded as a claim rather than
  // a notification: the list IS the product until the first run exists, and
  // "Notify Me" asks for a favour where "Claim a Number" offers one.
  //
  // It also carries the piece they clicked down to the form. Which one they
  // wanted is the most valuable thing a closed shop can learn: it says what to
  // sample first, what to make first, and on launch day it turns one blast to
  // everybody into "the hoodie you asked about is live" to the people who
  // asked for the hoodie. The field is a plain hidden input, so it still works
  // for a visitor whose JavaScript never ran — they simply send it empty.
  function onNotify(e) {
    var btn = e.target.closest('[data-notify]');
    if (!btn) return;

    var wants = btn.getAttribute('data-name') || '';
    var hidden = document.getElementById('news_wants');
    var line = document.getElementById('newsWants');
    // The name, not the id: this lands in a report you read, and
    // "The Legacy Set" tells you something "legacy-set" makes you decode.
    if (hidden) hidden.value = wants || btn.getAttribute('data-id') || '';
    if (line && wants) {
      line.textContent = 'Claiming a number on the ' + wants + '.';
      line.hidden = false;
    }

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
