/**
 * Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 *
 * Server-side try-on render. docs/ai-tryon.md §4.2, §4.3, §4.6.
 *
 * TWO RULES THAT CANNOT BE WAIVED:
 *   1. Child accounts NEVER server-render — a U13 face never leaves the device.
 *   2. Geometry lock — cosmetics only. Any landmark drift rejects the render.
 */
const logger = require('../utils/logger');
const { getProvider } = require('./mlProvider');

/** Closed enum. An unknown layer type is rejected at the boundary. */
const ALLOWED_LAYERS = ['lip', 'cheek', 'eye', 'brow', 'lash', 'glow', 'liner'];
const GEOMETRY_TOLERANCE_PX = 0.5;

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

async function render({ assetId, look, shadeProfile, profile }) {
  if (profile.age_band === 'child') {
    const e = new Error('server_render_forbidden_for_minor');
    e.status = 403;
    throw e;
  }

  const safeLook = sanitizeLook(look, profile.age_band);

  const result = await getProvider().render({ assetId, look: safeLook, shadeProfile });

  // GEOMETRY LOCK — there is no override flag.
  if ((result.deltaLandmarkPx ?? 0) > GEOMETRY_TOLERANCE_PX) {
    logger.error({ assetId, delta: result.deltaLandmarkPx }, 'tryon.geometry_violation');
    const e = new Error('render_rejected_geometry_changed');
    e.status = 500;
    throw e;
  }

  return { ...result, safety: { geometryLocked: true, deltaLandmarkPx: result.deltaLandmarkPx } };
}

module.exports = { render, sanitizeLook, ALLOWED_LAYERS, GEOMETRY_TOLERANCE_PX };
