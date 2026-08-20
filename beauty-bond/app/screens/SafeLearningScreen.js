/**
 * Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 *
 * Lock reason is ALWAYS shown. Age locks are NOT purchasable — no tier
 * unlocks age-gated content. docs/wireframes.md W-20.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, SafeAreaView, ScrollView } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../hooks/useAuth';
import { useSubscription } from '../hooks/useSubscription';
import Card from '../components/Cards/Card';
import SecondaryButton from '../components/Buttons/SecondaryButton';
import PaywallSheet from '../components/Modals/PaywallSheet';
import { ageFromBirthDate } from '../utils/validators';
import api from '../utils/api';

const FALLBACK_PATHS = [
  { level: 1, title: 'Clean Hands, Clean Tools', minAge: 5 },
  { level: 2, title: 'Skin First', minAge: 5 },
  { level: 3, title: 'Color Play', minAge: 6 },
  { level: 4, title: 'Brushes & Blending', minAge: 8 },
  { level: 5, title: 'Eyes & Definition', minAge: 10 },
  { level: 6, title: 'Full Face & Occasion', minAge: 13 },
];

export default function SafeLearningScreen({ navigation }) {
  const t = useTheme();
  const { profile } = useAuth();
  const { canLesson } = useSubscription();
  const [paths, setPaths] = useState(FALLBACK_PATHS);
  const [paywall, setPaywall] = useState(false);

  useEffect(() => { api.get('/paths').then((d) => setPaths(d.paths ?? FALLBACK_PATHS)).catch(() => {}); }, []);

  const age = profile?.birthDate ? ageFromBirthDate(profile.birthDate) : 99;

  function open(path) {
    if (age < path.minAge) return;                    // age lock: not purchasable
    if (!canLesson(path.level)) return setPaywall(true);
    navigation.navigate('LessonPlayer', { level: path.level, title: path.title });
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.color.ground }}>
      <ScrollView contentContainerStyle={{ padding: t.gutter, gap: t.space[3] }}>
        <Text style={[t.type('h1'), { color: t.color.textPrimary }]}>Learn</Text>

        {paths.map((p) => {
          const ageLocked = age < p.minAge;
          const tierLocked = !ageLocked && !canLesson(p.level);
          return (
            <Card key={p.level} onPress={() => open(p)}
                  style={{ opacity: ageLocked || tierLocked ? 0.6 : 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={[t.type('body'), { color: t.color.textPrimary, flex: 1 }]}>
                  {p.level}. {p.title}
                </Text>
                {/* Never a bare lock — always say why. */}
                {ageLocked && (
                  <Text style={[t.type('caption'), { color: t.color.textSecondary }]}>
                    Age {p.minAge}+
                  </Text>
                )}
                {tierLocked && (
                  <Text style={[t.type('caption'), { color: t.color.accent }]}>Bond plan</Text>
                )}
              </View>
            </Card>
          );
        })}

        <Text style={[t.type('overline'), { color: t.color.textSecondary, marginTop: t.space[4] }]}>
          QUICK SKILLS
        </Text>
        <View style={{ flexDirection: 'row', gap: t.space[3] }}>
          <Card style={{ flex: 1 }} onPress={() => navigation.navigate('BrushEducation')}>
            <Text style={[t.type('bodySm'), { color: t.color.textPrimary }]}>🖌 Brush School</Text>
          </Card>
          <Card style={{ flex: 1 }} onPress={() => navigation.navigate('ShadeMatch')}>
            <Text style={[t.type('bodySm'), { color: t.color.textPrimary }]}>🎨 Shade Match</Text>
          </Card>
        </View>

        {/* Practice Mode is prominent, not buried — most first sessions have no makeup. */}
        <SecondaryButton title="Practice Mode — no products needed"
          onPress={() => navigation.navigate('LessonPlayer', { practice: true })} />
      </ScrollView>

      <PaywallSheet visible={paywall} capability="lesson"
        onUpgrade={() => { setPaywall(false); navigation.navigate('PlanSelection'); }}
        onDismiss={() => setPaywall(false)} />
    </SafeAreaView>
  );
}
