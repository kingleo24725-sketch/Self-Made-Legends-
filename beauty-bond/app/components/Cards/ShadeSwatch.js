/**
 * Dads & Daughters Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 * Proprietary and confidential. Unauthorized copying, distribution,
 * or use of this file, via any medium, is strictly prohibited.
 *
 * Shade info is NEVER conveyed by color alone — always paired with the depth
 * number and undertone label. docs/wireframes.md W-C1.
 */
import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

export default function ShadeSwatch({ hex, depth, undertone, selected, onPress, size = 44 }) {
  const t = useTheme();
  const label = `Depth ${depth}${undertone ? `, ${undertone} undertone` : ''}`;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: !!selected }}
      style={{ alignItems: 'center', minHeight: t.tapTarget }}
    >
      <View style={{
        width: size, height: size, borderRadius: size / 2,
        backgroundColor: hex,
        borderWidth: selected ? 3 : 1,
        borderColor: selected ? t.color.accent : t.color.border,
      }} />
      <Text style={[t.type('caption'), { color: t.color.textSecondary, marginTop: 4 }]}>
        {depth}
      </Text>
    </Pressable>
  );
}
