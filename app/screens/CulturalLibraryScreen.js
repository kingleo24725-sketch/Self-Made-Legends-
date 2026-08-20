/**
 * Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 *
 * Six collections: Black, Latina, Middle Eastern, South Asian, East Asian,
 * Indigenous & Mixed-Race.
 *
 * Advisor credit appears on the CARD, not buried in a detail page, and the
 * Respect note is never paywalled. docs/wireframes.md W-30/W-31.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, SafeAreaView, ScrollView } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useSubscription } from '../hooks/useSubscription';
import Card from '../components/Cards/Card';
import PaywallSheet from '../components/Modals/PaywallSheet';
import { CULTURAL_COLLECTIONS } from '../utils/constants';
import api from '../utils/api';

export default function CulturalLibraryScreen({ navigation }) {
  const t = useTheme();
  const { can } = useSubscription();
  const [collections, setCollections] = useState(CULTURAL_COLLECTIONS);
  const [paywall, setPaywall] = useState(false);

  useEffect(() => {
    api.get('/collections')
      .then((d) => { if (d?.collections?.length) setCollections(d.collections); })
      .catch(() => { /* offline: fall back to the bundled list */ });
  }, []);

  const hasAll = can('cultural.all');

  function open(collection, index) {
    // Free tier gets one full collection; the rest show a soft paywall.
    if (!hasAll && index > 0) return setPaywall(true);
    navigation.navigate('CollectionDetail', {
      slug: collection.slug, name: collection.name,
    });
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.color.ground }}>
      <ScrollView contentContainerStyle={{ padding: t.gutter, gap: t.space[3] }}>
        <Text style={[t.type('h1'), { color: t.color.textPrimary }]}>
          Cultural Beauty Library
        </Text>
        <Text style={[t.type('body'), { color: t.color.textSecondary }]}>
          Beauty has roots. Learn them.
        </Text>

        {collections.map((c, i) => {
          const locked = !hasAll && i > 0;
          return (
            <Card
              key={c.slug}
              onPress={() => open(c, i)}
              style={{ opacity: locked ? 0.6 : 1 }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                  <Text style={[t.type('h3'), { color: t.color.textPrimary }]}>
                    {c.name}
                  </Text>
                  <Text style={[t.type('bodySm'), {
                    color: t.color.textSecondary, marginTop: t.space[1],
                  }]}>
                    {c.blurb}
                  </Text>

                  {/* Every collection carries a named, paid, credited advisor. */}
                  <Text style={[t.type('caption'), {
                    color: t.color.accent, marginTop: t.space[2],
                  }]}>
                    Advisor: {c.advisorName ?? 'Credited on the collection'} ✓
                  </Text>
                </View>

                {locked && (
                  <Text style={[t.type('caption'), { color: t.color.accent }]}>Bond plan</Text>
                )}
              </View>
            </Card>
          );
        })}

        {/* Never paywalled, on any collection. */}
        <Card onPress={() => navigation.navigate('RespectNote')}>
          <Text style={[t.type('h3'), { color: t.color.textPrimary }]}>
            🤝 What's shareable, what's not
          </Text>
          <Text style={[t.type('bodySm'), { color: t.color.textSecondary }]}>
            Written by our cultural advisors. Free on every plan.
          </Text>
        </Card>
      </ScrollView>

      <PaywallSheet
        visible={paywall}
        capability="cultural.all"
        onUpgrade={() => { setPaywall(false); navigation.navigate('PlanSelection'); }}
        onDismiss={() => setPaywall(false)}
      />
    </SafeAreaView>
  );
}
