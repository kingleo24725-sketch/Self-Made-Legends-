/**
 * Dad + Daughter Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 *
 * Neutral DOB entry — NEVER "Are you 13 or older?". Self-selection inflates
 * ages and voids the compliance posture. docs/wireframes.md W-01.
 */
import React, { useState } from 'react';
import { View, Text, SafeAreaView, TextInput } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import PrimaryButton from '../components/Buttons/PrimaryButton';
import { ageBandFor } from '../utils/validators';
import { AGE_BANDS } from '../utils/constants';

export default function AgeGateScreen({ navigation }) {
  const t = useTheme();
  const [dob, setDob] = useState({ m: '', d: '', y: '' });

  const complete = dob.m && dob.d && dob.y.length === 4;

  function submit() {
    const iso = `${dob.y}-${String(dob.m).padStart(2, '0')}-${String(dob.d).padStart(2, '0')}`;
    const band = ageBandFor(iso);
    // DOB is fixed once submitted; changing it needs guardian/support intervention.
    if (band === AGE_BANDS.CHILD) navigation.navigate('GuardianHandoff', { birthDate: iso });
    else navigation.navigate('ModeSelection', { birthDate: iso, ageBand: band });
  }

  const field = (key, placeholder, len) => (
    <TextInput
      value={dob[key]}
      onChangeText={(v) => setDob({ ...dob, [key]: v.replace(/\D/g, '').slice(0, len) })}
      placeholder={placeholder}
      keyboardType="number-pad"
      accessibilityLabel={placeholder}
      style={{
        flex: key === 'y' ? 1.4 : 1, height: t.controlHeight.input,
        backgroundColor: t.color.raised, borderRadius: t.radius.md,
        borderWidth: 1, borderColor: t.color.border,
        paddingHorizontal: t.space[4], color: t.color.textPrimary,
        ...t.type('body'),
      }}
    />
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.color.ground }}>
      <View style={{ flex: 1, padding: t.gutter, gap: t.space[4] }}>
        <Text style={[t.type('h1'), { color: t.color.textPrimary }]}>When were you born?</Text>
        <Text style={[t.type('body'), { color: t.color.textSecondary }]}>
          We use this to keep everyone safe.
        </Text>

        <View style={{ flexDirection: 'row', gap: t.space[3] }}>
          {field('m', 'Month', 2)}{field('d', 'Day', 2)}{field('y', 'Year', 4)}
        </View>

        <Text style={[t.type('caption'), { color: t.color.textSecondary }]}>
          🛈 We never share this. It only sets which features are available.
        </Text>

        <View style={{ flex: 1 }} />
        <PrimaryButton title="Continue" onPress={submit} disabled={!complete} />
      </View>
    </SafeAreaView>
  );
}
