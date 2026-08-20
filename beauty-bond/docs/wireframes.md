# 02 — Full Wireframes

> **DAD + DAUGHTER BEAUTY BOND™ — A SELF-MADE LEGENDS LLC (SML) PRODUCT**
> © 2026 **Self-Made Legends LLC (SML)**. All rights reserved.
> Owner: **Self-Made Legends LLC (SML)** · Proprietary and confidential.
> A standalone SML product — **not** part of The Self-Made Legends Come Up.
>
> **Designers:** every exported screen, prototype frame, and handoff file must carry
> the SML footer mark — see [`branding.md`](branding.md) §7.9.

Low-fidelity, labeled, designer-ready. Every region is named `[R#]` and annotated
below its frame. Frame reference: **390 × 844** (iPhone 14 baseline).
Safe area: 16 px side gutters, 8 px grid, 44 px minimum tap target
(**56 px in child accounts**).

Legend:
`▢` container · `◉` avatar · `▶` media · `⬤` primary CTA · `◦` secondary · `≡` list
`[!]` designer annotation · `{state}` conditional region

---

## W-00 · Welcome / Story Carousel

```
┌──────────────────────────────────────┐
│                                  Skip│ [R1]
│                                      │
│                                      │
│            ▶ hero motion             │ [R2]
│      (dad + daughter, brush pass)    │
│                                      │
│                                      │
│   Beauty is a language.              │ [R3]
│   Learn it together.                 │
│                                      │
│   Every tone. Every texture.         │ [R4]
│   Every culture.                     │
│                                      │
│            ● ○ ○                     │ [R5]
│                                      │
│  ┌────────────────────────────────┐  │
│  │ ⬤        Get started           │  │ [R6]
│  └────────────────────────────────┘  │
│         I already have an account    │ [R7]
└──────────────────────────────────────┘
```

- **[R1]** Skip → jumps to age gate, never to home.
- **[R2]** 3 s looping video, muted, `prefers-reduced-motion` → static still.
- **[R3]** Display/48/Semibold. **[R4]** Body/16/Regular, 70% opacity.
- **[R5]** 3 dots, swipe or auto-advance at 4 s (pauses on touch).
- **[!]** Hero must show a *dad's hands* in frame on card 1. This is the whole pitch.

---

## W-01 · Age Gate

```
┌──────────────────────────────────────┐
│ ←                                    │
│                                      │
│  When were you born?                 │ [R1]
│  We use this to keep everyone safe.  │
│                                      │
│   ┌──────┐ ┌──────┐ ┌──────────┐     │
│   │Month▾│ │ Day ▾│ │  Year  ▾ │     │ [R2]
│   └──────┘ └──────┘ └──────────┘     │
│                                      │
│  🛈 We never share this. It only sets │ [R3]
│    which features are available.     │
│                                      │
│  ┌────────────────────────────────┐  │
│  │ ⬤          Continue            │  │
│  └────────────────────────────────┘  │
└──────────────────────────────────────┘
```

- **[!]** Neutral DOB entry — **never** "Are you 13 or older?" Self-selection
  inflates ages and voids the compliance posture.
- Routes: `<13` → W-02 · `13–17` → W-03 · `18+` → W-04.
- **[!]** No back-and-retry loophole: DOB is fixed once submitted; changing it
  requires guardian/support intervention (`age_change_requests` table).

---

## W-02 · Guardian Handoff {U13}

```
┌──────────────────────────────────────┐
│  🔒                                   │
│  Let's get a grown-up.               │ [R1]
│                                      │
│  A parent or guardian has to set     │
│  this up with you. It only takes     │
│  a few minutes.                      │
│                                      │
│  Grown-up's email                    │
│  ┌────────────────────────────────┐  │ [R2]
│  │                                │  │
│  └────────────────────────────────┘  │
│                                      │
│  ┌────────────────────────────────┐  │
│  │ ⬤        Send the link          │  │
│  └────────────────────────────────┘  │
│                                      │
│  ────────── or ──────────            │
│  ◦ A grown-up is here with me now    │ [R3]
└──────────────────────────────────────┘
```

**{consent-pending} holding screen** replaces the app entirely until consent lands:

```
┌──────────────────────────────────────┐
│            ⏳                         │
│  We sent the link!                   │
│  Ask them to check their email.      │
│  ◦ Resend    ◦ Use a different email │
└──────────────────────────────────────┘
```

- **[!]** No camera, no name, no photo, **no data collection at all** on a child
  account before verifiable parental consent is recorded. This screen is a hard wall.
- **[R3]** In-person path: guardian authenticates on-device (SSO + card-based or
  knowledge-based verification per COPPA method), then continues.

---

## W-03 · Relationship Setup

```
┌──────────────────────────────────────┐
│ ←                          Step 2/4  │ [R1]
│                                      │
│  Who are you bonding with?           │ [R2]
│  Pick as many as you like.           │
│                                      │
│  ┌──────────────┐ ┌──────────────┐   │
│  │      👨‍👧       │ │      👩‍👧       │   │
│  │  My daughter │ │   My mom     │   │ [R3]
│  │      ✓       │ │              │   │
│  └──────────────┘ └──────────────┘   │
│  ┌──────────────┐ ┌──────────────┐   │
│  │      👯       │ │      🫂       │   │
│  │  Best friend │ │ Someone I've │   │
│  │              │ │     lost     │   │
│  └──────────────┘ └──────────────┘   │
│  ┌──────────────┐ ┌──────────────┐   │
│  │      ✨       │ │      🌍       │   │
│  │   Just me    │ │  The world   │   │
│  └──────────────┘ └──────────────┘   │
│                                      │
│  ┌────────────────────────────────┐  │
│  │ ⬤          Continue            │  │
│  └────────────────────────────────┘  │
└──────────────────────────────────────┘
```

- **[!]** "Someone I've lost" selection sets `remembrance_mode = true` immediately and
  suppresses every celebratory animation for the rest of onboarding. No confetti after
  someone tells you they're grieving.
- **[R3]** 2-col grid, 1:1 tiles, selected = 2 px Rose Gold border + fill tint.

---

## W-04 · Skin & Hair Profile

