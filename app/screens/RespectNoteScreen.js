/**
 * Dads & Daughters Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 * Proprietary and confidential. Unauthorized copying, distribution,
 * or use of this file, via any medium, is strictly prohibited.
 *
 * The cross-collection Respect note. docs/architecture.md M04.
 *
 * Mandatory on every collection and NEVER paywalled — it is the piece that
 * separates a cultural library from a costume box, so gating it would defeat
 * the point of having one.
 */
import React from 'react';
import { View, Text, SafeAreaView, ScrollView } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import Card from '../components/Cards/Card';
import { CULTURAL_COLLECTIONS } from '../utils/constants';

const PRINCIPLES = [
  {
    title: 'Technique travels. Ceremony does not.',
    body: 'How to lay an edge, cut a crease, or set a gradient lip is craft, and craft '
        + 'is meant to be taught. Regalia, ceremonial marks, and designs tied to '
        + 'initiation or mourning belong to the community they come from.',
  },
  {
    title: 'Say where it came from.',
    body: 'Naming the tradition and the artist is the whole difference between honouring '
        + 'a practice and lifting it. Every collection here credits a paid advisor by name.',
  },
  {
    title: 'It is not a costume.',
    body: 'A living tradition worn as a look for one night, by someone outside it, reads '
        + 'as costume no matter how respectfully it is done. When a collection says a '
        + 'practice is closed, that is the answer.',
  },
  {
    title: 'When you are unsure, ask before you wear it.',
    body: 'Each collection has an advisor and a way to reach them. "I did not know" is '
        + 'easy to avoid here.',
  },
];

export default function RespectNoteScreen() {
  const t = useTheme();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.color.ground }}>
      <ScrollView contentContainerStyle={{ padding: t.gutter, gap: t.space[4] }}>
        <Text style={[t.type('h1'), { color: t.color.textPrimary }]}>
          What's shareable, what's not
        </Text>
        <Text style={[t.type('body'), { color: t.color.textSecondary }]}>
          Written with the cultural advisors who author these collections.
          Free on every plan.
        </Text>

        {PRINCIPLES.map((p, i) => (
          <Card key={p.title}>
            <Text style={[t.type('overline'), { color: t.color.accent }]}>
              {String(i + 1).padStart(2, '0')}
            </Text>
            <Text style={[t.type('h3'), {
              color: t.color.textPrimary, marginTop: t.space[1],
            }]}>
              {p.title}
            </Text>
            <Text style={[t.type('body'), {
              color: t.color.textSecondary, marginTop: t.space[2],
            }]}>
              {p.body}
            </Text>
          </Card>
        ))}

        <Text style={[t.type('overline'), {
          color: t.color.textSecondary, marginTop: t.space[3],
        }]}>
          EVERY COLLECTION HAS ITS OWN NOTE
        </Text>
        {CULTURAL_COLLECTIONS.map((c) => (
          <Card key={c.slug}>
            <Text style={[t.type('body'), { color: t.color.textPrimary }]}>{c.name}</Text>
            <Text style={[t.type('caption'), {
              color: t.color.textSecondary, marginTop: 2,
            }]}>
              Advisor-authored · free on every plan
            </Text>
          </Card>
        ))}

        <Card>
          <Text style={[t.type('bodySm'), { color: t.color.textSecondary }]}>
            Think we've got something wrong? Reports about a collection go to that
            collection's advisor, not to general moderation.
          </Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
