/**
 * Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 * docs/wireframes.md W-11 (standard) and W-12 (Little Legend).
 */
import React from 'react';
import { View, Text, SafeAreaView, ScrollView, Pressable } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../hooks/useAuth';
import Card from '../components/Cards/Card';
import PrimaryButton from '../components/Buttons/PrimaryButton';
import EmptyState from '../components/EmptyState';
import { MODES, COPY } from '../utils/constants';

export default function HomeScreen({ navigation }) {
  const t = useTheme();
  const { profile } = useAuth();

  if (profile?.mode === MODES.LITTLE_LEGEND) return <LittleLegendHome navigation={navigation} />;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.color.ground }}>
      <ScrollView contentContainerStyle={{ padding: t.gutter, gap: t.space[5] }}>
        {/* Header: dual avatar in relational modes, mode chip is a tap target */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.space[3] }}>
          <Text style={[t.type('h3'), { color: t.color.textPrimary, flex: 1 }]}>
            {profile?.displayName ?? 'Welcome'}
          </Text>
          <Pressable onPress={() => navigation.navigate('ModeSelection')}
            accessibilityRole="button" accessibilityLabel="Change mode">
            <Text style={[t.type('caption'), { color: t.color.accent }]}>
              {MODES_LABEL[profile?.mode] ?? 'Mode'} ▾
            </Text>
          </Pressable>
          <Text accessibilityLabel="7 day streak">🔥 7</Text>
        </View>

        {/* TODAY'S BOND — one hero, ONE CTA. Never two competing CTAs. */}
        <Card elevation={2}>
          <Text style={[t.type('overline'), { color: t.color.accent }]}>TODAY'S BOND · 5 MIN</Text>
          <Text style={[t.type('h2'), { color: t.color.textPrimary, marginVertical: t.space[2] }]}>
            Name That Brush
          </Text>
          <Text style={[t.type('body'), { color: t.color.textSecondary, marginBottom: t.space[4] }]}>
            She teaches, you guess.
          </Text>
          <PrimaryButton title="Start" onPress={() => navigation.navigate('BrushEducation')} />
        </Card>

        <Section title="BOND METER" onSeeAll={() => navigation.navigate('Bond')}>
          <Card>
            <Text style={[t.type('h1'), { color: t.color.accent }]}>68%</Text>
            <Text style={[t.type('bodySm'), { color: t.color.textSecondary }]}>
              4 missions to Level 3
            </Text>
            {/* Decay copy must never shame. */}
            <Text style={[t.type('caption'), { color: t.color.textSecondary, marginTop: 4 }]}>
              {COPY.streakBroken}
            </Text>
          </Card>
        </Section>

        <Section title="CONTINUE" onSeeAll={() => navigation.navigate('Learn')}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ gap: t.space[3] }}>
            {['Blending Edges', 'Brush Care', 'Shade Match'].map((title, i) => (
              <Card key={title} style={{ width: 140 }}
                    onPress={() => navigation.navigate('LessonPlayer', { title })}>
                <Text style={[t.type('bodySm'), { color: t.color.textPrimary }]}>{title}</Text>
                <Text style={[t.type('caption'), { color: t.color.accent }]}>
                  {[60, 20, 5][i]}%
                </Text>
              </Card>
            ))}
          </ScrollView>
        </Section>

        <Section title="CULTURAL SPOTLIGHT" onSeeAll={() => navigation.navigate('CulturalLibrary')}>
          <Card onPress={() => navigation.navigate('CulturalLibrary')}>
            <Text style={[t.type('h3'), { color: t.color.textPrimary }]}>"Edges as Art"</Text>
            <Text style={[t.type('bodySm'), { color: t.color.textSecondary }]}>
              Black Beauty · with Ms. Deborah
            </Text>
          </Card>
        </Section>

        <Section title="LIVE NOW" onSeeAll={() => navigation.navigate('Rooms')}>
          <EmptyState
            emoji="🎥" title="No one's live right now."
            ctaTitle="Start a Family Room"
            onPress={() => navigation.navigate('Rooms')}
          />
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

const MODES_LABEL = {
  dad_daughter: 'Dad + Daughter', legacy: 'Legacy', little_legend: 'Little Legend',
  solo_glow: 'Solo Glow', bff: 'Best Friend', global_glam: 'Global',
};

function Section({ title, children, onSeeAll }) {
  const t = useTheme();
  return (
    <View style={{ gap: t.space[3] }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Text style={[t.type('overline'), { color: t.color.textSecondary, flex: 1 }]}>{title}</Text>
        {onSeeAll && (
          <Pressable onPress={onSeeAll} accessibilityRole="button">
            <Text style={[t.type('caption'), { color: t.color.accent }]}>See all →</Text>
          </Pressable>
        )}
      </View>
      {children}
    </View>
  );
}

/** 56px targets, no free text, no prices, no store, no external links. */
function LittleLegendHome({ navigation }) {
  const t = useTheme();
  const { profile } = useAuth();
  const TILES = [
    { emoji: '🖌', label: 'BRUSH GAME', to: 'BrushEducation' },
    { emoji: '🎨', label: 'PRETEND GLAM', to: 'TryOn' },
    { emoji: '🧼', label: 'CLEAN CREW', to: 'Learn' },
    { emoji: '👨‍👧', label: 'CALL DAD', to: 'Rooms' },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.color.ground }}>
      <ScrollView contentContainerStyle={{ padding: t.gutter, gap: t.space[4] }}>
        <Text style={[t.type('h1'), { color: t.color.textPrimary }]}>
          Hi {profile?.displayName ?? 'there'}! ✨
        </Text>
        {TILES.map((tile) => (
          <Card key={tile.label} onPress={() => navigation.navigate(tile.to)}
                style={{ minHeight: 96, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ fontSize: 40 }}>{tile.emoji}</Text>
            <Text style={[t.type('h3'), { color: t.color.textPrimary, marginTop: t.space[2] }]}>
              {tile.label}
            </Text>
          </Card>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