```
┌──────────────────────────────────────┐
│ ←                          Step 3/4  │
│  Let's find your shades.             │
│                                      │
│  Skin depth                          │ [R1]
│  ▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢   ← 16 swatches   │
│  1  2  3 ... selected: 9             │
│                                      │
│  Undertone                           │ [R2]
│  ( ) Cool  ( ) Neutral               │
│  (•) Warm  ( ) Olive  ( ) Not sure   │
│                                      │
│  Hair texture                        │ [R3]
│  [1] [2A-C] [3A-C] [4A-C] [Locs]     │
│  [Protective] [Braids] [Not sure]    │
│                                      │
│  Sensitivities  (optional)           │ [R4]
│  ☐ Fragrance  ☐ Eczema  ☐ Nut        │
│  ☐ Latex  ☐ Acne-prone  ☐ Eye-sensitive│
│                                      │
│  ◦ Scan my skin instead  📷           │ [R5]
│  ┌────────────────────────────────┐  │
│  │ ⬤          Continue            │  │
│  └────────────────────────────────┘  │
└──────────────────────────────────────┘
```

- **[!]** Swatch strip must render true-to-tone; ship a per-device display-profile
  calibration step before this screen on Android. Depth 1–16 with **equal visual
  spacing across the full range** — do not compress the deep end. This is the single
  most common failure in beauty apps and it reads as exclusion.
- **[R2]** "Not sure" is a first-class answer, not a fallback.
- **[R5]** Optional camera path → W-22 Shade Matching. Never required.

---

## W-05 · Consent Center

```
┌──────────────────────────────────────┐
│ ←                          Step 4/4  │
│  You're in control.                  │
│  Turn any of these on or off, any    │
│  time, in Settings.                  │
│                                      │
│  📷 Camera                    [ ON ] │ [R1]
│     For try-on and mirror lessons.   │
│     Photos stay on your device       │
│     unless you save them.            │
│  ─────────────────────────────────── │
│  🖼 Photo library            [ OFF ] │
│     To upload a picture for try-on.  │
│  ─────────────────────────────────── │
│  🎥 Live rooms               [ OFF ] │
│     Video calls with family.         │
│  ─────────────────────────────────── │
│  🔔 Reminders                [ ON  ] │
│  ─────────────────────────────────── │
│  📊 Help improve the app     [ OFF ] │ [R2]
│     Anonymous usage only. Never      │
│     your photos. Never a child's     │
│     data.                            │
│                                      │
│  ┌────────────────────────────────┐  │
│  │ ⬤        Finish setup          │  │
│  └────────────────────────────────┘  │
└──────────────────────────────────────┘
```

- **[!]** Every toggle **defaults OFF except camera and reminders**. Analytics default
  OFF and is *unavailable* (not merely off) on child accounts.
- **[R1]** Each row: icon, label, toggle, one-line plain-language purpose. No legalese
  on this screen; full policy link at bottom.

---

## W-10 · Mode Selection

```
┌──────────────────────────────────────┐
│  ◉ Marcus & Zaria            ⚙        │ [R1]
│                                      │
│  How do you want to glam today?      │ [R2]
│                                      │
│ ┌──────────────────────────────────┐ │
│ │ 👨‍👧  DAD + DAUGHTER               │ │
│ │    Learn together, level up      │ │ [R3]
│ │    together.          ● Active   │ │
│ └──────────────────────────────────┘ │
│ ┌──────────────────────────────────┐ │
│ │ 👩‍👧  MOM & ME / LEGACY            │ │
│ │    Her routine, her shades,      │ │
│ │    her voice.                    │ │
│ └──────────────────────────────────┘ │
│ ┌──────────────────────────────────┐ │
│ │ 🧸  LITTLE LEGEND       Ages 5–12│ │
│ │    Pretend play, real skills.    │ │
│ └──────────────────────────────────┘ │
│ ┌──────────────────────────────────┐ │
│ │ ✨  SOLO GLOW                     │ │
│ │    Just for you.                 │ │
│ └──────────────────────────────────┘ │
│ ┌──────────────────────────────────┐ │
│ │ 👯  BEST FRIEND GLAM      🔒 13+  │ │ [R4]
│ │    Glam with your person.        │ │
│ └──────────────────────────────────┘ │
│ ┌──────────────────────────────────┐ │
│ │ 🌍  GLOBAL GLAM           🔒 16+  │ │
│ │    Beauty from everywhere.       │ │
│ └──────────────────────────────────┘ │
│                                      │
│  You can switch any time.            │ [R5]
└──────────────────────────────────────┘
```

- **[R3]** Card: 88 px tall, mode gradient at 12% behind icon, title 18/Semibold,
  subtitle 14/Regular 65%.
- **[R4]** Locked cards render at 55% opacity with a lock chip; tap → explainer
  sheet ("Ask your grown-up to unlock") + guardian-request CTA, **never** a dead end.
- **[!]** Mode switch changes: accent color, home rails, copy voice, and the safety
  envelope. Persist per-profile server-side, not in local storage.

---

## W-11 · Home Dashboard

```
┌──────────────────────────────────────┐
│ ◉◉ Marcus & Zaria  [Dad+Daughter ▾] │ [R1]
│                        🔥7    ⚙       │
│ ┌──────────────────────────────────┐ │
│ │  TODAY'S BOND            5 min   │ │
│ │  ▶                               │ │ [R2]
│ │  "Name That Brush"               │ │
│ │  Zaria teaches, Dad guesses.     │ │
│ │  ┌────────────────────────────┐  │ │
│ │  │ ⬤        Start             │  │ │
│ │  └────────────────────────────┘  │ │
│ └──────────────────────────────────┘ │
│                                      │
│      ╭─────╮   BOND METER            │ [R3]
│      │ 68% │   4 missions to Level 3 │
│      ╰─────╯                         │
│                                      │
│ CONTINUE                    See all →│ [R4]
│ ┌────────┐┌────────┐┌────────┐       │
│ │▶ 60%   ││▶ 20%   ││▶ 5%    │       │
│ │Blending││Brush   ││Shade   │       │
│ │Edges   ││Care    ││Match   │       │
│ └────────┘└────────┘└────────┘       │
│                                      │
│ CULTURAL SPOTLIGHT                   │ [R5]
│ ┌──────────────────────────────────┐ │
│ │ ▶ "Edges as Art"                 │ │
│ │   Black Beauty · with Ms. Deborah│ │
│ └──────────────────────────────────┘ │
│                                      │
│ LIVE NOW                             │ [R6]
│ ┌────────┐┌────────┐                 │
│ │🔴 Dad  ││⚪ Auntie│                 │
│ │School  ││Rae     │                 │
│ │42 here ││invited │                 │
│ └────────┘└────────┘                 │
│                                      │
│ MEMORY OF THE WEEK                   │ [R7]
│ ┌──────────────────────────────────┐ │
│ │ [before] │ [after]   Aug 2 2025  │ │
│ │ ◦ Recreate this look             │ │
│ └──────────────────────────────────┘ │
├──────────────────────────────────────┤
│  🏠     📚     ✨     🎥     👤       │ [R8]
│ Home  Learn TryOn  Rooms Profile     │
└──────────────────────────────────────┘
```

