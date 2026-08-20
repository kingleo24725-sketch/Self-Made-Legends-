# Dad + Daughter Beauty Bond™

> **DAD + DAUGHTER BEAUTY BOND™ — A SELF-MADE LEGENDS LLC (SML) PRODUCT**
> © 2026 **Self-Made Legends LLC (SML)**. All rights reserved.
> Owner: **Self-Made Legends LLC (SML)** · Proprietary and confidential.
> A standalone SML product — **not** part of The Self-Made Legends Come Up.

Full IP, trademark, and attribution requirements: [`NOTICE.md`](NOTICE.md).

---

## ⚠️ This is a SEPARATE product from The Self-Made Legends Come Up

Read this before touching anything in this repository.

**Dad + Daughter Beauty Bond is its own standalone app.** It is *not* a feature, mode, mini-game,
expansion, or module of **The Self-Made Legends Come Up** (SML's AI trading game,
which lives in its own separate repository). The two products share exactly two
things: **the parent company, Self-Made Legends LLC, and one Stripe account.**

| | The Self-Made Legends Come Up | Beauty Bond |
|---|---|---|
| **Category** | Simulated trading game | Family bonding & beauty education |
| **Audience** | Adult gamers / traders | Parents + children, families |
| **Core loop** | Trade, compete, climb the leaderboard | Learn a skill together, build the bond |
| **Currency** | SML Bucks (virtual) | None — no in-app currency at all |
| **Stack** | Node/Express + SQLite, web | React Native + Postgres, mobile-first |
| **Repository** | `Self-Made-Legends-` | `beauty-bond` (separate) |
| **Stripe** | Shared SML account | **Shared SML account** (code-isolated) |
| **Accounts** | Standalone player accounts | Guardian-linked family accounts |
| **Regulatory posture** | Adult game | COPPA / GDPR-K child-safety regime |
| **Owner** | Self-Made Legends LLC | Self-Made Legends LLC |

### Hard separation rules

1. **No shared codebase.** Beauty Bond ships from **its own repository**
   (`beauty-bond`) with its own pipeline, dependency tree, deploy, and database.
   No Come Up code belongs here; no Beauty Bond code belongs there.
2. **No shared accounts, database, or user records.** A Come Up player is not a
   Beauty Bond user. There is no SSO between them, no account linking, no shared
   identity service.

   **Exception — billing:** the two products **do** share one SML Stripe account, by
   owner decision, so there is a single payout and dashboard. Because Stripe delivers
   every event to every endpoint on an account, isolation there is enforced in code:
   namespaced object metadata, a separate Stripe Customer per product, a webhook
   ownership gate that fails closed, and separate restricted API keys. A shared Stripe
   account must never become shared *entitlements*. See
   [`docs/stripe-flow.md`](docs/stripe-flow.md) §3.2 — read it before
   writing any billing code.
3. **No shared currency or economy.** SML Bucks, loot boxes, leaderboards, racing,
   pets, heists, and every other Come Up game system are **absent** from Beauty Bond.
   Beauty Bond has no virtual currency and no gambling-adjacent mechanic of any kind —
   it cannot, because it serves minors.
4. **No shared branding beyond the SML corporate mark.** Beauty Bond has its own
   name, logo, palette, typography, and voice (see `docs/branding.md`). It is presented
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

## Repository layout

```
beauty-bond/
├── app/                 React Native frontend (Expo)
│   ├── screens/         21 screens
│   ├── components/      Buttons/ Cards/ Modals/ VideoTiles/
│   ├── hooks/           useAuth, useSubscription, useTryOn, useRoom, useGlamPanel
│   ├── context/         Auth, Subscription, Theme
│   ├── navigation/      AppNavigator (age-aware tab set)
│   ├── native/          BBTryOnKit bridge (on-device try-on)
│   ├── styles/          colors, typography, spacing, theme
│   ├── utils/           api, validators, constants, config
│   └── App.js
├── backend/             Node.js API (Express)
│   ├── src/
│   │   ├── api/         auth/ tryon/ video/ stripe/ users/
│   │   ├── services/    aiService, videoService, stripeService,
│   │   │                userService, roomSafety, entitlements
│   │   ├── middleware/  auth, requireAgeBand, requireEntitlement, rateLimit
│   │   ├── models/      User, Profile, Subscription, Memory, GlamSet, Room
│   │   ├── config/      env, db, migrations/
│   │   └── server.js
│   └── tests/safety/    release-blocking safety suite
├── infra/               docker/ k8s/ terraform/ ci-cd/
├── docs/                the full specification (read these first)
├── .env.example
├── LICENSE              SML proprietary
└── NOTICE.md            ownership, trademarks, attribution
```

