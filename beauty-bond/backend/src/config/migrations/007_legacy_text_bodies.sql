-- Dad + Daughter Beauty Bond™ — a Self-Made Legends LLC (SML) product.
-- Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
-- Proprietary and confidential. Unauthorized use is prohibited.
--
-- The Vault and Letters Forward were designed around an object store: every
-- item and every letter carried a storage_key, and the words themselves were
-- meant to live behind it. That store was never built. There is no upload
-- route for legacy content and no bucket, so the two headline features of v1
-- could not hold a single word — a delivered letter returned its key, not its
-- text, and nothing in the app could create either.
--
-- A letter is words. A recipe is words. A routine, a shade note, a memory of
-- something she said — words. So text lives in the row, and storage_key
-- becomes optional for the day voice and photo get a real store behind them.
-- Neither is dropped; either is required. An item or a letter with no content
-- at all is the one thing this must refuse.
--
-- 'note' joins the kinds: "something she always said" is the most natural
-- thing to put in a vault, and none of the five existing kinds fit it.

ALTER TABLE legacy_items   ADD COLUMN IF NOT EXISTS body text;
ALTER TABLE letters_forward ADD COLUMN IF NOT EXISTS body text;

ALTER TABLE legacy_items   ALTER COLUMN storage_key DROP NOT NULL;
ALTER TABLE letters_forward ALTER COLUMN storage_key DROP NOT NULL;

-- Content is mandatory; its form is not.
ALTER TABLE legacy_items DROP CONSTRAINT IF EXISTS legacy_item_has_content;
ALTER TABLE legacy_items ADD CONSTRAINT legacy_item_has_content
  CHECK (body IS NOT NULL OR storage_key IS NOT NULL);

ALTER TABLE letters_forward DROP CONSTRAINT IF EXISTS letter_has_content;
ALTER TABLE letters_forward ADD CONSTRAINT letter_has_content
  CHECK (body IS NOT NULL OR storage_key IS NOT NULL);

-- Redefined from 005 to admit 'note'. Same closed set otherwise.
ALTER TABLE legacy_items DROP CONSTRAINT IF EXISTS legacy_item_kind_known;
ALTER TABLE legacy_items ADD CONSTRAINT legacy_item_kind_known
  CHECK (kind IN ('voice', 'photo', 'recipe', 'routine', 'shade', 'note'));