- **[R1]** Dual avatar only in relational modes; single avatar in Solo Glow.
  Mode chip is a tap-target → W-10.
- **[R2]** Hero card 220 px, mode gradient, one CTA only. Never two competing CTAs.
- **[R3]** Ring fills from *shared* activity only. **[!]** Decay copy must never
  shame: "Life gets busy. Five minutes puts you right back."
- **[R5]** Slot 1 = user's selected culture; slot 2 (on scroll) = an unselected one.
- **[R6]** Red dot = live, grey = scheduled. Empty state → "Start a Family Room ⬤".
- **[R8]** Tab bar; in child accounts the bar drops to 3 tabs (Home, Learn,
  Play) with 56 px targets and labels always visible.

---

## W-12 · Home {child accounts}

```
┌──────────────────────────────────────┐
│  Hi Zaria! ✨            🔥7          │ [R1]
│                                      │
│  ┌──────────────────────────────────┐│
│  │                                  ││
│  │        🖌  BRUSH GAME             ││ [R2]
│  │                                  ││
│  └──────────────────────────────────┘│
│  ┌──────────────────────────────────┐│
│  │        🎨  PRETEND GLAM           ││
│  └──────────────────────────────────┘│
│  ┌──────────────────────────────────┐│
│  │        🧼  CLEAN CREW             ││
│  └──────────────────────────────────┘│
│  ┌──────────────────────────────────┐│
│  │        👨‍👧  CALL DAD               ││ [R3]
│  └──────────────────────────────────┘│
│                                      │
├──────────────────────────────────────┤
│    🏠        📚        🎮            │
└──────────────────────────────────────┘
```

- **[!]** Little Legend rules, all mandatory: 56 px targets · no free-text input
  anywhere · no prices, no store, no external links · no follower/social surface ·
  large icon-first labels · voice-over on every tile · session cap enforced by
  guardian settings with a friendly wind-down, not a hard cut.
- **[R3]** Calls only to the guardian + trusted circle. The list is not editable by
  the child.

---

## W-20 · Safe Learning — Path Index

```
┌──────────────────────────────────────┐
│ ← Learn                       🔍     │
│                                      │
│  YOUR PATH                           │ [R1]
│  Level 3 · Color Play                │
│  ▓▓▓▓▓▓▓▓░░░░░░  8/14                │
│                                      │
│  ┌──────────────────────────────────┐│
│  │ ✅ 1  Clean Hands, Clean Tools   ││ [R2]
│  │ ✅ 2  Skin First                 ││
│  │ ▶  3  Color Play        8/14     ││
│  │ 🔒 4  Brushes & Blending   Age 8+││
│  │ 🔒 5  Eyes & Definition   Age 10+││
│  │ 🔒 6  Full Face          Age 13+ ││
│  └──────────────────────────────────┘│
│                                      │
│  QUICK SKILLS                        │ [R3]
│  ┌────────┐┌────────┐┌────────┐      │
│  │🖌Brush ││🎨Shade ││🧼Hygiene│      │
│  │ School ││ Match  ││ & Safety│      │
│  └────────┘└────────┘└────────┘      │
│                                      │
│  ◦ Practice Mode — no products needed│ [R4]
└──────────────────────────────────────┘
```

- **[R2]** Lock reason is always shown ("Age 8+", "Bond plan"), never a bare lock.
  Age locks are **not** purchasable — no tier unlocks age-gated content. [!] critical.
- **[R4]** Practice Mode is prominent, not buried: the majority of first sessions
  happen with no makeup in the house.

---

## W-21 · Lesson Player

```
┌──────────────────────────────────────┐
│ ✕                    Blending Edges  │
│                          Step 3 / 7  │ [R1]
│ ┌──────────────────────────────────┐ │
│ │                                  │ │
│ │       ▶ / MIRROR PANE            │ │ [R2]
│ │   (tap to swap demo ⇄ my camera) │ │
│ │                                  │ │
│ │                        ⏱ 0:20    │ │ [R3]
│ └──────────────────────────────────┘ │
│  ○ ○ ● ○ ○ ○ ○                       │ [R4]
│                                      │
│  Small circles, light pressure.      │ [R5]
│  Let the edge disappear — don't      │
│  chase it.                           │
│                                      │
│  🔊 Voice-over        ⓘ Why this way │ [R6]
│                                      │
│  ⚠ GROWN-UP CHECK                    │ [R7]
│  A grown-up should be here for       │
│  this step.        ◦ They're here ✓  │
│                                      │
│ ┌─────────┐  ┌─────────────────────┐ │
│ │◦  Back  │  │ ⬤   Got it — next   │ │ [R8]
│ └─────────┘  └─────────────────────┘ │
└──────────────────────────────────────┘
```

- **[R2]** Mirror = front camera, **processed on-device only**, never uploaded.
  Split-view option (demo left / me right) on tablets and in landscape.
- **[R3]** Timer appears only on wait-steps (setting, drying).
- **[R7]** Renders only when `step.supervision_required = true`. On a child account
  this is a **blocking** state — the step will not advance without the tap.
- **[!]** Persist step index on exit; resuming mid-lesson is the norm, not the edge case.

---

## W-22 · Brush Education

