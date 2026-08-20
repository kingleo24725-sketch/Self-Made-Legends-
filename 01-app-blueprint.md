# 01 — Full App Blueprint

> **BEAUTY BOND™ — A SELF-MADE LEGENDS LLC (SML) PRODUCT**
> © 2026 **Self-Made Legends LLC (SML)**. All rights reserved.
> Owner: **Self-Made Legends LLC (SML)** · Proprietary and confidential.
> A standalone SML product — **not** part of The Self-Made Legends Come Up. See
> [`README.md`](README.md) for the separation rules and [`NOTICE.md`](NOTICE.md) for IP.

**Product:** Beauty Bond (working title: Dad + Daughter Beauty Bond)
**Owner:** Self-Made Legends LLC (SML)
**Category:** Family bonding × beauty education × safe social
**Platforms:** iOS, Android (React Native), Web companion (Next.js)

---

## 1.0 Ownership & Product Boundary

Beauty Bond is owned and operated by **Self-Made Legends LLC**. It is a separate
product from SML's trading game, **The Self-Made Legends Come Up** — separate app,
separate codebase, separate accounts, separate database, separate economy, separate
brand system. No SML Bucks, no leaderboards, no loot boxes, no game economy of any
kind appears in this product; it serves minors and cannot carry gambling-adjacent
mechanics. The only shared asset is the SML corporate mark in the credits.
Full rules: [`README.md`](README.md).

---

## 1.1 Product Definition

Beauty Bond is a beauty platform where the *relationship* is the product. Makeup is
the medium; bonding is the outcome. Every feature must answer: **who is this bringing
closer together?**

Three relationship spines:

| Spine | Who | Emotional job |
|---|---|---|
| **Dad + Daughter** | A father learning beauty *with* his daughter, not for her | "My dad shows up for the things I love." |
| **Mother + Daughter Legacy** | Living moms, distant moms, and moms who have passed | "I carry her with me." |
| **Sisterhood / Best Friend** | Peers, cousins, chosen family, global rooms | "I belong, and I'm seen." |

### Positioning statement

> For families who want beauty to be a place they meet instead of a place they
> compete, Beauty Bond is a guided beauty studio where a parent and child learn
> shades, brushes, and technique together — inclusive of every skin tone, texture,
> and culture — with child safety designed in, not bolted on.

### Non-negotiable product principles

1. **Safety before delight.** Any feature touching a minor's camera, voice, or
   contact list ships behind guardian consent.
2. **Never a beauty-standard machine.** No skin smoothing, no face slimming, no
   "score your face." Try-on adds *color and artistry*, never alters facial structure.
   (See §1.7 and `04-ai-tryon.md` §4.6.)
3. **Cultural depth, not a skin-tone slider.** Cultural modes carry history,
   technique, and creator credit — not just pigment.
4. **Dads start at zero and that's the joke, not the shame.** Onboarding assumes no
   prior knowledge and never condescends.
5. **Offline-kind.** Learning content and the makeup bag work without a connection.

---

## 1.2 Audiences & Personas

| Persona | Age | Role | Primary need |
|---|---|---|---|
| **Marcus, 41** | Adult | Dad, guardian account | "I want to do her edges and her lip gloss without embarrassing her." |
| **Zaria, 9** | Child (U13) | Child account, guardian-linked | Play, learn, be praised, be safe. |
| **Nia, 15** | Teen (13–17) | Teen account, guardian-visible | Skill, identity, friends, autonomy. |
| **Yolanda, 63** | Adult | Grandmother / legacy contributor | Pass down what she knows before it's lost. |
| **Aunt Rae, 34** | Adult | Trusted circle member | Join glam calls, gift subscriptions. |
| **Creator: Imani** | Adult | Verified educator | Teach cultural technique, earn revenue share. |

### Account types (drives every permission in this document)

```
GUARDIAN (18+, verified)
  ├── CHILD  (under 13)   — COPPA-scoped, no public surfaces, no DMs, no discovery
  ├── TEEN   (13–17)      — semi-public, guardian visibility, opt-in rooms
  └── (self) ADULT        — full platform
TRUSTED CIRCLE (adult, invited by guardian, max 10) — join-only, never invite
CREATOR (adult, verified + background-checked for youth rooms)
MODERATOR (staff)
```

