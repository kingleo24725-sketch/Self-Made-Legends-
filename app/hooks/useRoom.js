/**
 * Dad + Daughter Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 * Proprietary and confidential. Unauthorized copying, distribution,
 * or use of this file, via any medium, is strictly prohibited.
 *
 * Room tokens are short-lived (10 min). Refresh re-runs the FULL server-side
 * safety check, so a guardian revoking permission mid-call ejects the child.
 * docs/video-rooms.md §5.3.
 */
import { useEffect, useState, useCallback, useRef } from 'react';
import api from '../utils/api';

const REFRESH_MS = 8 * 60 * 1000;   // refresh at 8 min on a 10 min TTL

export function useRoomToken(roomId) {
  const [state, setState] = useState({ token: null, url: null, capabilities: null, error: null });
  const timer = useRef(null);

  const mint = useCallback(async () => {
    try {
      const data = await api.post('/video/token', { roomId });
      setState({ token: data.token, url: data.url, capabilities: data.capabilities, error: null });
    } catch (e) {
      setState((s) => ({ ...s, error: e }));   // 403 => permission revoked; leave the room
    }
  }, [roomId]);

  useEffect(() => {
    mint();
    timer.current = setInterval(mint, REFRESH_MS);
    return () => clearInterval(timer.current);
  }, [mint]);

  return state;
}

/** One tap, no confirmation. A child in trouble never faces "Are you sure?" */
export function usePanic(roomId) {
  return useCallback(async () => {
    try { await api.post(`/video/rooms/${roomId}/panic`); } finally { /* always leave */ }
  }, [roomId]);
}

export default useRoomToken;
