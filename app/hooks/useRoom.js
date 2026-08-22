/**
 * Dads & Daughters Beauty Bond™ — a Self-Made Legends LLC (SML) product.
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

/**
 * Accepts an existing roomId, or a { type, name } to create-and-join in one
 * call — the API supports both, and the lobby's "Start" has no room yet.
 */
export function useRoomToken(roomIdOrOptions) {
  const opts = typeof roomIdOrOptions === 'string'
    ? { roomId: roomIdOrOptions }
    : (roomIdOrOptions ?? {});
  const { roomId, type, name } = opts;
  const [state, setState] = useState({ token: null, url: null, capabilities: null, error: null });
  const timer = useRef(null);

  const mint = useCallback(async () => {
    try {
      const body = roomId ? { roomId } : { type, name };
      const data = await api.post('/video/token', body);
      setState({ token: data.token, url: data.url, capabilities: data.capabilities, error: null });
    } catch (e) {
      setState((s) => ({ ...s, error: e }));   // 403 => permission revoked; leave the room
    }
  }, [roomId, type, name]);

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
