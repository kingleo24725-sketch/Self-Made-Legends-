# 06 — Development Plan

> **BEAUTY BOND™ — A SELF-MADE LEGENDS LLC (SML) PRODUCT**
> © 2026 **Self-Made Legends LLC (SML)**. All rights reserved.
> Owner: **Self-Made Legends LLC (SML)** · Proprietary and confidential.
> A standalone SML product — **not** part of The Self-Made Legends Come Up.
> Beauty Bond ships from **its own repository, pipeline, database, and cloud
> account**. It shares no infrastructure with any other SML product.

---

## 6.1 Frontend Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | **React Native 0.76** + Expo (dev client) | One codebase, native modules where needed |
| Language | TypeScript 5.6, `strict: true` | |
| Navigation | React Navigation 7 (native stack + tabs) | |
| State — server | TanStack Query v5 | Cache, retry, offline, background refetch |
| State — client | Zustand | Small, no boilerplate |
| Styling | Unistyles + design tokens (`07-branding.md`) | Themeable, RTL-aware |
| Graphics | **React Native Skia** | Try-on compositing, Bond Meter ring, gradients |
| Camera | `react-native-vision-camera` v4 + frame processors | Real-time ML on frames |
| On-device ML | CoreML (iOS) / NNAPI + MLKit (Android) via a custom `BBTryOnKit` module | 30 fps try-on |
| Video | `@livekit/react-native` | Glam Rooms |
| Payments | `@stripe/stripe-react-native` + **StoreKit 2 / Play Billing** | Store compliance (`03` §3.3) |
| Media | `expo-image` (caching), `react-native-video` | Lessons offline |
| Storage | MMKV (prefs), SQLite/op-sqlite (offline lessons) | |
| i18n | `i18next` + ICU plurals; RTL for Arabic/Hebrew | Global by design |
| A11y | RN a11y APIs; Dynamic Type to 200% | `02` §W-C1 |
| Testing | Jest + RN Testing Library, Maestro (E2E), Storybook | |

**Web companion:** Next.js 15 (App Router) + React 19 + Tailwind — marketing,
web checkout, gift purchase, Guardian Console, Bond Book viewer. **Not** a full app
port; the product is mobile-first.

---

## 6.2 Backend Stack

| Layer | Choice |
|---|---|
| Runtime | Node.js 22 LTS, TypeScript |
| API | Fastify 5 (REST + JSON Schema validation) |
| Auth | Custom JWT (15 min access / 30 d rotating refresh) + Apple/Google SSO; Argon2id |
| DB | **PostgreSQL 16** (primary + read replica) |
| ORM | Drizzle ORM + drizzle-kit migrations |
| Cache/queue | Redis 7 (sessions, quotas, rate limits) + BullMQ (jobs) |
| Object storage | S3 (SSE-KMS) + CloudFront signed URLs |
| Search | Postgres FTS → OpenSearch if catalog outgrows it |
| ML serving | Python 3.12 + FastAPI + NVIDIA Triton on A10G (try-on refine, segmentation) |
| Video | LiveKit Cloud (SFU + egress) |
| Payments | Stripe (+ StoreKit/Play server notifications) |
| Email/SMS | Postmark (transactional), Twilio (guardian verification) |
| Push | Expo Push → APNs/FCM |
| CMS | Sanity (lessons, collections, stories, presets) with custom publish gates |
| Observability | OpenTelemetry → Grafana Cloud; Sentry |
| Hosting | AWS (ECS Fargate), RDS, ElastiCache; ML on ECS GPU |
| IaC | Terraform |
| CI/CD | GitHub Actions → EAS Build/Submit (mobile), ECS rolling (API) |

---

## 6.3 Repository Structure

