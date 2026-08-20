/**
 * Dad + Daughter Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 *
 * Fetches subscription status and locks/unlocks premium features.
 *
 * This is a UI-affordance layer ONLY. The server is the source of truth and
 * returns 402 for an entitlement violation regardless of what the client
 * believes. docs/stripe-flow.md §3.5.
 */
import { useState, useCallback, useMemo } from 'react';
import { useStripe } from '@stripe/stripe-react-native';
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
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
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
   * Create a subscription. Entitlement is granted by the WEBHOOK, never by
   * this function returning — so on success we poll the status endpoint.
   */
  const subscribe = useCallback(async (plan, interval = 'monthly') => {
    setCheckoutStatus('pending');
    try {
      const { clientSecret, ephemeralKey, customerId } =
        await api.post('/stripe/subscription', { plan, interval });

      const { error: initErr } = await initPaymentSheet({
        merchantDisplayName: 'Beauty Bond',
        customerId,
        customerEphemeralKeySecret: ephemeralKey,
        paymentIntentClientSecret: clientSecret,
        allowsDelayedPaymentMethods: false,
      });
      if (initErr) throw new Error(initErr.message);

      const { error } = await presentPaymentSheet();
      if (error) {
        setCheckoutStatus('failed');
        return { status: 'failed', message: error.message };
      }

      const confirmed = await pollForPlan(ctx.reload, plan);
      setCheckoutStatus(confirmed ? 'success' : 'pending');
      return { status: confirmed ? 'success' : 'pending' };
    } catch (e) {
      setCheckoutStatus('failed');
      return { status: 'failed', message: e.message };
    }
  }, [initPaymentSheet, presentPaymentSheet, ctx]);

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

/** Covers the webhook gap shown on the "Finishing up" screen. */
async function pollForPlan(reload, expectedPlan, tries = 8) {
  for (let i = 0; i < tries; i++) {
    await new Promise((r) => setTimeout(r, 750 * (i + 1)));
    const next = await reload();
    if (next?.tier === expectedPlan) return true;
  }
  return false;
}

export default useSubscription;
