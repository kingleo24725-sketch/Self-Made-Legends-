/**
 * Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 *
 * Empty states ALWAYS carry a CTA. Error states ALWAYS take the blame.
 * docs/wireframes.md W-C0.
 */
import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import PrimaryButton from './Buttons/PrimaryButton';

export default function EmptyState({ emoji = '✨', title, body, ctaTitle, onPress }) {
  const t = useTheme();
  return (
    <View style={{ alignItems: 'center', padding: t.space[6], gap: t.space[3] }}>
      <Text style={{ fontSize: 40 }}>{emoji}</Text>
      <Text style={[t.type('h3'), { color: t.color.textPrimary, textAlign: 'center' }]}>{title}</Text>
      {body ? (
        <Text style={[t.type('body'), { color: t.color.textSecondary, textAlign: 'center' }]}>
          {body}
        </Text>
      ) : null}
      {ctaTitle ? <PrimaryButton title={ctaTitle} onPress={onPress} /> : null}
    </View>
  );
}