```
┌──────────────────────────────────────┐
│ ← Brush School                       │
│                                      │
│  THE WALL          [Grid ▾] [Mine ▾] │ [R1]
│ ┌────┐┌────┐┌────┐┌────┐             │
│ │ 🖌 ││ 🖌 ││ 🖌 ││ 🖌 │             │
│ │Fluff││Flat││Ang.││Fan │             │ [R2]
│ │ ✅  ││ ✅  ││    ││    │             │
│ └────┘└────┘└────┘└────┘             │
│ ┌────┐┌────┐┌────┐┌────┐             │
│ │Dome││Tap.││Kab.││Spool│            │
│ └────┘└────┘└────┘└────┘             │
│                                      │
│  ▸ tap a brush ─────────────────────┐│
│  ┌──────────────────────────────────┐│
│  │  ANGLED LINER                    ││ [R3]
│  │  ▶ 20 s demo                     ││
│  │  Use for: brows, gel liner       ││
│  │  Bristle: synthetic (wet product)││
│  │  Pressure: ▓▓░░░ light           ││
│  │  Wrong-tool result: harsh, patchy││
│  │  ◦ Add to my kit                 ││
│  └──────────────────────────────────┘│
│                                      │
│  🎮 BRUSH MATCH GAME                 │ [R4]
│  Drag each brush to where it goes.   │
│  Easy · Medium · Pro                 │
│                                      │
│  🧼 CLEANING COACH                   │ [R5]
│  Last cleaned: 9 days ago  ⚠         │
│  ⬤ Start 6-step wash                 │
└──────────────────────────────────────┘
```

- **[R2]** "Mine" filter cross-references the Makeup Bag brush kit.
- **[R4]** Game is the child-mode entry point to this screen; adults land on the wall.
- **[R5]** Cleaning streak feeds a badge. Dry-time reminder = local notification 4 h out.

---

## W-23 · Shade Matching

```
┌──────────────────────────────────────┐
│ ← Shade Match                        │
│                                      │
│  How should we match you?            │
│  ┌──────────────────────────────────┐│
│  │ 📷 Scan my skin      Recommended ││ [R1]
│  └──────────────────────────────────┘│
│  ┌──────────────────────────────────┐│
│  │ 🎚 Pick by eye                   ││
│  └──────────────────────────────────┘│
│  ┌──────────────────────────────────┐│
│  │ 🔁 Match a foundation I own      ││ [R2]
│  └──────────────────────────────────┘│
└──────────────────────────────────────┘

  ▸ SCAN FLOW
┌──────────────────────────────────────┐
│  ┌──────────────────────────────────┐│
│  │      ╭──────────╮                ││
│  │      │  face    │  ← oval guide  ││ [R3]
│  │      │  guide   │                ││
│  │      ╰──────────╯                ││
│  │  ☀ Lighting: GOOD                ││ [R4]
│  │  ↔ Distance: move closer         ││
│  └──────────────────────────────────┘│
│  Face a window. No filters. No makeup││ [R5]
│  on your jaw.                        │
│           ( ◉ )  capture             │
└──────────────────────────────────────┘

  ▸ RESULT
┌──────────────────────────────────────┐
│  YOUR SHADE PROFILE                  │
│  ┌──────────────────────────────────┐│
│  │  ███  Depth 9–10                 ││ [R6]
│  │  Undertone: Warm, slight olive   ││
│  │  Confidence: ▓▓▓▓░ 82%           ││
│  └──────────────────────────────────┘│
│                                      │
│  MATCHES BY BRAND                    │ [R7]
│  ≡ Fenty Pro Filt'r      370  ▓ 94%  │
│  ≡ Rare Beauty Liquid    340W ▓ 91%  │
│  ≡ MAC Studio Fix        NC45 ▓ 88%  │
│  ≡ Huda #FauxFilter      Toffee ▓86% │
│  ≡ Black Opal True Color Hazelnut 85%│
│                                      │
│  ⓘ Undertone shifts with season.     │ [R8]
│    Re-scan every few months.         │
│  ◦ Save to profile   ◦ Add to wishlist│
└──────────────────────────────────────┘
```

- **[R4]** Live quality HUD; capture button is **disabled** until lighting passes.
- **[R6]** Always a **range + confidence**, never a single point.
- **[!]** Low-confidence state (<60%) must say so plainly and offer a re-scan —
  "We can't match you confidently in this light." A wrong shade recommendation is
  worse than no recommendation, and for deep skin tones it is *the* trust-killer.
- **[R7]** Match % from ΔE in CIELAB against the brand shade catalog. Sort by ΔE,
  not by commercial partnership. Affiliate links are labeled.

---

## W-30 · Cultural Beauty Library — Index

```
┌──────────────────────────────────────┐
│ ← Cultural Library            🔍     │
│                                      │
│  Beauty has roots. Learn them.       │ [R1]
│                                      │
│ ┌──────────────────────────────────┐ │
│ │ ▨ BLACK BEAUTY                   │ │
│ │   42 lessons · 9 stories         │ │ [R2]
│ │   Advisor: Dr. A. Coleman ✓      │ │
│ └──────────────────────────────────┘ │
│ ┌──────────────────────────────────┐ │
│ │ ▨ LATINA BEAUTY                  │ │
│ │   38 lessons · 7 stories         │ │
│ └──────────────────────────────────┘ │
│ ┌──────────────────────────────────┐ │
│ │ ▨ MIDDLE EASTERN BEAUTY          │ │
│ └──────────────────────────────────┘ │
│ ┌──────────────────────────────────┐ │
│ │ ▨ ASIAN BEAUTY                   │ │
│ │   E · SE · South                 │ │ [R3]
│ └──────────────────────────────────┘ │
│ ┌──────────────────────────────────┐ │
│ │ ▨ INDIGENOUS BEAUTY              │ │
│ └──────────────────────────────────┘ │
│ ┌──────────────────────────────────┐ │
│ │ ▨ MIXED & MULTIHERITAGE          │ │
│ └──────────────────────────────────┘ │
└──────────────────────────────────────┘
```

- **[R2]** Advisor credit on the **card**, not buried in a detail page. Verified check.
- **[!]** Card art must be photography of real people of that heritage, never
  pattern-only abstraction. Commission it; do not stock-photo this module.

---

## W-31 · Collection Detail

