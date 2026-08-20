/**
 * Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 *
 * 60-second micro-lessons. Dad's inexperience is the joke, never the shame —
 * and Compliment Cards deliberately coach EFFORT praise over appearance
 * praise. Do not "simplify" the card templates into a free-text box.
 * docs/wireframes.md W-60, docs/branding.md §7.6.
 */
import React, { useState } from 'react';
import { View, Text, SafeAreaView, ScrollView, TextInput, Alert } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import Card from '../components/Cards/Card';
import PrimaryButton from '../components/Buttons/PrimaryButton';
import api from '../utils/api';

const LESSONS = [
  { id: 'ponytail', title: 'The puff ponytail', secs: 60 },
  { id: 'blend', title: 'What "blend" actually means', secs: 45 },
  { id: 'compliment', title: 'How to compliment her', secs: 50 },
  { id: 'gift', title: 'Buying makeup she\'ll actually use', secs: 60 },
  { id: 'edges', title: 'Edges without wrecking them', secs: 60 },
];

/** Structured to reward specificity about effort and character. */
const CARD_TEMPLATE = { before: 'I liked how', middle: 'you were when you', after: '.' };

export default function DadSchoolScreen() {
  const t = useTheme();
  const [trait, setTrait] = useState('');
  const [action, setAction] = useState('');

  async function send() {
    if (!trait.trim() || !action.trim()) {
      return Alert.alert('Almost there', 'Fill in both parts so it lands.');
    }
    await api.post('/bond/compliments', {
      templateId: 'effort_v1', filled: { trait, action },
    }).catch(() => {});
    Alert.alert('Sent 💛', 'She\'ll see it next time she opens the app.');
    setTrait(''); setAction('');
  }

  const input = (value, onChange, placeholder, label) => (
    <TextInput
      value={value} onChangeText={onChange} placeholder={placeholder}
      accessibilityLabel={label}
      style={{
        minHeight: t.controlHeight.input, backgroundColor: t.color.ground,
        borderRadius: t.radius.md, borderWidth: 1, borderColor: t.color.border,
        paddingHorizontal: t.space[4], color: t.color.textPrimary, ...t.type('body'),
      }}
    />
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.color.ground }}>
      <ScrollView contentContainerStyle={{ padding: t.gutter, gap: t.space[4] }}>
        <Text style={[t.type('h1'), { color: t.color.textPrimary }]}>Dad School</Text>
        <Text style={[t.type('body'), { color: t.color.textSecondary }]}>
          Nobody's born knowing what a fluff brush is. Let's fix that.
        </Text>

        {LESSONS.map((l) => (
          <Card key={l.id} onPress={() => {}}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={[t.type('body'), { color: t.color.textPrimary, flex: 1 }]}>
                ▶ {l.title}
              </Text>
              <Text style={[t.type('caption'), { color: t.color.textSecondary }]}>
                {l.secs}s
              </Text>
            </View>
          </Card>
        ))}

        <Text style={[t.type('overline'), { color: t.color.textSecondary }]}>
          COMPLIMENT CARD
        </Text>
        <Card>
          <Text style={[t.type('body'), { color: t.color.textPrimary }]}>
            {CARD_TEMPLATE.before}
          </Text>
          {input(trait, setTrait, 'patient, careful, brave…', 'Trait')}
          <Text style={[t.type('body'), {
            color: t.color.textPrimary, marginTop: t.space[2],
          }]}>
            {CARD_TEMPLATE.middle}
          </Text>
          {input(action, setAction, 'blended that edge for ten minutes…', 'What she did')}
          <Text style={[t.type('caption'), {
            color: t.color.textSecondary, marginTop: t.space[3],
          }]}>
            Tip: praise the effort, not the face. It lands harder and lasts longer.
          </Text>
          <PrimaryButton title="Send it" onPress={send} style={{ marginTop: t.space[3] }} />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
