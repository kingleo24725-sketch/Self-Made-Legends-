# 04 — AI Try-On Integration

> **BEAUTY BOND™ — A SELF-MADE LEGENDS LLC (SML) PRODUCT**
> © 2026 **Self-Made Legends LLC (SML)**. All rights reserved.
> Owner: **Self-Made Legends LLC (SML)** · Proprietary and confidential.
> A standalone SML product — **not** part of The Self-Made Legends Come Up.

Two rendering paths, one contract:

- **Path A — On-device AR (default).** Live 30 fps preview. Nothing leaves the phone.
- **Path B — Server render (opt-in).** Single photo, higher fidelity, for saved looks
  and Bond Book exports.

**Path A is the default for every account. Path B is unavailable to child accounts
entirely** — a U13 face image never leaves the device, ever.

---

## 4.1 Frontend Upload / Capture Flow

```
Entry (Try-On tab · "Try it on" from a lesson, product, or Legacy look)
   │
   ├─▶ Consent gate (W-41) ─── first run only ──▶ decline ──▶ Preset browse, no camera
   │
   ├─▶ OS permission (camera / photo library)
   │
   ├─▶ Source picker
   │     ├── Live camera  ──▶ PATH A (on-device AR)
   │     ├── Take a photo ──▶ PATH A, then optional PATH B
   │     └── Choose photo ──▶ validation ──▶ PATH A/B
   │
   ├─▶ Validation  ── fail ──▶ actionable error, never a dead end
   │     • exactly one face detected
   │     • face ≥ 25% of frame height
   │     • luminance in range, not blown out
   │     • not already heavily filtered (we ask for a clean base)
   │
   ├─▶ RENDER ──▶ Layer editor (lip / cheek / eye / brow / lash / glow)
   │
   └─▶ Output
         ├── Save to Makeup Bag look
         ├── Save to Memory Gallery  (shared look ⇒ all-party consent)
         ├── Shop this look     [adults only]
         ├── Add to wishlist    [teens]
         └── (U13: Save only — no share, no commerce)
```

### Client implementation (React Native)

```ts
// apps/mobile/src/features/tryon/useTryOn.ts
import { useProfile } from '@/features/profile'
import { renderOnDevice } from '@/native/BBTryOnKit'   // Vision/MLKit + Skia bridge

export function useTryOn() {
  const profile = useProfile()

  async function apply(look: LookSpec, source: ImageSource) {
    // HARD RULE: minors never round-trip to the server.
    const mustStayLocal = profile.ageBand === 'child'

    if (mustStayLocal || source.kind === 'live') {
      return renderOnDevice({
        source,
        look: sanitizeLook(look, profile.ageBand),
        // Child accounts get stylized pigment, never photoreal cosmetics.
        style: profile.ageBand === 'child' ? 'playful' : 'realistic',
      })
    }

    // Adults/teens, still-photo, opt-in high-fidelity path
    const upload = await uploadEphemeral(source)   // presigned, 24h TTL, SSE-KMS
    return api.post('/v1/tryon/render', {
      assetId: upload.assetId,
      look: sanitizeLook(look, profile.ageBand),
      shadeProfileId: profile.shadeProfileId,
    })
  }

  return { apply }
}
```

`sanitizeLook()` is the enforcement point for §4.6 — it strips any layer the age band
disallows *before* the request is built, and the server re-applies the same rules
because a client can be patched.

### Validation error copy (never blame the user)

| Failure | Copy | Recovery |
|---|---|---|
| No face | "We can't find a face in this one." | Retake / choose another |
| Multiple faces | "Looks like more than one person. Pick who to glam." | Face chooser |
| Too dark | "It's a little dark. Try facing a window." | Live lighting HUD |
| Blown out | "Too bright — the color won't read true." | Retake |
| Too small | "Move a bit closer." | Live distance HUD |
| Heavily filtered | "This photo already has a filter. A clean photo matches better." | Continue anyway / retake |

---

## 4.2 Rendering Pipeline