```
self-made-legends/beauty-bond/          # ← its own repo, NOT the Come Up repo
├── apps/
│   ├── mobile/                  # React Native
│   │   ├── src/
│   │   │   ├── features/        # onboarding, learning, tryon, rooms,
│   │   │   │                    #   legacy, bonding, bag, billing, guardian
│   │   │   ├── components/      # design-system primitives
│   │   │   ├── native/          # BBTryOnKit bridge
│   │   │   └── theme/           # tokens from 07-branding
│   │   └── e2e/                 # Maestro flows
│   ├── web/                     # Next.js companion
│   └── api/                     # Fastify
│       └── src/
│           ├── routes/          # auth, profiles, guardian, learning, culture,
│           │                    #   tryon, rooms, bag, legacy, billing, webhooks
│           ├── middleware/      # auth, requireAgeBand, requireEntitlement,
│           │                    #   requireConsent, rateLimit
│           ├── services/        # entitlements, roomSafety, shadeMatch,
│           │                    #   consent, moderation, notifications
│           └── db/              # drizzle schema + migrations
├── services/
│   ├── tryon/                   # Python FastAPI + Triton
│   └── moderation/              # classifier workers
├── packages/
│   ├── shared/                  # types, entitlements, glamPanel, zod schemas
│   ├── ui/                      # cross-platform primitives
│   └── tokens/                  # design tokens → TS/CSS/Swift/Kotlin
├── infra/                       # Terraform
├── docs/                        # this specification set
└── NOTICE.md                    # SML ownership (mirrors beauty-bond/NOTICE.md)
```

Monorepo: pnpm workspaces + Turborepo.

---

## 6.4 Database Schema

