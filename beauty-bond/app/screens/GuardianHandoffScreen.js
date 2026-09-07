/**
 * Dad + Daughter Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 * Proprietary and confidential. Unauthorized copying, distribution,
 * or use of this file, via any medium, is strictly prohibited.
 *
 * HARD WALL. No camera, no name, no photo, NO DATA COLLECTION AT ALL on a
 * child account before verifiable parental consent is recorded.
 * docs/wireframes.md W-02.
 */
import React, { useState } from 'react';
import { View, Text, SafeAreaView, TextInput } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import PrimaryButton from '../components/Buttons/PrimaryButton';
import SecondaryButton from '../components/Buttons/SecondaryButton';
import { isEmail } from '../utils/validators';
import api from '../utils/api';
import dialog from '../utils/dialog';

export default function GuardianHandoffScreen({ route }) {
  const t = useTheme();
  const [email, setEmail] = useState('');
  // 'email' when a link went out; 'in_app' when the server has no mailer and
  // the grown-up has to do it on this phone. This screen used to say "We
  // sent the link! Check their email" in both cases — a promise about an
  // email that, in v1, does not exist.
  const [sent, setSent] = useState(null);

  async function send() {
    try {
      const res = await api.post('/guardian/consent/start', {
        guardianEmail: email,
        birthDate: route?.params?.birthDate,
      });
      setSent(res?.delivery === 'email' ? 'email' : 'in_app');
    } catch {
      dialog.alert('Hmm', "That didn't go through. Check the email address and try again.");
    }
  }

  /**
   * The v1 path when the grown-up is right there: they make their own
   * account and add the child from their Guardian Console, which asks for
   * consent on the spot. That is the whole flow; this just says it plainly.
   */
  function grownUpHere() {
    dialog.alert(
      'Hand them the phone',
      '1. They tap "Get started" and make their own account.\n'
      + '2. In Profile → Settings → Guardian Console they tap "Add your daughter".\n'
      + '3. They say yes to parental consent, and your profile is made under theirs.',
      [{ text: 'Got it' }],
    );
  }

  if (sent) {
    const byEmail = sent === 'email';
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.color.ground }}>
        <View style={{ flex: 1, padding: t.gutter, justifyContent: 'center', gap: t.space[4] }}>
          <Text style={{ fontSize: 40, textAlign: 'center' }}>{byEmail ? '⏳' : '🤝'}</Text>
          <Text style={[t.type('h1'), { color: t.color.textPrimary, textAlign: 'center' }]}>
            {byEmail ? 'We sent the link!' : 'Next: your grown-up does it here.'}
          </Text>
          <Text style={[t.type('body'), { color: t.color.textSecondary, textAlign: 'center' }]}>
            {byEmail
              ? 'Ask them to check their email.'
              : 'No email goes out yet — they set you up on this phone instead.'}
          </Text>
          {byEmail
            ? <SecondaryButton title="Resend" onPress={send} ghost />
            : <PrimaryButton title="Show them how" onPress={grownUpHere} />}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.color.ground }}>
      <View style={{ flex: 1, padding: t.gutter, gap: t.space[4] }}>
        <Text style={{ fontSize: 32 }}>🔒</Text>
        <Text style={[t.type('h1'), { color: t.color.textPrimary }]}>Let's get a grown-up.</Text>
        <Text style={[t.type('body'), { color: t.color.textSecondary }]}>
          A parent or guardian has to set this up with you. It only takes a few minutes.
        </Text>

        <Text style={[t.type('caption'), { color: t.color.textSecondary }]}>Grown-up's email</Text>
        <TextInput
          value={email} onChangeText={setEmail}
          autoCapitalize="none" keyboardType="email-address"
          accessibilityLabel="Grown-up's email address"
          style={{
            height: t.controlHeight.input, backgroundColor: t.color.raised,
            borderRadius: t.radius.md, borderWidth: 1, borderColor: t.color.border,
            paddingHorizontal: t.space[4], color: t.color.textPrimary, ...t.type('body'),
          }}
        />
        <PrimaryButton title="Send the link" onPress={send} disabled={!isEmail(email)} />
        <SecondaryButton title="A grown-up is here with me now" ghost onPress={grownUpHere} />
      </View>
    </SafeAreaView>
  );
}
