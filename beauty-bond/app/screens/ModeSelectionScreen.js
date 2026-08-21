/**
 * Dads & Daughters Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 * Proprietary and confidential. Unauthorized copying, distribution,
 * or use of this file, via any medium, is strictly prohibited.
 *
 * Six modes. Mode changes vocabulary, accent color, home rails, AND the
 * safety envelope. Switchable any time; stored per-profile server-side.
 * docs/wireframes.md W-10.
 */
import React, { useState } from 'react';
import { View, Text, SafeAreaView, ScrollView, ActivityIndicator } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../hooks/useAuth';
import Card from '../components/Cards/Card';
import { MODES, MODE_META } from '../utils/constants';
import { ageFromBirthDate } from '../utils/validators';
import api from '../utils/api';

const ORDER = [
  MODES.DAD_DAUGHTER,
  MODES.MOM_DAUGHTER,
  MODES.GUARDIAN_DAUGHTER,
  MODES.SOLO_GIRL,
  MODES.BEST_FRIEND_GLAM,
  MODES.GLOBAL_ROOMS,
];

export default function ModeSelectionScreen({ navigation }) {
  const t = useTheme();
  const { profile, reload } = useAuth();
  const [saving, setSaving] = useState(null);

  const age = profile?.birthDate ? ageFromBirthDate(profile.birthDate) : 99;

  async function pick(mode, locked, meta) {
    if (locked) {
      // Never a dead end — route to the guardian-request path instead.
      navigation.navigate('GuardianConsole', { requestMode: mode, minAge: meta.minAge });
      return;
    }
    setSaving(mode);
    try {
      await api.patch(`/profiles/${profile.id}`, { mode });
      await reload();
      navigation.navigate('Main');
    } finally {
      setSaving(null);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.color.ground }}>
      <ScrollView contentContainerStyle={{ padding: t.gutter, gap: t.space[3] }}>
        <Text style={[t.type('h1'), { color: t.color.textPrimary }]}>
          How do you want to bond today?
        </Text>
        <Text style={[t.type('body'), { color: t.color.textSecondary, marginBottom: t.space[2] }]}>
          Pick a mode. You can switch any time.
        </Text>

        {ORDER.map((mode) => {
          const meta = MODE_META[mode];
          const locked = age < (meta.minAge ?? 0);
          const active = profile?.mode === mode;

          return (
            <Card
              key={mode}
              onPress={() => pick(mode, locked, meta)}
              selected={active}
              style={{ opacity: locked ? 0.55 : 1 }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.space[3] }}>
                <Text style={{ fontSize: 30 }}>{meta.icon}</Text>

                <View style={{ flex: 1 }}>
                  <Text style={[t.type('h3'), { color: t.color.textPrimary }]}>
                    {meta.title}
                  </Text>
                  <Text style={[t.type('bodySm'), { color: t.color.textSecondary }]}>
                    {meta.subtitle}
                  </Text>
                </View>

                {saving === mode && <ActivityIndicator color={t.color.accent} />}

                {/* Lock reason is always visible — never a bare padlock. */}
                {locked && !saving && (
                  <Text style={[t.type('caption'), { color: t.color.textSecondary }]}>
                    🔒 {meta.minAge}+
                  </Text>
                )}

                {active && !saving && (
                  <Text style={[t.type('caption'), { color: t.color.accent }]}>● Active</Text>
                )}
              </View>
            </Card>
          );
        })}

        <Text style={[t.type('caption'), {
          color: t.color.textSecondary, textAlign: 'center', marginTop: t.space[3],
        }]}>
          Locked modes need a grown-up. Tap one to ask.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
