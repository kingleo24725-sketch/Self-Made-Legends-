/**
 * Dads & Daughters Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 * Proprietary and confidential. Unauthorized copying, distribution,
 * or use of this file, via any medium, is strictly prohibited.
 *
 * Account creation, reached only from the age gate, which supplies birthDate.
 *
 * ONLY ADULTS HOLD ACCOUNTS. The age gate routes a child to GuardianHandoff
 * and never here, and the API refuses a minor birth date with
 * adults_only_signup. A child reaches the app by their guardian adding them
 * after verifiable parental consent — never by signing up.
 */
import React, { useState } from 'react';
import {
  View, Text, SafeAreaView, TextInput, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../hooks/useAuth';
import PrimaryButton from '../components/Buttons/PrimaryButton';
import SecondaryButton from '../components/Buttons/SecondaryButton';
import { AGE_BANDS } from '../utils/constants';
import { ageBandFor } from '../utils/validators';

const MIN_PASSWORD = 10;   // matches authController.js

const MESSAGES = {
  email_in_use: 'There is already an account with that email. Sign in instead?',
  invalid_email: 'That email address looks incomplete.',
  weak_password: `Use at least ${MIN_PASSWORD} characters.`,
  adults_only_signup: 'Accounts are held by grown-ups. Ask a parent to set this up.',
  birth_date_required: 'We need a date of birth first.',
  network: "Can't reach Beauty Bond. Check your connection and try again.",
};

export default function SignUpScreen({ navigation, route }) {
  const t = useTheme();
  const { register } = useAuth();

  const birthDate = route?.params?.birthDate ?? null;

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  // Defence in depth: the age gate should never route a minor here.
  const isMinor = birthDate ? ageBandFor(birthDate) !== AGE_BANDS.ADULT : false;

  const ready =
    !!birthDate && !isMinor && email.includes('@') &&
    password.length >= MIN_PASSWORD && !busy;

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      await register({
        email: email.trim(),
        password,
        birthDate,
        displayName: displayName.trim() || undefined,
      });
      // No navigate() — the navigator swaps stacks once status becomes authed.
    } catch (e) {
      const code = e?.code || e?.message;
      setError(MESSAGES[code] ?? 'Something went wrong creating your account.');
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
        borderColor: t.color.border,
        paddingHorizontal: t.space[4],
        color: t.color.textPrimary,
        ...t.type('body'),
      }}
      {...props}
    />
  );

  if (isMinor) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.color.bg }}>
        <View style={{ flex: 1, padding: t.space[5], justifyContent: 'center', gap: t.space[4] }}>
          <Text style={[t.type('h1'), { color: t.color.textPrimary }]}>
            Let's get a grown-up
          </Text>
          <Text style={[t.type('body'), { color: t.color.textSecondary }]}>
            Beauty Bond accounts are held by a parent or guardian. They can add you
            once they've set theirs up.
          </Text>
          <PrimaryButton
            title="Ask a grown-up"
            onPress={() => navigation.navigate('GuardianHandoff', { birthDate })}
          />
        </View>
      </SafeAreaView>
    );
  }

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
              Set up your account
            </Text>
            <Text style={[t.type('body'), { color: t.color.textSecondary }]}>
              This is the grown-up's account. You'll add your daughter next.
            </Text>
          </View>

          <View style={{ gap: t.space[3] }}>
            {input({
              value: displayName,
              onChangeText: setDisplayName,
              placeholder: 'Your name',
              autoCapitalize: 'words',
              textContentType: 'givenName',
              accessibilityLabel: 'Your name',
            })}
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
              placeholder: `Password (${MIN_PASSWORD}+ characters)`,
              secureTextEntry: true,
              textContentType: 'newPassword',
              accessibilityLabel: 'Password',
            })}

            {password.length > 0 && password.length < MIN_PASSWORD && (
              <Text style={[t.type('caption'), { color: t.color.textSecondary }]}>
                {MIN_PASSWORD - password.length} more character
                {MIN_PASSWORD - password.length === 1 ? '' : 's'} to go.
              </Text>
            )}

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
              title={busy ? 'Creating…' : 'Create account'}
              onPress={submit}
              disabled={!ready}
            />
            <SecondaryButton
              title="I already have an account"
              onPress={() => navigation.navigate('SignIn')}
              ghost
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
