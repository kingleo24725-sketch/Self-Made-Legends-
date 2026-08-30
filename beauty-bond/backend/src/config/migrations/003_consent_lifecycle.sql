-- Dad + Daughter Beauty Bond™ — a Self-Made Legends LLC (SML) product.
-- Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
-- Proprietary and confidential. Unauthorized use is prohibited.
--
-- guardian_consents could not hold a PENDING consent, so COPPA onboarding was
-- impossible: POST /guardian/consent/start inserted NULL into child_profile_id
-- and guardian_user_id (both NOT NULL) and omitted granted_at (also NOT NULL),
-- so the route raised 23502 on every call. createChildProfile then required
-- granted_at, which nothing ever set. No child account could exist.
--
-- The order COPPA requires is: consent FIRST, child data SECOND. So a consent
-- row must be insertable before the child profile exists, which means
-- child_profile_id and granted_at have to be nullable while pending.
--
-- guardian_user_id stays NOT NULL — the guardian is an authenticated adult at
-- the moment consent starts, and an unauthenticated writer here would be an
-- abuse vector.
--
-- Two CHECK constraints replace the lost NOT NULLs as the last line of
-- defence, so a child can never be attached to an ungranted consent even if
-- the application layer is wrong.
--
-- Idempotent.

ALTER TABLE guardian_consents ALTER COLUMN child_profile_id DROP NOT NULL;
ALTER TABLE guardian_consents ALTER COLUMN granted_at       DROP NOT NULL;

-- Verification material. The token is stored hashed: a leaked database row
-- must not let the reader grant consent on a parent's behalf.
ALTER TABLE guardian_consents
  ADD COLUMN IF NOT EXISTS verification_token_hash text,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz;

-- A consent may be spent on exactly one child.
CREATE UNIQUE INDEX IF NOT EXISTS guardian_consents_one_child
  ON guardian_consents(child_profile_id)
  WHERE child_profile_id IS NOT NULL;

-- Rule 1: a child may never be linked to a consent that was never granted.
ALTER TABLE guardian_consents DROP CONSTRAINT IF EXISTS consent_granted_before_child;
ALTER TABLE guardian_consents ADD CONSTRAINT consent_granted_before_child
  CHECK (child_profile_id IS NULL OR granted_at IS NOT NULL);

-- Rule 2: a revoked consent cannot also be a granted one at the same instant.
ALTER TABLE guardian_consents DROP CONSTRAINT IF EXISTS consent_revoked_after_granted;
ALTER TABLE guardian_consents ADD CONSTRAINT consent_revoked_after_granted
  CHECK (revoked_at IS NULL OR granted_at IS NULL OR revoked_at >= granted_at);