```
INPUT IMAGE / FRAME
   │
 ① FACE DETECTION            BlazeFace (on-device) · RetinaFace (server)
   │                          → bbox, confidence; reject if none / ambiguous
   │
 ② LANDMARK MESH             MediaPipe FaceMesh — 468 points + iris
   │                          → stable across frames via One-Euro filter
   │
 ③ SEMANTIC SEGMENTATION     BiSeNet-v2 face-parsing (19 classes)
   │                          → lips, eyes, brows, skin, hair, teeth masks
   │                          → matting pass for soft edges (no hard cutouts)
   │
 ④ LIGHTING ESTIMATION       Per-region luminance + white-balance estimate
   │                          → so a shade renders true on deep AND fair skin
   │
 ⑤ SHADE RESOLUTION          Product shade (sRGB→CIELAB) × user undertone
   │                          → ΔE-corrected target color
   │
 ⑥ LAYER COMPOSITE           Per-layer blend, back-to-front:
   │                            base → cheek → eye → brow → lash → lip → glow
   │                          Blend modes: multiply (pigment), soft-light
   │                          (sheen), screen (highlight). Alpha per layer.
   │                          Skin texture is PRESERVED — we tint, never repaint.
   │
 ⑦ SAFETY FILTER  ◄── §4.6   Geometry lock: assert output landmarks == input
   │                          landmarks. Any deviation ⇒ reject the render.
   │
 OUTPUT (preview frame · saved render · Bond Book asset)
```

**Performance budget (Path A):** ①–② 8 ms · ③ 12 ms · ④–⑥ 10 ms · ⑦ 2 ms →
**~32 ms/frame ≈ 30 fps** on an A14 / Snapdragon 888 class device. Below that class,
the app drops to photo mode automatically rather than shipping drifting AR that
lands lipstick on a cheek.

### Model inventory

| Stage | Model | Size | Runtime |
|---|---|---|---|
| Detection | BlazeFace | 1.2 MB | CoreML / NNAPI |
| Landmarks | FaceMesh (468) | 2.6 MB | CoreML / NNAPI |
| Segmentation | BiSeNet-v2 (quantized int8) | 5.8 MB | CoreML / NNAPI |
| Matting | MODNet-lite | 3.1 MB | CoreML / NNAPI |
| Server refine | BiSeNet-v2 fp32 + SR upscale | 190 MB | Triton / A10G |

All on-device models ship **in the app bundle** — try-on works offline.

> **Training-data commitment (binding):** SML trains and fine-tunes these models
> **only** on licensed, consented datasets with documented per-subject release, plus
> SML-commissioned shoots. **No user-submitted image is ever used for training, and no
> minor's image is used for any purpose beyond rendering the frame in front of them.**
> Training sets must be balanced across the full Fitzpatrick range and audited for
> per-tone segmentation accuracy before any model ships (§4.7).

---

## 4.3 Backend API

### `POST /v1/tryon/upload-url`

Presigned ephemeral upload. **403 for child accounts.**

```jsonc
// → request
{ "contentType": "image/jpeg", "bytes": 2418123 }

// ← response
{
  "assetId": "ast_01J8X...",
  "uploadUrl": "https://uploads.beautybond.sml/...&X-Amz-Expires=600",
  "expiresAt": "2026-08-20T14:31:00Z",
  "deleteAfter": "2026-08-21T14:21:00Z"   // 24h hard TTL, lifecycle-enforced
}
```

### `POST /api/tryon`

The primary endpoint. Accepts a **base64 data URL** (or a pre-uploaded `assetId`)
plus a look, and returns `processedImageUrl`.

```jsonc
// -> request
{
  "image": { "base64": "data:image/jpeg;base64,/9j/4AAQSkZJRgABA..." },
  "look": {
    "id": "soft_glam",
    "layers": [
      { "type": "lip",   "productId": "prd_fenty_icon_mvp", "shadeId": "shd_mvp",
        "opacity": 0.85, "finish": "matte" },
      { "type": "cheek", "shadeId": "shd_happy", "opacity": 0.45, "finish": "dewy" },
      { "type": "glow",  "shadeId": "shd_champagne", "opacity": 0.35 }
    ]
  }
}

// <- 200
{
  "renderId": "rnd_9f2c...",
  "processedImageUrl": "https://cdn.beautybond.sml/renders/rnd_9f2c.jpg",
  "originalImageUrl":  "https://cdn.beautybond.sml/renders/rnd_9f2c_before.jpg",
  "appliedLayers": 3,
  "adjustments": [
    { "layer": "lip", "note": "lip chroma boosted for depth 12 (anti-ashiness)" }
  ],
  "provider": "mock",
  "safety": { "geometryLocked": true, "deltaLandmarkPx": 0, "cosmeticsOnly": true }
}
```

