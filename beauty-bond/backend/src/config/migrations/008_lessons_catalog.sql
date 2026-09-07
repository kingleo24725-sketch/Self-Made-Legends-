-- Dad + Daughter Beauty Bond™ — a Self-Made Legends LLC (SML) product.
-- Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
-- Proprietary and confidential. Unauthorized use is prohibited.
--
-- The lessons table had a schema and no rows. The Learn tab listed five
-- topics, every one of which opened the same three demo steps, and the
-- player posted progress to /lessons/demo — an id that is not a uuid, so
-- the request failed and was swallowed. No streak ever started, no lesson
-- was ever recorded as done, and the Profile's "your first badge is waiting
-- after lesson one" was waiting for a badge nothing awards.
--
-- This is the catalogue: the five Safe Makeup Learning topics the app names
-- in utils/constants.js and the five Dad School lessons, with their actual
-- steps. Slugs are what the client knows; uuids stay the key. Steps whose
-- supervision_required is true stop a child until a grown-up confirms.

ALTER TABLE lessons ADD COLUMN IF NOT EXISTS slug text UNIQUE;

INSERT INTO lessons (id, slug, title, level, min_age, duration_seconds, kid_safe, steps)
VALUES
-- ── Safe Makeup Learning ───────────────────────────────────────────────
('a1000000-0000-4000-8000-000000000001', 'brush_basics', 'Brush Basics', 1, 5, 240, true, '[
  {"text": "Wash your hands. Warm water, twenty seconds — sing the birthday song twice.", "supervision_required": false},
  {"text": "Meet the fluff brush: soft, round, for blending. Hold it near the end of the handle, not the metal.", "supervision_required": false},
  {"text": "Meet the flat brush: for packing colour on. Press, do not drag.", "supervision_required": false},
  {"text": "Small circles, light pressure. If the handle is bending, you are pressing too hard.", "supervision_required": false},
  {"text": "Brushes get washed once a week. Dirty brushes give you spots. Ask a grown-up to show you the Cleaning Coach.", "supervision_required": false}
]'::jsonb),

('a1000000-0000-4000-8000-000000000002', 'shade_matching_kids', 'Shade Matching for Kids', 2, 6, 200, true, '[
  {"text": "Everybody has a depth (how light or deep) and an undertone (warm, cool, neutral or olive). There are no wrong answers.", "supervision_required": false},
  {"text": "Look at the inside of your wrist in daylight. Greenish veins lean warm, bluish lean cool, hard to tell means neutral.", "supervision_required": false},
  {"text": "A shade is tested on the jaw, never the hand — your hand is a different colour from your face.", "supervision_required": false},
  {"text": "The right shade disappears. If you can see where it stops, it is not yours.", "supervision_required": false}
]'::jsonb),

('a1000000-0000-4000-8000-000000000003', 'blush_powder_safety', 'Blush & Powder Safety', 3, 6, 200, true, '[
  {"text": "Tap the brush on the edge of the pot first. Most of the powder should fall off before it gets near your face.", "supervision_required": false},
  {"text": "Smile. The round part of your cheek is where blush goes. Sweep up toward your ear.", "supervision_required": false},
  {"text": "Never near the eyes, and close your eyes when powder is in the air. Breathe out, not in.", "supervision_required": true},
  {"text": "Light hands. You can always add more; taking it off is the hard part.", "supervision_required": false}
]'::jsonb),

('a1000000-0000-4000-8000-000000000004', 'eye_safety', 'Eye Safety', 4, 8, 240, true, '[
  {"text": "Never share mascara or eyeliner with anyone. Not sisters, not best friends. Eye infections travel that way.", "supervision_required": false},
  {"text": "The waterline — the wet edge inside your lashes — is off limits. Liner goes on the skin above the lashes only.", "supervision_required": true},
  {"text": "Mascara: look down, wiggle the wand at the base, sweep up. Never pump the wand in the tube; that pushes air and germs in.", "supervision_required": true},
  {"text": "If it stings, burns, or your eye goes red: stop, rinse with water, and tell a grown-up. Never push through it.", "supervision_required": false},
  {"text": "Mascara is thrown away after three months, opened or not. Write the date on it.", "supervision_required": false}
]'::jsonb),

