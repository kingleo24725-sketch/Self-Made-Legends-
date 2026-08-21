/**
 * Dads & Daughters Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 * Proprietary and confidential. Unauthorized copying, distribution,
 * or use of this file, via any medium, is strictly prohibited.
 *
 * Expiry chips are HYGIENE, not upsell — copy stays practical.
 * Ingredient cautions cross-reference the profile's declared sensitivities.
 * docs/wireframes.md W-80.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, SafeAreaView, ScrollView } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import Card from '../components/Cards/Card';
import EmptyState from '../components/EmptyState';
import { PAO_MONTHS } from '../utils/constants';
import api from '../utils/api';

export default function MakeupBagScreen() {
  const t = useTheme();
  const [items, setItems] = useState([]);
  const [tab, setTab] = useState('products');

  useEffect(() => { api.get('/bag').then((d) => setItems(d.items ?? [])).catch(() => {}); }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.color.ground }}>
      <ScrollView contentContainerStyle={{ padding: t.gutter, gap: t.space[3] }}>
        <Text style={[t.type('h1'), { color: t.color.textPrimary }]}>My Bag</Text>

        {items.length === 0 ? (
          <EmptyState emoji="👜" title="Your bag is empty."
            body="Add what you already own — we'll match shades and track when to replace things."
            ctaTitle="Add a product" onPress={() => {}} />
        ) : items.map((item) => {
          const months = PAO_MONTHS[item.category] ?? 12;
          const expiring = monthsSince(item.openedOn) > months - 2;
          return (
            <Card key={item.id}>
              <Text style={[t.type('body'), { color: t.color.textPrimary }]}>
                {item.brand} {item.name}
              </Text>
              <Text style={[t.type('bodySm'), { color: t.color.textSecondary }]}>
                Shade: {item.shade}
              </Text>
              {expiring && (
                <Text style={[t.type('caption'), { color: t.color.warning }]}>
                  ⚠ Replace soon
                </Text>
              )}
              {item.allergenFlags?.length > 0 && (
                <Text style={[t.type('caption'), { color: t.color.warning }]}>
                  ⚠ Contains: {item.allergenFlags.join(', ')}
                </Text>
              )}
            </Card>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

function monthsSince(dateStr) {
  if (!dateStr) return 0;
  const d = new Date(dateStr);
  return (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24 * 30);
}