**Error responses** — every one carries a machine `error` code, human `message`,
and where useful a `recovery` hint the client turns into a button:

| Status | `error` | When |
|---|---|---|
| 400 | `look_required` | No look supplied |
| 400 | `image_required` | Neither `base64` nor `assetId` |
| 400 | `no_valid_layers` | Every layer was disallowed (e.g. all geometry ops) |
| 403 | `server_render_forbidden_for_minor` | Child account — render on-device |
| 413 | `image_too_large` | Over 8 MB |
| 422 | `invalid_image_format` | Not JPEG/PNG/WebP |
| 402 | `upgrade_required` | Free-tier try-on quota exhausted |
| 500 | `render_rejected_geometry_changed` | Geometry lock tripped (§4.6) |
| 502 | `render_rejected_unverifiable_geometry` | Provider omitted the drift metric |

### The service function

```js
// services/aiService.js
const result = await aiService.applyLook(
  { base64 },                                   // or { assetId }
  { id: 'soft_glam', layers: [...] },
  { profile, shadeProfile },
);
// -> { processedImageUrl, originalImageUrl, appliedLayers, adjustments, safety }
```

`applyLook()` is the single entry point. It sanitizes the look for the caller's age
band, validates the image, calls the provider, and **enforces the geometry lock on
the way out** — so no route can bypass those checks by calling the provider directly.

### `GET /v1/tryon/presets?ageBand=&cultures[]=`

Returns only presets legal for the caller's age band.

### `POST /v1/tryon/save`

```jsonc
{ "renderId": "rnd_01J8X...", "destination": "memory_gallery",
  "sharedWith": ["prf_zaria"], "caption": "Pizza night twins" }
```

If `sharedWith` includes another profile, the render enters `pending_consent` and the
other party (or their guardian) must approve before it appears in either gallery.

### Server render service

```ts
// services/tryon/src/render.ts
export async function render(req: RenderRequest, ctx: Ctx): Promise<RenderResult> {
  if (ctx.profile.ageBand === 'child') throw new Forbidden('server_render_forbidden_for_minor')

  const image = await fetchEphemeral(req.assetId, ctx.profile.id)
  const faces = await detect(image)
  if (faces.length === 0) throw new Unprocessable('no_face_detected')
  if (faces.length > 1 && !req.faceIndex) throw new Unprocessable('multiple_faces')

  const face = faces[req.faceIndex ?? 0]
  const mesh = await landmarks(image, face)
  const masks = await segment(image, face)
  const light = estimateLighting(image, masks)

  // Server re-applies age rules — never trust the client's sanitizeLook()
  const look = sanitizeLook(req.look, ctx.profile.ageBand)

  let out = image
  for (const layer of orderLayers(look.layers)) {
    const target = resolveShade(layer, ctx.shadeProfile, light)   // §4.4
    out = composite(out, masks[layer.type], target, layer)
  }

  // §4.6 geometry lock — non-negotiable
  const after = await landmarks(out, face)
  const drift = maxLandmarkDelta(mesh, after)
  if (drift > 0.5 /* px */) {
    metrics.increment('tryon.geometry_violation')
    throw new Internal('render_rejected_geometry_changed')
  }

  const stored = await putSigned(out, { ttlHours: 1 })
  await deleteEphemeral(req.assetId)          // source gone immediately on success

  return { renderId: stored.id, url: stored.url,
           safety: { geometryLocked: true, deltaLandmarkPx: drift } }
}
```

---

## 4.4 Shade Resolution

The hard problem: the same lipstick reads completely differently on depth 3 vs
depth 14 skin. Naive alpha-blending makes deep skin look chalky — the single most
common failure in try-on apps, and one users read as exclusion.

```ts
function resolveShade(layer: Layer, profile: ShadeProfile, light: Lighting): Lab {
  const base = sRGBtoLab(catalog.shade(layer.shadeId).hex)
  const skin = profile.labMean                       // user's measured skin in Lab

  // 1. Normalize the shade for the lighting the photo was actually taken in
  const lit = applyIlluminant(base, light.illuminant)

  // 2. Undertone correction — warm skin pushes a+ b+, cool pulls back
  const corrected = shiftForUndertone(lit, profile.undertone)

  // 3. Contrast preservation: on deep skin, a sheer pigment must be rendered with
  //    HIGHER chroma, not higher lightness, or it goes ashy.
  const depthFactor = clamp((skin.L - 20) / 60, 0, 1)   // 0 = deepest, 1 = fairest
  corrected.C *= 1 + (1 - depthFactor) * 0.35           // boost chroma on deep skin
  corrected.L = mix(corrected.L, skin.L, layer.finish === 'sheer' ? 0.35 : 0.12)

  return corrected
}
```

