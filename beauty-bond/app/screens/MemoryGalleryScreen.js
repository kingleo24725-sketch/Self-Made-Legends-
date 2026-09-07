/**
 * Dad + Daughter Beauty Bond™ — a Self-Made Legends LLC (SML) product.
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
import dialog from '../utils/dialog';

export default function MemoryGalleryScreen({ navigation }) {
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
            body="Looks you save from Try-On land here, and Try-On arrives in a later update. Lessons and the Vault are open now."
            ctaTitle="Start a lesson"
            onPress={() => navigation.navigate('Main', { screen: 'Learn' })} />
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
          {/* A request with no answer on screen is a button that "did nothing"
              to the person who pressed it, whatever the server did. */}
          <PrimaryButton title="Create" onPress={async () => {
            try {
              await api.post('/bond-book');
              await dialog.alert('Bond Book', "We're putting your year together. It takes a little while — we'll let you know when it's ready.");
            } catch (e) {
              await dialog.alert('Bond Book', e?.code === 'upgrade_required'
                ? 'Bond Books are part of a paid plan.'
                : "That didn't start. Try again in a moment.");
            }
          }} />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
