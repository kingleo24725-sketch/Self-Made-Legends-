-- Dad + Daughter Beauty Bond™ — a Self-Made Legends LLC (SML) product.
-- Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
-- Proprietary and confidential. Unauthorized use is prohibited.
--
-- room_participants was read in three places and written in none:
--   roomSafety.js:51    -- "is an untrusted adult in this room with a child?"
--   videoController.js  -- listRooms
--   models/Room.js:12
--
-- Because nothing inserted, the set was always empty, the loop at
-- roomSafety.js:56 never ran, and untrusted_adult_present could not fire.
-- roomSafety.test.js passed throughout because it mocks db.query and hands
-- the checker participants directly — the invariant was tested, never the
-- system that feeds it.
--
-- Presence is now written on token mint. Access tokens carry a 10-minute TTL
-- and the client re-mints to stay in the room, so without a uniqueness rule a
-- one-hour call would leave six "open" rows per person and the safety loop
-- would re-check the same adult six times.
--
-- This index makes one-open-session-per-person-per-room a database guarantee
-- rather than a convention, and closes the race between two simultaneous
-- mints for the same person.
--
-- Idempotent.

CREATE UNIQUE INDEX IF NOT EXISTS room_participants_one_open_session
  ON room_participants(room_id, profile_id)
  WHERE left_at IS NULL;

-- Presence queries are always "who is in this room right now".
CREATE INDEX IF NOT EXISTS room_participants_open_by_room
  ON room_participants(room_id)
  WHERE left_at IS NULL;

-- A session cannot end before it began.
ALTER TABLE room_participants DROP CONSTRAINT IF EXISTS participant_left_after_joined;
ALTER TABLE room_participants ADD CONSTRAINT participant_left_after_joined
  CHECK (left_at IS NULL OR joined_at IS NULL OR left_at >= joined_at);
