/**
 * Dads & Daughters Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 * Proprietary and confidential. Unauthorized copying, distribution,
 * or use of this file, via any medium, is strictly prohibited.
 *
 * Five sections: Safe Makeup Learning, Cultural Beauty Library,
 * Bonding & Memories, AI Try-On, Live Glam Rooms.
 * Child accounts get 56px targets and simplified copy — keyed off AGE BAND,
 * not mode, because a child can pick any mode. docs/wireframes.md W-11/W-12.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, SafeAreaView, ScrollView, Pressable } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../hooks/useAuth';
import Card from '../components/Cards/Card';
import { HOME_SECTIONS, MODE_META, RELATIONAL_MODES, COPY } from '../utils/constants';
import api from '../utils/api';

export default function HomeScreen({ navigation }) {
  const t = useTheme();
  const { profile } = useAuth();

  const meta = MODE_META[profile?.mode];
  const isRelational = RELATIONAL_MODES.includes(profile?.mode);

  // The streak and Bond Meter were literals: every family saw 🔥 7 and 68%.
  const [prog, setProg] = useState(null);
  useEffect(() => {
    api.get('/me/progression').then(setProg).catch(() => {});
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.color.ground }}>
      <ScrollView contentContainerStyle={{ padding: t.gutter, gap: t.space[4] }}>

        {/* Header — mode chip is a tap target back to mode selection */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.space[3] }}>
          <View style={{ flex: 1 }}>
            <Text style={[t.type('h1'), { color: t.color.textPrimary }]}>
              {t.isChild ? `Hi ${profile?.displayName ?? 'there'}! ✨`
                         : `Hi ${profile?.displayName ?? 'there'}`}
            </Text>
            <Pressable
              onPress={() => navigation.navigate('ModeSelection')}
              accessibilityRole="button"
              accessibilityLabel={`Current mode: ${meta?.title ?? 'none'}. Tap to change.`}
              style={{ minHeight: t.tapTarget, justifyContent: 'center' }}
            >
              <Text style={[t.type('caption'), { color: t.color.accent }]}>
                {meta?.icon} {meta?.title ?? 'Choose a mode'} ▾
              </Text>
            </Pressable>
          </View>

          {!t.isChild && prog?.streak?.current > 0 && (
            <Text
              accessibilityLabel={`${prog.streak.current} day streak`}
              style={{ fontSize: 18 }}
            >
              🔥 {prog.streak.current}
            </Text>
          )}
        </View>

        {/* Bond Meter — only in modes that pair two people */}
        {isRelational && (
          <Card onPress={() => navigation.navigate('Bond')}>
            <Text style={[t.type('overline'), { color: t.color.textSecondary }]}>
              BOND METER
            </Text>
            <Text style={[t.type('display'), { color: t.color.accent }]}>
              {prog?.bond ? `${prog.bond.meter}` : '—'}
            </Text>
            <Text style={[t.type('bodySm'), { color: t.color.textSecondary }]}>
              {prog?.bond
                ? `${prog.bond.toNextLevel} points to Level ${prog.bond.level + 1}`
                : 'Start a mission together'}
            </Text>
            {/* Decay copy must never shame. */}
            <Text style={[t.type('caption'), {
              color: t.color.textSecondary, marginTop: t.space[1],
            }]}>
              {COPY.streakBroken}
            </Text>
          </Card>
        )}

        {/* The five sections */}
        {HOME_SECTIONS.map((section) => (
          <Card
            key={section.key}
            onPress={() => navigation.navigate(section.route)}
            style={{ minHeight: t.isChild ? 104 : 88, justifyContent: 'center' }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.space[3] }}>
              <Text style={{ fontSize: t.isChild ? 36 : 28 }}>{section.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[t.type('h3'), { color: t.color.textPrimary }]}>
                  {section.title}
                </Text>
                <Text style={[t.type('bodySm'), { color: t.color.textSecondary }]}>
                  {section.blurb}
                </Text>
              </View>
              <Text style={[t.type('h3'), { color: t.color.textSecondary }]}>›</Text>
            </View>
          </Card>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
