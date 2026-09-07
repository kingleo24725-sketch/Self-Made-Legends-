/**
 * Dad + Daughter Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 * Proprietary and confidential. Unauthorized copying, distribution,
 * or use of this file, via any medium, is strictly prohibited.
 *
 * Sections are driven by v1 scope — see utils/config.js. Try-On and Glam
 * Rooms are built but switched off, so v1 shows three.
 * Child accounts get 56px targets and simplified copy — keyed off AGE BAND,
 * not mode, because a child can pick any mode. docs/wireframes.md W-11/W-12.
 */
import React, { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, SafeAreaView, ScrollView, Pressable } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../hooks/useAuth';
import Card from '../components/Cards/Card';
import SecondaryButton from '../components/Buttons/SecondaryButton';
import { visibleHomeSections, MODE_META, RELATIONAL_MODES, COPY } from '../utils/constants';
import { featureOn } from '../utils/config';
import api from '../utils/api';
import dialog from '../utils/dialog';

export default function HomeScreen({ navigation }) {
  const t = useTheme();
  const { profile, profiles, switchProfile } = useAuth();

  // The grown-up whose phone this is. A child profile lives under a
  // guardian's account; the way back to the guardian's side is here, and
  // it costs the account password — so she can look, and not open the
  // Guardian Console.
  const guardian = profile?.guardianId
    ? profiles.find((p) => p.id === profile.guardianId) : null;

  async function giveBack() {
    const password = await dialog.prompt(`Give the phone back to ${guardian.displayName}`,
      `${guardian.displayName} types the account password here.`,
      { placeholder: 'Account password', ok: 'Switch', secure: true });
    if (!password) return;
    try {
      await switchProfile(guardian.id, password);
    } catch (e) {
      dialog.alert('Not yet', e?.code === 'password_required'
        ? "That password didn't match. Try again."
        : "That didn't work. Check your connection and try again.");
    }
  }

  const meta = MODE_META[profile?.mode];
  const isRelational = RELATIONAL_MODES.includes(profile?.mode);

  // The streak and Bond Meter were literals: every family saw 🔥 7 and 68%.
  // Refetched on focus, not once on mount: tabs stay mounted, so a mount-only
  // read meant finishing a lesson and coming Home showed yesterday's meter.
  const [prog, setProg] = useState(null);
  useFocusEffect(useCallback(() => {
    api.get('/me/progression').then(setProg).catch(() => {});
  }, []));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.color.ground }}>
      <ScrollView contentContainerStyle={{ padding: t.gutter, gap: t.space[4] }}>

        {/* Header — mode chip is a tap target back to mode selection */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.space[3] }}>
          <View style={{ flex: 1 }}>
            <Text style={[t.type('h1'), { color: t.color.textPrimary }]}>
              {t.isChild ? `Hi ${profile?.displayName ?? 'there'}! ✨`
                         : `Hi ${profile?.displayName ?? 'there'}`}
            </Text>
            <Pressable
              onPress={() => navigation.navigate('ModeSelection')}
              accessibilityRole="button"
              accessibilityLabel={`Current mode: ${meta?.title ?? 'none'}. Tap to change.`}
              style={{ minHeight: t.tapTarget, justifyContent: 'center' }}
            >
              <Text style={[t.type('caption'), { color: t.color.accent }]}>
                {meta?.icon} {meta?.title ?? 'Choose a mode'} ▾
              </Text>
            </Pressable>
          </View>

          {!t.isChild && !t.suppressStreaks && prog?.streak?.current > 0 && (
            <Text
              accessibilityLabel={`${prog.streak.current} day streak`}
              style={{ fontSize: 18 }}
            >
              🔥 {prog.streak.current}
            </Text>
          )}
        </View>

        {!!guardian && (
          <SecondaryButton title={`Give the phone back to ${guardian.displayName}`} ghost
            onPress={giveBack} />
        )}

        {/* Bond Meter — only in modes that pair two people */}
        {isRelational && (
          <Card onPress={() => navigation.navigate('Bond')}>
            <Text style={[t.type('overline'), { color: t.color.textSecondary }]}>
              BOND METER
            </Text>
            <Text style={[t.type('display'), { color: t.color.accent }]}>
              {prog?.bond ? `${prog.bond.meter}` : '—'}
            </Text>
            <Text style={[t.type('bodySm'), { color: t.color.textSecondary }]}>
              {prog?.bond
                ? `${prog.bond.toNextLevel} points to Level ${prog.bond.level + 1}`
                : 'Start a mission together'}
            </Text>
            {/* Decay copy must never shame. */}
            <Text style={[t.type('caption'), {
              color: t.color.textSecondary, marginTop: t.space[1],
            }]}>
              {COPY.streakBroken}
            </Text>
          </Card>
        )}

        {/* The sections in scope for this build */}
        {visibleHomeSections(featureOn).map((section) => (
          <Card
            key={section.key}
            onPress={() => navigation.navigate(section.route)}
            style={{ minHeight: t.isChild ? 104 : 88, justifyContent: 'center' }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.space[3] }}>
              <Text style={{ fontSize: t.isChild ? 36 : 28 }}>{section.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[t.type('h3'), { color: t.color.textPrimary }]}>
                  {section.title}
                </Text>
                <Text style={[t.type('bodySm'), { color: t.color.textSecondary }]}>
                  {section.blurb}
                </Text>
              </View>
              <Text style={[t.type('h3'), { color: t.color.textSecondary }]}>›</Text>
            </View>
          </Card>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
