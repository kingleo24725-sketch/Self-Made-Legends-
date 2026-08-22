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
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, SafeAreaView, ScrollView, Pressable, Alert } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import Card from '../components/Cards/Card';
import EmptyState from '../components/EmptyState';
import { PAO_MONTHS } from '../utils/constants';
import api from '../utils/api';

export default function MakeupBagScreen() {
  const t = useTheme();
  const [bag, setBag] = useState({ items: [], wishlist: [] });
  const [tab, setTab] = useState('products');

  const load = useCallback(() => {
    api.get('/bag')
      .then((d) => setBag({ items: d.items ?? [], wishlist: d.wishlist ?? [] }))
      .catch(() => { /* offline: keep whatever is on screen */ });
  }, []);

  useEffect(() => { load(); }, [load]);

  const items = tab === 'wishlist' ? bag.wishlist : bag.items;

  async function addProduct() {
    Alert.prompt?.(
      'Add a product',
      "What is it? You can add the shade later.",
      async (customName) => {
        if (!customName?.trim()) return;
        try {
          await api.post('/bag', { customName: customName.trim(), isWishlist: tab === 'wishlist' });
          load();
        } catch {
          Alert.alert('My Bag', "That didn't save. Try again?");
        }
      },
    ) ?? Alert.alert('Add a product', 'Adding products arrives with shade matching.');
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.color.ground }}>
      <ScrollView contentContainerStyle={{ padding: t.gutter, gap: t.space[3] }}>
        <Text style={[t.type('h1'), { color: t.color.textPrimary }]}>My Bag</Text>

        <View style={{ flexDirection: 'row', gap: t.space[2] }}>
          {[['products', 'What I own'], ['wishlist', 'Wishlist']].map(([key, label]) => (
            <Pressable
              key={key}
              onPress={() => setTab(key)}
              accessibilityRole="tab"
              accessibilityState={{ selected: tab === key }}
              style={{
                paddingVertical: t.space[2],
                paddingHorizontal: t.space[4],
                borderRadius: t.radius.pill ?? 999,
                minHeight: t.tapTarget,
                justifyContent: 'center',
                backgroundColor: tab === key ? t.color.accent : t.color.raised,
              }}
            >
              <Text style={[t.type('caption'), {
                color: tab === key ? t.color.cocoa ?? '#2A1F1C' : t.color.textSecondary,
              }]}>
                {label}
              </Text>
            </Pressable>
          ))}
        </View>

        {items.length === 0 ? (
          <EmptyState emoji="👜" title="Your bag is empty."
            body="Add what you already own — we'll match shades and track when to replace things."
            ctaTitle="Add a product" onPress={addProduct} />
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