```sql
-- ═══ IDENTITY & FAMILY ═══════════════════════════════════════════════
CREATE TYPE age_band  AS ENUM ('child','teen','adult');
CREATE TYPE tier_code AS ENUM ('sparkle','bond','legacy','studio');

CREATE TABLE users (                      -- billing/auth identity (adults)
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email               citext UNIQUE NOT NULL,
  password_hash       text,
  auth_provider       text,
  stripe_customer_id  text UNIQUE,
  region              text NOT NULL,                    -- consent-age floor
  trials_used         int  NOT NULL DEFAULT 0,
  created_at          timestamptz NOT NULL DEFAULT now(),
  deleted_at          timestamptz
);

CREATE TABLE profiles (                   -- who uses the app (incl. children)
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid REFERENCES users(id) ON DELETE CASCADE,  -- null for child
  guardian_id       uuid REFERENCES profiles(id),                  -- set for minors
  display_name      text NOT NULL,
  birth_date        date NOT NULL,
  age_band          age_band NOT NULL,     -- recomputed nightly on birthdays
  avatar_url        text,
  mode              text NOT NULL DEFAULT 'solo_glow',
  cultural_modes    text[] NOT NULL DEFAULT '{}',
  remembrance_mode  boolean NOT NULL DEFAULT false,
  is_verified_creator boolean NOT NULL DEFAULT false,
  suspended_until   timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  deleted_at        timestamptz,
  CONSTRAINT minor_needs_guardian
    CHECK (age_band = 'adult' OR guardian_id IS NOT NULL)
);
CREATE INDEX ON profiles(guardian_id);

CREATE TABLE guardian_consents (          -- COPPA verifiable parental consent
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  guardian_user_id uuid NOT NULL REFERENCES users(id),
  method          text NOT NULL,          -- 'card_verify','sms_otp','id_check'
  granted_at      timestamptz NOT NULL,
  revoked_at      timestamptz,
  evidence_ref    text NOT NULL           -- audit pointer, not raw PII
);

CREATE TABLE guardian_permissions (
  child_profile_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  camera_tryon    boolean NOT NULL DEFAULT true,
  video_rooms     boolean NOT NULL DEFAULT false,
  live_lessons    boolean NOT NULL DEFAULT false,
  bff_rooms       boolean NOT NULL DEFAULT false,
  notifications   boolean NOT NULL DEFAULT true,
  daily_limit_min int,
  bedtime_start   time,
  bedtime_end     time,
  updated_at      timestamptz NOT NULL DEFAULT now()
);
-- Purchases are NOT a column: child accounts can never purchase, by construction.

CREATE TABLE trusted_circle (
  guardian_profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  adult_profile_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  relationship        text,
  added_at            timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (guardian_profile_id, adult_profile_id)
);

CREATE TABLE friendships (
  a_profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  b_profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status       text NOT NULL,             -- 'pending_guardian','approved','blocked'
  approved_by  uuid REFERENCES profiles(id),
  approved_at  timestamptz,
  PRIMARY KEY (a_profile_id, b_profile_id)
);

CREATE TABLE consents (                   -- per-feature, per-profile
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  scope      text NOT NULL,               -- 'camera','photos','mic','analytics'
  granted    boolean NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (profile_id, scope)
);

-- ═══ BILLING ═════════════════════════════════════════════════════════
CREATE TABLE subscriptions (
  id                   text PRIMARY KEY,          -- stripe sub id / store txn id
  user_id              uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source               text NOT NULL,             -- 'stripe','apple','google'
  tier                 tier_code NOT NULL,
  status               text NOT NULL,
  price_lookup_key     text,
  current_period_end   timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  trial_end            timestamptz,
  seats                int NOT NULL DEFAULT 0,
  updated_at           timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON subscriptions(user_id, status);

CREATE TABLE webhook_events (             -- idempotency ledger
  id           text PRIMARY KEY,          -- provider event id
  provider     text NOT NULL,
  type         text NOT NULL,
  payload      jsonb NOT NULL,
  processed_at timestamptz,
  failed_reason text,
  received_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE usage_counters (
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  metric     text NOT NULL,               -- 'tryon','room_minutes','bond_books'
  period     text NOT NULL,               -- '2026-08'
  used       int  NOT NULL DEFAULT 0,
  PRIMARY KEY (profile_id, metric, period)
);

-- ═══ LEARNING & CONTENT ══════════════════════════════════════════════
CREATE TABLE learning_paths (
  id uuid PRIMARY KEY, level int NOT NULL, title text NOT NULL,
  min_age int NOT NULL, description text
);

CREATE TABLE collections (                -- cultural beauty library
  id                 uuid PRIMARY KEY,
  slug               text UNIQUE NOT NULL,  -- 'black_beauty', 'latina_beauty', …
  name               text NOT NULL,
  advisor_name       text NOT NULL,
  advisor_profile_id uuid REFERENCES profiles(id),
  advisor_approval_at timestamptz,          -- publish gate
  respect_note_id    uuid,
  published_at       timestamptz,
  CONSTRAINT publish_requires_advisor
    CHECK (published_at IS NULL OR advisor_approval_at IS NOT NULL)
);

CREATE TABLE lessons (
  id                   uuid PRIMARY KEY,
  path_id              uuid REFERENCES learning_paths(id),
  title                text NOT NULL,
  level                int  NOT NULL,
  min_age              int  NOT NULL,
  tier_required        tier_code NOT NULL DEFAULT 'sparkle',
  duration_seconds     int,
  video_url            text,
  captions             jsonb,             -- {locale: url}
  steps                jsonb NOT NULL,    -- [{text, supervision_required, timer_s}]
  requires_products    jsonb NOT NULL DEFAULT '[]',
  practice_mode_available boolean NOT NULL DEFAULT true,
  kid_safe             boolean NOT NULL DEFAULT false,
  collection_id        uuid REFERENCES collections(id),
  published_at         timestamptz
);

CREATE TABLE stories (                    -- elder/creator story archive
  id uuid PRIMARY KEY, collection_id uuid REFERENCES collections(id),
  speaker_name text, speaker_age int, video_url text,
  transcript text, credit jsonb, published_at timestamptz
);

CREATE TABLE brushes (
  id uuid PRIMARY KEY, name text NOT NULL, category text,
  bristle text, use_for text[], pressure int,   -- 1..5
  wrong_tool_result text, demo_url text, image_url text
);

CREATE TABLE progress (
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  lesson_id  uuid NOT NULL REFERENCES lessons(id),
  step_index int NOT NULL DEFAULT 0,
  completed_at timestamptz,
  PRIMARY KEY (profile_id, lesson_id)
);

CREATE TABLE streaks (
  profile_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  current int NOT NULL DEFAULT 0, longest int NOT NULL DEFAULT 0,
  last_active_on date, passes_remaining int NOT NULL DEFAULT 2
);

CREATE TABLE badges (
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  badge_code text NOT NULL, earned_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (profile_id, badge_code)
);

-- ═══ SHADE, PRODUCTS, TRY-ON ═════════════════════════════════════════
CREATE TABLE shade_profiles (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id   uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  depth_min    int NOT NULL, depth_max int NOT NULL,   -- range, never a point
  undertone    text NOT NULL,                          -- cool|neutral|warm|olive
  lab_l numeric, lab_a numeric, lab_b numeric,
  confidence   numeric NOT NULL,
  method       text NOT NULL,                          -- 'scan','manual','match'
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE brands (
  id uuid PRIMARY KEY, name text NOT NULL, slug text UNIQUE NOT NULL,
  logo_url text, affiliate_program text, is_partner boolean NOT NULL DEFAULT false
);

CREATE TABLE products (
  id uuid PRIMARY KEY, brand_id uuid REFERENCES brands(id),
  name text NOT NULL, category text NOT NULL,     -- lip|cheek|eye|brow|base|tool
  finish text, ingredients text[], kid_safe boolean NOT NULL DEFAULT false,
  allergen_flags text[],                          -- fragrance, carmine, lanolin…
  pao_months int,                                 -- period-after-opening
  blocked boolean NOT NULL DEFAULT false          -- e.g. skin-lightening: blocked
);

CREATE TABLE shades (
  id uuid PRIMARY KEY, product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  name text NOT NULL, hex text NOT NULL,
  lab_l numeric, lab_a numeric, lab_b numeric,
  depth int, undertone text
);
CREATE INDEX ON shades(depth, undertone);

CREATE TABLE makeup_bag (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id), shade_id uuid REFERENCES shades(id),
  custom_name text, opened_on date, is_wishlist boolean NOT NULL DEFAULT false,
  added_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE brush_kit (
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  brush_id   uuid NOT NULL REFERENCES brushes(id),
  last_cleaned_on date,
  PRIMARY KEY (profile_id, brush_id)
);

CREATE TABLE looks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL, layers jsonb NOT NULL,
  preset_id text, collection_id uuid REFERENCES collections(id),
  min_age int NOT NULL DEFAULT 0, tier_required tier_code NOT NULL DEFAULT 'sparkle',
  advisor_approved_at timestamptz, qa_panel_passed_at timestamptz,
  credit jsonb, created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cultural_preset_needs_signoff
    CHECK (collection_id IS NULL OR (advisor_approved_at IS NOT NULL
                                 AND qa_panel_passed_at IS NOT NULL))
);

CREATE TABLE renders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  look_id uuid REFERENCES looks(id),
  url text, before_url text,
  geometry_locked boolean NOT NULL DEFAULT true,
  saved boolean NOT NULL DEFAULT false,
  expires_at timestamptz NOT NULL,        -- 24h if unsaved
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ═══ ROOMS ═══════════════════════════════════════════════════════════
CREATE TYPE room_type AS ENUM ('family','lesson','bff','global');

CREATE TABLE rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type room_type NOT NULL,
  name text, livekit_room text UNIQUE NOT NULL,
  host_profile_id uuid NOT NULL REFERENCES profiles(id),
  join_code text, max_participants int NOT NULL,
  recording_enabled boolean NOT NULL DEFAULT false,
  recording_egress_id text, recording_started_at timestamptz,
  glam_state jsonb, scheduled_for timestamptz,
  frozen_at timestamptz, freeze_reason text,
  ended_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bff_never_records
    CHECK (type <> 'bff' OR recording_enabled = false)
);

CREATE TABLE room_participants (
  room_id uuid NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'participant',
  joined_at timestamptz, left_at timestamptz, minutes int,
  PRIMARY KEY (room_id, profile_id, joined_at)
);

CREATE TABLE reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_profile_id uuid REFERENCES profiles(id),
  reported_profile_id uuid REFERENCES profiles(id),
  room_id uuid REFERENCES rooms(id),
  reason text NOT NULL, status text NOT NULL DEFAULT 'open',
  priority text NOT NULL DEFAULT 'p2',
  created_at timestamptz NOT NULL DEFAULT now(), resolved_at timestamptz
);

CREATE TABLE blocks (
  blocker_profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_profile_id, blocked_profile_id)
);

-- ═══ BONDING, LEGACY, MEMORIES ═══════════════════════════════════════
CREATE TABLE bond_pairs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  a_profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  b_profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  meter numeric NOT NULL DEFAULT 0, level int NOT NULL DEFAULT 1,
  last_activity_at timestamptz,
  UNIQUE (a_profile_id, b_profile_id)
);

CREATE TABLE bond_missions (
  id uuid PRIMARY KEY, week_of date NOT NULL, title text NOT NULL,
  description text, points int NOT NULL DEFAULT 10, mode text
);

CREATE TABLE bond_mission_completions (
  mission_id uuid NOT NULL REFERENCES bond_missions(id),
  bond_pair_id uuid NOT NULL REFERENCES bond_pairs(id) ON DELETE CASCADE,
  confirmed_by uuid[] NOT NULL DEFAULT '{}',   -- BOTH profiles required
  completed_at timestamptz,
  PRIMARY KEY (mission_id, bond_pair_id)
);

CREATE TABLE compliment_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  to_profile_id   uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  template_id text NOT NULL, filled jsonb NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE legacy_people (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL, born_year int, passed_year int, quote text, photo_url text
);

CREATE TABLE legacy_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_person_id uuid NOT NULL REFERENCES legacy_people(id) ON DELETE CASCADE,
  kind text NOT NULL,                  -- 'voice','photo','recipe','routine','shade'
  storage_key text NOT NULL,           -- encrypted at rest
  caption text, contributed_by uuid REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
-- NOTE: legacy_items are NEVER deleted for non-payment. Over-limit ⇒ read-only.

CREATE TABLE letters_forward (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_person_id uuid REFERENCES legacy_people(id) ON DELETE CASCADE,
  to_profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  occasion text NOT NULL, deliver_on date NOT NULL,
  storage_key text NOT NULL,           -- encrypted
  status text NOT NULL DEFAULT 'sealed',   -- sealed|delivered
  delivered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
-- Delivery job reads letters_forward.status ONLY. It never joins subscriptions.

CREATE TABLE journal_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  ciphertext bytea NOT NULL,           -- client-encrypted; server cannot read
  prompt_id text, created_at timestamptz NOT NULL DEFAULT now()
);
-- Never scanned, never analyzed, not guardian-visible for 13+.

CREATE TABLE memories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  kind text NOT NULL,                  -- 'before_after','look','room_recap'
  render_id uuid REFERENCES renders(id),
  caption text, occurred_on date,
  shared_with uuid[] NOT NULL DEFAULT '{}',
  consent_status text NOT NULL DEFAULT 'ok',  -- ok|pending_consent
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE audit_log (
  id bigserial PRIMARY KEY,
  actor_profile_id uuid, action text NOT NULL, subject_id text,
  metadata jsonb, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON audit_log(actor_profile_id, created_at DESC);
```

