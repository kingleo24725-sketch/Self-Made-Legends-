-- Beauty Bond™ — a Self-Made Legends LLC (SML) product.
-- Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
-- Proprietary and confidential.
--
-- Initial schema. Canonical reference: docs/api-reference.md §6.4.
-- Safety invariants are encoded as CHECK constraints so they survive a
-- careless application-layer change.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "citext";

-- ═══ IDENTITY & FAMILY ═══════════════════════════════════════════════
CREATE TYPE age_band  AS ENUM ('child','teen','adult');
CREATE TYPE tier_code AS ENUM ('free','basic','premium','family');

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
  tier_required        tier_code NOT NULL DEFAULT 'free',
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
  min_age int NOT NULL DEFAULT 0, tier_required tier_code NOT NULL DEFAULT 'free',
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

-- ═══ TABLES REFERENCED BY THE APP BUT NOT IN THE SPEC PROSE ══════════
CREATE TABLE IF NOT EXISTS dunning (
  user_id       uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  attempt       int NOT NULL DEFAULT 1,
  grace_ends_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS entitlement_audit (
  id         bigserial PRIMARY KEY,
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tier       tier_code NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS age_change_requests (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id   uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  requested_at timestamptz NOT NULL DEFAULT now(),
  resolved_at  timestamptz,
  note         text
);

-- Row-level security on the tables holding personal or sensitive content.
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE memories        ENABLE ROW LEVEL SECURITY;
ALTER TABLE legacy_items    ENABLE ROW LEVEL SECURITY;
ALTER TABLE makeup_bag      ENABLE ROW LEVEL SECURITY;

-- The Healing Journal is private by design and is NOT guardian-visible for
-- 13+. docs/architecture.md M08.
CREATE POLICY journal_own ON journal_entries
  USING (profile_id = current_setting('app.profile_id', true)::uuid);

CREATE POLICY memories_own ON memories
  USING (profile_id = current_setting('app.profile_id', true)::uuid);

CREATE POLICY legacy_family ON legacy_items
  USING (contributed_by = current_setting('app.profile_id', true)::uuid);

CREATE POLICY bag_own ON makeup_bag
  USING (profile_id = current_setting('app.profile_id', true)::uuid);