```
┌──────────────────────────────────────┐
│ ←  BLACK BEAUTY                      │
│  ┌──────────────────────────────────┐│
│  │        ▶ collection film          ││ [R1]
│  └──────────────────────────────────┘│
│  [Technique] [Stories] [Palette] [Respect]│ [R2]
│  ─────────────                        │
│  TECHNIQUE                            │
│  ≡ Matching deep shades without ash  ▸│ [R3]
│  ≡ Edge control & baby hair artistry ▸│
│  ≡ Bold lip on deep skin             ▸│
│  ≡ Hyperpigmentation-aware color     ▸│
│  ≡ Ashy-cast troubleshooting         ▸│
│                                       │
│  ▸ Stories tab                        │
│  ┌──────────────────────────────────┐ │
│  │ ◉ Ms. Deborah, 71                │ │ [R4]
│  │ "We used what we had. Then we    │ │
│  │  made what we needed."           │ │
│  │ ▶ 6 min                          │ │
│  └──────────────────────────────────┘ │
│                                       │
│  ▸ Respect tab                        │
│  ┌──────────────────────────────────┐ │
│  │ 🤝 What's shareable, what's not   │ │ [R5]
│  │ Written by our advisors.         │ │
│  └──────────────────────────────────┘ │
└───────────────────────────────────────┘
```

- **[R5]** The Respect tab is **mandatory on every collection** and is never
  paywalled. In Indigenous Beauty it leads with the sacred-vs-shareable module.

---

## W-40 · AI Try-On Studio

```
┌──────────────────────────────────────┐
│ ✕                    Try-On      ⟳   │
│ ┌──────────────────────────────────┐ │
│ │                                  │ │
│ │        LIVE AR PREVIEW           │ │ [R1]
│ │        (or uploaded photo)       │ │
│ │                                  │ │
│ │                                  │ │
│ │  ◐ before/after drag handle      │ │ [R2]
│ └──────────────────────────────────┘ │
│                                      │
│  LAYERS                              │ [R3]
│  ┌────┐┌────┐┌────┐┌────┐┌────┐      │
│  │Lip ││Chk ││Eye ││Brow││Glow│      │
│  │ ●  ││ ●  ││    ││ ●  ││    │      │
│  └────┘└────┘└────┘└────┘└────┘      │
│                                      │
│  ▸ LIP selected                      │
│  ┌──────────────────────────────────┐│
│  │ Fenty Icon Velvet · "MVP"        ││ [R4]
│  │ ⬤⬤⬤⬤⬤⬤⬤⬤  ← shade rail          ││
│  │ Opacity ▓▓▓▓▓▓░░░  Finish: Matte ││
│  └──────────────────────────────────┘│
│                                      │
│  PRESETS                     See all→│ [R5]
│  ┌────┐┌────┐┌────┐┌────┐┌────┐      │
│  │Ever││Soft││Date││Fest││Brid│      │
│  │yday││Glam││Nite││ival││ al │      │
│  └────┘└────┘└────┘└────┘└────┘      │
│  CULTURAL GLAM SETS                  │ [R6]
│  ┌────┐┌────┐┌────┐┌────┐            │
│  │Blk ││Ltx ││ME  ││Asia│            │
│  └────┘└────┘└────┘└────┘            │
│                                      │
│ ┌────────┐┌────────┐┌──────────────┐ │
│ │◦ Save  ││◦ Share ││⬤ Shop this   │ │ [R7]
│ └────────┘└────────┘└──────────────┘ │
└──────────────────────────────────────┘
```

- **[R1]** 30 fps target; degrade to photo mode on low-end devices rather than
  shipping a laggy AR that lands on the wrong face landmark.
- **[R2]** Before/after drag is the trust mechanic — always available.
- **[R4]** Shade rail shows the *real* brand range; out-of-range shades for the user's
  profile are shown but marked "not your match," never hidden.
- **[R7]** Button set is age-dependent: adult = Save/Share/Shop · teen =
  Save/Share/Wishlist · **U13 = Save only**. No commerce, no share, ever.
- **[!]** U13 rendering uses stylized, obviously-playful pigment (sparkle, sticker,
  face-paint) — **never** photoreal cosmetics on a child's face.

---

## W-41 · Try-On Consent Gate {first run}

```
┌──────────────────────────────────────┐
│              📷                       │
│  Before we start                     │
│                                      │
│  • Your photo is processed and then  │ [R1]
│    deleted within 24 hours.          │
│  • We never train our models on      │
│    your pictures.                    │
│  • Nothing is saved unless you tap   │
│    Save.                             │
│  • We change makeup only — never     │ [R2]
│    your face shape or your skin.     │
│                                      │
│  ◦ Read the full policy              │
│  ┌────────────────────────────────┐  │
│  │ ⬤       I understand           │  │
│  └────────────────────────────────┘  │
│  ◦ Not right now                     │
└──────────────────────────────────────┘
```

- **[R2]** This promise is a product commitment, not marketing. Enforced in the
  render pipeline (`ai-tryon.md` §4.6).

---

## W-50 · Live Glam Rooms — Lobby

```
┌──────────────────────────────────────┐
│ ← Glam Rooms                    ＋   │ [R1]
│                                      │
│  YOUR ROOMS                          │
│  ┌──────────────────────────────────┐│
│  │ 👨‍👧 Family Room                   ││ [R2]
│  │ Marcus, Zaria, Auntie Rae        ││
│  │ ⬤ Start                          ││
│  └──────────────────────────────────┘│
│                                      │
│  LIVE LESSONS                        │ [R3]
│  ┌──────────────────────────────────┐│
│  │ 🔴 LIVE · Dad School: Ponytails  ││
│  │ Imani ✓ · 42 watching            ││
│  │ ⬤ Join                           ││
│  └──────────────────────────────────┘│
│  ┌──────────────────────────────────┐│
│  │ ⏰ Sat 4pm · Shade Match Clinic   ││
│  │ ◦ Remind me                      ││
│  └──────────────────────────────────┘│
│                                      │
│  BEST FRIEND GLAM              🔒    │ [R4]
│  ┌──────────────────────────────────┐│
│  │ Approved friends: Maya, Sofia    ││
│  │ ⬤ Invite Maya                    ││
│  └──────────────────────────────────┘│
│                                      │
│  GLOBAL GLAM ROOMS          16+      │ [R5]
│  ┌────────┐┌────────┐┌────────┐      │
│  │🇧🇷 Rio  ││🇳🇬 Lagos││🇰🇷 Seoul│      │
│  │ 12 ppl ││  8 ppl ││ 20 ppl │      │
│  └────────┘└────────┘└────────┘      │
└──────────────────────────────────────┘
```

