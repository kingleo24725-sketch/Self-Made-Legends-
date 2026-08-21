/**
 * Dads & Daughters Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 * Proprietary and confidential. Unauthorized copying, distribution,
 * or use of this file, via any medium, is strictly prohibited.
 *
 * docs/ai-tryon.md — Path A (on-device) is the default for every account.
 * Path B (server render) is UNAVAILABLE to child accounts: a U13 face image
 * never leaves the device, ever.
 */
import { useCallback, useState } from 'react';
import api from '../utils/api';
import { useAuth } from './useAuth';
import { useSubscription } from './useSubscription';
import { sanitizeLook } from '../utils/validators';
import { AGE_BANDS } from '../utils/constants';
import { renderOnDevice } from '../native/BBTryOnKit';

export function useTryOn() {
  const { profile } = useAuth();
  const { can } = useSubscription();
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState(null);

  const apply = useCallback(async (look, source) => {
    setError(null);

    if (!can('tryon')) {
      const err = new Error('upgrade_required');
      err.isUpgradeRequired = true;
      setError(err);
      throw err;
    }

    const ageBand = profile?.ageBand ?? AGE_BANDS.ADULT;
    const safeLook = sanitizeLook(look, ageBand);
    const mustStayLocal = ageBand === AGE_BANDS.CHILD;

    setRendering(true);
    try {
      if (mustStayLocal || source.kind === 'live') {
        return await renderOnDevice({
          source,
          look: safeLook,
          // Child accounts get stylized pigment, never photoreal cosmetics.
          style: mustStayLocal ? 'playful' : 'realistic',
        });
      }

      const upload = await uploadEphemeral(source);
      return await api.post('/tryon/render', {
        assetId: upload.assetId,
        look: safeLook,
        shadeProfileId: profile?.shadeProfileId,
      });
    } catch (e) {
      setError(e);
      throw e;
    } finally {
      setRendering(false);
    }
  }, [profile, can]);

  return { apply, rendering, error };
}

async function uploadEphemeral(source) {
  const { assetId, uploadUrl } = await api.post('/tryon/upload-url', {
    contentType: source.mimeType ?? 'image/jpeg',
    bytes: source.bytes ?? 0,
  });
  const blob = await (await fetch(source.uri)).blob();
  await fetch(uploadUrl, { method: 'PUT', body: blob });
  return { assetId };
}

export default useTryOn;
