# All Shades of Brown (ASB) — Website

The website for **All Shades of Brown**, founded by Rose Brown. One brand, many services, each with its own "All Shades of ___" tab:

| Tab | Service | Status |
|---|---|---|
| All Shades of Order | Professional organizing | Live (quote first) |
| All Shades of Learning | Tutoring | Live |
| All Shades of Beauty | Custom press-on nails | Live (shop) |
| All Shades of Clean | Cleaning | Live (quote first) |
| All Shades of Handy | Handyman | Live (quote first) |
| All Shades of Español | Spanish / English lessons for kids and families | Live |
| All Shades of Words | Creative writing services | Live (quote first) |
| All Shades of Digital | Social media content, website fixes, tech help | Live (quote first) |
| All Shades of Lawn Care | Lawn care | Live (quote first) |
| All Shades of Strength | Personal training | Coming soon (waitlist) |

Business details used across the site: **All Shades Of Brown, L.L.C.** · 816.287.2389 · fyi@myasbllc.com · www.myasbllc.com · Hablamos Español.

Rose's original flyers live in `public/flyers/` and are offered for download on each service page. Their content is rebuilt as a native section on the page (the `flyer` field in `services.json`).

Crest artwork goes in `assets-raw/` and is prepared by `scripts/prep-images.py` (removes the "Made with AI" badge, cuts out the shield for the logo). See `assets-raw/README.md`.

This folder is self-contained and has no connection to the rest of this repository. Move it to its own repo whenever ready.

## Run it

```bash
cd asb
npm install
cp .env.example .env     # optional; runs in demo mode without Stripe keys
npm start                # http://localhost:4000
```

Demo mode records bookings without charging anything. Add `STRIPE_SECRET_KEY` (and `STRIPE_WEBHOOK_SECRET` for paid-status updates) to take real deposits.

## What's here

- `public/` — the site. Home, About, Book, Shop, Community, Careers, Contact, legal pages, and one page per service.
- `data/services.json` — the single source of truth for services: name, tagline, pricing, deposit, intake questions, live/coming-soon status. The nav, homepage grid, booking page, and service pages all read from it.
- `scripts/generate-services.js` — regenerates `public/services/*.html` after editing `services.json` (`npm run build:services`).
- `server.js` — serves the site, saves form submissions to `data/submissions/*.json`, and creates Stripe Checkout sessions for deposits.

## Editing common things

- **Add or change a service:** edit `data/services.json`, then run `npm run build:services`.
- **Post a job:** uncomment the example block in `public/careers.html`.
- **Post an event:** edit the `EVENTS` list at the bottom of `public/community.html`.
- **Welcome video:** replace the placeholder in `public/index.html` with the YouTube/Vimeo iframe shown in the comment.
- **Contact details, hours, service area:** `public/contact.html`.
- **Deposit amounts:** the `deposit` field per service in `services.json`.

## Seeing submissions

Every form writes to `data/submissions/<form>.json`. With `ADMIN_TOKEN` set, `GET /api/admin/submissions` with header `x-admin-token` returns everything. A proper admin screen is next on the roadmap.

## Before launch

See `../docs/asb/ASB_WEBSITE_PLAN.md` for the full checklist. The short version: real photos and video, attorney review of the legal pages (especially the sweepstakes rules), Stripe account in Rose's name, domain and hosting.