**Finish behavior:**

| Finish | Blend | Extra |
|---|---|---|
| Matte | multiply | texture preserved, no specular |
| Satin | multiply + 8% soft-light | slight specular along the mesh normal |
| Dewy | multiply + 18% soft-light | specular highlight follows light estimate |
| Metallic | multiply + screen sparkle map | anisotropic along lip/lid curve |
| Sheer | 35% alpha, skin luminance retained | never masks skin texture |

**QA gate:** every shipped preset is rendered against a **16-tone reference panel**
(depth 1–16 × 4 undertones = 64 faces). A preset fails review if any tone shows
ΔE > 12 from the artist-approved target, or if the ashiness metric
(chroma loss vs. reference) exceeds 15% on depths 11–16.

---

## 4.5 Glam Presets & Cultural Glam Sets

### Universal presets

| Preset | Layers | Notes |
|---|---|---|
| **Everyday** | brow, sheer lip, light cheek | The 3-minute face |
| **Soft Glam** | + neutral lid, lash, glow | Default recommendation |
| **Date Night** | + defined liner, bold lip, contour | 13+ |
| **Festival** | glitter glow, graphic liner, color | Playful, all ages (stylized for U13) |
| **Bridal** | full base, long-wear, precise liner | 16+ |
| **No-Makeup Makeup** | brow, balm, sheer glow | Most-used by dads learning |
| **Little Legend** | sparkle, sticker, face-paint pigment | U13 only — stylized by design |

### Cultural Glam Sets

Each set is authored **with** the collection's Cultural Advisor (§1.4 M04) and ships
with a technique lesson, credited artist, and Respect note. These are not
"skins" — each carries provenance.

| Set | Signature looks | Rendering notes |
|---|---|---|
| **Black Beauty Glam** | Bold matte lip on deep skin · glossy nude · laid edges · gold-glow highlight · graphic liner | Chroma-boost path is critical; ashiness gate is strictest here |
| **Latina Glam** | Defined brow architecture · glossy overlined lip · bronzed olive base · quinceañera full glam | Olive undertone requires a green-axis correction, not just warm |
| **Middle Eastern Glam** | Modern kohl-inspired liner · smoked halo eye · henna-toned lip · bridal gold | Kohl look uses safe modern liner only — never traditional kohl (lead) |
| **Asian Glam** | Straight soft brow · gradient lip · dewy glass skin · monolid-optimized liner · S. Asian festival gold | Liner path must be **monolid-aware** — a crease-based liner renders wrong |
| **Indigenous Glam** | Contemporary looks by Indigenous artists · plant-pigment-inspired palettes | **Excludes** any sacred or ceremonial design. Advisor-gated. |
| **Mixed Heritage Glam** | Cross-undertone blends · seasonal-shift looks | Dual-undertone interpolation |

**Preset schema:**

```jsonc
{
  "id": "glam_black_bold_lip",
  "name": "Bold Lip, Deep Skin",
  "collection": "black_beauty",
  "advisorApprovedAt": "2026-05-12T00:00:00Z",
  "credit": { "artist": "Imani W.", "role": "Lead MUA", "profileId": "prf_..." },
  "minAge": 13,
  "tierRequired": "bond",
  "layers": [ /* … */ ],
  "toneRange": [1, 16],
  "qaPanelPassedAt": "2026-05-20T00:00:00Z",
  "lessonId": "lsn_bold_lip_deep_skin",
  "respectNoteId": "rsp_black_beauty"
}
```

Preset without `advisorApprovedAt` or `qaPanelPassedAt` **cannot be published** —
enforced in the CMS publish step, not by editorial habit.

---

## 4.6 Safety Rules — Non-Negotiable

These are enforced in code, tested in CI, and monitored in production.

### Rule 1 — Cosmetics only, never geometry

The pipeline may change **color and sheen inside a segmentation mask**. It may never:

- reshape the face, jaw, nose, chin, or eyes
- slim, widen, or warp any region
- smooth, blur, or retouch skin texture
- remove blemishes, scars, freckles, moles, or birthmarks
- whiten teeth or eyes
- lighten or darken overall skin tone
- alter body shape anywhere in frame

