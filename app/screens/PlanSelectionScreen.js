/**
 * Dad + Daughter Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 * Proprietary and confidential. Unauthorized copying, distribution,
 * or use of this file, via any medium, is strictly prohibited.
 *
 * No countdown timers, no fake scarcity, no dark patterns.
 * "Safety features are free, always" is permanent and non-negotiable.
 * docs/wireframes.md W-B0.
 */
import React, { useState } from 'react';
import { View, Text, SafeAreaView, ScrollView, Pressable, Alert } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useSubscription } from '../hooks/useSubscription';
import Card from '../components/Cards/Card';
import PrimaryButton from '../components/Buttons/PrimaryButton';
import { COPY, PLAN_META } from '../utils/constants';

const PLAN_ORDER = ['free', 'basic', 'premium', 'family'];

export default function PlanSelectionScreen({ navigation }) {
  const t = useTheme();
  const { tier, subscribe, checkoutStatus } = useSubscription();
  const [interval, setInterval] = useState('monthly');

  async function choose(code) {
    if (code === 'free') return;
    const res = await subscribe(code, interval);
    // 'unavailable' is v1's answer: billing is switched off and subscribe()
    // has no payment sheet to open. Without this branch the button would look
    // broken — tapped, nothing happens, no reason given.
    if (res.status === 'unavailable') Alert.alert('Beauty Bond is free', res.message);
    if (res.status === 'failed') Alert.alert('Payment', res.message ?? COPY.paymentFailed);
    if (res.status === 'success') navigation.goBack();
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.color.ground }}>
      <ScrollView contentContainerStyle={{ padding: t.gutter, gap: t.space[3] }}>
        <Text style={[t.type('h1'), { color: t.color.textPrimary }]}>Choose your bond.</Text>

        <View style={{ flexDirection: 'row', gap: t.space[2] }}>
          {[['monthly', 'Monthly'], ['yearly', 'Yearly — save 30%']].map(([k, label]) => (
            <Pressable key={k} onPress={() => setInterval(k)} accessibilityRole="button"
              style={{
                flex: 1, minHeight: t.tapTarget, alignItems: 'center', justifyContent: 'center',
                borderRadius: t.radius.pill, borderWidth: 1,
                borderColor: interval === k ? t.color.accent : t.color.border,
              }}>
              <Text style={[t.type('caption'), { color: t.color.textPrimary }]}>{label}</Text>
            </Pressable>
          ))}
        </View>

        {PLAN_ORDER.map((code) => {
          const p = PLAN_META[code];
          const isCurrent = tier === code;
          return (
            <Card key={code} selected={isCurrent}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={[t.type('h3'), { color: t.color.textPrimary, flex: 1 }]}>
                  {p.name}
                </Text>
                <Text style={[t.type('body'), { color: t.color.accent }]}>{p.price}</Text>
              </View>

              {p.popular && (
                <Text style={[t.type('caption'), { color: t.color.accent }]}>★ POPULAR</Text>
              )}

              <Text style={[t.type('bodySm'), {
                color: t.color.textSecondary, marginVertical: t.space[2],
              }]}>
                {p.blurb}
              </Text>

              {isCurrent ? (
                <Text style={[t.type('caption'), { color: t.color.textSecondary }]}>
                  Current plan
                </Text>
              ) : code !== 'free' ? (
                <PrimaryButton
                  title={`Choose ${p.name}`}
                  loading={checkoutStatus === 'pending'}
                  onPress={() => choose(code)}
                />
              ) : null}
            </Card>
          );
        })}

        {/* Permanent line. Non-negotiable. */}
        <Text style={[t.type('caption'), { color: t.color.textSecondary, textAlign: 'center' }]}>
          🛈 {COPY.safetyAlwaysFree}{'\n'}Cancel anytime.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
