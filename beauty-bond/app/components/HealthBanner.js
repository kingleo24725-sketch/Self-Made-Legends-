/**
 * Dad + Daughter Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 * Proprietary and confidential. Unauthorized copying, distribution,
 * or use of this file, via any medium, is strictly prohibited.
 *
 * "Can this phone reach the API?", answered before anyone types a password.
 *
 * Without this, a sleeping or misconfigured server looks identical to a broken
 * app: the sign-in button spins, fails, and says nothing a person can act on.
 * This is the difference between "it doesn't work" and "the server is down".
 *
 * It deliberately does NOT use utils/api.js. That client prefixes /api and
 * attaches auth; /health is mounted at the ROOT of the server (backend
 * src/server.js:48) and must answer with no credentials at all — which is
 * exactly what makes it a usable reachability probe.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';

import { useTheme } from '../context/ThemeContext';
import { HEALTH_URL, EXPECTED_PRODUCT, API_CONFIGURED } from '../utils/config';


/** fetch has no timeout of its own in React Native, so this supplies one. */
async function probe(timeoutMs = 6000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(HEALTH_URL, { signal: controller.signal });
    if (!res.ok) throw new Error(`server answered ${res.status}`);
    const body = await res.json();
    if (body?.ok !== true) throw new Error('server is not healthy');

    /**
     * "Reachable" is not "correct". This app shares a repository and a Stripe
     * account with The Self-Made Legends Come Up, and it spent days pointed at
     * Come Up's Railway deployment — a healthy server that simply is not this
     * product. Checking `ok` alone would have called that a success.
     *
     * /health names the product (backend/src/server.js:48). Trust that, not
     * reachability.
     */
    if (body.product !== EXPECTED_PRODUCT) {
      const err = new Error(`that server is "${body.product ?? 'unknown'}", not Beauty Bond`);
      err.wrongProduct = true;
      throw err;
    }
    return body;
  } catch (err) {
    // A phone on a bad connection should not sit on "Checking…" forever, and
    // an abandoned request should actually be abandoned — racing a timer
    // against fetch would leave the socket open behind the answer.
    if (err.name === 'AbortError') throw new Error('no answer in time');
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export default function HealthBanner({ style }) {
  const t = useTheme();
  const [state, setState] = useState({ status: 'checking' });

  const check = useCallback(() => {
    if (!API_CONFIGURED) {
      setState({
        status: 'down',
        reason: 'this build has no server address set',
        unconfigured: true,
      });
      return undefined;
    }
    let live = true;
    setState({ status: 'checking' });
    probe()
      .then((body) => { if (live) setState({ status: 'up', body }); })
      .catch((err) => {
        if (live) {
          setState({ status: 'down', reason: err.message, wrongProduct: !!err.wrongProduct });
        }
      });
    return () => { live = false; };
  }, []);

  useEffect(check, [check]);

  // A working connection is not news. Saying nothing keeps the first screen
  // calm; the banner only appears when there is something to tell.
  if (state.status === 'up') return null;

  const checking = state.status === 'checking';
  const tone = checking ? t.color.textSecondary : t.color.danger;

  return (
    <View
      accessibilityRole="alert"
      style={[{
        flexDirection: 'row',
        alignItems: 'center',
        gap: t.space[2],
        paddingVertical: t.space[2],
        paddingHorizontal: t.space[3],
        borderRadius: t.radius.lg,
        borderWidth: 1,
        borderColor: tone,
        marginBottom: t.space[3],
      }, style]}
    >
      {checking && <ActivityIndicator size="small" color={tone} />}
      <View style={{ flex: 1 }}>
        <Text style={[t.type('bodySm'), { color: tone }]}>
          {checking
            ? 'Checking the connection…'
            : state.wrongProduct
              ? 'Connected to the wrong service.'
              : "Can't reach Beauty Bond's server."}
        </Text>
        {!checking && (
          <Text style={[t.type('caption'), { color: t.color.textSecondary }]}>
            {state.reason} · Signing in won't work until it answers.
          </Text>
        )}
      </View>
      {!checking && (
        <Pressable onPress={check} accessibilityRole="button"
          accessibilityLabel="try the connection again"
          style={{ minHeight: t.tapTarget, justifyContent: 'center', paddingLeft: t.space[2] }}>
          <Text style={[t.type('bodySm'), { color: t.color.accent }]}>Retry</Text>
        </Pressable>
      )}
    </View>
  );
}