---

## 1.3 Information Architecture

```
Beauty Bond
│
├── 00  Welcome / Onboarding
│     ├── Splash + value story
│     ├── Age gate  ──► Guardian verification (if minor)
│     ├── Account creation / SSO
│     ├── Relationship setup (who are you bonding with?)
│     ├── Skin & hair profile (tone, undertone, sensitivity, texture)
│     ├── Cultural mode preference (multi-select)
│     └── Consent center (camera, photos, video, notifications)
│
├── 01  Mode Selection  ◄── returnable hub, switchable any time
│     ├── Dad + Daughter Mode
│     ├── Mom & Me / Legacy Mode
│     ├── Little Legend Mode (U13, play-safe)
│     ├── Solo Glow Mode (adult/teen)
│     ├── Best Friend Glam Mode
│     └── Global Glam Mode
│
├── 02  Home Dashboard
│     ├── Today's Bond (daily 5-minute activity)
│     ├── Streak + Bond Meter
│     ├── Continue Learning rail
│     ├── Cultural spotlight rail
│     ├── Live now / upcoming rooms rail
│     └── Memory of the week
│
├── 03  Safe Makeup Learning System
│     ├── Learning Paths (Level 1–6)
│     ├── Lesson Player (step, mirror, timer, checkpoint)
│     ├── Brush Education
│     ├── Shade Matching
│     ├── Hygiene & Ingredient Safety
│     └── Practice Mode (no camera required)
│
├── 04  Cultural Beauty Library
│     ├── Black Beauty
│     ├── Latina Beauty
│     ├── Middle Eastern Beauty
│     ├── Asian Beauty (E/SE/South sub-collections)
│     ├── Indigenous Beauty
│     ├── Mixed & Multiheritage
│     └── Story archive (elders, creators, history)
│
├── 05  AI Try-On Studio
│     ├── Capture / upload
│     ├── Preset gallery (+ cultural glam sets)
│     ├── Layer editor (lip, cheek, eye, brow, lash, highlight)
│     ├── Shade-match handoff
│     └── Save to Makeup Bag / Memory Gallery
│
├── 06  Live Glam Rooms
│     ├── Family Room (private, invite-only)
│     ├── Dad + Daughter Live Lesson (creator-led)
│     ├── Best Friend Glam Room (2–4, guardian-approved)
│     ├── Global Glam Room (adult/teen, moderated)
│     └── Shared Glam Panel (synced look + steps)
│
├── 07  Dad + Daughter Bonding
│     ├── Bond Missions (weekly challenges)
│     ├── "Dad School" (60-second skills)
│     ├── Compliment Cards
│     ├── Bond Meter + milestones
│     └── Date Night Looks
│
├── 08  Mom's Legacy
│     ├── Legacy Vault (voice, photo, recipe, routine)
│     ├── Her Signature Look (recreate + try on)
│     ├── Letters Forward (time-released messages)
│     ├── Healing Journal
│     └── Remembrance Mode (grief-aware UI)
│
├── 09  My Makeup Bag
│     ├── Owned products (scan / search / manual)
│     ├── Wishlist
│     ├── Brush kit
│     ├── Shade profile card
│     └── Brand shelf (Fenty, Rare, Huda, MAC, …)
│
├── 10  Memory Gallery
│     ├── Timeline (by year / by person)
│     ├── Before + After pairs
│     ├── Glam Room recaps
│     └── Printable Bond Book export
│
├── 11  Profile & Progress
│     ├── Levels, badges, skill tree
│     ├── Streaks
│     ├── Shade profile
│     └── Public card (adult/teen only)
│
└── 12  Settings & Safety
      ├── Guardian Console
      ├── Privacy & data controls
      ├── Screen-time & bedtime
      ├── Subscription & billing
      ├── Blocking / reporting
      └── Delete & export
```

---

## 1.4 Module Specifications

Each module below is written as a build unit: purpose → screens → data → states →
permissions → gate.

---

### M00 — Welcome & Onboarding

**Purpose:** Establish emotional promise in under 45 seconds, then collect only the
minimum needed to personalize.

