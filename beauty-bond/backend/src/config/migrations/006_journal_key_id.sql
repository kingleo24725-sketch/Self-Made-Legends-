-- Dad + Daughter Beauty Bond™ — a Self-Made Legends LLC (SML) product.
-- Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
-- Proprietary and confidential. Unauthorized use is prohibited.
--
-- The Healing Journal is encrypted with a key that never leaves the device
-- (app/utils/journalCrypto.js). That is the promise in docs/architecture.md:411
-- and it is worth what it costs — but it has one honest consequence: a
-- reinstall, or a new phone, means the old key is gone and the entries written
-- under it can never be opened again. By anyone, including us. There is no
-- escrow, because an escrow is a way for someone other than the writer to read
-- a grieving child's journal.
--
-- So each entry records WHICH key wrote it. The app compares that against the
-- key it holds and says "written on a device you no longer have" instead of
-- rendering mojibake or throwing.
--
-- key_id is a truncated SHA-256 of a domain-separated string containing the
-- key. It identifies the key; it does not reveal it, and it is useless to
-- anyone reading this table.
--
-- Nullable on purpose: entries written before this migration were base64, not
-- encrypted, and are marked legacy_plaintext rather than silently treated as
-- ciphertext the app would fail to open.
--
-- Idempotent.

ALTER TABLE journal_entries
  ADD COLUMN IF NOT EXISTS key_id text;

-- Any entry already present predates real encryption.
UPDATE journal_entries
   SET key_id = 'legacy_plaintext'
 WHERE key_id IS NULL
   AND octet_length(ciphertext) > 0;

CREATE INDEX IF NOT EXISTS journal_entries_by_profile
  ON journal_entries(profile_id, created_at DESC);
