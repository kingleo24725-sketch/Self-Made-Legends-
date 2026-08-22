/**
 * Dad + Daughter Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 * Proprietary and confidential. Unauthorized copying, distribution,
 * or use of this file, via any medium, is strictly prohibited.
 */
import React from 'react';
import { Pressable, Text } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

export default function SecondaryButton({ title, onPress, ghost, style }) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={[{
        minHeight: t.tapTarget,
        alignItems: 'center', justifyContent: 'center',
        paddingHorizontal: t.space[4],
        borderRadius: t.radius.lg,
        borderWidth: ghost ? 0 : 1.5,
        borderColor: t.color.accent,
      }, style]}
    >
      <Text style={[t.type('body'), { color: t.color.accent, fontWeight: '600' }]}>{title}</Text>
    </Pressable>
  );
}