**Row-level security:** enabled on `profiles`, `journal_entries`, `legacy_items`,
`memories`, `makeup_bag`. Policies key off `current_setting('app.profile_id')`, set
per-request by the API. A guardian policy grants read on a linked child's rows
**except** `journal_entries` for 13+.

---

## 6.5 Core API Endpoints

### Auth & Identity

| Method | Path | Notes |
|---|---|---|
| `POST` | `/v1/auth/signup` | Adult only; region → consent floor |
| `POST` | `/v1/auth/login` | |
| `POST` | `/v1/auth/refresh` | Rotating refresh token |
| `POST` | `/v1/auth/sso/:provider` | Apple / Google |
| `POST` | `/v1/auth/logout` | |
| `GET` | `/v1/me` | User + profiles |
| `GET` | `/v1/me/entitlements` | Client-side UI affordances (advisory) |

### Profiles & Guardianship

| Method | Path | Notes |
|---|---|---|
| `POST` | `/v1/profiles` | Create child/teen profile (adult only) |
| `PATCH` | `/v1/profiles/:id` | Mode, avatar, cultural modes, remembrance |
| `POST` | `/v1/guardian/consent/start` | Send verification to guardian |
| `POST` | `/v1/guardian/consent/verify` | Completes VPC → provisions child account |
| `GET` | `/v1/guardian/children` | Guardian Console list |
| `PATCH` | `/v1/guardian/permissions/:childId` | Permission matrix |
| `GET` | `/v1/guardian/activity/:childId` | Activity log |
| `POST` | `/v1/guardian/friend-requests/:id/approve` | |
| `POST` | `/v1/trusted-circle` | Add trusted adult |
| `GET` | `/v1/privacy/export` | Always free |
| `DELETE` | `/v1/privacy/account` | Always free |

