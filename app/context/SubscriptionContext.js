/**
 * Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 *
 * Mirrors server entitlements for UI affordances ONLY.
 * The server is the source of truth; a client that lies gets a 402.
 * docs/stripe-flow.md §3.5.
 */
import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { AppState } from 'react-native';
import api from '../utils/api';
import { TIERS } from '../utils/constants';

const SubscriptionContext = createContext(null);

/** Capabilities that are NEVER gated. docs/stripe-flow.md §3.1. */
const ALWAYS_FREE = new Set([
  'safety.panic_button', 'safety.report', 'safety.block',
  'guardian.console', 'guardian.permissions',
  'privacy.data_export', 'privacy.account_delete',
  'learning.hygiene', 'legacy.letter_delivery',
]);

const FALLBACK = {
  tier: TIERS.FREE,
  learningMaxLevel: 2, culturalCollections: 1, tryOnPerMonth: 5,
  culturalGlamSets: false, familyRoomMinutesPerMonth: 20, globalRooms: 'listen',
  vaultItems: 3, lettersForward: false, bondBooksPerYear: 0, childSeats: 1,
  creatorTools: false,
};

export function SubscriptionProvider({ children }) {
  const [entitlements, setEntitlements] = useState(FALLBACK);
  const [usage, setUsage] = useState({ tryon: 0, room_minutes: 0 });
  const [loading, setLoading] = useState(true);

  const [plan, setPlan] = useState(null);
  const [status, setStatus] = useState('none');

  const load = useCallback(async () => {
    try {
      const data = await api.get('/stripe/subscription');
      const next = { tier: data.tier, ...data.entitlements };
      setEntitlements(next);
      setUsage(data.usage ?? { tryon: 0, room_minutes: 0 });
      setPlan(data.plan ?? null);
      setStatus(data.status ?? 'none');
      return next;
    } catch {
      // Fail to the FREE tier, never to unlocked.
      setEntitlements(FALLBACK);
      return FALLBACK;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Refetch on foreground — a webhook may have landed while backgrounded.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') load(); });
    return () => sub.remove();
  }, [load]);

  const can = useCallback((capability) => {
    if (ALWAYS_FREE.has(capability)) return true;
    switch (capability) {
      case 'tryon':
        return entitlements.tryOnPerMonth === 'unlimited'
          || usage.tryon < entitlements.tryOnPerMonth;
      case 'cultural.all':      return entitlements.culturalCollections === 'all';
      case 'cultural.glamSets': return !!entitlements.culturalGlamSets;
      case 'legacy.letters':    return !!entitlements.lettersForward;
      case 'rooms.global':      return entitlements.globalRooms === 'full';
      case 'creator.tools':     return !!entitlements.creatorTools;
      default:                  return false;
    }
  }, [entitlements, usage]);

  const canLesson = useCallback(
    (level) => level <= entitlements.learningMaxLevel, [entitlements]);

  const value = useMemo(() => ({
    entitlements, usage, loading, plan, status, can, canLesson, reload: load,
    tier: entitlements.tier ?? TIERS.FREE,
  }), [entitlements, usage, loading, plan, status, can, canLesson, load]);

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
}

export const useSubscriptionContext = () => {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) throw new Error('useSubscriptionContext must be used inside <SubscriptionProvider>');
  return ctx;
};
