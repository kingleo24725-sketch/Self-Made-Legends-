# selfmadelegendsz.com — Upload Guide

The Self-Made Legends website. Plain HTML, CSS, and a little PHP — nothing
to build, nothing to install. Upload the files and it works.

Written for InterServer shared hosting (cPanel + Apache + PHP).

---

## Before you upload — 3 things

### 1. Create the email addresses

In cPanel → **Email Accounts**, create these at `selfmadelegendsz.com`:

| Address | What lands there |
|---|---|
| `info@selfmadelegendsz.com` | Newsletter signups + Ambassador applications |
| `ceo@selfmadelegendsz.com` | **Customer problems and complaints** — straight to you |
| `noreply@selfmadelegendsz.com` | The "from" address on those notifications |
| `wholesale@selfmadelegendsz.com` | Linked in the footer |
| `press@selfmadelegendsz.com` | Linked in the footer |

**Note on `ceo@`:** the contact form sends there, but the address is
deliberately **not printed anywhere on the site**. Published addresses get
scraped by spam bots within weeks, and then real complaints get buried in
junk. Customers reach you through the form; you reply from whatever address
you like. If you'd rather publish it anyway, that's your call — say so and
it's a one-line change.

**These must exist before the forms will work.** Mail sent to an address that
doesn't exist just disappears.

`noreply@` matters more than it looks: mail has to be sent *from your own
domain* or it gets treated as forged and filtered into spam. That is why the
visitor's address goes in Reply-To instead — you can still just hit Reply.

### 2. Check `api/config.php`

Open it. Every setting is at the top, with a comment. If you used the
addresses above, there is nothing to change.

### 3. Replace the testimonials

`index.html` has a red warning box in the Testimonials section. Read it.
Short version: **the three quotes are empty templates, not real reviews.**
Replace them with real quotes from real customers who said yes, then delete
the warning box.

---

## Uploading

**cPanel File Manager** (easiest):

1. Log into InterServer cPanel → **File Manager**
2. Open `public_html`
3. Upload everything in this `website/` folder — **the contents, not the folder itself**
4. Make sure hidden files came across: File Manager → **Settings** →
   check *Show Hidden Files (dotfiles)*. You need `.htaccess` and
   `data/.htaccess`. **The site is not safe without them.**

**FTP** works too — same destination, `public_html`.

When you're done, `public_html` should look like:

```
public_html/
├── .htaccess          ← hidden, required
├── index.html
├── shipping-returns.html
├── 404.html
├── api/
│   ├── config.php
│   └── submit.php
├── assets/
│   ├── favicon.svg
│   ├── css/sml.css
│   └── js/
│       ├── sml.js
│       └── shop.js     ← your products and Stripe links
└── data/
    └── .htaccess      ← hidden, REQUIRED
```

### Permissions

The `data` folder must be writable — that's where signups are saved.
File Manager → right-click `data` → **Change Permissions** → `755`.
If the forms report a save error, try `775`.

---

## Test it — 5 minutes, do not skip

**1. The site loads.** Visit `https://selfmadelegendsz.com`. Check it on
your phone too.

**2. The newsletter works.** Enter your own email, submit. You should see
"You're on the list" and get an email at `info@`.

Nothing arrived? Check the spam folder first — that's usually it.

**3. The ambassador form works.** Fill it in and submit. Also to `info@`.

**4. The contact form works.** Fill it in and submit — this one should
arrive at **`ceo@`**, not `info@`. Confirm it went to the right inbox.

**5. ⚠️ Your email list is NOT public.** In a browser, go to:

```
https://selfmadelegendsz.com/data/newsletter.csv
```

**You must get "Forbidden" or a 404.**

If it downloads the file, `data/.htaccess` didn't upload. Stop, fix it,
test again. Without it, anyone can take your entire email list.

---

## Reading your signups

cPanel → File Manager → `public_html/data/`

- `newsletter.csv` — email list
- `ambassadors.csv` — Ambassador applications
- `support.csv` — customer messages and complaints

Every message is written to `support.csv` **before** the email goes out.
So even if mail delivery fails or something lands in spam, no customer
complaint is ever lost — it's on disk. Worth checking that file
occasionally against your inbox.

Download and open in Excel or Google Sheets.

**One thing that looks like a bug but isn't:** social handles show up as
`'@handle` with an apostrophe. That's deliberate. Excel treats a cell
starting with `@`, `=`, `+`, or `-` as a *formula*, which is a known attack
route — someone submits a formula, you open the file, it runs. The
apostrophe defuses it. Delete it when you copy the handle out.

---

## Editing the site

All in `index.html`. Search for what you want and change the text.

| To change | Search for |
|---|---|
| Drop dates and status | `<section id="drops"` |
| Products and prices | `<section id="collection"` |
| FAQ answers | `<section id="faq"` |
| Ambassador perks | `class="perks"` |
| Contact emails | `foot-col` |
| Contact form topics | `<section id="support"` |
| Shipping rates and returns | `shipping-returns.html` |
| Products, prices, Stripe links | `assets/js/shop.js` |

