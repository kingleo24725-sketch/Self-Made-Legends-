/**
 * Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 */
import { useState, useCallback } from 'react';
import { useStripe } from '@stripe/stripe-react-native';
import api from '../utils/api';
import { useSubscriptionContext } from '../context/SubscriptionContext';

export function useSubscription() {
  const ctx = useSubscriptionContext();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [status, setStatus] = useState('idle'); // idle|pending|success|failed

  /**
   * Entitlement is granted by the WEBHOOK, never by this function returning.
   * On success we poll until the server confirms. docs/stripe-flow.md §3.3.
   */
  const checkout = useCallback(async (lookupKey) => {
    setStatus('pending');
    try {
      const { clientSecret, ephemeralKey, customerId } =
        await api.post('/stripe/checkout', { lookupKey });

      const { error: initErr } = await initPaymentSheet({
        merchantDisplayName: 'Beauty Bond',
        customerId,
        customerEphemeralKeySecret: ephemeralKey,
        paymentIntentClientSecret: clientSecret,
        allowsDelayedPaymentMethods: false,
      });
      if (initErr) throw new Error(initErr.message);

      const { error } = await presentPaymentSheet();
      if (error) { setStatus('failed'); return { status: 'failed', message: error.message }; }

      const confirmed = await pollForEntitlement(ctx.reload, ctx.tier);
      setStatus(confirmed ? 'success' : 'pending');
      return { status: confirmed ? 'success' : 'pending' };
    } catch (e) {
      setStatus('failed');
      return { status: 'failed', message: e.message };
    }
  }, [initPaymentSheet, presentPaymentSheet, ctx]);

  const openBillingPortal = useCallback(async () => {
    // Store-sourced subscriptions deep-link to the OS manager instead.
    const { url, source } = await api.post('/stripe/portal');
    return { url, source };
  }, []);

  return { ...ctx, checkout, openBillingPortal, checkoutStatus: status };
}

/** Covers the webhook gap shown on the W-B1 "Finishing up" screen. */
async function pollForEntitlement(reload, previousTier, tries = 8) {
  for (let i = 0; i < tries; i++) {
    await new Promise((r) => setTimeout(r, 750 * (i + 1)));
    const next = await reload();
    if (next?.tier && next.tier !== previousTier) return true;
  }
  return false;
}

export default useSubscription;
