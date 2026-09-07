/**
 * Dad + Daughter Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 * Proprietary and confidential. Unauthorized copying, distribution,
 * or use of this file, via any medium, is strictly prohibited.
 *
 * Step-by-step lesson player with supervision gating for child accounts.
 * The mirror pane never uploads frames; ML runs on-device.
 * docs/wireframes.md W-21.
 *
 * Lessons come from the server (migration 008 is the catalogue), found by
 * the slug the Learn tab and Dad School already use. This player used to
 * show the same three demo steps for every topic and post progress to
 * /lessons/demo, which is not a lesson — so nothing was ever recorded and
 * the streak never started. Practice Mode still uses the demo steps and
 * records nothing, on purpose: it is practice.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, SafeAreaView, Pressable, ActivityIndicator } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../hooks/useAuth';
import PrimaryButton from '../components/Buttons/PrimaryButton';
import SecondaryButton from '../components/Buttons/SecondaryButton';
import { AGE_BANDS, BADGE_ICON } from '../utils/constants';
import api from '../utils/api';
import dialog from '../utils/dialog';

const DEMO_STEPS = [
  { text: 'Wash your hands. Warm water, twenty seconds.', supervisionRequired: false },
  { text: 'Pick up the fluff brush. Hold it near the end, not the metal.', supervisionRequired: false },
  { text: 'Small circles, light pressure. Let the edge disappear — don’t chase it.',
    supervisionRequired: true },
];

const BADGE_NAMES = {
  first_lesson: 'First lesson', brush_care: 'Brush care', colour_theory: 'Colour theory',
  hygiene_hero: 'Hygiene hero', streak_7: 'Seven-day streak', streak_30: 'Thirty-day streak',
  bond_level_2: 'Bond level 2',
};

export default function LessonPlayerScreen({ route, navigation }) {
  const t = useTheme();
  const { profile } = useAuth();
  const params = route?.params ?? {};
  // The server's key for this lesson. Absent in Practice Mode.
  const key = params.lessonId ?? params.topicKey ?? null;

  const [title, setTitle] = useState(params.title ?? 'Lesson');
  const [steps, setSteps] = useState(params.steps ?? (key ? null : DEMO_STEPS));
  const [index, setIndex] = useState(params.resumeAt ?? 0);
  const [supervised, setSupervised] = useState(false);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (steps || !key) return;
    let alive = true;
    api.get(`/lessons/${key}`).then((d) => {
      if (!alive) return;
      const got = d?.lesson?.steps ?? [];
      if (!got.length) { setMissing(true); return; }
      setSteps(got);
      if (d.lesson.title) setTitle(d.lesson.title);
      // Resume where they left off, unless they had finished — then start over.
      const at = d?.progress?.completedAt ? 0 : (d?.progress?.stepIndex ?? 0);
      setIndex(Math.min(at, got.length - 1));
    }).catch(() => { if (alive) setMissing(true); });
    return () => { alive = false; };
  }, [key, steps]);

  const isChild = profile?.ageBand === AGE_BANDS.CHILD;

  if (missing) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.color.ground }}>
        <View style={{ flex: 1, padding: t.gutter, justifyContent: 'center', gap: t.space[4] }}>
          <Text style={[t.type('h2'), { color: t.color.textPrimary }]}>That lesson isn't here yet.</Text>
          <Text style={[t.type('body'), { color: t.color.textSecondary }]}>
            Nothing is wrong on your end. Try another one for now.
          </Text>
          <SecondaryButton title="Back" onPress={() => navigation.goBack()} />
        </View>
      </SafeAreaView>
    );
  }

  if (!steps) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.color.ground, justifyContent: 'center' }}>
        <ActivityIndicator color={t.color.accent} accessibilityLabel="Loading lesson" />
      </SafeAreaView>
    );
  }

  const step = steps[index];
  const blocked = isChild && step.supervisionRequired && !supervised;

  async function next() {
    if (blocked) return;
    const last = index + 1 >= steps.length;
    if (last) {
      let earned = [];
      if (key) {
        const r = await api.post(`/lessons/${key}/progress`,
          { stepIndex: index + 1, completed: true }).catch(() => null);
        earned = r?.badgesAwarded ?? [];
      }
      if (earned.length) {
        await dialog.alert('You earned a badge',
          earned.map((c) => `${BADGE_ICON[c] ?? '🏅'} ${BADGE_NAMES[c] ?? c}`).join('\n'));
      }
      return navigation.goBack();
    }
    // Persist on advance — resuming mid-lesson is the norm, not the edge case.
    if (key) api.post(`/lessons/${key}/progress`, { stepIndex: index + 1 }).catch(() => {});
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
            {title}
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
            {key ? 'Take your time. There is no timer.' : 'Practice — nothing is recorded.'}
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
            <PrimaryButton title={index + 1 >= steps.length ? 'Done' : 'Got it — next'}
              onPress={next} disabled={blocked} />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
