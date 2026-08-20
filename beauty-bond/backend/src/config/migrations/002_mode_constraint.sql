-- Dad + Daughter Beauty Bond™ — a Self-Made Legends LLC (SML) product.
-- Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
-- Proprietary and confidential. Unauthorized use is prohibited.
--
-- Repairs a database created before the mode rename.
--
-- profiles.mode was free text defaulting to 'solo_glow', and child/teen
-- profiles were written as 'little_legend' or 'solo_glow'. Neither exists in
-- the app's MODES, so those profiles rendered an undefined mode chip with no
-- accent colour. This maps the old values onto real ones and adds the CHECK
-- constraint that stops it recurring.
--
-- Idempotent: safe on a fresh database created from 001, which already has
-- the constraint.

UPDATE profiles SET mode = 'guardian_daughter' WHERE mode = 'little_legend';
UPDATE profiles SET mode = 'solo_girl'         WHERE mode = 'solo_glow';
UPDATE profiles SET mode = 'mom_daughter'      WHERE mode = 'legacy';
UPDATE profiles SET mode = 'best_friend_glam'  WHERE mode = 'bff';
UPDATE profiles SET mode = 'global_rooms'      WHERE mode = 'global_glam';

ALTER TABLE profiles ALTER COLUMN mode SET DEFAULT 'solo_girl';

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS mode_is_known;
ALTER TABLE profiles ADD CONSTRAINT mode_is_known CHECK (mode IN (
  'dad_daughter','mom_daughter','guardian_daughter',
  'solo_girl','best_friend_glam','global_rooms'));