**No blanks are left in the FAQ.** Shipping, returns, and international are
all written and live.

### The numbers in the shipping policy are a starting point

They are real, sensible defaults for a US brand shipping from Missouri —
not guesses, but not quotes either. Before your first order ships, price
your actual boxes with USPS or UPS and adjust these in
`shipping-returns.html` if they don't match:

| Setting | Currently |
|---|---|
| Free shipping threshold | $150 |
| US standard / express | $8 / $25 |
| Canada / UK-EU / rest of world | $25 / $35 / $45 |
| Processing time | 1–3 business days |
| Return window | 30 days |
| First size exchange | Free |

**Whatever you set, honour it.** A published policy is a promise you can be
held to.

---

## Selling: putting products on sale

The site takes money through **Stripe Payment Links**. There is no shopping
cart and no Shopify subscription — each product is one link, and Stripe
handles the card, the receipt, and the shipping address.

**Nothing secret lives on the server.** Payment Links are public URLs by
design. Your Stripe *secret key* must never appear in any file you upload.

### Create a Payment Link (about 5 minutes per product)

1. Stripe Dashboard → **Product catalogue** → **+ Add product**
2. Name it exactly as it appears on the site, e.g. *Regent Embroidered Hoodie*
3. Set the price — **one-off**, not recurring
4. Save, then **Create payment link**
5. **Before you finish, turn these on** — they are off by default:

| Setting | Why it matters |
|---|---|
| **Collect shipping address** | Without it you get paid and have **no idea where to ship** |
| **Shipping rates** | Add a flat rate, and a free option over $150 to match your policy |
| **Quantity adjustable** | Lets one customer buy two |
| **Limit the number of payments** | This is how you enforce a numbered run — set it to your run size and Stripe closes the link when it sells out |

6. Copy the link. It looks like `https://buy.stripe.com/xxxxxxxx`

### Put it on the site

Open `assets/js/shop.js`. Find the product. Paste the link:

```js
paymentLink: 'https://buy.stripe.com/xxxxxxxx'
```

Set `price` to match, **in cents** — `6500` is $65.00. Save, upload that one
file. The product is live.

A product with an empty `paymentLink` shows **Notify Me** instead of Buy,
which sends the visitor to the newsletter. That is deliberate: you never
advertise something a customer cannot actually receive, and the interest
still gets captured.

Only genuine `stripe.com` links become Buy buttons. Paste something else by
mistake and it falls back to Notify Me rather than sending a paying customer
to the wrong place.

### Sizes

A Payment Link can't ask for a size on its own. Two options:

- **Simplest:** in Stripe, add a **custom field** called `Size` on the link
- **Cleaner:** create one product per size in Stripe and add a size row to
  `shop.js` — more setup, but stock per size is then tracked properly

Start with the custom field. Move to per-size products when volume justifies it.

### Before your first real sale

- [ ] Do one **test purchase with a real card**, then refund it in Stripe.
      Confirm the receipt arrives and the shipping address came through.
- [ ] Check the payout bank account in Stripe is one you can access
- [ ] Stripe holds the first payout ~7–14 days for new accounts. Expect that.
- [ ] Sales tax: you likely owe it in Missouri, and possibly other states once
      you sell enough there. **Stripe Tax** can calculate it automatically —
      worth turning on before volume, not after. Ask your accountant.

---

## What this site does not do yet

The shop uses Payment Links, not a full cart. That means:

- One product per checkout — no basket of several items
- No live stock counts on the page (Stripe closes a link when its payment
  limit is reached, but the page won't grey the product out until you edit
  `shop.js`)
- No customer accounts or order history

For limited numbered drops this is genuinely fine, and it costs nothing per
month. When you're selling enough that one-item-at-a-time is losing you
money, move to **Shopify or WooCommerce** — they handle baskets, per-size
stock, and tax properly.

Don't pay for that before you need it.

---

## Security notes

Built in, no action needed:

- **Data directory sealed** — `data/.htaccess` blocks web access
- **Spam honeypot** — a hidden field bots fill and humans never see
- **Rate limiting** — 20 seconds between submissions per visitor, and only
  a *successful* submission starts that clock, so correcting a typo isn't
  punished
- **Mail header injection blocked** — line breaks are stripped from every
  field, so nobody can inject a hidden Bcc into your notifications
- **Spreadsheet formula injection blocked** — see the apostrophe note above
- **HTTPS forced**, plus standard security headers
- **Consent checkbox** on the ambassador form, and consent is stored

Not included, and worth knowing:

- No CAPTCHA. The honeypot plus rate limiting handles ordinary bots. If you
  ever get flooded, add Cloudflare Turnstile — it's free.
- No double opt-in on the newsletter. If you start emailing large lists,
  add it; mailbox providers treat it as a trust signal.

---

## Copyright

Copyright © 2026 Self-Made Legends LLC. All Rights Reserved.

The name is always written **Self-Made Legends**, hyphenated, everywhere.
