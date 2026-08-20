/**
 * Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 *
 * Four tabs per collection: Technique, Stories, Palette, Respect.
 * The Respect tab is mandatory on every collection and never paywalled.
 * docs/wireframes.md W-31.
 */
import React, { useState } from 'react';
import { View, Text, SafeAreaView, ScrollView, Pressable } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import Card from '../components/Cards/Card';
import ShadeSwatch from '../components/Cards/ShadeSwatch';

const TABS = ['Technique', 'Stories', 'Palette', 'Respect'];

const CONTENT = {
  black_beauty: {
    technique: ['Matching deep shades without ash', 'Edge control & baby hair artistry',
                'Bold lip on deep skin', 'Hyperpigmentation-aware color'],
    story: { who: 'Ms. Deborah, 71',
             quote: 'We used what we had. Then we made what we needed.' },
    depths: [10, 11, 12, 13, 14, 15],
  },
  latina_beauty: {
    technique: ['Olive-undertone matching', 'Brow architecture', 'Glossy lip traditions',
                'Quinceañera glam'],
    story: { who: 'Rosa, 64', quote: 'My mother lined her lips before she opened the shop.' },
    depths: [5, 6, 7, 8, 9, 10],
  },
  south_asian_beauty: {
    technique: ['Bridal & festival glam', 'Gold pigment work', 'Long-wear in humidity',
                'Colorism, named and addressed'],
    story: { who: 'Priya, 58', quote: 'Gold was never decoration. It was blessing.' },
    depths: [6, 7, 8, 9, 10, 11],
  },
  east_asian_beauty: {
    technique: ['Skincare-first layering', 'Straight soft brow', 'Gradient lip',
                'Monolid-optimized liner'],
    story: { who: 'Mei, 67', quote: 'Skin first. Always skin first.' },
    depths: [2, 3, 4, 5, 6, 7],
  },
};

export default function CollectionDetailScreen({ route }) {
  const t = useTheme();
  const [tab, setTab] = useState('Technique');
  const slug = route?.params?.slug;
  const data = CONTENT[slug] ?? CONTENT.black_beauty;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.color.ground }}>
      <ScrollView contentContainerStyle={{ padding: t.gutter, gap: t.space[4] }}>
        <Text style={[t.type('h1'), { color: t.color.textPrimary }]}>
          {route?.params?.name ?? 'Collection'}
        </Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: t.space[2] }}>
          {TABS.map((label) => (
            <Pressable key={label} onPress={() => setTab(label)}
              accessibilityRole="button" accessibilityState={{ selected: tab === label }}
              style={{
                minHeight: t.tapTarget, paddingHorizontal: t.space[4],
                justifyContent: 'center', borderRadius: t.radius.pill, borderWidth: 1,
                borderColor: tab === label ? t.color.accent : t.color.border,
              }}>
              <Text style={[t.type('caption'), { color: t.color.textPrimary }]}>{label}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {tab === 'Technique' && data.technique.map((item) => (
          <Card key={item}>
            <Text style={[t.type('body'), { color: t.color.textPrimary }]}>{item}</Text>
          </Card>
        ))}

        {tab === 'Stories' && (
          <Card>
            <Text style={[t.type('h3'), { color: t.color.textPrimary }]}>{data.story.who}</Text>
            <Text style={[t.type('bodyLg'), {
              color: t.color.textSecondary, marginTop: t.space[2], fontStyle: 'italic',
            }]}>
              "{data.story.quote}"
            </Text>
          </Card>
        )}

        {tab === 'Palette' && (
          <Card>
            <Text style={[t.type('bodySm'), {
              color: t.color.textSecondary, marginBottom: t.space[3],
            }]}>
              Depths most represented in this collection.
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.space[3] }}>
              {data.depths.map((d) => (
                <ShadeSwatch key={d} hex={t.color.shadeScale[d - 1]} depth={d} />
              ))}
            </View>
          </Card>
        )}

        {tab === 'Respect' && (
          <Card>
            <Text style={[t.type('h3'), { color: t.color.textPrimary }]}>
              🤝 What's shareable, what's not
            </Text>
            <Text style={[t.type('body'), {
              color: t.color.textSecondary, marginTop: t.space[2],
            }]}>
              Written by this collection's cultural advisor. Some practices are open to
              everyone. Some are ceremonial and belong to the community they come from —
              this section names which is which, and why.
            </Text>
            <Text style={[t.type('caption'), {
              color: t.color.accent, marginTop: t.space[3],
            }]}>
              Free on every plan.
            </Text>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
