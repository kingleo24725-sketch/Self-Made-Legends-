/**
 * Dad + Daughter Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 * Proprietary and confidential. Unauthorized copying, distribution,
 * or use of this file, via any medium, is strictly prohibited.
 *
 * Mirrors server entitlements for UI affordances ONLY.
 * The server is the source of truth; a client that lies gets a 402.
 * docs/stripe-flow.md §3.5.
 */
import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { AppState } from 'react-native';
import api from '../utils/api';
import { TIERS } from '../utils/constants';
import { featureOn } from '../utils/config';
import { useAuthContext } from './AuthContext';

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
  const { status: authStatus } = useAuthContext();
  const signedIn = authStatus === 'authed' || authStatus === 'consent_pending';

  const [entitlements, setEntitlements] = useState(FALLBACK);
  const [usage, setUsage] = useState({ tryon: 0, room_minutes: 0 });
  const [loading, setLoading] = useState(true);

  const [plan, setPlan] = useState(null);
  const [status, setStatus] = useState('none');

  /**
   * Two sources, deliberately separate.
   *
   * /me/entitlements is what this profile may DO. The server applies
   * V1_UNGATED there when billing is off — vault unlimited, Letters Forward
   * on — so it is the only endpoint that tells the truth in v1.
   *
   * /stripe/subscription is what this account PAYS. It 503s when billing is
   * not configured, and this provider used to read entitlements from it: the
   * catch fell through to FALLBACK, the free tier, and the UI showed locks on
   * the exact features v1 gives away while the server was happily allowing
   * them. It is now asked only when billing is on, and only for plan/status.
   *
   * Neither is asked while signed out. There is no entitlement to fetch for
   * nobody, and the old unconditional fetch put a 401 in the console on every
   * fresh load of the Welcome screen.
   */
  const load = useCallback(async () => {
    if (!signedIn) {
      setEntitlements(FALLBACK);
      setLoading(false);
      return FALLBACK;
    }
    try {
      const me = await api.get('/me/entitlements');
      const next = { ...FALLBACK, ...me.entitlements };
      setEntitlements(next);
      setUsage(me.usage ?? { tryon: 0, room_minutes: 0 });

      if (featureOn('billing')) {
        const sub = await api.get('/stripe/subscription').catch(() => null);
        setPlan(sub?.plan ?? null);
        setStatus(sub?.status ?? 'none');
      }
      return next;
    } catch {
      // Fail to the FREE tier, never to unlocked.
      setEntitlements(FALLBACK);
      return FALLBACK;
    } finally {
      setLoading(false);
    }
  }, [signedIn]);

  useEffect(() => { load(); }, [load]);

  // Refetch on foreground — a webhook may have landed while backgrounded.
  // Only meaningful for a signed-in account with billing to reconcile.
  useEffect(() => {
    if (!signedIn) return undefined;
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') load(); });
    return () => sub.remove();
  }, [load, signedIn]);

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
