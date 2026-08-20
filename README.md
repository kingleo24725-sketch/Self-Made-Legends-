# Beauty Bond™ — Dad + Daughter Beauty Bond

> **BEAUTY BOND™ — A SELF-MADE LEGENDS LLC (SML) PRODUCT**
> © 2026 **Self-Made Legends LLC (SML)**. All rights reserved.
> Owner: **Self-Made Legends LLC (SML)** · Proprietary and confidential.
> A standalone SML product — **not** part of The Self-Made Legends Come Up.

Full IP, trademark, and attribution requirements: [`NOTICE.md`](NOTICE.md).

---

## ⚠️ This is a SEPARATE product from The Self-Made Legends Come Up

Read this before touching anything in this directory.

**Beauty Bond is its own standalone app.** It is *not* a feature, mode, mini-game,
expansion, or module of **The Self-Made Legends Come Up** (the AI trading game that
lives in the root of this repository). The two products share one thing and one thing
only: **the same parent company, Self-Made Legends LLC.**

| | The Self-Made Legends Come Up | Beauty Bond |
|---|---|---|
| **Category** | Simulated trading game | Family bonding & beauty education |
| **Audience** | Adult gamers / traders | Parents + children, families |
| **Core loop** | Trade, compete, climb the leaderboard | Learn a skill together, build the bond |
| **Currency** | SML Bucks (virtual) | None — no in-app currency at all |
| **Stack** | Node/Express + SQLite, web | React Native + Postgres, mobile-first |
| **Accounts** | Standalone player accounts | Guardian-linked family accounts |
| **Regulatory posture** | Adult game | COPPA / GDPR-K child-safety regime |
| **Owner** | Self-Made Legends LLC | Self-Made Legends LLC |

### Hard separation rules

1. **No shared codebase.** Beauty Bond ships from its own repository and its own
   pipeline. This directory holds the specification only.
2. **No shared accounts, database, or user records.** A Come Up player is not a
   Beauty Bond user. There is no SSO between them, no account linking, no shared
   identity service.
3. **No shared currency or economy.** SML Bucks, loot boxes, leaderboards, racing,
   pets, heists, and every other Come Up game system are **absent** from Beauty Bond.
   Beauty Bond has no virtual currency and no gambling-adjacent mechanic of any kind —
   it cannot, because it serves minors.
4. **No shared branding beyond the SML corporate mark.** Beauty Bond has its own
   name, logo, palette, typography, and voice (see `07-branding.md`). It is presented
   as "Beauty Bond, from Self-Made Legends," never as "SML Come Up: Beauty Edition."
5. **No cross-promotion into the child experience.** A simulated trading game must
   never be advertised to a 9-year-old inside a child-safe app. Corporate-level
   cross-promotion is permitted only on adult-facing surfaces (the marketing site,
   adult account settings), never in-app to a minor.

> **Why this matters practically:** Beauty Bond operates under COPPA and GDPR-K.
> Entangling it with an adult game economy would contaminate its compliance posture,
> its data model, and its App Store age rating. The separation is a legal requirement,
> not a preference.

---

## Why the spec lives in this repository

This directory is the delivery location for the Beauty Bond specification on the
`claude/beauty-bond-app-rebuild-u0c50c` branch. It is documentation only — there is no
Beauty Bond application code here, and none should be added.

**Recommended next step:** move `beauty-bond/` into a dedicated
`self-made-legends/beauty-bond` repository before implementation begins, so the two
products never share a build, a dependency tree, or a deploy. The spec is written to be
lifted wholesale — nothing in it references Come Up code.

---

## Ownership & IP

All content in this directory — product concept, feature design, wireframes,
architecture, data models, API contracts, brand system, naming, and copy — is the
exclusive property of **Self-Made Legends LLC**.

- **Product:** Beauty Bond™ (working title "Dad + Daughter Beauty Bond")
- **Owner:** Self-Made Legends LLC
- **Status:** Proprietary — internal specification, not for public distribution
- **Trademarks to file:** `BEAUTY BOND`, `BOND METER`, `DAD SCHOOL`,
  `LITTLE LEGEND`, `LETTERS FORWARD`, `BOND BOOK`
- **Third-party marks** (Fenty Beauty, Rare Beauty, Huda Beauty, MAC, NARS, and all
  other brands referenced) belong to their respective owners and appear here only as
  catalog-integration targets. No affiliation or endorsement is implied or claimed.

Every document in this set carries the SML ownership header. Any generated
artifact — app binary, marketing site, PDF export, Bond Book, press kit — must carry
"A Self-Made Legends LLC product" and the current copyright line.

---

## Document set

| # | Document | Contents |
|---|---|---|
| 01 | [`01-app-blueprint.md`](01-app-blueprint.md) | Product definition, personas, account types, full IA tree, 13 module specs, safety architecture, monetization gates, out-of-scope guardrails |
| 02 | [`02-wireframes.md`](02-wireframes.md) | 25 labeled screen wireframes with designer annotations, global states, accessibility requirements |
| 03 | [`03-stripe-subscriptions.md`](03-stripe-subscriptions.md) | Four tiers, entitlement matrix, checkout flows, webhook handlers, access control, lifecycle rules |
| 04 | [`04-ai-tryon.md`](04-ai-tryon.md) | Upload flow, ML pipeline, API contracts, glam presets, cultural glam sets, minor-safety rendering rules |
| 05 | [`05-live-video-rooms.md`](05-live-video-rooms.md) | Room creation, token generation, video tiles, shared glam panel, moderation, all four room types |
| 06 | [`06-development-plan.md`](06-development-plan.md) | Stack, repo structure, database schema, full API surface, environment, delivery phases |
| 07 | [`07-branding.md`](07-branding.md) | Palette, typography, logo concepts, UI style, design tokens, emotional tone, voice guide |

Read them in order. `01` establishes vocabulary the rest depend on.

---

## The one-line pitch

> Beauty Bond is a guided beauty studio where a parent and child learn shades,
> brushes, and technique together — inclusive of every skin tone, texture, and
> culture — with child safety designed in, not bolted on.
>
> **From Self-Made Legends LLC.**
