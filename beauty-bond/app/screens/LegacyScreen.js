/**
 * Dads & Daughters Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 * Proprietary and confidential. Unauthorized copying, distribution,
 * or use of this file, via any medium, is strictly prohibited.
 *
 * NO streaks, NO confetti, NO badges, NO gamification anywhere in this module.
 * Entry is a 400ms fade, not a bounce. "Talk to someone" is always present.
 * docs/wireframes.md W-70, docs/architecture.md M08.
 */
import React from 'react';
import { View, Text, SafeAreaView, ScrollView, Linking } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useSubscription } from '../hooks/useSubscription';
import Card from '../components/Cards/Card';
import SecondaryButton from '../components/Buttons/SecondaryButton';
import { COPY } from '../utils/constants';

export default function LegacyScreen({ navigation }) {
  const t = useTheme();
  const { can } = useSubscription();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.color.ground }}>
      <ScrollView contentContainerStyle={{ padding: t.gutter, gap: t.space[5] }}>
        <Card>
          <Text style={[t.type('h2'), { color: t.color.textPrimary }]}>Denise</Text>
          <Text style={[t.type('bodySm'), { color: t.color.textSecondary }]}>1979 – 2019</Text>
          <Text style={[t.type('body'), { color: t.color.textPrimary, marginTop: t.space[2] }]}>
            "Lipstick before shoes."
          </Text>
        </Card>

        <Section title="HER SIGNATURE LOOK">
          <Card onPress={() => navigation.navigate('TryOn', { legacyLook: true })}>
            <Text style={[t.type('body'), { color: t.color.textPrimary }]}>
              Red lip · winged liner · gold
            </Text>
            <Text style={[t.type('caption'), { color: t.color.accent, marginTop: 4 }]}>
              ✨ try it on
            </Text>
          </Card>
        </Section>

        <Section title="THE VAULT">
          <View style={{ flexDirection: 'row', gap: t.space[3] }}>
            {['🎙 voice', '📷 photo', '📝 recipe', '💄 shades'].map((k) => (
              <Card key={k} style={{ flex: 1 }}>
                <Text style={[t.type('caption'), { color: t.color.textPrimary }]}>{k}</Text>
              </Card>
            ))}
          </View>
        </Section>

        <Section title="LETTERS FORWARD">
          {/* Already-recorded letters deliver regardless of subscription state. */}
          <Card>
            <Text style={[t.type('body'), { color: t.color.textPrimary }]}>
              🔒 For your 13th birthday
            </Text>
            <Text style={[t.type('caption'), { color: t.color.textSecondary }]}>
              opens Mar 4, 2027
            </Text>
          </Card>
          {!can('legacy.letters') && (
            <Text style={[t.type('caption'), { color: t.color.textSecondary }]}>
              Recording new letters is part of the Legacy plan. Letters already
              recorded always deliver.
            </Text>
          )}
        </Section>

        <Section title="HEALING JOURNAL">
          <Card onPress={() => {}}>
            <Text style={[t.type('body'), { color: t.color.textPrimary }]}>
              "What would she have said today?"
            </Text>
            <View style={{ flexDirection: 'row', gap: t.space[3], marginTop: t.space[3] }}>
              <SecondaryButton title="Write" onPress={() => {}} style={{ flex: 1 }} />
              {/* Logs presence without requiring words. */}
              <SecondaryButton title="Just sit with it" onPress={() => {}} style={{ flex: 1 }} ghost />
            </View>
          </Card>
        </Section>

        {/* Persistent, region-aware. Always visible in this module. */}
        <SecondaryButton title="💬 Talk to someone"
          onPress={() => Linking.openURL('https://findahelpline.com')} ghost />

        <Text style={[t.type('caption'), { color: t.color.textSecondary, textAlign: 'center' }]}>
          {COPY.legacyEntry}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }) {
  const t = useTheme();
  return (
    <View style={{ gap: t.space[3] }}>
      <Text style={[t.type('overline'), { color: t.color.textSecondary }]}>{title}</Text>
      {children}
    </View>
  );
}
