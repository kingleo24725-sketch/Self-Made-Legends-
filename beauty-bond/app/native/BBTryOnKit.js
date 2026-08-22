/**
 * Dad + Daughter Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 * Proprietary and confidential. Unauthorized copying, distribution,
 * or use of this file, via any medium, is strictly prohibited.
 *
 * Bridge to the native on-device try-on module (CoreML / NNAPI + Skia).
 * Pipeline and safety rules: docs/ai-tryon.md §4.2 and §4.6.
 *
 * IMPLEMENTATION NOTE: the native module is built in Phase 3. This JS bridge
 * defines the contract and fails loudly rather than silently returning the
 * source image — a silent no-op would look like a working try-on.
 */
import { NativeModules, Platform } from 'react-native';

const Native = NativeModules.BBTryOnKit;

export async function renderOnDevice({ source, look, style = 'realistic' }) {
  if (!Native) {
    throw new Error(
      'BBTryOnKit native module not linked. Build a dev client — Expo Go cannot load it.'
    );
  }
  const result = await Native.render({
    uri: source.uri,
    layers: look.layers,
    style,
    platform: Platform.OS,
  });

  // Geometry lock — docs/ai-tryon.md §4.6 Rule 1. Enforced natively AND here.
  if (result.deltaLandmarkPx > 0.5) {
    throw new Error('render_rejected_geometry_changed');
  }
  return result;
}

export async function isSupported() {
  if (!Native) return false;
  return Native.isSupported();   // false on low-end devices -> photo mode
}

export default { renderOnDevice, isSupported };