**Screens:** Splash → Story carousel (3 cards) → Age gate → Guardian verification
(conditional) → Auth → Relationship setup → Skin/hair profile → Cultural preference →
Consent center → Mode selection.

**Story carousel copy (locked):**
1. "Beauty is a language. Learn it together."
2. "Every tone. Every texture. Every culture."
3. "Safe for her. Simple for you."

**Age gate:** neutral date-of-birth wheel (not "are you over 13?" — self-selection
inflates). Result routes:
- `< 13` → guardian email required → guardian completes verifiable parental consent
  before *any* account is provisioned. Child sees a "Ask a grown-up to finish" holding
  screen. No camera, no data collection until consent lands.
- `13–17` → account created, guardian link *requested*; teen features degrade
  gracefully until linked (no live rooms, no BFF mode).
- `18+` → full account.

**Data written:** `users`, `guardianship`, `profiles.skin_profile`,
`profiles.cultural_modes`, `consents[]`.

**States:** first-run, resumed-onboarding, consent-pending, consent-denied,
region-blocked.

---

### M01 — Mode Selection

**Purpose:** The app is not one app. Mode changes vocabulary, color temperature,
content rails, and safety envelope.

| Mode | Available to | What changes |
|---|---|---|
| Dad + Daughter | Guardian + linked child/teen | Two-avatar header, Bond Missions, Dad School, co-op lessons |
| Mom & Me / Legacy | All | Legacy Vault surfaced, warmer palette, memory prompts |
| Little Legend | U13 only | Pretend-play products, no purchase links, no text entry, giant tap targets |
| Solo Glow | 13+ | Full library, personal goals |
| Best Friend Glam | 13+ w/ guardian approval | Pair rooms, shared looks, duo challenges |
| Global Glam | 16+ | Public moderated rooms, cultural exchange |

Mode is **switchable at any time** from the home header; it is *not* a one-time
choice. Mode is stored per-profile, not per-device.

---

### M02 — Home Dashboard

**Purpose:** One screen that answers "what do we do together today?"

**Blocks (top → bottom):**
1. **Header** — dual avatar (mode-dependent), mode chip, streak flame, settings.
2. **Today's Bond** — hero card, one 5-minute activity, `Start` CTA. Rotates daily
   from a curated set weighted by: skill level, mode, day of week, unfinished paths.
3. **Bond Meter** — progress ring; fills from shared activity, not solo activity.
4. **Continue** — horizontal rail of in-progress lessons.
5. **Cultural Spotlight** — one story/technique from the user's selected modes, plus
   one from a mode they haven't explored (deliberate cross-pollination).
6. **Live Now** — room cards; empty state offers "Start a Family Room."
7. **Memory of the Week** — a resurfaced gallery pair with "Recreate this" CTA.

**Empty state (day 1):** Today's Bond becomes "Your first 5 minutes together" —
a brush-naming game requiring no products.

---

### M03 — Safe Makeup Learning System

**Purpose:** Progressive, age-appropriate skill building with hard safety rails.

**Learning path levels:**

| Level | Title | Age floor | Sample lessons |
|---|---|---|---|
| 1 | Clean Hands, Clean Tools | 5+ | Handwashing, brush names, "never share mascara" |
| 2 | Skin First | 5+ | Gentle cleanse, moisturizer, SPF, patch testing |
| 3 | Color Play | 6+ | Lip balm & tinted gloss, blush placement, cheek + lip harmony |
| 4 | Brushes & Blending | 8+ | Brush grip, pressure, blending edges, cleaning |
| 5 | Eyes & Definition | 10+ | Brow shaping w/ pencil, lash care, safe liner (never waterline for minors) |
| 6 | Full Face & Occasion | 13+ | Base match, contour, setting, photo-ready |

**Kid-safe content rules (enforced in CMS, not just editorially):**
- No lesson under 13 may reference: needles, lash extensions, adhesive on the eye,
  waterline application, chemical peels, permanent dye, injectables, or weight.
- Every product mention under 13 must be tagged `kid_safe: true` and carry an
  ingredient-caution flag if it contains common child allergens/irritants
  (fragrance, formaldehyde-releasers, carmine, essential oils, lanolin).
