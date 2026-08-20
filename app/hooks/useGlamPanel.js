/**
 * Dad + Daughter Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 *
 * Shared Glam Panel state over the LiveKit data channel.
 * "Everyone try it" renders LOCALLY on each device — no face image ever
 * crosses the room. docs/video-rooms.md §5.5.
 */
import { useState, useCallback } from 'react';
import api from '../utils/api';

export function useGlamPanel(roomId, { isHost, send }) {
  const [state, setState] = useState(null);

  const onMessage = useCallback((raw) => {
    const msg = JSON.parse(new TextDecoder().decode(raw));
    if (msg.t === 'state') {
      // Last-writer-wins; ignore stale packets from a reconnecting peer.
      setState((prev) => (!prev || msg.state.updatedAt > prev.updatedAt ? msg.state : prev));
    }
    return msg;
  }, []);

  const advance = useCallback((step) => {
    if (!isHost) return send({ t: 'request_step', step });
    const next = { ...state, step, updatedAt: Date.now() };
    setState(next);
    send({ t: 'state', state: next });
    api.post(`/video/rooms/${roomId}/glam`, next).catch(() => {});  // persist for late joiners
  }, [isHost, state, send, roomId]);

  const everyoneTryIt = useCallback(() => {
    if (state?.shadeId) send({ t: 'try_local', shadeId: state.shadeId });
  }, [state, send]);

  return { state, setState, onMessage, advance, everyoneTryIt };
}

export default useGlamPanel;