### Learning & Culture

| Method | Path |
|---|---|
| `GET` | `/v1/paths` · `/v1/paths/:id` |
| `GET` | `/v1/lessons/:id` (age gate → entitlement gate) |
| `POST` | `/v1/lessons/:id/progress` |
| `GET` | `/v1/brushes` · `/v1/brushes/:id` |
| `POST` | `/v1/brush-kit/:brushId/cleaned` |
| `GET` | `/v1/collections` · `/v1/collections/:slug` |
| `GET` | `/v1/collections/:slug/stories` |
| `GET` | `/v1/progress` · `/v1/streaks` · `/v1/badges` |

### Shade & Products

| Method | Path |
|---|---|
| `POST` | `/v1/shade/scan` → shade profile (range + confidence) |
| `POST` | `/v1/shade/manual` |
| `GET` | `/v1/shade/matches?profileId=&brand=` (ΔE-sorted) |
| `GET` | `/v1/brands` · `/v1/products?q=` · `/v1/products/barcode/:ean` |
| `GET`/`POST`/`DELETE` | `/v1/bag` · `/v1/bag/:id` |

### Try-On (`04`)

`POST /v1/tryon/upload-url` · `POST /v1/tryon/render` · `GET /v1/tryon/presets` ·
`POST /v1/tryon/save` · `GET/POST /v1/looks`

