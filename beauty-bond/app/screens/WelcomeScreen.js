/**
 * Dad + Daughter Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 * docs/wireframes.md W-00.
 */
import React, { useState } from 'react';
import { View, Text, SafeAreaView, Pressable } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import PrimaryButton from '../components/Buttons/PrimaryButton';
import SecondaryButton from '../components/Buttons/SecondaryButton';
import { ATTRIBUTION } from '../utils/constants';

const CARDS = [
  { title: 'Beauty is a language.\nLearn it together.', sub: '' },
  { title: 'Every tone.\nEvery texture.\nEvery culture.', sub: '' },
  { title: 'Safe for her.\nSimple for you.', sub: '' },
];

export default function WelcomeScreen({ navigation }) {
  const t = useTheme();
  const [index, setIndex] = useState(0);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.color.ground }}>
      <View style={{ flex: 1, padding: t.gutter, justifyContent: 'space-between' }}>
        <Pressable onPress={() => navigation.navigate('AgeGate')} style={{ alignSelf: 'flex-end' }}
          accessibilityRole="button" accessibilityLabel="Skip">
          <Text style={[t.type('body'), { color: t.color.textSecondary }]}>Skip</Text>
        </Pressable>

        {/* Hero: must show a dad's hands in frame on card 1 — that's the pitch. */}
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <Text style={[t.type('display'), { color: t.color.textPrimary }]}>
            {CARDS[index].title}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', gap: 8, alignSelf: 'center', marginBottom: t.space[5] }}>
          {CARDS.map((_, i) => (
            <Pressable key={i} onPress={() => setIndex(i)}
              accessibilityRole="button" accessibilityLabel={`Page ${i + 1}`}>
              <View style={{
                width: 8, height: 8, borderRadius: 4,
                backgroundColor: i === index ? t.color.accent : t.color.border,
              }} />
            </Pressable>
          ))}
        </View>

        <View style={{ gap: t.space[3] }}>
          <PrimaryButton title="Get started" onPress={() => navigation.navigate('AgeGate')} />
          <SecondaryButton title="I already have an account"
            onPress={() => navigation.navigate('AgeGate', { returning: true })} ghost />
          <Text style={[t.type('caption'), { color: t.color.textSecondary, textAlign: 'center' }]}>
            {ATTRIBUTION}
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