## Setup

### Prerequisites

Node 22+, PostgreSQL 16+, and an Expo dev client (Expo Go cannot load the
on-device try-on native module).

### 1. Backend

```bash
cd backend
cp ../.env.example ../.env        # then fill in the values below
npm install
createdb beauty_bond              # or point DATABASE_URL at an existing one
npm run migrate                   # 43 tables, safety constraints, RLS policies
npm run test:safety               # release blocker — must pass
npm run dev                       # http://localhost:4000
```

Verify it came up:

```bash
curl localhost:4000/health
# {"ok":true,"product":"beauty-bond"}
```

**Minimum env to boot locally** — everything else can stay blank:

```bash
DATABASE_URL=postgres://postgres@localhost:5432/beauty_bond
JWT_SECRET=any-long-random-string
REFRESH_SECRET=another-long-random-string
ML_PROVIDER=mock                  # runs the full try-on pipeline with no ML service
```

Stripe and LiveKit keys are only needed for billing and video. Without them the
rest of the API works; those routes will error.

### 2. App

```bash
cd app
npm install
npx expo start --dev-client
```

Point the app at your backend via `app.json` → `expo.extra.apiBaseUrl`
(default `http://localhost:4000/api`).

### 3. Try it end to end

```bash
# Register
curl -X POST localhost:4000/api/auth/register -H 'Content-Type: application/json' \
  -d '{"email":"you@example.com","password":"a-strong-passphrase","birthDate":"1990-01-01"}'

# Use the accessToken from that response
curl -X POST localhost:4000/api/tryon -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"image":{"base64":"data:image/png;base64,iVBORw0KGgo="},
       "look":{"id":"soft_glam","layers":[{"type":"lip","opacity":0.8}]}}'
# -> { "processedImageUrl": "...", "safety": { "cosmeticsOnly": true } }
```

### Tests

```bash
cd backend
npm run test:safety   # release blocker: geometry lock, canJoin matrix, gate order
npm run test:e2e      # end-to-end against a real Postgres
npx jest --coverage   # everything
```

## API

| Group | Endpoints |
|---|---|
| **Auth** `/api/auth` | `POST /register` · `POST /login` · `GET /me` · `POST /refresh` · `POST /logout` |
| **Stripe** `/api/stripe` | `GET /plans` · `POST /customer` · `POST /subscription` · `GET /subscription` · `POST /subscription/cancel` · `POST /portal` |
| **Try-On** `/api/tryon` | `POST /` (base64 → `processedImageUrl`) · `POST /upload-url` · `GET /presets` · `POST /shade` |
| **Video** `/api/video` | `POST /token` · `GET|POST /rooms` · `GET|POST /rooms/:id/glam` · `POST /rooms/:id/panic` · `POST /rooms/:id/report` · `POST /rooms/:id/eject/:profileId` |
| **Users** `/api` | `GET /me/entitlements` · `PATCH /profiles/:id` · `POST /guardian/*` · `GET /privacy/export` · `DELETE /privacy/account` |
| **Webhooks** `/api/webhooks` | `POST /stripe` (raw body, signature-verified, product-scoped) |

## Plans

| Plan | Price | Adds |
|---|---|---|
| **Free** | $0 | Levels 1–2, one cultural collection, 5 try-ons/mo, 20 min rooms |
| **Basic** | $6.99/mo | All lessons and cultures, unlimited try-on, glam sets, 5 h rooms |
| **Premium** | $12.99/mo | Legacy Vault, **Letters Forward**, unlimited rooms, 4 kids |
| **Family** | $19.99/mo | 6 kids, unlimited Bond Books, creator tools |

