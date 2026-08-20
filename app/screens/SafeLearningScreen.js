/**
 * Dad + Daughter Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 *
 * Five topics: Brush Basics, Shade Matching for Kids, Blush & Powder Safety,
 * Eye Safety, Skin Care Basics.
 *
 * Age locks are NOT purchasable — no tier unlocks age-gated content, and the
 * lock reason is always shown. docs/wireframes.md W-20.
 */
import React, { useState } from 'react';
import { View, Text, SafeAreaView, ScrollView } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../hooks/useAuth';
import { useSubscription } from '../hooks/useSubscription';
import Card from '../components/Cards/Card';
import SecondaryButton from '../components/Buttons/SecondaryButton';
import PaywallSheet from '../components/Modals/PaywallSheet';
import { SAFE_LEARNING_TOPICS } from '../utils/constants';
import { ageFromBirthDate } from '../utils/validators';

/** Hygiene-critical topics are free at every tier. docs/stripe-flow.md §3.1. */
const ALWAYS_FREE_TOPICS = new Set(['brush_basics', 'skin_care_basics', 'eye_safety']);

export default function SafeLearningScreen({ navigation }) {
  const t = useTheme();
  const { profile } = useAuth();
  const { canLesson } = useSubscription();
  const [paywall, setPaywall] = useState(null);

  const age = profile?.birthDate ? ageFromBirthDate(profile.birthDate) : 99;

  function open(topic, ageLocked, tierLocked) {
    if (ageLocked) return;                       // not purchasable, ever
    if (tierLocked) return setPaywall(topic.key);
    navigation.navigate('LessonPlayer', { topicKey: topic.key, title: topic.title });
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.color.ground }}>
      <ScrollView contentContainerStyle={{ padding: t.gutter, gap: t.space[3] }}>
        <Text style={[t.type('h1'), { color: t.color.textPrimary }]}>
          Safe Makeup Learning
        </Text>
        <Text style={[t.type('body'), { color: t.color.textSecondary }]}>
          Clean hands, clean tools, and no rush.
        </Text>

        {SAFE_LEARNING_TOPICS.map((topic, i) => {
          const ageLocked = age < topic.minAge;
          const tierLocked = !ageLocked
            && !ALWAYS_FREE_TOPICS.has(topic.key)
            && !canLesson(i + 1);

          return (
            <Card
              key={topic.key}
              onPress={() => open(topic, ageLocked, tierLocked)}
              style={{ opacity: ageLocked || tierLocked ? 0.6 : 1 }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.space[3] }}>
                <Text style={{ fontSize: t.isChild ? 34 : 28 }}>{topic.icon}</Text>

                <View style={{ flex: 1 }}>
                  <Text style={[t.type('h3'), { color: t.color.textPrimary }]}>
                    {topic.title}
                  </Text>
                  <Text style={[t.type('bodySm'), { color: t.color.textSecondary }]}>
                    {topic.blurb}
                  </Text>
                </View>

                {ageLocked && (
                  <Text style={[t.type('caption'), { color: t.color.textSecondary }]}>
                    Age {topic.minAge}+
                  </Text>
                )}
                {tierLocked && (
                  <Text style={[t.type('caption'), { color: t.color.accent }]}>Bond plan</Text>
                )}
              </View>
            </Card>
          );
        })}

        {/* Most first sessions happen with no makeup in the house. */}
        <SecondaryButton
          title="Practice Mode — no products needed"
          onPress={() => navigation.navigate('LessonPlayer', { practice: true })}
        />

        <Card>
          <Text style={[t.type('overline'), { color: t.color.textSecondary }]}>
            THE THREE RULES
          </Text>
          <Text style={[t.type('body'), { color: t.color.textPrimary, marginTop: t.space[2] }]}>
            1. Wash your hands first — every time.{'\n'}
            2. Never share eye makeup with anyone.{'\n'}
            3. If it stings, wash it off and tell a grown-up.
          </Text>
        </Card>
      </ScrollView>

      <PaywallSheet
        visible={!!paywall}
        capability="lesson"
        onUpgrade={() => { setPaywall(null); navigation.navigate('PlanSelection'); }}
        onDismiss={() => setPaywall(null)}
      />
    </SafeAreaView>
  );
}
