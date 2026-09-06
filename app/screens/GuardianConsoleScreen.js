/**
 * Dad + Daughter Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 * Proprietary and confidential. Unauthorized copying, distribution,
 * or use of this file, via any medium, is strictly prohibited.
 *
 * The most important screen in the app.
 * Purchases are HARD-LOCKED on child accounts — a lock, not a toggle.
 * docs/wireframes.md W-A0.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, SafeAreaView, ScrollView, Switch, Share } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../hooks/useAuth';
import { normaliseDate } from '../utils/validators';
import Card from '../components/Cards/Card';
import PrimaryButton from '../components/Buttons/PrimaryButton';
import SecondaryButton from '../components/Buttons/SecondaryButton';
import api from '../utils/api';
import dialog from '../utils/dialog';

const PERMISSIONS = [
  { key: 'camera_tryon', label: 'Camera & try-on' },
  { key: 'video_rooms', label: 'Family Room video' },
  { key: 'live_lessons', label: 'Live lessons (creator-led)' },
  { key: 'bff_rooms', label: 'Best Friend Glam' },
  { key: 'notifications', label: 'Notifications' },
];

export default function GuardianConsoleScreen() {
  const t = useTheme();
  const { user, reload } = useAuth();
  const [adding, setAdding] = useState(false);

  // The child used to be a hardcoded placeholder, so every permission toggle
  // wrote to /guardian/permissions/c1 -- an id that does not exist.
  const [child, setChild] = useState(null);
  const [perms, setPerms] = useState({
    camera_tryon: true, video_rooms: false, live_lessons: false,
    bff_rooms: false, notifications: true,
  });

  const loadChildren = useCallback(async () => {
    try {
      const { children } = await api.get('/guardian/children');
      const first = children?.[0] ?? null;
      setChild(first && { id: first.id, name: first.displayName, ageBand: first.ageBand });
    } catch {
      setChild(null);
    }
  }, []);

  useEffect(() => { loadChildren(); }, [loadChildren]);

  /**
   * ADDING A DAUGHTER — the flow that did not exist.
   *
   * The API had the whole COPPA sequence for months (consent/start -> verify
   * -> children) and no screen called it, so no father could form the
   * relationship the app is named after. In order, and none skippable:
   *
   *   1. Her name and birth date. Nothing is sent yet.
   *   2. Consent is STARTED for the signed-in guardian's own email. Data about
   *      her is still not collected — the server stores only that this adult
   *      asked. (userService.startConsent)
   *   3. The consent statement is shown and affirmed. With a mail provider
   *      configured the token arrives by email and we wait; without one — every
   *      deployment so far — the server hands it back to this authenticated
   *      guardian and the affirmation happens here. api/users/index.js.
   *   4. Only now is her profile created, bound to that consent.
   */
  async function addDaughter() {
    if (adding) return;
    const name = await dialog.prompt('What is her name?', 'Just her first name is fine.',
      { placeholder: 'Her name', ok: 'Next' });
    if (!name) return;

    const dobRaw = await dialog.prompt(`When was ${name} born?`,
      'We use this to set which features are right for her age. It is never shared.',
      { placeholder: 'YYYY-MM-DD', ok: 'Next' });
    if (!dobRaw) return;
    const birthDate = normaliseDate(dobRaw);
    if (!birthDate) {
      dialog.alert('That date', 'Please write it as YYYY-MM-DD, like 2016-01-20.');
      return;
    }

    setAdding(true);
    try {
      const started = await api.post('/guardian/consent/start', { guardianEmail: user?.email });

      if (started.delivery === 'email') {
        await dialog.alert('Check your email',
          `We sent a consent link to ${user?.email}. Tap it, then come back here and `
          + `add ${name} again — it will pick up where you left off.`);
        return;
      }

      const agreed = await dialog.confirm(
        'Parental consent',
        `You are ${name}'s parent or legal guardian, and you consent to Beauty Bond `
        + 'creating a profile for her.\n\n'
        + 'What we keep: her first name, her date of birth, and what she does in the '
        + 'app. What we never do: sell it, show her ads, or let her buy anything. '
        + 'You can export or delete all of it from this screen, any time.',
        { ok: 'I consent', cancel: 'Not now' },
      );
      if (!agreed) return;

      await api.post(`/guardian/consent/${started.consentId}/verify`,
        { token: started.verificationToken });
      await api.post('/guardian/children',
        { displayName: name, birthDate, consentId: started.consentId });

      await loadChildren();
      await reload?.();
      dialog.alert(`${name} is in`, 'Her permissions, screen time and data controls are all here.');
    } catch (e) {
      const why = {
        child_profile_must_be_a_minor: 'That birth date makes her an adult. Grown-ups hold their own accounts.',
        consent_expired: 'That consent expired. Start again and it will be fresh.',
        parental_consent_required: 'Consent was not recorded. Try again from the start.',
      }[e?.code] ?? "That didn't go through. Check your connection and try again.";
      dialog.alert('Adding her', why);
    } finally {
      setAdding(false);
    }
  }

  async function toggle(key, value) {
    if (!child) return;
    const previous = perms[key];
    setPerms((p) => ({ ...p, [key]: value }));
    try {
      await api.patch(`/guardian/permissions/${child.id}`, { [key]: value });
    } catch {
      // Never leave a permission switch showing a state the server rejected —
      // a guardian would believe video was off when it is on.
      setPerms((p) => ({ ...p, [key]: previous }));
      dialog.alert('Permissions', "That didn't save. Check your connection.");
    }
  }

  async function exportChildData() {
    try {
      const data = await api.get('/privacy/export');
      await Share.share({
        title: `${child.name} — Beauty Bond data`,
        message: JSON.stringify(data, null, 2),
      });
    } catch {
      dialog.alert('Export', "We couldn't build that export just now.");
    }
  }

  function confirmDeleteChild() {
    dialog.alert(
      `Delete ${child.name}'s account?`,
      'This removes their profile, memories and Legacy Vault items. '
      + 'It cannot be undone.',
      [
        { text: 'Keep it', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/guardian/children/${child.id}`);
              await loadChildren();
            } catch {
              dialog.alert('Delete', "That didn't go through. Try again?");
            }
          },
        },
      ],
    );
  }

  // No child yet: the console has nothing to govern, and every control below
  // dereferences `child`. Say what to do instead of rendering a broken page.
  if (!child) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.color.ground }}>
        <ScrollView contentContainerStyle={{ padding: t.gutter, gap: t.space[4] }}>
          <Text style={[t.type('h1'), { color: t.color.textPrimary }]}>Guardian Console</Text>
          <Card>
            <Text style={[t.type('body'), { color: t.color.textPrimary }]}>
              No child profile yet.
            </Text>
            <Text style={[t.type('bodySm'), { color: t.color.textSecondary }]}>
              Once you've added your daughter, her permissions, screen time and
              data controls all live here.
            </Text>
          </Card>
          <PrimaryButton title={adding ? 'Adding…' : 'Add your daughter'}
            onPress={addDaughter} disabled={adding} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.color.ground }}>
      <ScrollView contentContainerStyle={{ padding: t.gutter, gap: t.space[4] }}>
        <Text style={[t.type('h1'), { color: t.color.textPrimary }]}>Guardian Console</Text>

        <Card>
          <Text style={[t.type('h3'), { color: t.color.textPrimary }]}>
            {child.name}
          </Text>
          <Text style={[t.type('caption'), { color: t.color.textSecondary }]}>Child account</Text>
        </Card>

        <Text style={[t.type('overline'), { color: t.color.textSecondary }]}>PERMISSIONS</Text>
        {PERMISSIONS.map((p) => (
          <Card key={p.key}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={[t.type('body'), { color: t.color.textPrimary, flex: 1 }]}>{p.label}</Text>
              <Switch value={perms[p.key]} onValueChange={(v) => toggle(p.key, v)}
                accessibilityLabel={p.label} />
            </View>
          </Card>
        ))}

        {/* Not a toggle — a lock. Child accounts can never purchase, at any tier. */}
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={[t.type('body'), { color: t.color.textPrimary, flex: 1 }]}>Purchases</Text>
            <Text style={[t.type('body'), { color: t.color.textSecondary }]}>🔒 Locked</Text>
          </View>
          <Text style={[t.type('caption'), { color: t.color.textSecondary, marginTop: 4 }]}>
            Child accounts can never make a purchase.
          </Text>
        </Card>

        <Text style={[t.type('overline'), { color: t.color.textSecondary }]}>SCREEN TIME</Text>
        <Card>
          <Text style={[t.type('body'), { color: t.color.textPrimary }]}>Daily limit · 45 min</Text>
          <Text style={[t.type('bodySm'), { color: t.color.textSecondary }]}>
            Bedtime 8:30 pm – 7:00 am
          </Text>
        </Card>

        {/* Always free, at every tier. */}
        <SecondaryButton title={`Export ${child.name}'s data`} onPress={exportChildData} />
        <SecondaryButton title={`Delete ${child.name}'s account`} onPress={confirmDeleteChild} ghost />
      </ScrollView>
    </SafeAreaView>
  );
}
