-- Dad + Daughter Beauty Bond™ — a Self-Made Legends LLC (SML) product.
-- Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
-- Proprietary and confidential. Unauthorized use is prohibited.
--
-- The Legacy tables were designed and never written to, so their defects were
-- never exercised. Legacy is now the centre of the product, so they matter.
--
-- 1. legacy_family did the opposite of its name. It scoped legacy_items by
--    contributed_by, so a person could see only the items THEY contributed —
--    while docs/architecture.md:402 calls the vault "contributable by any
--    family member". A mother's voice note added by her husband was invisible
--    to their daughter. contributed_by is also nullable, so an item added with
--    no contributor was visible to nobody at all.
--
-- 2. letters_forward and legacy_people had no row-level security whatsoever —
--    the two tables holding a dead parent's messages.
--
-- 3. kind and status were free text with the valid values in a comment.
--    status = 'delivered' with a null delivered_at was legal, and so was
--    kind = 'banana'. Migration 002 set the precedent: if a comment states an
--    enum, a CHECK should enforce it.
--
-- 4. The delivery job scans (status, deliver_on). There was no index on it.
--
-- Idempotent.

/* ── 1 & 2: row-level security that follows the family ─────────────── */

ALTER TABLE legacy_people    ENABLE ROW LEVEL SECURITY;
ALTER TABLE letters_forward  ENABLE ROW LEVEL SECURITY;

-- One helper defines "the family of the current profile": the profile itself,
-- its guardian, and every child under the same guardian. Used by all three
-- policies so they cannot drift apart.
CREATE OR REPLACE FUNCTION app_family_profiles() RETURNS SETOF uuid
LANGUAGE sql STABLE AS $$
  WITH me AS (
    SELECT id, guardian_id FROM profiles
     WHERE id = current_setting('app.profile_id', true)::uuid
  )
  SELECT id FROM me
  UNION
  SELECT guardian_id FROM me WHERE guardian_id IS NOT NULL
  UNION
  SELECT p.id FROM profiles p, me
   WHERE p.guardian_id = me.id
      OR (me.guardian_id IS NOT NULL AND p.guardian_id = me.guardian_id)
$$;

DROP POLICY IF EXISTS legacy_family ON legacy_items;
CREATE POLICY legacy_family ON legacy_items
  USING (EXISTS (
    SELECT 1 FROM legacy_people lp
     WHERE lp.id = legacy_items.legacy_person_id
       AND lp.family_profile_id IN (SELECT app_family_profiles())));

DROP POLICY IF EXISTS legacy_people_family ON legacy_people;
CREATE POLICY legacy_people_family ON legacy_people
  USING (family_profile_id IN (SELECT app_family_profiles()));

-- A letter is visible to its recipient and to the family that holds it. The
-- policy governs VISIBILITY of the row, never whether it delivers — delivery
-- is decided by status and deliver_on alone. docs/stripe-flow.md:778.
DROP POLICY IF EXISTS letters_family ON letters_forward;
CREATE POLICY letters_family ON letters_forward
  USING (to_profile_id IN (SELECT app_family_profiles())
         OR EXISTS (
           SELECT 1 FROM legacy_people lp
            WHERE lp.id = letters_forward.legacy_person_id
              AND lp.family_profile_id IN (SELECT app_family_profiles())));

/* ── 3: enums the comments already promised ────────────────────────── */

ALTER TABLE legacy_items DROP CONSTRAINT IF EXISTS legacy_item_kind_known;
ALTER TABLE legacy_items ADD CONSTRAINT legacy_item_kind_known
  CHECK (kind IN ('voice', 'photo', 'recipe', 'routine', 'shade'));

ALTER TABLE letters_forward DROP CONSTRAINT IF EXISTS letter_status_known;
ALTER TABLE letters_forward ADD CONSTRAINT letter_status_known
  CHECK (status IN ('sealed', 'delivered'));

-- A delivered letter must record when. Without this, "delivered" could be set
-- with no timestamp and the recipient would have no idea when it arrived.
ALTER TABLE letters_forward DROP CONSTRAINT IF EXISTS letter_delivered_has_timestamp;
ALTER TABLE letters_forward ADD CONSTRAINT letter_delivered_has_timestamp
  CHECK (status <> 'delivered' OR delivered_at IS NOT NULL);

/* ── 4: the index the delivery job scans ───────────────────────────── */

CREATE INDEX IF NOT EXISTS letters_due
  ON letters_forward(deliver_on)
  WHERE status = 'sealed';

CREATE INDEX IF NOT EXISTS letters_for_profile
  ON letters_forward(to_profile_id, status);

CREATE INDEX IF NOT EXISTS legacy_items_by_person
  ON legacy_items(legacy_person_id);
