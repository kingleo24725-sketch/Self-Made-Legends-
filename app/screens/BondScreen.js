/**
 * Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 *
 * DUAL-CONFIRM is the whole mechanic — one person cannot complete a bond
 * mission alone. Compliment templates deliberately coach EFFORT praise over
 * appearance praise; do not "simplify" into a free-text box.
 * docs/wireframes.md W-60.
 */
import React, { useState } from 'react';
import { View, Text, SafeAreaView, ScrollView } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import Card from '../components/Cards/Card';
import PrimaryButton from '../components/Buttons/PrimaryButton';
import SecondaryButton from '../components/Buttons/SecondaryButton';
import api from '../utils/api';

const MISSIONS = [
  { id: 'm1', title: 'Dad picks her lip color — and has to name it.', confirmedBy: ['a', 'b'] },
  { id: 'm2', title: 'She teaches him one brush.', confirmedBy: ['a', 'b'] },
  { id: 'm3', title: 'Match your looks for pizza night.', confirmedBy: ['b'] },
];

export default function BondScreen() {
  const t = useTheme();
  const [missions, setMissions] = useState(MISSIONS);

  async function confirm(id) {
    await api.post(`/bond/missions/${id}/confirm`).catch(() => {});
    setMissions((ms) => ms.map((m) =>
      m.id === id ? { ...m, confirmedBy: [...new Set([...m.confirmedBy, 'me'])] } : m));
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.color.ground }}>
      <ScrollView contentContainerStyle={{ padding: t.gutter, gap: t.space[5] }}>
        <Card>
          <Text style={[t.type('display'), { color: t.color.accent }]}>68%</Text>
          <Text style={[t.type('h3'), { color: t.color.textPrimary }]}>
            Level 2 · "Blending Buddies"
          </Text>
        </Card>

        <Text style={[t.type('overline'), { color: t.color.textSecondary }]}>
          THIS WEEK'S MISSIONS
        </Text>
        {missions.map((m) => {
          const done = m.confirmedBy.length >= 2;
          return (
            <Card key={m.id}>
              <Text style={[t.type('body'), { color: t.color.textPrimary }]}>
                {done ? '✅ ' : '○ '}{m.title}
              </Text>
              {/* Pending state names WHO we're waiting on, gently. */}
              {!done && (
                <>
                  <Text style={[t.type('caption'), { color: t.color.textSecondary, marginTop: 4 }]}>
                    Waiting on one more ✓
                  </Text>
                  <SecondaryButton title="I did it ✓" onPress={() => confirm(m.id)}
                    style={{ marginTop: t.space[3] }} />
                </>
              )}
            </Card>
          );
        })}

        <Text style={[t.type('overline'), { color: t.color.textSecondary }]}>DAD SCHOOL · 60s</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: t.space[3] }}>
          {['Puff Pony', 'What "blend" means', 'How to compliment'].map((s) => (
            <Card key={s} style={{ width: 130 }}>
              <Text style={[t.type('bodySm'), { color: t.color.textPrimary }]}>▶ {s}</Text>
            </Card>
          ))}
        </ScrollView>

        <Text style={[t.type('overline'), { color: t.color.textSecondary }]}>COMPLIMENT CARDS</Text>
        <Card>
          <Text style={[t.type('body'), { color: t.color.textPrimary }]}>
            "I liked how ___ you were when you ___."
          </Text>
          <PrimaryButton title="Send it" onPress={() => {}} style={{ marginTop: t.space[3] }} />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