- **[R4]** Friends list is guardian-approved and **read-only to the teen**;
  adding a friend opens a request to the guardian.
- **[R5]** Absent entirely from U13 and 13–15 accounts. Not greyed — absent.

---

## W-51 · In-Room

```
┌──────────────────────────────────────┐
│ ● LIVE  Family Room       👥3   ⚑    │ [R1]
│ ┌────────────────┐┌────────────────┐ │
│ │                ││                │ │
│ │   ◉ Zaria      ││   ◉ Marcus     │ │ [R2]
│ │   (speaking)   ││                │ │
│ └────────────────┘└────────────────┘ │
│ ┌────────────────┐                   │
│ │   ◉ Auntie Rae │                   │
│ └────────────────┘                   │
│                                      │
│ ┌──────────────────────────────────┐ │
│ │ SHARED GLAM PANEL           ▾    │ │ [R3]
│ │ Look: "Soft Glam"                │ │
│ │ Step 2/5 — Blush on the apples   │ │
│ │ ▓▓▓▓░░░░░░                       │ │
│ │ ⬤⬤⬤⬤ shades   ◦ Everyone try it  │ │ [R4]
│ └──────────────────────────────────┘ │
│                                      │
│  🎥   🎤   ✨    💬    😊    ⏹        │ [R5]
│  cam  mic tryon chat react  end      │
│                                      │
│  ⚑ GET HELP                          │ [R6]
└──────────────────────────────────────┘
```

- **[R2]** Active-speaker border in Rose Gold. Grid: 2×2 up to 4, then paginated
  6-up with the active speaker pinned.
- **[R3]** Shared Glam Panel state syncs to all participants over the room data
  channel; host controls step advance, anyone can "try it" locally.
- **[R5]** `💬 chat` is **absent** for U13 accounts — the control does not render.
  Reactions (emoji burst) remain available as the child-safe expression channel.
- **[R6]** Panic button: always visible, one tap → immediately leaves the room,
  freezes the room for staff review, notifies guardian. **No confirmation dialog** —
  a child in trouble should not face an "Are you sure?"

---

## W-60 · Dad + Daughter Bonding

```
┌──────────────────────────────────────┐
│ ← Our Bond                           │
│      ╭────────╮                      │
│      │  68%   │  LEVEL 2             │ [R1]
│      │ ▓▓▓▓▓░ │  "Blending Buddies"  │
│      ╰────────╯                      │
│                                      │
│  THIS WEEK'S MISSIONS          2/3   │ [R2]
│  ┌──────────────────────────────────┐│
│  │ ✅ Dad picks her lip color —     ││
│  │    and has to name it.           ││
│  │    ✓ Marcus  ✓ Zaria             ││ [R3]
│  ├──────────────────────────────────┤│
│  │ ✅ She teaches him one brush.    ││
│  ├──────────────────────────────────┤│
│  │ ○  Match your looks for          ││
│  │    pizza night.                  ││
│  │    ✓ Zaria  ○ Marcus  ← waiting  ││
│  └──────────────────────────────────┘│
│                                      │
│  DAD SCHOOL                    60 s  │ [R4]
│  ┌────────┐┌────────┐┌────────┐      │
│  │▶Puff   ││▶What   ││▶How to │      │
│  │ Pony   ││ "blend"││ compli-│      │
│  │        ││ means  ││ ment   │      │
│  └────────┘└────────┘└────────┘      │
│                                      │
│  COMPLIMENT CARDS                    │ [R5]
│  ┌──────────────────────────────────┐│
│  │ "I liked how ___ you were when   ││
│  │  you ___."                       ││
│  │  ◦ Send to Zaria                 ││
│  └──────────────────────────────────┘│
│                                      │
│  ⬤ Plan a Date Night Look            │ [R6]
└──────────────────────────────────────┘
```

- **[R3]** Dual-confirm is the whole mechanic — one person cannot complete a bond
  mission alone. Pending state shows *who* the app is waiting on, gently.
- **[R5]** Card templates are structured to force **effort/character praise over
  appearance praise**. This is a deliberate psychological design choice; do not
  "simplify" it into a free-text box.

---

## W-70 · Mom's Legacy

```
┌──────────────────────────────────────┐
│ ← Legacy                             │
│                                      │
│  ┌──────────────────────────────────┐│
│  │  ◉  Denise                       ││ [R1]
│  │     1979 – 2019                  ││
│  │     "Lipstick before shoes."     ││
│  └──────────────────────────────────┘│
│                                      │
│  HER SIGNATURE LOOK                  │ [R2]
│  ┌──────────────────────────────────┐│
│  │  [her photo]   →   ✨ try it on   ││
│  │  Red lip · winged liner · gold   ││
│  └──────────────────────────────────┘│
│                                      │
│  THE VAULT                    24 items│ [R3]
│  ┌────┐┌────┐┌────┐┌────┐            │
│  │🎙  ││📷  ││📝  ││💄  │            │
│  │voice││photo││recipe││shades│       │
│  └────┘└────┘└────┘└────┘            │
│  ◦ Add something of hers             │
│                                      │
│  LETTERS FORWARD                     │ [R4]
│  ┌──────────────────────────────────┐│
│  │ 🔒 For your 13th birthday        ││
│  │    opens Mar 4, 2027             ││
│  ├──────────────────────────────────┤│
│  │ ✉️ First day of high school      ││
│  └──────────────────────────────────┘│
│                                      │
│  HEALING JOURNAL              🔐     │ [R5]
│  ┌──────────────────────────────────┐│
│  │ "What would she have said today?"││
│  │ ◦ Write     ◦ Just sit with it   ││
│  └──────────────────────────────────┘│
│                                      │
│  ────────────────────────────────────│
│  💬 Talk to someone                  │ [R6]
└──────────────────────────────────────┘
```

- **[!]** No streaks, no confetti, no badges anywhere in this module. Entry transition
  is a 400 ms fade, not a bounce. Palette shifts to the warm Legacy set.
- **[R4]** Letters are encrypted at rest and **delivered regardless of subscription
  state**. A lapsed card must never withhold a dead parent's message.
- **[R5]** Journal is private by default — invisible to guardians for 13+ profiles.
  "Just sit with it" logs presence without requiring words.
