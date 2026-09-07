# All Shades of Brown (ASB) — Website Plan

**Owner:** Rose Brown, founder of All Shades Of Brown, L.L.C. (ASB). 816.287.2389 · fyi@myasbllc.com · www.myasbllc.com
**Status:** planning draft. This captures Rose's vision plus the gaps identified during review.

ASB is its own business and its own website. It is not connected to Self-Made Legends LLC or the
trading game in this repository. The site code lives in the self-contained `asb/` folder so it can be
moved to its own repository and hosting account under Rose's name at any time.

---

## 1. Vision (as described)

- **Brand:** "All Shades of Brown" is the umbrella. Each service gets its own "All Shades of ___" name and its own tab.
- **Services (planned):** professional organizing, tutoring, custom press-on nails, cleaning, handyman, Spanish classes, lawn care, personal training (later), freelancing (later).
- **Homepage:** All Shades of Brown, with a personal welcome video to the "Web Community."
- **Booking:** a calendar where customers schedule a service directly after paying a non-refundable deposit. Debit and credit accepted; crypto possibly later.
- **Careers:** open jobs when available, plus an always-on interest card / application.
- **Community:** newsletter / community signup, volunteer tab, monthly or quarterly give-back events (BBQs, fundraisers) posted on the calendar.
- **Raffle:** monthly, $2 per ticket, $1 goes back to the community.
- **Social giveaway:** weekly or monthly, for new follows / likes / comments / subscribes.

---

## 2. Must-resolve before building (legal and money)

| Item | Why it matters | Recommendation |
|---|---|---|
| **Raffle legality** | Paid raffles are regulated as lotteries in most US states and are usually only legal for registered nonprofits with a permit. Donating $1 per ticket does not exempt a for-profit business. | Run it as a **sweepstakes** (free alternate method of entry, official rules, 18+, void where prohibited), or partner with a registered 501(c)(3) that runs the raffle while ASB sponsors the prize. |
| **Social giveaway rules** | Instagram, Facebook, and TikTok each have promotion guidelines (official rules, platform-release statement, no "share to your timeline" on Facebook). Sweepstakes law applies here too. "New followers only" cannot be reliably verified. | Use "follow + comment within a dated window" as the entry, publish official rules, and pick winners with a documented method. |
| **Non-refundable deposit** | Card networks side with the customer on chargebacks unless the terms were shown and accepted before payment. | Show the deposit terms on the checkout page with a required checkbox. Define: reschedule window, what happens if ASB cancels, weather policy for outdoor work. |
| **Service agreements / waivers** | In-home and physical services carry liability. Tutoring involves minors. | Personal training: liability waiver + health questionnaire (PAR-Q). Cleaning: damage policy, entry access. Handyman: scope, materials, change orders. Tutoring: parental consent, background checks. |
| **Business structure** | Multiple "All Shades of ___" names. | One LLC with DBAs (or trade names) per service. EIN, business bank account, general liability insurance. Cleaning: bonding. Handyman: check local contractor license thresholds. |
| **Workers: W-2 vs 1099** | Multi-service model with helpers. Misclassification is expensive. | Decide early. Contractor onboarding needs W-9, insurance status, service area, skills. |
| **Sales tax and shipping** | Press-on nails are taxable goods. Some services are taxable in some states. | Configure tax in the payment processor. Define shipping and returns for nails. |
| **Privacy / email law** | Collecting emails and payments triggers CAN-SPAM and state privacy laws. | Terms of Service, Privacy Policy, cookie notice, refund/cancellation policy, unsubscribe in every email. |
| **Crypto** | Volatile, no refunds, every transaction is a taxable event for the business. | Defer. If added later, use a processor that auto-converts to USD (e.g., Coinbase Commerce, BitPay). |
| **"Giving back" money** | Do not imply charitable status unless registered. | Say "we donate to ___" and name the partner nonprofit, or form a nonprofit arm later. |

---

## 3. Site map

### Top-level navigation
1. **Home** — All Shades of Brown. Welcome video, what ASB is, featured services, upcoming community event, newsletter signup.
2. **About ASB** — Rose's story, values, team, "why brown."
3. **Services** — one tab/page per service (see §4). Navigation can be a top bar with a dropdown on desktop and a side drawer on mobile.
4. **Book** — calendar booking with deposit (see §5).
5. **Shop** — press-on nails store (separate from booking).
6. **Community** — events, volunteer signup, give-back impact, partner nonprofits, raffle/sweepstakes, social giveaway rules.
7. **Careers** — open roles, always-on application, contractor/partner interest form.
8. **Contact** — phone, email, text/WhatsApp button, service area map, hours, FAQ.

### Always present
- Newsletter / community signup (footer and homepage).
- Social links.
- Language toggle: English / Español.
- Legal footer: Terms, Privacy, Refund & Cancellation, Sweepstakes Rules.

---

## 4. Service pages (one template, filled per service)

Each "All Shades of ___" page has:
- Hero + short description, who it's for.
- Pricing ("starting at") **or** a "Get a quote" form (handyman, cleaning, organizing need photos / square footage before a deposit makes sense).
- Gallery / before-and-after / portfolio.
- Reviews for that service.
- What to expect (process, what's included, what's not).
- Service-specific intake questions collected after booking.
- Book / Get a Quote / Join Waitlist button.

