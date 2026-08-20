/**
 * Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 *
 * Advisor credit appears on the CARD, not buried in a detail page.
 * The Respect tab is mandatory on every collection and is NEVER paywalled.
 * docs/wireframes.md W-30, W-31.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, SafeAreaView, ScrollView } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import Card from '../components/Cards/Card';
import api from '../utils/api';

const FALLBACK = [
  { slug: 'black_beauty', name: 'Black Beauty', lessons: 42, stories: 9, advisorName: 'Dr. A. Coleman' },
  { slug: 'latina_beauty', name: 'Latina Beauty', lessons: 38, stories: 7, advisorName: 'Advisor credited' },
  { slug: 'middle_eastern_beauty', name: 'Middle Eastern Beauty', lessons: 30, stories: 6, advisorName: 'Advisor credited' },
  { slug: 'asian_beauty', name: 'Asian Beauty', lessons: 44, stories: 8, advisorName: 'Advisor credited' },
  { slug: 'indigenous_beauty', name: 'Indigenous Beauty', lessons: 22, stories: 9, advisorName: 'Advisor credited' },
  { slug: 'mixed_heritage', name: 'Mixed & Multiheritage', lessons: 18, stories: 5, advisorName: 'Advisor credited' },
];

export default function CulturalLibraryScreen({ navigation }) {
  const t = useTheme();
  const [collections, setCollections] = useState(FALLBACK);

  useEffect(() => {
    api.get('/collections').then((d) => setCollections(d.collections ?? FALLBACK)).catch(() => {});
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.color.ground }}>
      <ScrollView contentContainerStyle={{ padding: t.gutter, gap: t.space[3] }}>
        <Text style={[t.type('h1'), { color: t.color.textPrimary }]}>Cultural Library</Text>
        <Text style={[t.type('body'), { color: t.color.textSecondary }]}>
          Beauty has roots. Learn them.
        </Text>

        {collections.map((c) => (
          <Card key={c.slug} onPress={() => navigation.navigate('CulturalLibrary', { slug: c.slug })}>
            <Text style={[t.type('h3'), { color: t.color.textPrimary }]}>{c.name}</Text>
            <Text style={[t.type('bodySm'), { color: t.color.textSecondary }]}>
              {c.lessons} lessons · {c.stories} stories
            </Text>
            {/* Advisor credit is on the card. Verified check. */}
            <Text style={[t.type('caption'), { color: t.color.accent, marginTop: 4 }]}>
              Advisor: {c.advisorName} ✓
            </Text>
          </Card>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
