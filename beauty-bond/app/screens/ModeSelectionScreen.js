/**
 * Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 *
 * Mode changes vocabulary, color, content rails, AND the safety envelope.
 * Switchable any time — stored per-profile server-side. docs/wireframes.md W-10.
 */
import React from 'react';
import { View, Text, SafeAreaView, ScrollView } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../hooks/useAuth';
import Card from '../components/Cards/Card';
import { MODES, MODE_META } from '../utils/constants';
import { ageFromBirthDate } from '../utils/validators';
import api from '../utils/api';

const ORDER = [MODES.DAD_DAUGHTER, MODES.LEGACY, MODES.LITTLE_LEGEND,
                MODES.SOLO_GLOW, MODES.BFF, MODES.GLOBAL_GLAM];
const ICON = {
  [MODES.DAD_DAUGHTER]: '👨‍👧', [MODES.LEGACY]: '👩‍👧', [MODES.LITTLE_LEGEND]: '🧸',
  [MODES.SOLO_GLOW]: '✨', [MODES.BFF]: '👯', [MODES.GLOBAL_GLAM]: '🌍',
};

export default function ModeSelectionScreen({ navigation }) {
  const t = useTheme();
  const { profile, reload } = useAuth();
  const age = profile?.birthDate ? ageFromBirthDate(profile.birthDate) : 99;

  async function pick(mode, locked) {
    if (locked) {
      // Never a dead end — offer the guardian-request path.
      navigation.navigate('GuardianConsole', { requestMode: mode });
      return;
    }
    await api.patch(`/profiles/${profile.id}`, { mode });
    await reload();
    navigation.navigate('Main');
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.color.ground }}>
      <ScrollView contentContainerStyle={{ padding: t.gutter, gap: t.space[3] }}>
        <Text style={[t.type('h1'), { color: t.color.textPrimary }]}>
          How do you want to glam today?
        </Text>

        {ORDER.map((mode) => {
          const meta = MODE_META[mode];
          const locked = age < (meta.minAge ?? 0);
          const active = profile?.mode === mode;

          return (
            <Card key={mode} onPress={() => pick(mode, locked)} selected={active}
                  style={{ opacity: locked ? 0.55 : 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.space[3] }}>
                <Text style={{ fontSize: 28 }}>{ICON[mode]}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[t.type('h3'), { color: t.color.textPrimary }]}>{meta.title}</Text>
                  <Text style={[t.type('bodySm'), { color: t.color.textSecondary }]}>
                    {meta.subtitle}
                  </Text>
                </View>
                {locked && (
                  <Text style={[t.type('caption'), { color: t.color.textSecondary }]}>
                    🔒 {meta.minAge}+
                  </Text>
                )}
                {active && <Text style={[t.type('caption'), { color: t.color.accent }]}>● Active</Text>}
              </View>
            </Card>
          );
        })}

        <Text style={[t.type('caption'), { color: t.color.textSecondary, textAlign: 'center' }]}>
          You can switch any time.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
