/**
 * Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 *
 * AI try-on. docs/ai-tryon.md.
 *
 * TWO RULES THAT CANNOT BE WAIVED:
 *   1. Child accounts NEVER server-render — a U13 face never leaves the device.
 *   2. Geometry lock: cosmetics only. Any facial-landmark drift rejects the
 *      render, whatever the provider claims.
 */
const logger = require('../utils/logger');
const { getProvider } = require('./mlProvider');
const { base64Bytes, isImageDataUrl } = require('../utils/validators');

/**
 * Build an error carrying BOTH a machine code and human copy. The client
 * branches on `code`; the person reads `publicMessage`.
 */
function fail(code, status, publicMessage, recovery) {
  const e = new Error(code);
  e.code = code;
  e.status = status;
  if (publicMessage) e.publicMessage = publicMessage;
  if (recovery) e.recovery = recovery;
  return e;
}

/** Closed enum. An unknown layer type is rejected at the boundary. */
const ALLOWED_LAYERS = ['lip', 'cheek', 'eye', 'brow', 'lash', 'glow', 'liner'];
const GEOMETRY_TOLERANCE_PX = 0.5;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

/**
 * Strip any layer the age band disallows. The client runs the identical
 * function, but a client can be patched — so the server re-applies it.
 */
function sanitizeLook(look, ageBand) {
  const layers = (look.layers || []).filter((l) => {
    if (!ALLOWED_LAYERS.includes(l.type)) {
      logger.warn({ type: l.type }, 'rejected_unknown_layer_type');
      return false;
    }
    return true;
  });

  if (ageBand === 'child') {
    return {
      ...look,
      layers: layers
        .filter((l) => ['lip', 'cheek', 'glow'].includes(l.type))
        .map((l) => ({ ...l, opacity: Math.min(l.opacity ?? 0.5, 0.5), finish: 'sheer' })),
      style: 'playful',
    };
  }
  return { ...look, layers, style: 'realistic' };
}

/**
 * applyLook(image, look, context) -> { processedImageUrl, ... }
 *
 * The single entry point for try-on. `image` is either:
 *   { base64: 'data:image/jpeg;base64,...' }   — the primary path
 *   { assetId: 'ast_...' }                     — pre-uploaded to object storage
 *
 * @param {{base64?: string, assetId?: string}} image
 * @param {{id?: string, layers: Array}} look
 * @param {{profile: object, shadeProfile?: object}} context
 */
async function applyLook(image, look, { profile, shadeProfile } = {}) {
  // ── Rule 1: minors render on-device only ──────────────────────────
  if (profile?.age_band === 'child') {
    throw fail('server_render_forbidden_for_minor', 403,
               'This account renders on-device only.', 'render_on_device');
  }

  if (!look || !Array.isArray(look.layers)) {
    throw fail('look_required', 400, 'Pick a look first.');
  }

  // ── Validate the image payload ────────────────────────────────────
  if (image?.base64) {
    if (!isImageDataUrl(image.base64)) {
      throw fail('invalid_image_format', 422,
                 'That file type is not supported. Use JPEG, PNG, or WebP.', 'retake');
    }
    if (base64Bytes(image.base64) > MAX_IMAGE_BYTES) {
      throw fail('image_too_large', 413,
                 'That photo is too large. Try one under 8MB.', 'retake');
    }
  } else if (!image?.assetId) {
    throw fail('image_required', 400, 'Add a photo to start.');
  }

  const safeLook = sanitizeLook(look, profile?.age_band ?? 'adult');
  if (safeLook.layers.length === 0) {
    throw fail('no_valid_layers', 400, 'Nothing to apply — every layer was rejected.');
  }

  const result = await getProvider().render({
    base64: image.base64,
    assetId: image.assetId,
    look: safeLook,
    shadeProfile,
  });

  // ── Rule 2: geometry lock. There is no override flag. ─────────────
  const drift = result.deltaLandmarkPx;
  if (typeof drift !== 'number') {
    logger.error({ provider: result.provider }, 'provider_omitted_geometry_metric');
    throw fail('render_rejected_unverifiable_geometry', 502);
  }
  if (drift > GEOMETRY_TOLERANCE_PX) {
    logger.error({ drift, provider: result.provider }, 'tryon.geometry_violation');
    throw fail('render_rejected_geometry_changed', 500);
  }

  return {
    renderId: result.renderId,
    processedImageUrl: result.processedImageUrl ?? result.url,
    originalImageUrl: result.beforeUrl ?? null,
    appliedLayers: safeLook.layers.length,
    adjustments: result.adjustments ?? [],
    provider: result.provider,
    safety: { geometryLocked: true, deltaLandmarkPx: drift, cosmeticsOnly: true },
  };
}

/** Back-compat wrapper for callers that pass a flat payload. */
async function render({ assetId, base64, look, shadeProfile, profile }) {
  return applyLook({ assetId, base64 }, look, { profile, shadeProfile });
}

module.exports = {
  applyLook, render, sanitizeLook,
  ALLOWED_LAYERS, GEOMETRY_TOLERANCE_PX, MAX_IMAGE_BYTES,
};