| Service | Booking type | Intake essentials | Notes |
|---|---|---|---|
| Professional organizing | Quote → then deposit | Photos, rooms, goals | Package pricing (half day / full day). |
| Tutoring | Direct booking, recurring | Student age/grade, subject, parent contact | Minors: consent, background check, virtual option. Session packs. |
| Press-on nails | **Store**, not booking | Size (sizing kit), shape, length, design | Custom order form, production time, shipping, returns. |
| Cleaning | Quote → recurring plans | Sq ft, bedrooms/baths, pets, entry instructions | Weekly / biweekly / monthly plans. Bonding + insurance. |
| Handyman | Quote → deposit | Photos, description, urgency | Urgent-request form. Materials policy. |
| Spanish classes | Direct booking, recurring | Level, goal, group or 1:1 | Group class schedule. Session packs. |
| Lawn care | Direct or quote, recurring | Lot size, photos | Weather policy. Seasonal plans. |
| Personal training (later) | Direct booking, recurring | PAR-Q, goals | Waiver required. Certification. |
| Freelancing (later) | Quote | Project brief | Define what "freelancing" covers. |

**Launch advice:** go live with 2–3 services. Show the rest as "Join the waitlist" so the site never looks empty.

---

## 5. Booking and payments

- **Deposit flow:** pick service → pick time → intake form → accept deposit terms (required checkbox) → pay deposit → confirmation email + SMS.
- **Balance collection:** decide on-site card reader vs. invoice after service. Add tipping.
- **Per-service settings:** duration, buffer time, travel time, staff assignment, availability blocks, time zone.
- **Recurring bookings** for cleaning, tutoring, Spanish, lawn care.
- **Reminders** 24h and 2h before. Self-service reschedule inside the policy window.
- **Client accounts:** booking history, receipts, one-tap rebook, saved addresses.
- **Gift cards, packages, referral credits, loyalty.**
- **Payments:** Stripe Checkout (or Square) so card data never touches ASB servers (PCI). Crypto deferred.
- **Recommendation:** embed an existing booking tool (Square Appointments, Acuity, or Cal.com) with Stripe for deposits instead of building scheduling from scratch. Custom build only once volume justifies it.

---

## 6. Community, raffle, giveaway

- **Events:** upcoming events with RSVP, photo recaps of past events, added to the public calendar.
- **Volunteer signup:** name, contact, availability, interests, waiver.
- **Impact tracker:** "$___ given back so far," partner nonprofits, how the money is used.
- **Raffle → Sweepstakes page:** current prize, entry methods (paid + free), drawing date, official rules, past winners.
- **Social giveaway page:** current giveaway, how to enter, rules, winner announcement method. Requires the social accounts to exist first.
- **Newsletter:** decide the monthly content (events, new services, winners, promo). Use a tool with double opt-in and built-in unsubscribe (Mailchimp, Beehiiv, etc.).

---

## 7. Careers

- Open roles list (can be empty with "no openings right now, but we're always looking").
- **Job application** (employee): resume upload, availability, services interested in, background check consent where required, EEO statement.
- **Contractor / partner interest form** (for people met in person who are not a business): skills, service area, rates, insurance status, W-9 later.
- Auto-reply confirming receipt. Applications go to an inbox or simple admin list.

---

## 8. Back office (admin)

- Dashboard: today's bookings, unassigned jobs, quotes waiting, balances owed.
- Assign staff, mark complete, trigger balance invoice.
- Customer list, notes, service history.
- Applications and contractor forms inbox.
- Event and raffle management.
- Notifications to staff on new bookings.

---

## 9. Content and brand assets to prepare

- Logo and a brown-tone palette; name consistency ("All Shades of Brown" vs "ASB").
- Welcome video: under 90 seconds, captioned, hosted on YouTube (unlisted) or Vimeo, no autoplay with sound.
- Photos per service (real work, not stock where possible).
- Rose's story for About.
- Written policies: deposit, cancellation, weather, damage, refunds.
- Spanish translations of all core pages.

---

## 10. Technical baseline

- Domain and business email (e.g., hello@ your domain).
- Mobile-first, accessible (WCAG AA), fast.
- SEO: one page per service with "[service] in [city]" targeting; Google Business Profile linked.
- Analytics and conversion tracking on booking and signup.
- HTTPS, backups, Stripe webhooks for payment confirmation.
- Suggested stack: static HTML/CSS/JS front end served by a small Node/Express server, Stripe Checkout for deposits, email/SMS via a provider (Resend / Twilio). Move to its own repository and Rose's own Stripe, domain, and hosting accounts before launch.

---

## 11. Suggested build order

1. Legal decisions (entity, worker classification, raffle → sweepstakes, deposit terms).
2. Brand assets, domain, email, social accounts.
3. Home, About, Contact, 2–3 service pages, waitlist for the rest.
4. Booking with deposit for the live services + intake forms + reminders.
5. Newsletter signup + legal pages.
6. Careers (application + contractor form).
7. Community page + events + volunteer signup.
8. Nails store.
9. Sweepstakes and social giveaway (only after rules are written).
10. Client accounts, packages, gift cards, referrals.
11. Spanish site version.
12. Crypto (optional, last).

---

## 12. Open questions for Rose

- Which 2–3 services launch first?
- What city / radius is the service area, and is there a travel fee?
- Deposit amount: flat (e.g., $25) or percentage?
- Reschedule window and no-show policy?
- Who does the work initially: Rose only, or helpers from day one? W-2 or 1099?
- Will the raffle become a sweepstakes, or is there a nonprofit partner?
- Which social platforms exist today?
- How is the balance collected after a service?