### Rooms (`05`)

`POST /v1/rooms` · `GET /v1/rooms` · `POST /v1/rooms/:id/token` ·
`POST /v1/rooms/:id/invite` · `GET/POST /v1/rooms/:id/glam` ·
`POST /v1/rooms/:id/panic` · `POST /v1/rooms/:id/report` ·
`POST /v1/rooms/:id/eject/:profileId` · `POST /v1/rooms/:id/recording`

### Bonding & Legacy

| Method | Path |
|---|---|
| `GET` | `/v1/bond/:pairId` |
| `GET` | `/v1/bond/missions` |
| `POST` | `/v1/bond/missions/:id/confirm` (dual-confirm) |
| `POST` | `/v1/bond/compliments` |
| `GET`/`POST` | `/v1/legacy/people` · `/v1/legacy/items` |
| `POST` | `/v1/legacy/letters` (seal) |
| `GET` | `/v1/legacy/letters` (sealed metadata only) |
| `POST` | `/v1/journal` (ciphertext in, never read server-side) |
| `GET`/`POST` | `/v1/memories` · `POST /v1/memories/:id/consent` |
| `POST` | `/v1/bond-book` → PDF/print job |

### Billing (`03`)

`POST /v1/billing/checkout` · `POST /v1/billing/checkout-session` ·
`POST /v1/billing/portal` · `POST /v1/billing/gift` ·
`POST /v1/webhooks/stripe` · `POST /v1/webhooks/apple` · `POST /v1/webhooks/google`

### AI service (internal, mTLS, not public)

`POST /internal/ml/detect` · `/internal/ml/segment` · `/internal/ml/render` ·
`/internal/ml/shade-extract` · `/internal/ml/moderate-frame`

### Conventions

- Versioned `/v1`; additive changes only within a version.
- Errors: `{ error: 'snake_code', message: 'human copy', recovery?: 'action' }`.
- Idempotency-Key required on all `POST` that create money or media.
- Rate limits: 60 rpm default · 10 rpm try-on render · 5 rpm auth · 120 rpm reads.
- Every response carries `x-request-id` for support correlation.

---

## 6.6 Middleware Order (mandatory)

```ts
app.register(requestId)
app.register(rateLimit)
app.register(auth)              // → req.user, req.profile
app.register(rlsContext)        // SET app.profile_id for row-level security
// then, per route:
//   requireConsent('camera')   — OS + in-app consent record
//   requireAgeBand()           — COMPLIANCE gate; nothing overrides it
//   requireEntitlement(...)    — COMMERCIAL gate
//   handler
```

**Age gate always precedes the entitlement gate.** No tier, coupon, promo, or admin
flag unlocks age-restricted content. This ordering is asserted by a CI test that walks
the route table.

---

## 6.7 Environment

```bash
# Core
NODE_ENV= DATABASE_URL= REDIS_URL= JWT_SECRET= REFRESH_SECRET=
# Storage
S3_BUCKET_MEDIA= S3_BUCKET_EPHEMERAL= CLOUDFRONT_KEY_PAIR_ID= KMS_KEY_ID=
# Stripe (Beauty Bond's OWN account — never shared with other SML products)
STRIPE_SECRET_KEY= STRIPE_WEBHOOK_SECRET= STRIPE_PORTAL_CONFIG_ID=
# Stores
APPLE_SHARED_SECRET= GOOGLE_PLAY_SERVICE_ACCOUNT_JSON=
# LiveKit
LIVEKIT_API_KEY= LIVEKIT_API_SECRET= LIVEKIT_WS_URL= LIVEKIT_WEBHOOK_KEY=
# ML
ML_SERVICE_URL= ML_SERVICE_MTLS_CERT=
# Comms
POSTMARK_TOKEN= TWILIO_SID= TWILIO_TOKEN= EXPO_ACCESS_TOKEN=
# Content
SANITY_PROJECT_ID= SANITY_TOKEN=
# Observability
SENTRY_DSN= OTEL_EXPORTER_OTLP_ENDPOINT=
```

