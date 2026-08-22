/**
 * Dad + Daughter Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 * Proprietary and confidential. Unauthorized copying, distribution,
 * or use of this file, via any medium, is strictly prohibited.
 */
import React from 'react';
import { View, Pressable } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

export default function Card({ children, onPress, selected, elevation = 1, style }) {
  const t = useTheme();
  const Wrapper = onPress ? Pressable : View;

  return (
    <Wrapper
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      style={[{
        backgroundColor: t.color.raised,
        borderRadius: t.radius.xl,
        padding: t.space[4],
        borderWidth: selected ? 2 : 1,
        borderColor: selected ? t.color.accent : t.color.border,
        ...t.elevation[elevation],
      }, style]}
    >
      {children}
    </Wrapper>
  );
}
