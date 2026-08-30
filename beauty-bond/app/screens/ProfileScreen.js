/**
 * Dad + Daughter Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 * Proprietary and confidential. Unauthorized copying, distribution,
 * or use of this file, via any medium, is strictly prohibited.
 *
 * "Share card" is hidden entirely on U13 profiles. Public profile cards show
 * NO location, NO school, NO last-seen. Streaks get two free passes a month —
 * they must never become an anxiety mechanic for a 9-year-old.
 * docs/wireframes.md W-90.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, SafeAreaView, ScrollView, Pressable } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../hooks/useAuth';
import { useSubscription } from '../hooks/useSubscription';
import Card from '../components/Cards/Card';
import SecondaryButton from '../components/Buttons/SecondaryButton';
import ShadeSwatch from '../components/Cards/ShadeSwatch';
import { AGE_BANDS, BADGE_ICON, BADGE_TOTAL } from '../utils/constants';
import api from '../utils/api';
import { featureOn } from '../utils/config';

export default function ProfileScreen({ navigation }) {
  const t = useTheme();
  const { profile } = useAuth();
  const { tier, entitlements, usage } = useSubscription();
  const isChild = profile?.ageBand === AGE_BANDS.CHILD;

  // Level, streak and badge count were literals identical on every device.
  const [prog, setProg] = useState(null);
  useEffect(() => {
    api.get('/me/progression').then(setProg).catch(() => {});
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.color.ground }}>
      <ScrollView contentContainerStyle={{ padding: t.gutter, gap: t.space[5] }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={[t.type('h1'), { color: t.color.textPrimary, flex: 1 }]}>
            {profile?.displayName ?? 'Profile'}
          </Text>
          <Pressable onPress={() => navigation.navigate('Settings')}
            accessibilityRole="button" accessibilityLabel="Settings">
            <Text style={{ fontSize: 22 }}>⚙</Text>
          </Pressable>
        </View>

        <Card>
          <Text style={[t.type('h3'), { color: t.color.textPrimary }]}>
            {prog?.bond ? `Level ${prog.bond.level}` : 'Just getting started'}
          </Text>
          <Text style={[t.type('bodySm'), { color: t.color.textSecondary }]}>
            {prog?.streak?.current > 0 && !t.suppressStreaks
              ? `🔥 ${prog.streak.current}-day streak — `
                + `${prog.streak.passesRemaining} pass`
                + `${prog.streak.passesRemaining === 1 ? '' : 'es'} left`
              : `${prog?.lessonsCompleted ?? 0} lessons finished`}
          </Text>
        </Card>

        {/* Subscription status — kids never see billing, they don't hold a plan,
            and with billing off in v1 nobody does. */}
        {!isChild && featureOn('billing') && (
          <>
            <Text style={[t.type('overline'), { color: t.color.textSecondary }]}>
              SUBSCRIPTION
            </Text>
            <Card onPress={() => navigation.navigate('PlanSelection')}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={[t.type('h3'), {
                  color: t.color.textPrimary, flex: 1, textTransform: 'capitalize',
                }]}>
                  {tier} plan
                </Text>
                <Text style={[t.type('caption'), { color: t.color.accent }]}>Manage ›</Text>
              </View>
              <Text style={[t.type('bodySm'), {
                color: t.color.textSecondary, marginTop: t.space[1],
              }]}>
                Try-ons this month: {usage.tryon}
                {entitlements.tryOnPerMonth === 'unlimited'
                  ? ' · unlimited'
                  : ` / ${entitlements.tryOnPerMonth}`}
              </Text>
              <Text style={[t.type('caption'), {
                color: t.color.textSecondary, marginTop: t.space[1],
              }]}>
                🛈 Safety features are free, always.
              </Text>
            </Card>
          </>
        )}

        <Text style={[t.type('overline'), { color: t.color.textSecondary }]}>
          BADGES · {prog?.badges?.length ?? 0}/{BADGE_TOTAL}
        </Text>
        <Card>
          {prog?.badges?.length
            ? (
              <Text style={{ fontSize: 24 }}>
                {prog.badges.map((b) => BADGE_ICON[b.code] ?? '🏅').join(' ')}
              </Text>
            )
            : (
              <Text style={[t.type('bodySm'), { color: t.color.textSecondary }]}>
                Your first badge is waiting after lesson one.
              </Text>
            )}
        </Card>

        <Text style={[t.type('overline'), { color: t.color.textSecondary }]}>MY SHADE PROFILE</Text>
        <Card>
          <View style={{ flexDirection: 'row', gap: t.space[2], alignItems: 'center' }}>
            <ShadeSwatch hex={t.color.shadeScale[8]} depth={9} undertone="warm" />
            <View>
              <Text style={[t.type('body'), { color: t.color.textPrimary }]}>Depth 9–10</Text>
              <Text style={[t.type('bodySm'), { color: t.color.textSecondary }]}>
                Warm, slight olive
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: t.space[3], marginTop: t.space[3] }}>
            {/* Share is hidden entirely for U13. */}
            {!isChild && <SecondaryButton title="Share card" onPress={() => {}} style={{ flex: 1 }} />}
            <SecondaryButton title="Re-scan" style={{ flex: 1 }}
              onPress={() => featureOn('tryOn') && navigation.navigate('ShadeMatch')} />
          </View>
        </Card>

        <SecondaryButton title="Memory Gallery"
          onPress={() => navigation.navigate('MemoryGallery')} />
        <SecondaryButton title="My Makeup Bag" onPress={() => navigation.navigate('MakeupBag')} />
      </ScrollView>
    </SafeAreaView>
  );
}
