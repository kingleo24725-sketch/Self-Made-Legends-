/**
 * Dads & Daughters Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 * Proprietary and confidential. Unauthorized copying, distribution,
 * or use of this file, via any medium, is strictly prohibited.
 *
 * Room recaps are STILLS ONLY, generated with all-party consent.
 * Delete is a REAL delete: source, thumbs, recap frames, CDN purge <=24h.
 * docs/wireframes.md W-91.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, SafeAreaView, ScrollView } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import Card from '../components/Cards/Card';
import PrimaryButton from '../components/Buttons/PrimaryButton';
import EmptyState from '../components/EmptyState';
import api from '../utils/api';

export default function MemoryGalleryScreen() {
  const t = useTheme();
  const [memories, setMemories] = useState([]);

  useEffect(() => {
    api.get('/memories').then((d) => setMemories(d.memories ?? [])).catch(() => {});
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.color.ground }}>
      <ScrollView contentContainerStyle={{ padding: t.gutter, gap: t.space[4] }}>
        <Text style={[t.type('h1'), { color: t.color.textPrimary }]}>Memories</Text>

        {memories.length === 0 ? (
          <EmptyState emoji="✨" title="No memories yet."
            body="Your first look is one lesson away."
            ctaTitle="Start a lesson" onPress={() => {}} />
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.space[3] }}>
            {memories.map((m) => (
              <Card key={m.id} style={{ width: '47%' }}>
                <Text style={[t.type('caption'), { color: t.color.textSecondary }]}>
                  {m.occurredOn}
                </Text>
                <Text style={[t.type('bodySm'), { color: t.color.textPrimary }]}>{m.caption}</Text>
                {m.consentStatus === 'pending_consent' && (
                  <Text style={[t.type('caption'), { color: t.color.warning }]}>
                    Waiting on consent
                  </Text>
                )}
              </Card>
            ))}
          </View>
        )}

        <Card>
          <Text style={[t.type('h3'), { color: t.color.textPrimary }]}>📖 Make a Bond Book</Text>
          <Text style={[t.type('bodySm'), { color: t.color.textSecondary, marginBottom: t.space[3] }]}>
            A printed keepsake of your year.
          </Text>
          <PrimaryButton title="Create" onPress={() => api.post('/bond-book')} />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
