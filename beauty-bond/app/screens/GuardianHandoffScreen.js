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

export default function GuardianHandoffScreen({ route }) {
  const t = useTheme();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  async function send() {
    await api.post('/guardian/consent/start', {
      guardianEmail: email,
      birthDate: route?.params?.birthDate,
    });
    setSent(true);
  }

  if (sent) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.color.ground }}>
        <View style={{ flex: 1, padding: t.gutter, justifyContent: 'center', gap: t.space[4] }}>
          <Text style={{ fontSize: 40, textAlign: 'center' }}>⏳</Text>
          <Text style={[t.type('h1'), { color: t.color.textPrimary, textAlign: 'center' }]}>
            We sent the link!
          </Text>
          <Text style={[t.type('body'), { color: t.color.textSecondary, textAlign: 'center' }]}>
            Ask them to check their email.
          </Text>
          <SecondaryButton title="Resend" onPress={send} ghost />
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
        <SecondaryButton title="A grown-up is here with me now" ghost onPress={() => {}} />
      </View>
    </SafeAreaView>
  );
}
