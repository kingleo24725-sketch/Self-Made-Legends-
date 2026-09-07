/**
 * Dad + Daughter Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 * Proprietary and confidential. Unauthorized copying, distribution,
 * or use of this file, via any medium, is strictly prohibited.
 *
 * Remembrance Mode is TOP-LEVEL, not buried in Legacy. Data export and
 * account deletion are always free, at every tier, in every region.
 * docs/wireframes.md W-A1.
 */
import React, { useState } from 'react';
import {
  View, Text, SafeAreaView, ScrollView, Switch, Pressable, Linking, Share,
} from 'react-native';
import { featureOn, SUPPORT_EMAIL } from '../utils/config';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../hooks/useAuth';
import { useSubscription } from '../hooks/useSubscription';
import Card from '../components/Cards/Card';
import { OWNER, AGE_BANDS } from '../utils/constants';
import api from '../utils/api';
import dialog from '../utils/dialog';

export default function SettingsScreen({ navigation }) {
  const t = useTheme();
  const { profile, logout } = useAuth();
  const { tier, openBillingPortal } = useSubscription();
  const [remembrance, setRemembrance] = useState(!!profile?.remembranceMode);

  /**
   * Deleting the account also deletes any child profiles under it. Say so
   * before doing it, not after -- a guardian is deciding for someone else.
   */
  function confirmDelete() {
    dialog.alert(
      'Delete your account?',
      'This removes your account and any child profiles you manage, '
      + 'including their memories and Legacy Vault. It cannot be undone.',
      [
        { text: 'Keep my account', style: 'cancel' },
        {
          text: 'Delete everything',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete('/privacy/account');
              await logout();
            } catch {
              dialog.alert('Delete account', "That didn't go through. Try again?");
            }
          },
        },
      ],
    );
  }

  /** Always free, every tier, every region. NOTICE.md ALWAYS_FREE. */
  async function exportMyData() {
    try {
      const data = await api.get('/privacy/export');
      await Share.share({
        title: 'Beauty Bond data export',
        message: JSON.stringify(data, null, 2),
      });
    } catch {
      dialog.alert('Export', "We couldn't build your export just now. Try again?");
    }
  }

  async function toggleRemembrance(v) {
    setRemembrance(v);
    await api.patch(`/profiles/${profile.id}`, { remembranceMode: v }).catch(() => {});
  }

  async function manageBilling() {
    const { url } = await openBillingPortal();
    if (url) Linking.openURL(url);
  }

  const isAdult = profile?.ageBand === AGE_BANDS.ADULT;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.color.ground }}>
      <ScrollView contentContainerStyle={{ padding: t.gutter, gap: t.space[4] }}>
        <Text style={[t.type('h1'), { color: t.color.textPrimary }]}>Settings</Text>

        <Group title="SAFETY CONTROLS">
          <Card>
            <Text style={[t.type('bodySm'), { color: t.color.textSecondary }]}>
              Age band: <Text style={{ color: t.color.textPrimary }}>{profile?.ageBand}</Text>
            </Text>
            <Text style={[t.type('caption'), {
              color: t.color.textSecondary, marginTop: t.space[1],
            }]}>
              Age settings are fixed and cannot be changed with a plan. Contact
              support if this is wrong.
            </Text>
          </Card>
          {isAdult && (
            <Row label="Guardian Console" onPress={() => navigation.navigate('GuardianConsole')} />
          )}
          {/* Blocking, reporting and reach all concern rooms with other
              people in them. Rooms are off in v1, so there is nobody to
              block and nothing to report; the rows were three dead taps.
              They return with the feature. */}
          {featureOn('rooms') && (
            <>
              <Row label="Blocked accounts" onPress={() => navigation.navigate('Rooms')} />
              <Row label="Report history" onPress={() => navigation.navigate('Rooms')} />
            </>
          )}
        </Group>

        <Group title="PRIVACY">
          <Row label="Camera, photos, mic" onPress={() => Linking.openSettings()} />
          {/* Always free, every tier, every region. */}
          <Row label="Download my data" onPress={exportMyData} />
          <Row label="Delete my account" destructive onPress={confirmDelete} />
        </Group>

        {/* v1 is free: with billing off there is no plan to manage, so the
            row is absent rather than leading to a wall nobody can buy past. */}
        {isAdult && featureOn('billing') && (
          <Group title="BILLING">
            <Row label={`Plan: ${tier}`} onPress={() => navigation.navigate('PlanSelection')} />
            <Text style={[t.type('caption'), {
              color: t.color.textSecondary, paddingBottom: t.space[2],
            }]}>
              🛈 Safety features, guardian controls, and data export are free on
              every plan.
            </Text>
            <Row label="Manage billing" onPress={manageBilling} />
          </Group>
        )}

        <Group title="APP">
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <Text style={[t.type('body'), { color: t.color.textPrimary }]}>Remembrance Mode</Text>
                <Text style={[t.type('caption'), { color: t.color.textSecondary }]}>
                  Softens the app and mutes Mother's/Father's Day campaigns.
                </Text>
              </View>
              <Switch value={remembrance} onValueChange={toggleRemembrance}
                accessibilityLabel="Remembrance Mode" />
            </View>
          </Card>
          {/* Language and text size are phone settings; the app follows
              them. These rows open the phone's settings rather than
              pretending to own the choice. */}
          <Row label="Language / Region" onPress={() => Linking.openSettings()} />
          <Row label="Text size" onPress={() => Linking.openSettings()} />
          {!!SUPPORT_EMAIL && (
            <Row label="Help & support" onPress={() => Linking.openURL(
              `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Beauty Bond help')}`)
              .catch(() => dialog.alert('Help & support', `Email us at ${SUPPORT_EMAIL}.`))} />
          )}
          <Row label="Sign out" onPress={logout} />
        </Group>

        <Text style={[t.type('caption'), { color: t.color.textSecondary, textAlign: 'center' }]}>
          Beauty Bond™{'\n'}© 2026 {OWNER}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Group({ title, children }) {
  const t = useTheme();
  return (
    <View style={{ gap: t.space[2] }}>
      <Text style={[t.type('overline'), { color: t.color.textSecondary }]}>{title}</Text>
      {children}
    </View>
  );
}

function Row({ label, onPress, destructive }) {
  const t = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label}
      style={{ minHeight: t.tapTarget, justifyContent: 'center', paddingVertical: t.space[2] }}>
      <Text style={[t.type('body'), { color: destructive ? t.color.danger : t.color.textPrimary }]}>
        {label}
      </Text>
    </Pressable>
  );
}
