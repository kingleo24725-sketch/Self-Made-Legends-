/**
 * Dads & Daughters Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 * Proprietary and confidential. Unauthorized copying, distribution,
 * or use of this file, via any medium, is strictly prohibited.
 *
 * The app had no way in: AuthContext.login existed with zero call sites, so a
 * returning family could not reach their account. docs/wireframes.md W-03.
 */
import React, { useState } from 'react';
import {
  View, Text, SafeAreaView, TextInput, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../hooks/useAuth';
import PrimaryButton from '../components/Buttons/PrimaryButton';
import SecondaryButton from '../components/Buttons/SecondaryButton';

/** Server codes -> something a parent can act on. Never surface a raw code. */
const MESSAGES = {
  invalid_credentials: "That email and password don't match. Try again?",
  invalid_email: 'That email address looks incomplete.',
  rate_limited: 'Too many tries. Give it a minute, then have another go.',
  network: "Can't reach Beauty Bond. Check your connection and try again.",
};

export default function SignInScreen({ navigation }) {
  const t = useTheme();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const ready = email.includes('@') && password.length > 0 && !busy;

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      await login(email.trim(), password);
      // No navigate() — the navigator swaps to the authed stack when status changes.
    } catch (e) {
      const code = e?.code || e?.message;
      setError(MESSAGES[code] ?? MESSAGES.invalid_credentials);
    } finally {
      setBusy(false);
    }
  }

  const input = (props) => (
    <TextInput
      placeholderTextColor={t.color.textSecondary}
      autoCapitalize="none"
      autoCorrect={false}
      style={{
        height: t.controlHeight.input,
        backgroundColor: t.color.raised,
        borderRadius: t.radius.md,
        borderWidth: 1,
        borderColor: error ? t.color.danger : t.color.border,
        paddingHorizontal: t.space[4],
        color: t.color.textPrimary,
        ...t.type('body'),
      }}
      {...props}
    />
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.color.bg }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, padding: t.space[5], justifyContent: 'center' }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ gap: t.space[3], marginBottom: t.space[6] }}>
            <Text style={[t.type('h1'), { color: t.color.textPrimary }]}>
              Welcome back
            </Text>
            <Text style={[t.type('body'), { color: t.color.textSecondary }]}>
              Sign in to pick up where you and your daughter left off.
            </Text>
          </View>

          <View style={{ gap: t.space[3] }}>
            {input({
              value: email,
              onChangeText: setEmail,
              placeholder: 'Email',
              keyboardType: 'email-address',
              textContentType: 'username',
              accessibilityLabel: 'Email',
            })}
            {input({
              value: password,
              onChangeText: setPassword,
              placeholder: 'Password',
              secureTextEntry: true,
              textContentType: 'password',
              accessibilityLabel: 'Password',
              onSubmitEditing: () => ready && submit(),
              returnKeyType: 'go',
            })}

            {error && (
              <Text
                accessibilityLiveRegion="polite"
                style={[t.type('bodySm'), { color: t.color.danger }]}
              >
                {error}
              </Text>
            )}
          </View>

          <View style={{ gap: t.space[3], marginTop: t.space[6] }}>
            <PrimaryButton
              title={busy ? 'Signing in…' : 'Sign in'}
              onPress={submit}
              disabled={!ready}
            />
            <SecondaryButton
              title="I need an account"
              onPress={() => navigation.navigate('AgeGate')}
              ghost
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
