/**
 * Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 *
 * Button set is AGE-DEPENDENT:
 *   adult = Save/Share/Shop | teen = Save/Share/Wishlist | U13 = Save ONLY.
 * U13 rendering is stylized (sparkle/sticker/face-paint) — NEVER photoreal
 * cosmetics on a child's face. docs/wireframes.md W-40, docs/ai-tryon.md §4.6.
 */
import React, { useState } from 'react';
import { View, Text, SafeAreaView, ScrollView, Pressable } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../hooks/useAuth';
import { useTryOn } from '../hooks/useTryOn';
import Card from '../components/Cards/Card';
import PrimaryButton from '../components/Buttons/PrimaryButton';
import SecondaryButton from '../components/Buttons/SecondaryButton';
import ConsentGate from '../components/Modals/ConsentGate';
import PaywallSheet from '../components/Modals/PaywallSheet';
import { AGE_BANDS, TRYON_LAYERS } from '../utils/constants';

const PRESETS = ['Everyday', 'Soft Glam', 'Date Night', 'Festival', 'Bridal'];
const CULTURAL = ['Black', 'Latina', 'Middle Eastern', 'Asian', 'Indigenous', 'Mixed'];

export default function TryOnScreen({ navigation }) {
  const t = useTheme();
  const { profile } = useAuth();
  const { apply, rendering } = useTryOn();
  const [consented, setConsented] = useState(false);
  const [paywall, setPaywall] = useState(false);
  const [activeLayer, setActiveLayer] = useState('lip');

  const band = profile?.ageBand ?? AGE_BANDS.ADULT;
  const isChild = band === AGE_BANDS.CHILD;
  const isTeen = band === AGE_BANDS.TEEN;

  async function run(preset) {
    try {
      await apply({ id: preset, layers: [{ type: 'lip', opacity: 0.8 }] }, { kind: 'live' });
    } catch (e) {
      if (e.isUpgradeRequired) setPaywall(true);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.color.ground }}>
      <ScrollView contentContainerStyle={{ padding: t.gutter, gap: t.space[4] }}>
        <Text style={[t.type('h1'), { color: t.color.textPrimary }]}>Try-On</Text>

        {/* Live AR preview / before-after drag handle is the trust mechanic */}
        <View style={{
          height: 320, borderRadius: t.radius.xl, backgroundColor: t.color.plumSoft,
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Text style={[t.type('caption'), { color: '#fff' }]}>
            {rendering ? 'Rendering…' : '◐ live preview — drag to compare'}
          </Text>
        </View>

        <Text style={[t.type('overline'), { color: t.color.textSecondary }]}>LAYERS</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: t.space[2] }}>
          {TRYON_LAYERS.map((layer) => (
            <Pressable key={layer} onPress={() => setActiveLayer(layer)}
              accessibilityRole="button" accessibilityState={{ selected: activeLayer === layer }}
              style={{
                minHeight: t.tapTarget, paddingHorizontal: t.space[4], justifyContent: 'center',
                borderRadius: t.radius.pill, borderWidth: 1,
                borderColor: activeLayer === layer ? t.color.accent : t.color.border,
              }}>
              <Text style={[t.type('caption'), { color: t.color.textPrimary }]}>{layer}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <Text style={[t.type('overline'), { color: t.color.textSecondary }]}>PRESETS</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: t.space[3] }}>
          {(isChild ? ['Little Legend', 'Festival'] : PRESETS).map((p) => (
            <Card key={p} style={{ width: 110 }} onPress={() => run(p)}>
              <Text style={[t.type('bodySm'), { color: t.color.textPrimary }]}>{p}</Text>
            </Card>
          ))}
        </ScrollView>

        {!isChild && (
          <>
            <Text style={[t.type('overline'), { color: t.color.textSecondary }]}>
              CULTURAL GLAM SETS
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ gap: t.space[3] }}>
              {CULTURAL.map((c) => (
                <Card key={c} style={{ width: 120 }} onPress={() => run(c)}>
                  <Text style={[t.type('bodySm'), { color: t.color.textPrimary }]}>{c}</Text>
                </Card>
              ))}
            </ScrollView>
          </>
        )}

        {/* Age-dependent action row */}
        <View style={{ gap: t.space[3] }}>
          <PrimaryButton title="Save" onPress={() => {}} />
          {!isChild && <SecondaryButton title="Share" onPress={() => {}} />}
          {isTeen && <SecondaryButton title="Add to wishlist" onPress={() => {}} />}
          {band === AGE_BANDS.ADULT && (
            <SecondaryButton title="Shop this look" onPress={() => {}} />
          )}
        </View>
      </ScrollView>

      <ConsentGate visible={!consented} onAccept={() => setConsented(true)}
        onDecline={() => navigation.goBack()} />
      <PaywallSheet visible={paywall} capability="tryon"
        onUpgrade={() => { setPaywall(false); navigation.navigate('PlanSelection'); }}
        onDismiss={() => setPaywall(false)} />
    </SafeAreaView>
  );
}
