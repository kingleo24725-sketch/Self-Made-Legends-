/**
 * Dad + Daughter Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 * Proprietary and confidential. Unauthorized copying, distribution,
 * or use of this file, via any medium, is strictly prohibited.
 */
const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || '').trim());

/** Rough byte size of a base64 payload, without decoding it. */
function base64Bytes(b64) {
  const data = String(b64 || '').split(',').pop() || '';
  const padding = (data.match(/=+$/) || [''])[0].length;
  return Math.floor((data.length * 3) / 4) - padding;
}

const DATA_URL = /^data:image\/(jpeg|jpg|png|webp);base64,/;

function isImageDataUrl(v) { return DATA_URL.test(String(v || '')); }

module.exports = { isEmail, base64Bytes, isImageDataUrl, DATA_URL };
