/**
 * Dads & Daughters Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 * Proprietary and confidential. Unauthorized copying, distribution,
 * or use of this file, via any medium, is strictly prohibited.
 *
 * The most important screen in the app.
 * Purchases are HARD-LOCKED on child accounts — a lock, not a toggle.
 * docs/wireframes.md W-A0.
 */
import React, { useState } from 'react';
import { View, Text, SafeAreaView, ScrollView, Switch } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import Card from '../components/Cards/Card';
import SecondaryButton from '../components/Buttons/SecondaryButton';
import api from '../utils/api';

const PERMISSIONS = [
  { key: 'camera_tryon', label: 'Camera & try-on' },
  { key: 'video_rooms', label: 'Family Room video' },
  { key: 'live_lessons', label: 'Live lessons (creator-led)' },
  { key: 'bff_rooms', label: 'Best Friend Glam' },
  { key: 'notifications', label: 'Notifications' },
];

export default function GuardianConsoleScreen() {
  const t = useTheme();
  const [child] = useState({ id: 'c1', name: 'Zaria', age: 9 });
  const [perms, setPerms] = useState({
    camera_tryon: true, video_rooms: true, live_lessons: false,
    bff_rooms: false, notifications: true,
  });

  async function toggle(key, value) {
    setPerms((p) => ({ ...p, [key]: value }));
    await api.patch(`/guardian/permissions/${child.id}`, { [key]: value }).catch(() => {});
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.color.ground }}>
      <ScrollView contentContainerStyle={{ padding: t.gutter, gap: t.space[4] }}>
        <Text style={[t.type('h1'), { color: t.color.textPrimary }]}>Guardian Console</Text>

        <Card>
          <Text style={[t.type('h3'), { color: t.color.textPrimary }]}>
            {child.name}, {child.age}
          </Text>
          <Text style={[t.type('caption'), { color: t.color.textSecondary }]}>Child account</Text>
        </Card>

        <Text style={[t.type('overline'), { color: t.color.textSecondary }]}>PERMISSIONS</Text>
        {PERMISSIONS.map((p) => (
          <Card key={p.key}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={[t.type('body'), { color: t.color.textPrimary, flex: 1 }]}>{p.label}</Text>
              <Switch value={perms[p.key]} onValueChange={(v) => toggle(p.key, v)}
                accessibilityLabel={p.label} />
            </View>
          </Card>
        ))}

        {/* Not a toggle — a lock. Child accounts can never purchase, at any tier. */}
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={[t.type('body'), { color: t.color.textPrimary, flex: 1 }]}>Purchases</Text>
            <Text style={[t.type('body'), { color: t.color.textSecondary }]}>🔒 Locked</Text>
          </View>
          <Text style={[t.type('caption'), { color: t.color.textSecondary, marginTop: 4 }]}>
            Child accounts can never make a purchase.
          </Text>
        </Card>

        <Text style={[t.type('overline'), { color: t.color.textSecondary }]}>SCREEN TIME</Text>
        <Card>
          <Text style={[t.type('body'), { color: t.color.textPrimary }]}>Daily limit · 45 min</Text>
          <Text style={[t.type('bodySm'), { color: t.color.textSecondary }]}>
            Bedtime 8:30 pm – 7:00 am
          </Text>
        </Card>

        {/* Always free, at every tier. */}
        <SecondaryButton title={`Export ${child.name}'s data`} onPress={() => {}} />
        <SecondaryButton title={`Delete ${child.name}'s account`} onPress={() => {}} ghost />
      </ScrollView>
    </SafeAreaView>
  );
}
