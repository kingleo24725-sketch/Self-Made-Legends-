/**
 * Dad + Daughter Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 * Proprietary and confidential. Unauthorized copying, distribution,
 * or use of this file, via any medium, is strictly prohibited.
 *
 * Fetches subscription status and locks/unlocks premium features.
 *
 * This is a UI-affordance layer ONLY. The server is the source of truth and
 * returns 402 for an entitlement violation regardless of what the client
 * believes. docs/stripe-flow.md §3.5.
 *
 * BILLING IS OFF IN v1 (utils/config.js -> FEATURES.billing), so the payment
 * sheet — and with it @stripe/stripe-react-native — is not installed. Only
 * `subscribe()` depended on it; every other member here is a plain API call
 * and works unchanged. docs/stripe-flow.md §3.7 holds the restore procedure.
 */
import { useState, useCallback, useMemo } from 'react';
import api from '../utils/api';
import { useSubscriptionContext } from '../context/SubscriptionContext';

/** Plan order, so "at least Premium" is a comparison rather than a list. */
const RANK = { free: 0, basic: 1, premium: 2, family: 3 };

/** Minimum plan required per premium feature. */
const REQUIRES = {
  'lessons.all': 'basic',
  'cultural.all': 'basic',
  'cultural.glamSets': 'basic',
  'tryon.unlimited': 'basic',
  'rooms.global': 'basic',
  'legacy.vault.unlimited': 'premium',
  'legacy.letters': 'premium',
  'rooms.unlimited': 'premium',
  'bondBook': 'premium',
  'creator.tools': 'family',
  'seats.six': 'family',
};

export function useSubscription() {
  const ctx = useSubscriptionContext();
  const [checkoutStatus, setCheckoutStatus] = useState('idle');

  const tier = ctx.tier ?? 'free';

  /** True when the current plan is at least `minimum`. */
  const atLeast = useCallback(
    (minimum) => (RANK[tier] ?? 0) >= (RANK[minimum] ?? 0), [tier]);

  /** Is this specific feature unlocked? */
  const isUnlocked = useCallback((feature) => {
    const required = REQUIRES[feature];
    if (!required) return ctx.can(feature);   // quota-based or always-free
    return atLeast(required);
  }, [ctx, atLeast]);

  /** Inverse, for readability at call sites that gate rendering. */
  const isLocked = useCallback((feature) => !isUnlocked(feature), [isUnlocked]);

  /** What plan would unlock this? Drives the paywall sheet's copy. */
  const requiredPlanFor = useCallback((feature) => REQUIRES[feature] ?? null, []);

  /**
   * v1 takes no payments, so there is nothing to open. This returns the same
   * shape a real checkout returns rather than throwing, because PlanSelection
   * renders the message and a thrown error there would look like a fault.
   *
   * TO RESTORE: npm i @stripe/stripe-react-native, add
   * "@stripe/stripe-react-native" to app.json -> expo.plugins (required on
   * Android — without it the SDK crashes on a non-AppCompat theme), restore
   * StripeProvider in App.js, put back the initPaymentSheet /
   * presentPaymentSheet body and its pollForPlan helper (both in git history
   * at the commit that removed them), set
   * extra.features.billing = true, and make a NEW build. A native module is
   * never a flag flip alone.
   *
   * Entitlement is granted by the WEBHOOK, never by this function returning —
   * so the restored body must keep polling the status endpoint afterwards.
   */
  const subscribe = useCallback(async () => {
    setCheckoutStatus('unavailable');
    return {
      status: 'unavailable',
      message: 'Beauty Bond is free in this version — there is nothing to buy yet.',
    };
  }, []);

  const cancel = useCallback(async () => {
    const res = await api.post('/stripe/subscription/cancel');
    await ctx.reload();
    return res;   // { accessUntil } — they keep what they paid for
  }, [ctx]);

  const openBillingPortal = useCallback(async () => {
    // Store-sourced subscriptions deep-link to the OS manager instead.
    return api.post('/stripe/portal');
  }, []);

  return useMemo(() => ({
    ...ctx,
    tier,
    plan: ctx.plan,
    isFree: tier === 'free',
    isPremium: (RANK[tier] ?? 0) >= RANK.premium,
    atLeast,
    isUnlocked,
    isLocked,
    requiredPlanFor,
    subscribe,
    cancel,
    openBillingPortal,
    checkoutStatus,
  }), [ctx, tier, atLeast, isUnlocked, isLocked, requiredPlanFor,
       subscribe, cancel, openBillingPortal, checkoutStatus]);
}

export default useSubscription;