- Every lesson must declare `requires_products: []` and offer a **Practice Mode**
  path that needs none.

**Lesson Player anatomy:** step list (collapsible) · mirror pane (front camera,
processed on-device) · step card w/ voice-over · timer for wait-steps · "Grown-up
check" checkpoint on any step flagged `supervision_required` · haptic on step
complete · offline-cached video.

**Brush Education submodule:**
- Interactive brush wall — tap any brush → name, purpose, bristle type
  (synthetic/natural), pressure diagram, "what happens if you use the wrong one."
- **Brush Match game:** drag brush → target face zone; 3 difficulty tiers.
- **Cleaning coach:** 6-step wash routine with a 20-second timer and a dry-time
  reminder notification.
- Data: `brushes` table (see `06-development-plan.md` §6.4).

**Shade Matching submodule:**
- Inputs: (a) guided camera capture in neutral light with a white-balance card
  prompt, (b) manual selector, (c) "match my existing foundation" by brand+shade.
- Outputs: **Shade Profile Card** — depth (1–16), undertone (cool/neutral/warm/olive),
  Fitzpatrick estimate, plus a *range* not a point ("you sit between 8W and 9W").
- Cross-brand mapping table converts the profile into candidate shades per brand.
- Honest failure state: "Lighting isn't good enough for a confident match" beats a
  wrong shade. Never guess.

---

### M04 — Cultural Beauty Library

**Purpose:** Depth, credit, and history — the anti-tokenism module.

**Every collection contains four content types:**
1. **Technique** — step-based, filmed on models of that heritage.
2. **Story** — an elder or creator on what the practice means.
3. **Palette** — pigments, undertone guidance, historical color meaning.
4. **Respect note** — what is sacred vs. shareable; where appropriation lines sit.

**Collections & sample depth:**

| Collection | Sample content |
|---|---|
| **Black Beauty** | Deep-shade foundation matching without ashiness; edge control & baby hair artistry; bold lip on deep skin; ashy-cast troubleshooting; hyperpigmentation-aware color; history of Black-owned beauty houses |
| **Latina Beauty** | Olive-undertone matching; brow architecture; glossy lip traditions; quinceañera glam; regional variation (Caribbean, Mexican, Andean, Southern Cone) |
| **Middle Eastern Beauty** | Kohl history & modern safe alternatives; halal & wudu-friendly formulas; henna as art form; bridal traditions; hijab-conscious face framing |
| **Asian Beauty** | E. Asian: skincare-first layering, straight brow, gradient lip. SE Asian: humidity-proof wear, deeper-tone corrections. S. Asian: bridal & festival glam, gold pigment work, colorism as an explicit topic |
| **Indigenous Beauty** | Regional traditions with nation-specific credit; sacred-vs-shareable guidance authored *by* Indigenous creators; plant-based pigment history; explicit "this is not a costume" module |
| **Mixed & Multiheritage** | Matching skin that shifts seasonally; undertone conflicts; belonging & identity essays; "which family's tradition is mine?" |

**Governance:** every collection has a named **Cultural Advisor** (paid, credited
on-screen). No collection ships without advisor sign-off recorded in
`collections.advisor_approval_at`. Content flagged by community as misrepresenting a
culture routes to the advisor, not to generic moderation.

---

### M05 — AI Try-On Studio

Full spec: `04-ai-tryon.md`. Blueprint-level summary:

- **Capture** → consent modal → live AR preview *or* single-photo mode.
- **Presets** → Everyday, Soft Glam, Date Night, Festival, Bridal + the six cultural
  glam sets.
- **Layer editor** → per-layer product, shade, opacity, finish.
- **Handoff** → "Shop this look" (adults), "Add to wishlist" (teens), **nothing**
  (U13 — pretend-play pigments only, no commerce, no realistic rendering).