Secrets in AWS Secrets Manager; rotated quarterly. **No production secret ever lives
in the mobile bundle** — the client holds only the public Stripe key and the API URL.

---

## 6.8 Delivery Phases

| Phase | Weeks | Scope | Exit criteria |
|---|---|---|---|
| **0 — Foundation** | 1–3 | Repo, CI, IaC, schema, auth, age gate, **guardian consent flow** | A child account cannot be provisioned without verified consent |
| **1 — Core Loop** | 4–8 | Onboarding, mode selection, home, Levels 1–3, brush education, progress | A dad and daughter can finish a lesson together |
| **2 — Shade & Bag** | 9–12 | Shade scan, cross-brand matching, Makeup Bag, brand catalog | Match confidence honest at all 16 depths; fairness gate green |
| **3 — Try-On** | 13–18 | On-device AR, layer editor, presets, geometry lock, fairness panel | §4.6 CI tests green; 30 fps on target devices |
| **4 — Billing** | 19–21 | Tiers, checkout (Stripe + StoreKit/Play), webhooks, entitlements, portal | Webhook fixture suite green incl. duplicate/out-of-order |
| **5 — Rooms** | 22–27 | Family rooms, Shared Glam Panel, tokens, panic, moderation | `canJoin()` matrix fully covered by tests |
| **6 — Culture** | 28–32 | Six collections, advisor workflow, stories, cultural glam sets | No collection publishable without advisor sign-off |
| **7 — Bond & Legacy** | 33–38 | Bond missions, Dad School, Legacy Vault, Letters Forward, journal, memories | Letters deliver with subscription cancelled |
| **8 — Scale** | 39–44 | Live lessons, BFF rooms, Global rooms, creator tools, Bond Book | Moderation SLA met in load test |
| **9 — Launch** | 45–48 | i18n, a11y audit, pen test, COPPA/GDPR-K legal review, store submission | External audit passed |

**Beta:** closed family beta at end of Phase 3 (50 families), open beta after Phase 6.

---

## 6.9 Brand Catalog Integration

Three ingestion tiers:

1. **Partner API** (executed agreement): live shade data, stock, affiliate links.
2. **Affiliate network** (Rakuten/Impact/Sovrn): catalog feed + tracked links,
   disclosed in-app with a visible chip.
3. **Manual/community**: SML-maintained shade database; user-submitted entries
   reviewed before publication.

**Catalog ingest rules (enforced at import):**

- `blocked = true` for any skin-lightening/bleaching product — never surfaced.
- `kid_safe` defaults **false**; must be explicitly reviewed to become true.
- Allergen flags auto-extracted from the ingredient list and cross-checked against
  each profile's declared sensitivities.
- Shade `hex` converted to Lab at ingest so matching is colorimetric, not string-based.
- Match ordering is **always by ΔE**, never by commercial relationship. Partner status
  may add a badge; it may never reorder results.

**Legal posture:** brand names are used nominatively to identify products a user owns
or is matched to. No brand logo appears in SML marketing without written permission.
No affiliation is implied (`NOTICE.md` §4.2).

---

## 6.10 Testing & Release Gates

| Gate | Requirement |
|---|---|
| Unit | ≥ 80% on services; **100% on `roomSafety`, `entitlements`, `sanitizeLook`** |
| Safety suite | Geometry lock, minor-server-render 403, `canJoin` matrix, panic path, age-before-entitlement ordering |
| Fairness | `04` §4.7 thresholds, per Fitzpatrick group, published to the model card |
| Webhook | Replay all 12 Stripe events + duplicates + out-of-order |
| E2E (Maestro) | Onboarding w/ consent, lesson completion, try-on, room join, checkout |
| A11y | Automated scan + manual screen-reader pass on every P0 screen |
| Perf | Cold start < 2.5 s; try-on ≥ 30 fps on target tier; API p95 < 300 ms |
| Security | Quarterly pen test; annual COPPA/GDPR-K review by outside counsel |
| Content | No collection or cultural preset ships without advisor sign-off + QA panel |

**Release blocker:** any failure in the safety suite or the fairness gate blocks the
build. These cannot be waived by a product decision — only by fixing the defect.

---

*Continue to `07-branding.md`.*
