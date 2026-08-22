/**
 * Dads & Daughters Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 * Proprietary and confidential. Unauthorized copying, distribution,
 * or use of this file, via any medium, is strictly prohibited.
 *
 * Flow: pick/take photo -> POST /api/tryon/render -> display processed image.
 *
 * AGE RULES (docs/ai-tryon.md §4.6) — enforced here AND on the server:
 *   - Child accounts NEVER upload. They render on-device only; a U13 face
 *     image does not leave the phone.
 *   - Action row is age-dependent: adult Save/Share/Shop, teen Save/Share/
 *     Wishlist, child Save only.
 */
import React, { useEffect, useState } from 'react';
import {
  View, Text, SafeAreaView, ScrollView, Image, Pressable, Alert, ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../hooks/useAuth';
import { useTryOn } from '../hooks/useTryOn';
import Card from '../components/Cards/Card';
import PrimaryButton from '../components/Buttons/PrimaryButton';
import SecondaryButton from '../components/Buttons/SecondaryButton';
import ConsentGate from '../components/Modals/ConsentGate';
import PaywallSheet from '../components/Modals/PaywallSheet';
import { AGE_BANDS, TRYON_LAYERS, COPY } from '../utils/constants';
import api from '../utils/api';

const FALLBACK_PRESETS = [
  { id: 'everyday',   name: 'Everyday' },
  { id: 'soft_glam',  name: 'Soft Glam' },
  { id: 'date_night', name: 'Date Night', minAge: 13 },
  { id: 'festival',   name: 'Festival' },
  { id: 'bridal',     name: 'Bridal', minAge: 16 },
];

const FALLBACK_CULTURAL_SETS = [
  { id: 'glam_black',          name: 'Black Glam' },
  { id: 'glam_latina',         name: 'Latina Glam' },
  { id: 'glam_middle_eastern', name: 'Middle Eastern Glam' },
  { id: 'glam_south_asian',    name: 'South Asian Glam' },
  { id: 'glam_east_asian',     name: 'East Asian Glam' },
  { id: 'glam_indigenous',     name: 'Indigenous & Mixed Glam' },
];

export default function TryOnScreen({ navigation }) {
  const t = useTheme();
  const { profile } = useAuth();
  const { apply, rendering } = useTryOn();

  const [consented, setConsented] = useState(false);
  const [paywall, setPaywall] = useState(false);
  const [source, setSource] = useState(null);      // { uri, mimeType, bytes }
  const [result, setResult] = useState(null);      // { url, beforeUrl, adjustments }
  const [showBefore, setShowBefore] = useState(false);
  const [activeLayer, setActiveLayer] = useState('lip');

  // The server filters presets by the profile's age band, so an age-gated look
  // never reaches a child's device at all. The literals stay only as an
  // offline fallback.
  const [presets, setPresets] = useState(FALLBACK_PRESETS);
  const [culturalSets, setCulturalSets] = useState(FALLBACK_CULTURAL_SETS);
  useEffect(() => {
    api.get('/tryon/presets')
      .then((d) => {
        if (d?.presets?.length) setPresets(d.presets);
        if (d?.culturalSets?.length) setCulturalSets(d.culturalSets);
      })
      .catch(() => {});
  }, []);

  const band = profile?.ageBand ?? AGE_BANDS.ADULT;
  const isChild = band === AGE_BANDS.CHILD;
  const isTeen = band === AGE_BANDS.TEEN;

  async function pickPhoto(fromCamera) {
    const perm = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      return Alert.alert('Permission needed', 'We need access to continue.');
    }

    const picker = fromCamera
      ? ImagePicker.launchCameraAsync
      : ImagePicker.launchImageLibraryAsync;

    const res = await picker({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
      allowsEditing: false,
    });
    if (res.canceled) return;

    const asset = res.assets[0];
    setSource({ uri: asset.uri, mimeType: asset.mimeType ?? 'image/jpeg',
                bytes: asset.fileSize ?? 0, kind: 'photo' });
    setResult(null);
  }

  async function run(preset) {
    if (!source && !isChild) {
      return Alert.alert('Pick a photo first', 'Take one or choose from your library.');
    }
    try {
      const out = await apply(
        { id: preset.id, layers: [{ type: activeLayer, opacity: 0.8 }] },
        source ?? { kind: 'live' },
      );
      setResult(out);
    } catch (e) {
      if (e.isUpgradeRequired) return setPaywall(true);
      if (e.isOnDeviceUnavailable) {
        return Alert.alert('Try-on', COPY.errorOnDeviceUnavailable);
      }
      // e.message is a machine code (server_render_forbidden_for_minor and
      // friends) -- never show it to a family.
      Alert.alert('Try-on', COPY.errorGeneric);
    }
  }

  const displayUri = result
    ? (showBefore ? (result.beforeUrl ?? source?.uri) : result.url)
    : source?.uri;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.color.ground }}>
      <ScrollView contentContainerStyle={{ padding: t.gutter, gap: t.space[4] }}>
        <Text style={[t.type('h1'), { color: t.color.textPrimary }]}>AI Try-On</Text>

        {isChild && (
          <Card>
            <Text style={[t.type('bodySm'), { color: t.color.textSecondary }]}>
              ✨ Your pictures stay on this phone. Nothing is ever uploaded.
            </Text>
          </Card>
        )}

        {/* Preview */}
        <View style={{
          height: 340, borderRadius: t.radius.xl, overflow: 'hidden',
          backgroundColor: t.color.plumSoft, alignItems: 'center', justifyContent: 'center',
        }}>
          {displayUri ? (
            <Image source={{ uri: displayUri }} style={{ width: '100%', height: '100%' }}
                   resizeMode="cover" accessibilityLabel="Try-on preview" />
          ) : (
            <Text style={[t.type('body'), { color: '#fff' }]}>
              {isChild ? 'Tap a look to play ✨' : 'Add a photo to start'}
            </Text>
          )}

          {rendering && (
            <View style={{
              ...StyleSheetAbsolute, alignItems: 'center', justifyContent: 'center',
              backgroundColor: 'rgba(61,38,69,.45)',
            }}>
              <ActivityIndicator color="#fff" />
              <Text style={[t.type('caption'), { color: '#fff', marginTop: 8 }]}>
                Rendering…
              </Text>
            </View>
          )}
        </View>

        {/* Before/after is the trust mechanic — always available once rendered. */}
        {result && (
          <Pressable
            onPressIn={() => setShowBefore(true)}
            onPressOut={() => setShowBefore(false)}
            accessibilityRole="button"
            accessibilityLabel="Press and hold to see the photo without makeup"
            style={{ minHeight: t.tapTarget, justifyContent: 'center', alignItems: 'center' }}
          >
            <Text style={[t.type('caption'), { color: t.color.accent }]}>
              ◐ Hold to see it without makeup
            </Text>
          </Pressable>
        )}

        {!isChild && (
          <View style={{ flexDirection: 'row', gap: t.space[3] }}>
            <SecondaryButton title="📷 Take photo" style={{ flex: 1 }}
              onPress={() => pickPhoto(true)} />
            <SecondaryButton title="🖼 Choose photo" style={{ flex: 1 }}
              onPress={() => pickPhoto(false)} />
          </View>
        )}

        {/* Layers */}
        <Text style={[t.type('overline'), { color: t.color.textSecondary }]}>LAYERS</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: t.space[2] }}>
          {TRYON_LAYERS.filter((l) => !isChild || ['lip', 'cheek', 'glow'].includes(l))
            .map((layer) => (
              <Pressable key={layer} onPress={() => setActiveLayer(layer)}
                accessibilityRole="button"
                accessibilityState={{ selected: activeLayer === layer }}
                style={{
                  minHeight: t.tapTarget, paddingHorizontal: t.space[4],
                  justifyContent: 'center', borderRadius: t.radius.pill, borderWidth: 1,
                  borderColor: activeLayer === layer ? t.color.accent : t.color.border,
                }}>
                <Text style={[t.type('caption'), { color: t.color.textPrimary }]}>{layer}</Text>
              </Pressable>
            ))}
        </ScrollView>

        {/* Presets */}
        <Text style={[t.type('overline'), { color: t.color.textSecondary }]}>PRESETS</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: t.space[3] }}>
          {presets.filter((p) => !isChild || !p.minAge).map((p) => (
            <Card key={p.id} style={{ width: 118 }} onPress={() => run(p)}>
              <Text style={[t.type('bodySm'), { color: t.color.textPrimary }]}>{p.name}</Text>
            </Card>
          ))}
        </ScrollView>

        {/* Cultural glam sets — each advisor-approved and QA-panel tested */}
        {!isChild && (
          <>
            <Text style={[t.type('overline'), { color: t.color.textSecondary }]}>
              CULTURAL GLAM SETS
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ gap: t.space[3] }}>
              {culturalSets.map((c) => (
                <Card key={c.id} style={{ width: 150 }} onPress={() => run(c)}>
                  <Text style={[t.type('bodySm'), { color: t.color.textPrimary }]}>{c.name}</Text>
                </Card>
              ))}
            </ScrollView>
          </>
        )}

        {/* Age-dependent actions */}
        {result && (
          <View style={{ gap: t.space[3] }}>
            <PrimaryButton title="Save to my looks" onPress={() => {
              navigation.navigate('MemoryGallery');
            }} />
            {!isChild && <SecondaryButton title="Share" onPress={() => {}} />}
            {isTeen && <SecondaryButton title="Add to wishlist" onPress={() => {}} />}
            {band === AGE_BANDS.ADULT && (
              <SecondaryButton title="Shop this look" onPress={() => {}} />
            )}
          </View>
        )}

        {result?.adjustments?.length > 0 && (
          <Card>
            <Text style={[t.type('caption'), { color: t.color.textSecondary }]}>
              {result.adjustments.map((a) => `• ${a.note}`).join('\n')}
            </Text>
          </Card>
        )}
      </ScrollView>

      <ConsentGate visible={!consented} onAccept={() => setConsented(true)}
        onDecline={() => navigation.goBack()} />
      <PaywallSheet visible={paywall} capability="tryon"
        onUpgrade={() => { setPaywall(false); navigation.navigate('PlanSelection'); }}
        onDismiss={() => setPaywall(false)} />
    </SafeAreaView>
  );
}

const StyleSheetAbsolute = {
  position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
};
