/**
 * Dads & Daughters Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 * Proprietary and confidential. Unauthorized copying, distribution,
 * or use of this file, via any medium, is strictly prohibited.
 *
 * Mirror pane is the FRONT CAMERA processed ON-DEVICE ONLY — never uploaded.
 * "Grown-up check" is a BLOCKING state on a child account.
 * docs/wireframes.md W-21.
 */
import React, { useState } from 'react';
import { View, Text, SafeAreaView, Pressable } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../hooks/useAuth';
import PrimaryButton from '../components/Buttons/PrimaryButton';
import SecondaryButton from '../components/Buttons/SecondaryButton';
import { AGE_BANDS } from '../utils/constants';
import api from '../utils/api';

const DEMO_STEPS = [
  { text: 'Wash your hands. Warm water, twenty seconds.', supervisionRequired: false },
  { text: 'Pick up the fluff brush. Hold it near the end, not the metal.', supervisionRequired: false },
  { text: 'Small circles, light pressure. Let the edge disappear — don’t chase it.',
    supervisionRequired: true },
];

export default function LessonPlayerScreen({ route, navigation }) {
  const t = useTheme();
  const { profile } = useAuth();
  const steps = route?.params?.steps ?? DEMO_STEPS;
  const [index, setIndex] = useState(route?.params?.resumeAt ?? 0);
  const [supervised, setSupervised] = useState(false);

  const step = steps[index];
  const isChild = profile?.ageBand === AGE_BANDS.CHILD;
  const blocked = isChild && step.supervisionRequired && !supervised;

  function next() {
    if (blocked) return;
    if (index + 1 >= steps.length) {
      api.post(`/lessons/${route?.params?.lessonId ?? 'demo'}/progress`,
               { stepIndex: index + 1, completed: true }).catch(() => {});
      return navigation.goBack();
    }
    // Persist on advance — resuming mid-lesson is the norm, not the edge case.
    api.post(`/lessons/${route?.params?.lessonId ?? 'demo'}/progress`,
             { stepIndex: index + 1 }).catch(() => {});
    setIndex(index + 1);
    setSupervised(false);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.color.ground }}>
      <View style={{ flex: 1, padding: t.gutter, gap: t.space[4] }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Pressable onPress={() => navigation.goBack()} accessibilityRole="button"
                     accessibilityLabel="Close lesson">
            <Text style={[t.type('h3'), { color: t.color.textSecondary }]}>✕</Text>
          </Pressable>
          <Text style={[t.type('body'), { color: t.color.textPrimary, flex: 1, textAlign: 'center' }]}>
            {route?.params?.title ?? 'Lesson'}
          </Text>
          <Text style={[t.type('caption'), { color: t.color.textSecondary }]}>
            Step {index + 1} / {steps.length}
          </Text>
        </View>

        {/* MIRROR PANE — on-device processing only */}
        <View style={{
          flex: 1, borderRadius: t.radius.xl, backgroundColor: t.color.plumSoft,
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Text style={[t.type('caption'), { color: '#fff' }]}>
            ▶ demo / mirror — tap to swap
          </Text>
        </View>

        <Text style={[t.type('bodyLg'), { color: t.color.textPrimary }]}>{step.text}</Text>

        {blocked && (
          <View style={{
            padding: t.space[4], borderRadius: t.radius.lg,
            backgroundColor: t.color.raised, borderWidth: 1, borderColor: t.color.warning,
            gap: t.space[3],
          }}>
            <Text style={[t.type('body'), { color: t.color.textPrimary }]}>
              ⚠ A grown-up should be here for this step.
            </Text>
            <SecondaryButton title="They're here ✓" onPress={() => setSupervised(true)} />
          </View>
        )}

        <View style={{ flexDirection: 'row', gap: t.space[3] }}>
          <SecondaryButton title="Back" style={{ flex: 1 }}
            onPress={() => setIndex(Math.max(0, index - 1))} />
          <View style={{ flex: 2 }}>
            <PrimaryButton title="Got it — next" onPress={next} disabled={blocked} />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
