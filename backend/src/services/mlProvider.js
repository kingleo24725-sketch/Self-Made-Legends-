/**
 * Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 *
 * Vision/ML provider abstraction for AI try-on.
 *
 * Ships with a MOCK provider so the whole pipeline runs end-to-end in
 * development, but the interface is the real one: swapping in a hosted
 * Vision API means implementing `render()` and setting ML_PROVIDER.
 *
 * Every provider MUST honor the §4.6 contract:
 *   - cosmetics only; return `deltaLandmarkPx` so the caller can enforce the
 *     geometry lock
 *   - never persist the source image beyond the request
 *   - never use submitted imagery for training
 */
const crypto = require('crypto');
const config = require('../config');
const logger = require('../utils/logger');

/* ── Provider interface ───────────────────────────────────────────── */

/**
 * @typedef {Object} RenderResult
 * @property {string} renderId
 * @property {string} url            processed image URL
 * @property {string} beforeUrl      original, for the before/after compare
 * @property {number} deltaLandmarkPx  facial-landmark drift; >0.5 is rejected
 * @property {Array<{layer:string,note:string}>} adjustments
 */

/* ── Mock provider ────────────────────────────────────────────────── */

const MOCK_LATENCY_MS = 400;

const mockProvider = {
  name: 'mock',

  async detect() {
    return { faces: 1, confidence: 0.97 };
  },

  /**
   * Deterministic mock: derives a stable render id from the input so repeat
   * calls return the same URL, and echoes shade adjustments that a real
   * provider would make. Returns geometry drift of exactly 0 — a mock must
   * never fake a violation, and must never fake a *pass* it didn't compute.
   */
  async render({ assetId, base64, look, shadeProfile }) {
    await new Promise((r) => setTimeout(r, MOCK_LATENCY_MS));

    // Deterministic id from whichever input we were given, so repeat calls
    // with the same photo and look return the same URL.
    const fingerprint = base64
      ? crypto.createHash('sha256').update(base64).digest('hex').slice(0, 16)
      : String(assetId);

    const renderId = 'rnd_' + crypto
      .createHash('sha256')
      .update(`${fingerprint}:${JSON.stringify(look.layers)}`)
      .digest('hex')
      .slice(0, 24);

    const adjustments = (look.layers || []).map((l) => ({
      layer: l.type,
      note: describeAdjustment(l, shadeProfile),
    }));

    return {
      renderId,
      processedImageUrl: `${config.mock.mediaBaseUrl}/renders/${renderId}.jpg`,
      url: `${config.mock.mediaBaseUrl}/renders/${renderId}.jpg`,   // alias
      beforeUrl: `${config.mock.mediaBaseUrl}/renders/${renderId}_before.jpg`,
      deltaLandmarkPx: 0,
      appliedLayers: (look.layers || []).length,
      adjustments,
      provider: 'mock',
    };
  },

  async extractShade() {
    return {
      depthMin: 9, depthMax: 10, undertone: 'warm',
      lab: { L: 42.1, a: 12.4, b: 18.9 },
      confidence: 0.82,
    };
  },
};

/**
 * Explains what a real pipeline would do to the shade for this skin.
 * Deep skin needs a CHROMA boost, not a lightness boost, or it goes ashy —
 * docs/ai-tryon.md §4.4.
 */
function describeAdjustment(layer, shadeProfile) {
  if (!shadeProfile) return `${layer.type} applied at default shade`;
  const depth = shadeProfile.depth_max ?? shadeProfile.depthMax ?? 8;
  if (depth >= 11) return `${layer.type} chroma boosted for depth ${depth} (anti-ashiness)`;
  if (shadeProfile.undertone === 'olive') return `${layer.type} shifted on the green axis for olive undertone`;
  return `${layer.type} adjusted ${shadeProfile.undertone ?? 'neutral'} for undertone`;
}

/* ── HTTP provider (real Vision/ML service) ───────────────────────── */

const httpProvider = {
  name: 'http',

  async detect(payload) { return call('/internal/ml/detect', payload); },
  async render(payload) { return call('/internal/ml/render', payload); },
  async extractShade(payload) { return call('/internal/ml/shade-extract', payload); },
};

async function call(path, payload) {
  const res = await fetch(`${config.ml.serviceUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(body.error || 'ml_service_error');
    err.status = res.status === 422 ? 422 : 502;
    err.recovery = body.recovery;
    throw err;
  }
  return res.json();
}

/* ── Selection ────────────────────────────────────────────────────── */

const providers = { mock: mockProvider, http: httpProvider };

function getProvider() {
  const name = config.ml.provider;
  const provider = providers[name];
  if (!provider) throw new Error(`unknown ML provider: ${name}`);
  if (name === 'mock' && config.env === 'production') {
    // A mock in production would return fake renders to real families.
    throw new Error('refusing to use the mock ML provider in production');
  }
  return provider;
}

logger.info({ provider: config.ml.provider }, 'ml_provider_selected');

module.exports = { getProvider, providers, mockProvider, httpProvider };