- **Save** → Makeup Bag look, or Memory Gallery entry (requires the second person's
  consent if it's a shared look).

---

### M06 — Live Glam Rooms

Full spec: `05-live-video-rooms.md`. Blueprint-level summary:

| Room type | Size | Who | Recording | Moderation |
|---|---|---|---|---|
| Family Room | 2–8 | Guardian-invited only | Off by default; guardian may enable, all parties notified | None needed (closed) |
| Dad + Daughter Live Lesson | 2–200 | Creator-hosted, families attend | Creator-side only, minors never rendered in recording | Creator + staff mod |
| Best Friend Glam | 2–4 | Teen + guardian-approved friends | Hard off | Auto-audio/video classifier |
| Global Glam | up to 50 | 16+ only | Off | Staff mod + auto classifier + report queue |

Hard rules: **no U13 in any room with a non-trusted-circle adult.** No 1:1 adult↔minor
room unless the adult is the linked guardian or trusted circle. No DMs anywhere in the
product for U13 — ever.

---

### M07 — Dad + Daughter Bonding

**Purpose:** Convert makeup practice into relationship reps.

- **Bond Missions** — weekly, 3 per week, e.g. "Dad picks her lip color and has to
  name it," "She teaches him one brush," "Match your looks for pizza night."
  Completion requires *both* accounts to confirm → writes to Bond Meter.
- **Dad School** — 60-second, zero-jargon micro-lessons: how to do a puff ponytail,
  what "blend" actually means, how to buy a gift she'll like, how to compliment
  effort not appearance.
- **Compliment Cards** — structured prompts that reward specificity ("I liked how
  patient you were with the blending" > "you look pretty"). Deliberately coaches away
  from appearance-only praise.
- **Bond Meter** — decays slowly with inactivity; never shames. Copy on decay:
  "Life gets busy. Five minutes puts you right back."
- **Date Night Looks** — a look pair (his grooming + her glam) for a shared outing.

---

### M08 — Mom's Legacy

**Purpose:** The emotional core. Must be handled with grief-literate design.

- **Legacy Vault** — voice notes, photos, handwritten-recipe scans, "her routine,"
  her signature shades. Contributable by any family member with guardian approval.
- **Her Signature Look** — a mom's look encoded as a try-on preset; daughter can wear
  it. This is the single most emotionally loaded feature in the app — it gets a
  gentle entry animation, no confetti, no gamification, no streaks.
- **Letters Forward** — a mother (or guardian, on her behalf) records messages
  time-released to future dates: 13th birthday, first day of high school, wedding
  morning. Stored encrypted; delivery independent of subscription status
  (**never paywall a dead mother's letter** — see `03-stripe-subscriptions.md` §3.6).
- **Healing Journal** — private, encrypted at rest, guardian-invisible for teens
  (13+) by design; prompts are grief-informed and never require a response.
- **Remembrance Mode** — a per-profile flag. When on: mutes Mother's Day campaigns,
  softens color temperature, removes streak pressure, changes empty-state copy.

**Crisis handling:** journal entries and room audio are *not* scanned by AI for
self-harm sentiment (surveillance breaks the trust this module depends on). Instead,
a persistent, non-intrusive **"Talk to someone"** entry point is always present in
this module, region-aware, listing local helplines. If a user self-reports via that
button, the app hands off to real resources and does not attempt to counsel.

---

### M09 — My Makeup Bag

- Add product via barcode scan, brand catalog search, or manual entry.
- Fields: brand, product, shade, finish, opened-on date, **expiry estimate**
  (mascara 3mo, liquid liner 3mo, foundation 12mo, powder 24mo) with a gentle
  replace-reminder.
- **Brush kit** — which brushes owned, last cleaned date, cleaning streak.
- **Brand shelf** — Fenty Beauty, Rare Beauty, Huda Beauty, MAC, NARS, Pat McGrath,
  Black Opal, Juvia's Place, Uoma, Danessa Myricks, Mented, Beauty Bakerie, Milk,
  e.l.f., Maybelline, L'Oréal, Charlotte Tilbury, Anastasia, Tarte, Glossier.
  See `06-development-plan.md` §6.9 for the catalog-integration model and the
  affiliate/partnership boundary.
- **Shade Profile Card** — shareable image export (adults/teens only), the single
  most valuable retention artifact in the app.

---

### M10 — Memory Gallery

- Timeline by year and by person; before/after pairs; auto-generated glam-room
  recaps (stills only, never room video, and only with all-party consent).
- **Bond Book export** — a printable/PDF keepsake of a year of looks, missions, and
  compliment cards. Premium feature; the emotional anchor for annual renewal.
- Deletion is real deletion: removing a memory purges derived thumbnails, recap
  frames, and CDN cache within 24h.

---

### M11 — Profile & Progress

Levels (Novice → Apprentice → Artist → Stylist → Master → Legend), skill tree per
learning path, badges (Brush Boss, Shade Sleuth, Culture Scholar, 30-Day Bond,
Legacy Keeper), streaks with **two free "life happens" passes per month**, and the
shade profile. Public profile card exists only for 13+ and shows *no* location, no
school, no last-seen.

---

### M12 — Settings & Safety

**Guardian Console** (the most important screen in the app):
- Linked children list, per-child permission matrix (camera / try-on / rooms /
  friend requests / purchases / notifications).
- Approve-friend queue, room join log, weekly activity digest.
- Screen-time caps + bedtime windows (child device is soft-locked, not scolded).
- Data export and delete for each child.
- Purchase lock (no in-app purchase by a child account, at all, under any tier).

**Everyone:** blocking, reporting (in-room panic button reachable in ≤1 tap →
immediately ends the child's connection and notifies guardian + staff), privacy
controls, subscription management, download-my-data, delete-account.

---

## 1.5 Cross-Cutting: Safety Architecture

| Control | Where enforced |
|---|---|
| Verifiable parental consent | Server-side, blocks account provisioning |
| Age-band feature gating | API middleware `requireAgeBand()` — never client-only |
| No stranger contact for U13 | Room join service; discovery index excludes U13 entirely |
| No DMs for U13 | Feature does not exist for that account type (not "disabled") |
| Camera/photo consent | OS permission + in-app per-feature consent record |
| Minor faces in recordings | Media pipeline drops minor tracks pre-encode |
| Panic button | Client + server; server force-disconnects |
| Data minimization | No precise location, ever. No contacts upload for minors. |
| Retention | Minor try-on source images deleted ≤24h; renders kept only if saved |

**Compliance surface:** COPPA (US), GDPR + GDPR-K (EU, 13–16 varies by member state),
UK Age Appropriate Design Code, California AADC, Brazil LGPD. Region detection at
signup sets the consent age floor; the app takes the **stricter** of region floor and
13.

---

## 1.6 Monetization Gates (summary — full detail in `03-stripe-subscriptions.md`)

| Capability | Free | Bond | Legacy | Studio |
|---|---|---|---|---|
| Learning Levels 1–2 | ✅ | ✅ | ✅ | ✅ |
| Learning Levels 3–6 | — | ✅ | ✅ | ✅ |
| Cultural Library (1 collection) | ✅ | — | — | — |
| Cultural Library (all) | — | ✅ | ✅ | ✅ |
| AI Try-On | 5/mo | Unlimited | Unlimited | Unlimited |
| Cultural glam sets | — | ✅ | ✅ | ✅ |
| Family Room | 20 min/mo | 5 hr/mo | Unlimited | Unlimited |
| Global Glam Rooms | Listen-only | ✅ | ✅ | ✅ |
| Legacy Vault | 3 items | 25 items | Unlimited | Unlimited |
| Letters Forward | — | — | ✅ | ✅ |
| Bond Book export | — | 1/yr | 4/yr | Unlimited |
| Child accounts | 1 | 3 | 6 | 6 |
| Creator tools | — | — | — | ✅ |

**Never gated, at any tier:** safety features, the panic button, guardian console,
data export, hygiene lessons, delivery of already-recorded Letters Forward.

---

## 1.7 Explicitly Out of Scope (product guardrails)

These are documented as *rejected*, so nobody adds them in a later sprint:

- Face-slimming, nose-narrowing, jaw-sharpening, skin-smoothing, or teeth-whitening
  filters. The AI try-on renders **cosmetics only**.
- Any "beauty score," symmetry rating, or attractiveness ranking.
- Weight, diet, or body-shape content anywhere in the product.
- Skin-lightening product promotion (blocked at the catalog level).
- Public follower counts or virality mechanics for minor accounts.
- Open-ended text chat for U13.
- Selling or sharing minors' data, ever — including "anonymized" model training.
  Try-on models are **not** trained on user-submitted minor imagery.

---

*Continue to `02-wireframes.md`.*