('a1000000-0000-4000-8000-000000000005', 'skin_care_basics', 'Skin Care Basics', 5, 5, 220, true, '[
  {"text": "Three steps, morning and night: cleanse, moisturise, and in the morning, sunscreen. That is the whole routine.", "supervision_required": false},
  {"text": "Cleanse with lukewarm water and something gentle. Pat dry — do not rub.", "supervision_required": false},
  {"text": "Moisturiser: a pea-sized amount, warmed between your fingers, pressed in. Skin drinks it better than being scrubbed.", "supervision_required": false},
  {"text": "Patch test anything new: a dab behind the ear, wait a day. If nothing happens, it is safe for your face.", "supervision_required": true},
  {"text": "Sunscreen every morning, every skin tone. Deep skin burns too — it just hides it better.", "supervision_required": false}
]'::jsonb),

-- ── Dad School ─────────────────────────────────────────────────────────
('a2000000-0000-4000-8000-000000000001', 'dad_ponytail', 'The puff ponytail', 1, 18, 60, false, '[
  {"text": "Brush from the ends up, a few inches at a time. Never from the root down.", "supervision_required": false},
  {"text": "Gather at the crown with your hand, not the brush. Loose is fine — you tighten last.", "supervision_required": false},
  {"text": "Hair tie: twist once, loop twice. If it hurts when she moves her eyebrows, it is too tight.", "supervision_required": false},
  {"text": "Fluff the puff with your fingertips. Done. She will fix the rest herself, and that is the point.", "supervision_required": false}
]'::jsonb),

('a2000000-0000-4000-8000-000000000002', 'dad_blend', 'What "blend" actually means', 1, 18, 45, false, '[
  {"text": "Blending is making the EDGE disappear, not moving the colour around.", "supervision_required": false},
  {"text": "Small circles, light pressure, at the border where the colour stops.", "supervision_required": false},
  {"text": "Stop when you cannot see where it starts. If you are still going, you are removing it.", "supervision_required": false}
]'::jsonb),

('a2000000-0000-4000-8000-000000000003', 'dad_compliment', 'How to compliment her', 1, 18, 50, false, '[
  {"text": "Praise the effort, not the face. \"You were patient with that line\" lands harder than \"pretty\".", "supervision_required": false},
  {"text": "Be specific. Name the thing she actually did.", "supervision_required": false},
  {"text": "Say it once, mean it, and let it sit. Do not add a \"but\".", "supervision_required": false}
]'::jsonb),

('a2000000-0000-4000-8000-000000000004', 'dad_gift', 'Buying makeup she''ll actually use', 1, 18, 60, false, '[
  {"text": "Ask what she is out of. Not what she wants — what she is OUT of. That is the gift.", "supervision_required": false},
  {"text": "Take a photo of the product she has now. Shade names matter; \"the pink one\" does not exist.", "supervision_required": false},
  {"text": "Same brand, same shade, or a gift card. A wrong shade is a gift she has to pretend about.", "supervision_required": false}
]'::jsonb),

('a2000000-0000-4000-8000-000000000005', 'dad_edges', 'Edges without wrecking them', 1, 18, 60, false, '[
  {"text": "Edges are the baby hairs at the hairline. They break easily. Go gentle or go nowhere.", "supervision_required": false},
  {"text": "A little edge control on a soft brush — a toothbrush is fine. Tiny amounts.", "supervision_required": false},
  {"text": "Lay them in the direction they already grow. Do not pull. Tie a scarf over them for ten minutes.", "supervision_required": false}
]'::jsonb)

ON CONFLICT (id) DO UPDATE
  SET slug = EXCLUDED.slug, title = EXCLUDED.title, level = EXCLUDED.level,
      min_age = EXCLUDED.min_age, duration_seconds = EXCLUDED.duration_seconds,
      kid_safe = EXCLUDED.kid_safe, steps = EXCLUDED.steps;

UPDATE lessons SET published_at = now() WHERE published_at IS NULL AND slug IS NOT NULL;