- **[R6]** Persistent, region-aware helpline entry. Always visible in this module.

---

## W-80 · My Makeup Bag

```
┌──────────────────────────────────────┐
│ ← My Bag              ＋  [Grid ▾]   │
│  [Products][Brushes][Wishlist][Shades]│ [R1]
│  ──────────                           │
│  ┌────────┐┌────────┐┌────────┐      │
│  │ ▢      ││ ▢      ││ ▢      │      │ [R2]
│  │Fenty   ││Rare    ││MAC     │      │
│  │Filt'r  ││Soft    ││Ruby Woo│      │
│  │370     ││Pinch   ││        │      │
│  │        ││⚠ 2 mo  ││        │      │ [R3]
│  └────────┘└────────┘└────────┘      │
│                                      │
│  ▸ tap ────────────────────────────  │
│  ┌──────────────────────────────────┐│
│  │ Rare Beauty Soft Pinch           ││
│  │ Shade: Happy · Opened: Jun 2025  ││ [R4]
│  │ ⚠ Replace in ~2 months           ││
│  │ ✅ Matches your profile (91%)     ││
│  │ ⚠ Contains: fragrance            ││ [R5]
│  │ ◦ Try it on   ◦ Remove           ││
│  └──────────────────────────────────┘│
│                                      │
│  BRAND SHELF                         │ [R6]
│  Fenty · Rare · Huda · MAC · NARS ·  │
│  Black Opal · Juvia's · Pat McGrath ·│
│  Mented · Danessa Myricks · e.l.f. …  │
└──────────────────────────────────────┘
```

- **[R3]** Expiry chip: mascara 3 mo · liquid liner 3 mo · foundation 12 mo ·
  powder 24 mo, from `opened_on`. Hygiene, not upsell — copy stays practical.
- **[R5]** Ingredient caution cross-references the profile's declared sensitivities.
- **[R6]** Brand shelf = catalog integration, not endorsement. Affiliate links carry
  a visible disclosure chip. **No skin-lightening products in the catalog** — blocked
  at ingest.

---

## W-90 · Profile & Progress

```
┌──────────────────────────────────────┐
│ ← Profile                      ⚙     │
│         ◉                            │
│      Zaria, 9                        │ [R1]
│      Level 2 · Apprentice            │
│      🔥 7-day streak  (2 passes left)│ [R2]
│                                      │
│  SKILL TREE                          │ [R3]
│   Hygiene ●───● Skin ●───○ Color     │
│              │                       │
│           Brushes ○                  │
│                                      │
│  BADGES                        6/24  │ [R4]
│  🖌 🧼 🎨 🌍 👨‍👧 💛 ▢ ▢ ▢ ▢          │
│                                      │
│  MY SHADE PROFILE                    │ [R5]
│  ┌──────────────────────────────────┐│
│  │ ███ Depth 9–10 · Warm/olive      ││
│  │ ◦ Share card   ◦ Re-scan         ││
│  └──────────────────────────────────┘│
│                                      │
│  MEMORY GALLERY               128 →  │ [R6]
│  ┌────┐┌────┐┌────┐┌────┐            │
│  └────┘└────┘└────┘└────┘            │
└──────────────────────────────────────┘
```

- **[R2]** Two free streak "passes" per month, auto-applied silently. Streaks must
  never become an anxiety mechanic for a 9-year-old.
- **[R5]** "Share card" hidden entirely on U13 profiles.

---

## W-91 · Memory Gallery

```
┌──────────────────────────────────────┐
│ ← Memories        [Year ▾][Person ▾] │
│                                      │
│  AUGUST 2025                         │ [R1]
│  ┌────────┐┌────────┐┌────────┐      │
│  │        ││        ││        │      │
│  │ before ││  glam  ││  room  │      │ [R2]
│  │ /after ││  look  ││  recap │      │
│  └────────┘└────────┘└────────┘      │
│                                      │
│  JULY 2025                           │
│  ┌────────┐┌────────┐                │
│  └────────┘└────────┘                │
│                                      │
│  ┌──────────────────────────────────┐│
│  │ 📖 Make a Bond Book              ││ [R3]
│  │ A printed keepsake of your year. ││
│  │ ⬤ Create (1 of 1 left this year) ││
│  └──────────────────────────────────┘│
└──────────────────────────────────────┘
```

- **[R2]** Room recaps are **stills only**, generated only with all-party consent.
- **[R3]** Bond Book = PDF + print-on-demand. The annual-renewal anchor.
- **[!]** Delete = real delete: source, derived thumbs, recap frames, CDN purge ≤24 h.

---

## W-A0 · Settings & Safety — Guardian Console

```
┌──────────────────────────────────────┐
│ ← Guardian Console                   │
│                                      │
│  MY KIDS                             │ [R1]
│  ┌──────────────────────────────────┐│
│  │ ◉ Zaria, 9         Child account ││
│  │ ◉ Nia, 15          Teen account  ││
│  └──────────────────────────────────┘│
│                                      │
│  ▸ Zaria's permissions               │ [R2]
│  Camera & try-on              [ ON ] │
│  Family Room video            [ ON ] │
│  Live lessons (creator-led)   [ OFF] │
│  Best Friend Glam             [ 🔒 ] │
│  Global rooms                 [ 🔒 ] │
│  Purchases                    [ 🔒 ] │ [R3]
│  Notifications                [ ON ] │
│                                      │
│  SCREEN TIME                         │ [R4]
│  Daily limit    45 min  ▓▓▓▓▓░░      │
│  Bedtime        8:30 pm – 7:00 am    │
│                                      │
│  ACTIVITY                            │ [R5]
│  ≡ Joined Family Room      Tue 6:12p │
│  ≡ Finished "Skin First"   Tue 6:20p │
│  ≡ Friend request: Maya    ⚠ Approve │
│                                      │
│  ┌──────────────────────────────────┐│
│  │ ◦ Export Zaria's data            ││ [R6]
│  │ ◦ Delete Zaria's account         ││
│  └──────────────────────────────────┘│
└──────────────────────────────────────┘
```