Safety features, guardian controls, data export, and delivery of already-recorded
Letters Forward are **free on every plan and never lapse**.

## Stack

| Layer | Choice | Why (full reasoning in [`docs/architecture-decisions.md`](docs/architecture-decisions.md)) |
|---|---|---|
| Frontend | **React Native + Expo** | One codebase; dev client for the on-device try-on native module |
| Backend | **Node.js + Express** | Conventional layout; explicit middleware ordering, which is load-bearing here |
| Database | **PostgreSQL** | Safety questions are joins; CHECK constraints and RLS enforce child-safety invariants the app layer could otherwise break |
| Auth | **JWT** (15 min access + rotating refresh) | Mobile-first; token carries the *active profile*, driving every age and entitlement gate |
| Payments | **Stripe** subscriptions | Shared SML account, isolated in code — see `docs/stripe-flow.md` §3.2 |
| Video | **LiveKit** | Server-side per-track egress control makes minor-exclusion structural, not a policy promise |
| AI Try-On | Provider abstraction, **mock by default** | Real structure and contract; mock is refused in production |

## Read before you write code

| If you're touching… | Read first |
|---|---|
| **Anything billing** | [`docs/stripe-flow.md`](docs/stripe-flow.md) **§3.2** — the SML Stripe account is shared with the Come Up game; isolation is enforced in code |
| **Try-on / rendering** | [`docs/ai-tryon.md`](docs/ai-tryon.md) §4.6 — cosmetics only, geometry lock, minors render on-device |
| **Rooms / video** | [`docs/video-rooms.md`](docs/video-rooms.md) §5.1–5.3 — the `canJoin()` matrix |
| **Any new route** | [`docs/api-reference.md`](docs/api-reference.md) §6.6 — the age gate always precedes the entitlement gate |
| **Any UI** | [`docs/branding.md`](docs/branding.md) + [`docs/wireframes.md`](docs/wireframes.md) — tokens only, no hardcoded hex |

## Specification

| Document | Contents |
|---|---|
| [`docs/architecture.md`](docs/architecture.md) | Product definition, personas, account types, IA tree, 13 module specs, safety architecture, out-of-scope guardrails |
| [`docs/wireframes.md`](docs/wireframes.md) | 25 labeled screens with designer annotations, global states, accessibility requirements |
| [`docs/stripe-flow.md`](docs/stripe-flow.md) | Tiers, entitlements, shared-account isolation, checkout, webhooks, lifecycle |
| [`docs/ai-tryon.md`](docs/ai-tryon.md) | Rendering pipeline, API contracts, shade resolution, cultural glam sets, fairness gates |
| [`docs/video-rooms.md`](docs/video-rooms.md) | Room types, join authorization, tokens, tiles, Shared Glam Panel, moderation |
| [`docs/api-reference.md`](docs/api-reference.md) | Stack, database schema, full API surface, environment, delivery phases |
| [`docs/branding.md`](docs/branding.md) | Palette, typography, logo concepts, UI style, design tokens, voice guide |
| [`docs/architecture-decisions.md`](docs/architecture-decisions.md) | ADRs — why Postgres, JWT, LiveKit, Express, and the mock ML provider; what was rejected and why |

## Safety suite (release blocker)

`npm run test:safety` in `backend/` covers:

- Try-on renders cosmetics only — geometry and skin-tone layers are rejected
- Child accounts get stylized, low-opacity pigment and never server-render
- The `canJoin()` matrix — age floors, guardian permission, no U13 with
  untrusted adults, no 1:1 adult/minor, friendship approval, suspensions
- Stripe webhook ownership gate — Come Up events rejected, fails closed
- Age gates return 403 and never 402: age locks are not purchasable
- Safety, guardian tools, data export, and letter delivery are never gated

A failure here cannot be waived by a product decision. Only fixing the defect
clears it.

## The one-line pitch

> **Dad + Daughter Beauty Bond™** is a guided beauty studio where a parent and
> child learn shades, brushes, and technique together — inclusive of every skin
> tone, texture, and culture — with child safety designed in, not bolted on.
>
> **From Self-Made Legends LLC (SML).**
