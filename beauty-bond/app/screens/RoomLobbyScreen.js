/**
 * Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 *
 * Global Glam Rooms are ABSENT (not greyed) for U13 and 13-15 accounts.
 * docs/wireframes.md W-50.
 */
import React from 'react';
import { View, Text, SafeAreaView, ScrollView } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../hooks/useAuth';
import Card from '../components/Cards/Card';
import PrimaryButton from '../components/Buttons/PrimaryButton';
import { ageFromBirthDate } from '../utils/validators';

export default function RoomLobbyScreen({ navigation }) {
  const t = useTheme();
  const { profile } = useAuth();
  const age = profile?.birthDate ? ageFromBirthDate(profile.birthDate) : 99;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.color.ground }}>
      <ScrollView contentContainerStyle={{ padding: t.gutter, gap: t.space[4] }}>
        <Text style={[t.type('h1'), { color: t.color.textPrimary }]}>Glam Rooms</Text>

        <Text style={[t.type('overline'), { color: t.color.textSecondary }]}>YOUR ROOMS</Text>
        <Card>
          <Text style={[t.type('h3'), { color: t.color.textPrimary }]}>👨‍👧 Family Room</Text>
          <Text style={[t.type('bodySm'), { color: t.color.textSecondary, marginBottom: t.space[3] }]}>
            Invite-only. Your grown-up sets who can join.
          </Text>
          <PrimaryButton title="Start" onPress={() => navigation.navigate('LiveRoom', { name: 'Family Room' })} />
        </Card>

        {age >= 13 && (
          <>
            <Text style={[t.type('overline'), { color: t.color.textSecondary }]}>BEST FRIEND GLAM</Text>
            <Card>
              <Text style={[t.type('bodySm'), { color: t.color.textSecondary }]}>
                Approved friends only. Ask your grown-up to add someone.
              </Text>
            </Card>
          </>
        )}

        {/* 16+ only — absent entirely below that, not greyed out. */}
        {age >= 16 && (
          <>
            <Text style={[t.type('overline'), { color: t.color.textSecondary }]}>GLOBAL GLAM ROOMS</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ gap: t.space[3] }}>
              {['🇧🇷 Rio', '🇳🇬 Lagos', '🇰🇷 Seoul'].map((r) => (
                <Card key={r} style={{ width: 120 }}>
                  <Text style={[t.type('bodySm'), { color: t.color.textPrimary }]}>{r}</Text>
                </Card>
              ))}
            </ScrollView>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