- **[R3]** Purchases are **hard-locked** on child accounts — not a toggle, a lock.
- **[R4]** Limit reached = friendly wind-down screen ("Time to put the brushes down.
  See you tomorrow ✨"), never an abrupt kill.
- **[R6]** Export and delete are always free, at every tier, in every region.

---

## W-A1 · Settings — Main

```
┌──────────────────────────────────────┐
│ ← Settings                           │
│  ACCOUNT                             │
│  ≡ Profile & photo                  ▸│
│  ≡ Mode                             ▸│
│  ≡ Skin & shade profile             ▸│
│  SAFETY                              │
│  ≡ Guardian Console                 ▸│ [R1]
│  ≡ Blocked accounts                 ▸│
│  ≡ Report history                   ▸│
│  PRIVACY                             │
│  ≡ Camera, photos, mic              ▸│
│  ≡ Download my data                 ▸│
│  ≡ Delete my account                ▸│
│  BILLING                             │
│  ≡ Plan: Bond · $6.99/mo            ▸│ [R2]
│  ≡ Manage billing (Stripe portal)   ▸│
│  ≡ Restore purchases                ▸│
│  APP                                 │
│  ≡ Language / Region                ▸│
│  ≡ Remembrance Mode         [ OFF ] ▸│ [R3]
│  ≡ Reduce motion            [ OFF ] ▸│
│  ≡ Text size                        ▸│
│  ≡ Help & support                   ▸│
└──────────────────────────────────────┘
```

- **[R3]** Remembrance Mode is a top-level setting, not buried in Legacy: mutes
  Mother's Day / Father's Day campaigns, removes streak pressure, softens palette.

---

## W-B0 · Plan Selection (Stripe entry)

```
┌──────────────────────────────────────┐
│ ✕                                    │
│  Choose your bond.                   │ [R1]
│  [ Monthly ] [ Yearly — save 30% ]   │ [R2]
│  ┌──────────────────────────────────┐│
│  │ FREE                     Free ││
│  │ Levels 1–2 · 1 culture · 5 try-  ││ [R3]
│  │ ons/mo · 20 min rooms            ││
│  │ ◦ Current plan                   ││
│  ├──────────────────────────────────┤│
│  │ BOND              $6.99/mo  ★POPULAR│
│  │ All levels · All cultures ·      ││
│  │ Unlimited try-on · 5 h rooms ·   ││
│  │ 3 kids                           ││
│  │ ⬤ Choose Bond                    ││
│  ├──────────────────────────────────┤│
│  │ LEGACY           $12.99/mo       ││
│  │ Everything in Bond + unlimited   ││
│  │ vault · Letters Forward ·        ││
│  │ unlimited rooms · 6 kids ·       ││
│  │ 4 Bond Books                     ││
│  │ ⬤ Choose Legacy                  ││
│  ├──────────────────────────────────┤│
│  │ STUDIO           $24.99/mo       ││
│  │ For creators & pros              ││
│  └──────────────────────────────────┘│
│                                      │
│  🛈 Safety features are free, always. │ [R4]
│  Cancel anytime. ◦ Restore purchases │
└──────────────────────────────────────┘
```

- **[R4]** This line is permanent and non-negotiable. Guardian controls, panic
  button, data export, and hygiene lessons never sit behind a paywall.
- **[!]** No countdown timers, no fake scarcity, no dark patterns. Cancel is one tap
  from the billing portal.

---

## W-B1 · Checkout & Result

```
  ▸ CHECKOUT (Stripe-hosted or PaymentSheet)
┌──────────────────────────────────────┐
│ ← Bond · $6.99/mo                    │
│  ┌──────────────────────────────────┐│
│  │  💳 Card                          ││
│  │  🍎 Apple Pay  /  G Pay          ││ [R1]
│  └──────────────────────────────────┘│
│  Total today          $6.99          │
│  Then $6.99 monthly. Cancel anytime. │ [R2]
│  ⬤ Subscribe                          │
└──────────────────────────────────────┘

  ▸ SUCCESS
┌──────────────────────────────────────┐
│            ✨                         │
│  You're in.                          │
│  Everything's unlocked.              │ [R3]
│  ⬤ Start Today's Bond                │
└──────────────────────────────────────┘

  ▸ PENDING {webhook not yet received}
┌──────────────────────────────────────┐
│  Finishing up…  ⏳                    │ [R4]
│  This can take a few seconds.        │
└──────────────────────────────────────┘

  ▸ FAILED
┌──────────────────────────────────────┐
│  That card didn't go through.        │ [R5]
│  Nothing was charged.                │
│  ◦ Try another card  ◦ Not now       │
└──────────────────────────────────────┘
```

- **[R4]** **Critical:** entitlement is granted by the *webhook*, never by the client
  returning to a success URL. This screen covers the gap. See
  `stripe-flow.md` §3.5.
- **[R5]** Never blame the user; never say "declined" without "nothing was charged."

---

## W-C0 · Global States (apply everywhere)

```
 OFFLINE          EMPTY              ERROR            LOADING
┌────────────┐  ┌────────────┐   ┌────────────┐  ┌────────────┐
│ 📴          │  │ ✨          │   │ 🌧          │  │ ░░░░░░     │
│ You're off │  │ Nothing here│   │ Our side,  │  │ ░░░░       │
│ line.      │  │ yet.        │   │ not yours. │  │ ░░░░░░░    │
│ Downloaded │  │ Here's a    │   │ ◦ Try again│  │ (skeleton) │
│ lessons    │  │ place to    │   │            │  │            │
│ still work.│  │ start ⬤     │   │            │  │            │
└────────────┘  └────────────┘   └────────────┘  └────────────┘
```

- Empty states **always** carry a CTA. Error states **always** take the blame.
- Loading = skeletons matching final layout, never a centered spinner on a blank page.

---

## W-C1 · Accessibility Requirements (binding on all screens)

| Requirement | Spec |
|---|---|
| Contrast | 4.5:1 body, 3:1 large text — verified against **both** themes |
| Tap target | 44 px min; 56 px in child accounts |
| Dynamic type | Support to 200%; no clipped layouts, no fixed-height text rows |
| Screen reader | Every control labeled; decorative art `aria-hidden` |
| Reduced motion | All hero loops → static; transitions → fades |
| Captions | Every lesson and story video captioned, in all supported languages |
| Color independence | Shade info never conveyed by color alone — always paired with depth number + undertone label |
| One-handed reach | Primary CTAs in the bottom third |

---

*Continue to `stripe-flow.md`.*