**Enforcement:** step ⑦ re-runs landmark detection on the output and asserts
`maxLandmarkDelta ≤ 0.5 px`. Any drift rejects the render and fires a
`tryon.geometry_violation` alert. There is no override flag. Skin-texture retention is
verified by a high-frequency energy check: output must retain ≥ 95% of input
texture energy inside the skin mask.

```ts
// CI test — this must never be deleted
it('rejects any render that alters facial geometry', async () => {
  const evil = { ...LOOK, layers: [...LOOK.layers, { type: 'reshape', jaw: -0.2 } as any] }
  await expect(render({ look: evil, assetId: FIXTURE }, ctx))
    .rejects.toThrow(/geometry|unsupported_layer/)
})

it('preserves skin texture energy', async () => {
  const out = await render({ look: FULL_GLAM, assetId: FIXTURE }, ctx)
  expect(textureEnergy(out, SKIN_MASK) / textureEnergy(FIXTURE, SKIN_MASK))
    .toBeGreaterThan(0.95)
})
```

### Rule 2 — Minors render on-device only

| | Child (U13) | Teen (13–17) | Adult |
|---|---|---|---|
| On-device AR | ✅ | ✅ | ✅ |
| Server render | ❌ **403** | ✅ opt-in | ✅ opt-in |
| Image leaves device | **Never** | Only on explicit save | Only on explicit save |
| Photoreal cosmetics | ❌ stylized only | ✅ | ✅ |
| Share externally | ❌ | ✅ w/ guardian setting | ✅ |
| Shop link | ❌ | wishlist only | ✅ |
| Used for training | **Never** | Never | Never |

### Rule 3 — Retention

| Asset | TTL |
|---|---|
| Ephemeral upload | **24 h hard** (S3 lifecycle), deleted immediately on successful render |
| Signed render URL | 1 h |
| Unsaved render | 24 h |
| Saved render | Until the user deletes it, then purged from source, thumbs, and CDN ≤ 24 h |
| Any minor's source image | Never stored server-side at all |

### Rule 4 — No beauty scoring

No symmetry score, skin-quality grade, "glow-up" percentage, attractiveness rating, or
before/after "improvement" framing. Before/after is presented as **"with / without
makeup"**, never as "worse / better." Copy is reviewed against this rule at design QA.

### Rule 5 — No skin-tone alteration, in any direction

Skin-lightening and tanning effects do not exist in the layer schema. `type` is a
closed enum: `lip | cheek | eye | brow | lash | glow | liner`. An unknown layer type is
rejected at the API boundary, not silently ignored.

---

## 4.7 Fairness Testing (release gate)

Before any model or preset ships:

| Metric | Threshold | Measured on |
|---|---|---|
| Face-detection recall | ≥ 99.0% **per Fitzpatrick group I–VI** | 6 × 500 image panel |
| Landmark error (NME) | ≤ 2.5% per group, **max/min group ratio ≤ 1.15** | same |
| Lip/eye segmentation IoU | ≥ 0.92 per group | same |
| Monolid liner placement | ≥ 0.90 IoU on monolid subset | dedicated set |
| Texture-hair robustness | No mask bleed into 4A–4C hair or locs | dedicated set |
| Ashiness (depth 11–16) | Chroma loss < 15% vs. artist reference | 16-tone panel |
| Shade ΔE | ≤ 12 across all 64 panel faces | 16-tone panel |

**A model that performs worse on darker skin does not ship.** The max/min ratio gate
exists specifically so aggregate accuracy can't hide a failing subgroup. Results are
published to the internal model card each release.

---

## 4.8 Failure & Degradation

| Condition | Behavior |
|---|---|
| Low-end device | Auto-drop to photo mode; banner: "Live try-on needs a faster camera — photos still work." |
| Offline | On-device path fully works. Server path queues; presets and Makeup Bag cached. |
| Server render down | Fall back to on-device render; save at lower fidelity; never block the user |
| Model confidence low | Show it: "This match is a rough guess in this lighting." Never fake certainty. |
| Geometry violation | Reject render, log, alert. User sees a generic retry — never a broken face. |
| Segmentation bleed onto hair | Detected by mask-overlap check → reduce layer opacity and flag for QA |

---

*Continue to `video-rooms.md`.*
