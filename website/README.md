# selfmadelegendsz.com — Upload Guide

The Self-Made Legends website. Plain HTML, CSS, and a little PHP — nothing
to build, nothing to install. Upload the files and it works.

Written for InterServer shared hosting (cPanel + Apache + PHP).

---

## Before you upload — 3 things

### 1. Create the email addresses

In cPanel → **Email Accounts**, create these at `selfmadelegendsz.com`:

| Address | Why |
|---|---|
| `info@selfmadelegendsz.com` | Where form submissions are sent |
| `noreply@selfmadelegendsz.com` | The "from" address on those notifications |
| `wholesale@selfmadelegendsz.com` | Linked in the footer |
| `press@selfmadelegendsz.com` | Linked in the footer |

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
├── 404.html
├── api/
│   ├── config.php
│   └── submit.php
├── assets/
│   ├── favicon.svg
│   ├── css/sml.css
│   └── js/sml.js
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

**3. The ambassador form works.** Fill it in and submit.

**4. ⚠️ Your email list is NOT public.** In a browser, go to:

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
- `ambassadors.csv` — applications

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

**The FAQ has 3 unfinished answers** marked `[ SET ... ]` — shipping times,
returns, and international. Fill those in before you take real orders. Those
are the questions a customer asks right before they decide not to buy.

---

## What this site does not do yet

It's a catalog and a mailing-list builder, not a store. There is **no
shopping cart and no checkout** — nobody can buy anything from it today.

That's a deliberate first step, not an oversight. Build the list first, then
add selling. When you're ready, the two realistic options:

- **Stripe Payment Links** — free, ~30 minutes, one link per product. Fine
  for a handful of items and limited drops. Good enough to start taking
  money this week.
- **Shopify or WooCommerce** — real inventory, variants, shipping rules,
  taxes. More setup and a monthly cost, but it handles sold-out runs and
  size stock properly, which matters once drops are real.

For numbered runs that sell out, you will eventually want the second one.

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
