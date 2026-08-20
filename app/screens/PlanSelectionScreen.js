/**
 * Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
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
import { COPY } from '../utils/constants';

const PLANS = [
  { code: 'sparkle', name: 'SPARKLE', price: 'Free',
    blurb: 'Levels 1–2 · 1 culture · 5 try-ons/mo · 20 min rooms' },
  { code: 'bond', name: 'BOND', price: '$6.99/mo', popular: true,
    blurb: 'All levels · All cultures · Unlimited try-on · 5 h rooms · 3 kids' },
  { code: 'legacy', name: 'LEGACY', price: '$12.99/mo',
    blurb: 'Everything in Bond + unlimited vault · Letters Forward · 6 kids' },
  { code: 'studio', name: 'STUDIO', price: '$24.99/mo', blurb: 'For creators & pros' },
];

export default function PlanSelectionScreen({ navigation }) {
  const t = useTheme();
  const { tier, checkout, checkoutStatus } = useSubscription();
  const [interval, setInterval] = useState('monthly');

  async function choose(code) {
    if (code === 'sparkle') return;
    // lookup_key is bb_-prefixed — see docs/stripe-flow.md §3.2 Layer 1.
    const res = await checkout(`bb_${code}_${interval}`);
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

        {PLANS.map((p) => (
          <Card key={p.code} selected={tier === p.code}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={[t.type('h3'), { color: t.color.textPrimary, flex: 1 }]}>{p.name}</Text>
              <Text style={[t.type('body'), { color: t.color.accent }]}>{p.price}</Text>
            </View>
            {p.popular && (
              <Text style={[t.type('caption'), { color: t.color.accent }]}>★ POPULAR</Text>
            )}
            <Text style={[t.type('bodySm'), { color: t.color.textSecondary, marginVertical: t.space[2] }]}>
              {p.blurb}
            </Text>
            {tier === p.code
              ? <Text style={[t.type('caption'), { color: t.color.textSecondary }]}>Current plan</Text>
              : p.code !== 'sparkle' && (
                  <PrimaryButton title={`Choose ${p.name[0] + p.name.slice(1).toLowerCase()}`}
                    loading={checkoutStatus === 'pending'} onPress={() => choose(p.code)} />
                )}
          </Card>
        ))}

        {/* Permanent line. Non-negotiable. */}
        <Text style={[t.type('caption'), { color: t.color.textSecondary, textAlign: 'center' }]}>
          🛈 {COPY.safetyAlwaysFree}{'\n'}Cancel anytime.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
