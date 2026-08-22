/**
 * Dad + Daughter Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 * Proprietary and confidential. Unauthorized copying, distribution,
 * or use of this file, via any medium, is strictly prohibited.
 *
 * ONE primary CTA per screen, always. docs/branding.md §7.5.
 */
import React from 'react';
import { Pressable, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

export default function PrimaryButton({ title, onPress, loading, disabled, style, accessibilityHint }) {
  const t = useTheme();
  const height = t.isChild ? t.controlHeight.buttonChild : t.controlHeight.button;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!disabled, busy: !!loading }}
      style={({ pressed }) => [
        styles.base,
        {
          height,
          minHeight: t.tapTarget,
          borderRadius: t.radius.lg,
          // Text on Rose Gold is cocoa, not white — white fails contrast.
          backgroundColor: pressed ? t.color.roseGoldDeep : t.color.accent,
          opacity: disabled ? 0.45 : 1,
        },
        style,
      ]}
    >
      {loading
        ? <ActivityIndicator color={t.color.onAccent} />
        : <Text style={[t.type('h3'), { color: t.color.onAccent }]}>{title}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, width: '100%' },
});
