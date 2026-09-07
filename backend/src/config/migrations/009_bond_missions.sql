-- Dad + Daughter Beauty Bond™ — a Self-Made Legends LLC (SML) product.
-- Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
-- Proprietary and confidential. Unauthorized use is prohibited.
--
-- bond_missions had a schema and no rows, so /bond/missions returned an
-- empty list and the Bonding screen fell back to three hardcoded
-- challenges — two of them drawn as already done, for every family, on
-- the first day. A brand-new dad opened the app and was told he had
-- completed things he had never heard of.
--
-- These are the starting missions. mode is NULL so every mode sees them;
-- week_of is the launch week, and the screen orders newest first, so a
-- later migration adding a new week puts it on top. Each needs BOTH halves
-- of the pair to tick it — the point of a bond mission.

INSERT INTO bond_missions (id, week_of, title, description, points, mode) VALUES
('b1000000-0000-4000-8000-000000000001', '2026-09-07', 'Dad picks her lip colour — and has to name it.',
  'Not "the pink one". The actual name on the tube.', 10, NULL),
('b1000000-0000-4000-8000-000000000002', '2026-09-07', 'She teaches him one brush.',
  'Which one, what it is for, and how to hold it. He has to say it back.', 10, NULL),
('b1000000-0000-4000-8000-000000000003', '2026-09-07', 'Match your looks for pizza night.',
  'Same colour somewhere on both of you. A lip, a nail, a scarf.', 15, NULL),
('b1000000-0000-4000-8000-000000000004', '2026-09-07', 'Wash the brushes together.',
  'Six steps, in the Cleaning Coach. Whoever finishes last dries.', 10, NULL),
('b1000000-0000-4000-8000-000000000005', '2026-09-07', 'One compliment each, about effort not looks.',
  '"You were patient with that line." Say it out loud, not in the app.', 10, NULL),
('b1000000-0000-4000-8000-000000000006', '2026-09-07', 'Put something in the Vault together.',
  'A recipe, a routine, a thing she always said. Decide on it together.', 15, NULL)
ON CONFLICT (id) DO UPDATE
  SET title = EXCLUDED.title, description = EXCLUDED.description,
      points = EXCLUDED.points, mode = EXCLUDED.mode, week_of = EXCLUDED.week_of;
