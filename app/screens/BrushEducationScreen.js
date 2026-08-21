/**
 * Dads & Daughters Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 * Proprietary and confidential. Unauthorized copying, distribution,
 * or use of this file, via any medium, is strictly prohibited.
 * docs/wireframes.md W-22.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, SafeAreaView, ScrollView } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import Card from '../components/Cards/Card';
import PrimaryButton from '../components/Buttons/PrimaryButton';
import api from '../utils/api';

const FALLBACK = [
  { id: 'fluff', name: 'Fluff', useFor: ['blending eyeshadow'], bristle: 'natural', pressure: 2 },
  { id: 'flat', name: 'Flat', useFor: ['packing color'], bristle: 'synthetic', pressure: 3 },
  { id: 'angled', name: 'Angled liner', useFor: ['brows', 'gel liner'], bristle: 'synthetic', pressure: 2,
    wrongToolResult: 'harsh, patchy lines' },
  { id: 'fan', name: 'Fan', useFor: ['highlight'], bristle: 'natural', pressure: 1 },
  { id: 'kabuki', name: 'Kabuki', useFor: ['buffing base'], bristle: 'synthetic', pressure: 3 },
  { id: 'spoolie', name: 'Spoolie', useFor: ['brow grooming'], bristle: 'synthetic', pressure: 2 },
];

export default function BrushEducationScreen() {
  const t = useTheme();
  const [brushes, setBrushes] = useState(FALLBACK);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    api.get('/brushes').then((d) => setBrushes(d.brushes ?? FALLBACK)).catch(() => {});
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.color.ground }}>
      <ScrollView contentContainerStyle={{ padding: t.gutter, gap: t.space[4] }}>
        <Text style={[t.type('h1'), { color: t.color.textPrimary }]}>Brush School</Text>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.space[3] }}>
          {brushes.map((b) => (
            <Card key={b.id} style={{ width: '30%' }} selected={selected?.id === b.id}
                  onPress={() => setSelected(b)}>
              <Text style={{ fontSize: 24, textAlign: 'center' }}>🖌</Text>
              <Text style={[t.type('caption'), { color: t.color.textPrimary, textAlign: 'center' }]}>
                {b.name}
              </Text>
            </Card>
          ))}
        </View>

        {selected && (
          <Card>
            <Text style={[t.type('h3'), { color: t.color.textPrimary }]}>{selected.name}</Text>
            <Text style={[t.type('bodySm'), { color: t.color.textSecondary }]}>
              Use for: {(selected.useFor ?? []).join(', ')}
            </Text>
            <Text style={[t.type('bodySm'), { color: t.color.textSecondary }]}>
              Bristle: {selected.bristle}
            </Text>
            <Text style={[t.type('bodySm'), { color: t.color.textSecondary }]}>
              Pressure: {'▓'.repeat(selected.pressure ?? 1)}{'░'.repeat(5 - (selected.pressure ?? 1))}
            </Text>
            {selected.wrongToolResult && (
              <Text style={[t.type('caption'), { color: t.color.warning, marginTop: 4 }]}>
                Wrong tool: {selected.wrongToolResult}
              </Text>
            )}
          </Card>
        )}

        <Text style={[t.type('overline'), { color: t.color.textSecondary }]}>CLEANING COACH</Text>
        <Card>
          <Text style={[t.type('body'), { color: t.color.textPrimary }]}>
            Last cleaned: 9 days ago ⚠
          </Text>
          <PrimaryButton title="Start 6-step wash" onPress={() => {}}
            style={{ marginTop: t.space[3] }} />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
