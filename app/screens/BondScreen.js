/**
 * Dad + Daughter Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 *
 * Six sections: Dad Learns Makeup, Daughter Teaches Dad, Bonding Challenges,
 * Memory Gallery, Healing Journal, Mom's Legacy Looks.
 *
 * DUAL-CONFIRM is the whole mechanic — one person cannot complete a challenge
 * alone. docs/wireframes.md W-60.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, SafeAreaView, ScrollView } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../hooks/useAuth';
import Card from '../components/Cards/Card';
import SecondaryButton from '../components/Buttons/SecondaryButton';
import { BOND_SECTIONS } from '../utils/constants';
import api from '../utils/api';

const ROUTES = {
  dad_learns: 'DadSchool',
  daughter_teaches: 'DadSchool',
  challenges: null,          // rendered inline below
  memories: 'MemoryGallery',
  journal: 'Legacy',
  legacy: 'Legacy',
};

const FALLBACK_CHALLENGES = [
  { id: 'c1', title: 'Dad picks her lip color — and has to name it.', confirmedBy: ['a', 'b'] },
  { id: 'c2', title: 'She teaches him one brush.', confirmedBy: ['a', 'b'] },
  { id: 'c3', title: 'Match your looks for pizza night.', confirmedBy: ['b'] },
];

export default function BondScreen({ navigation }) {
  const t = useTheme();
  const { profile } = useAuth();
  const [challenges, setChallenges] = useState(FALLBACK_CHALLENGES);

  useEffect(() => {
    api.get('/bond/missions')
      .then((d) => { if (d?.missions?.length) setChallenges(d.missions); })
      .catch(() => {});
  }, []);

  async function confirm(id) {
    setChallenges((cs) => cs.map((c) =>
      c.id === id
        ? { ...c, confirmedBy: [...new Set([...c.confirmedBy, profile?.id ?? 'me'])] }
        : c));
    await api.post(`/bond/missions/${id}/confirm`).catch(() => {});
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.color.ground }}>
      <ScrollView contentContainerStyle={{ padding: t.gutter, gap: t.space[4] }}>
        <Text style={[t.type('h1'), { color: t.color.textPrimary }]}>
          Bonding & Memories
        </Text>

        <Card>
          <Text style={[t.type('overline'), { color: t.color.textSecondary }]}>BOND METER</Text>
          <Text style={[t.type('display'), { color: t.color.accent }]}>68%</Text>
          <Text style={[t.type('bodySm'), { color: t.color.textSecondary }]}>
            Level 2 · "Blending Buddies"
          </Text>
        </Card>

        {BOND_SECTIONS.map((section) => {
          if (section.key === 'challenges') {
            return (
              <View key={section.key} style={{ gap: t.space[3] }}>
                <Text style={[t.type('overline'), { color: t.color.textSecondary }]}>
                  {section.title.toUpperCase()}
                </Text>

                {challenges.map((c) => {
                  const done = (c.confirmedBy ?? []).length >= 2;
                  return (
                    <Card key={c.id}>
                      <Text style={[t.type('body'), { color: t.color.textPrimary }]}>
                        {done ? '✅ ' : '○ '}{c.title}
                      </Text>
                      {!done && (
                        <>
                          {/* Name who we're waiting on — gently. */}
                          <Text style={[t.type('caption'), {
                            color: t.color.textSecondary, marginTop: t.space[1],
                          }]}>
                            Waiting on one more ✓
                          </Text>
                          <SecondaryButton
                            title="I did it ✓"
                            onPress={() => confirm(c.id)}
                            style={{ marginTop: t.space[3] }}
                          />
                        </>
                      )}
                    </Card>
                  );
                })}
              </View>
            );
          }

          return (
            <Card
              key={section.key}
              onPress={() => ROUTES[section.key] && navigation.navigate(ROUTES[section.key])}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.space[3] }}>
                <Text style={{ fontSize: 26 }}>{section.icon}</Text>
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
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}
