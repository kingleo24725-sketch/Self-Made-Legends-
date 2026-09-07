/**
 * Dad + Daughter Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 * Proprietary and confidential. Unauthorized copying, distribution,
 * or use of this file, via any medium, is strictly prohibited.
 *
 * Renders whatever utils/dialog.js is currently asking. Mounted ONCE in
 * App.js, inside ThemeProvider so it can use the palette, above the
 * navigator so it sits over every screen.
 *
 * Built on RN's Modal rather than Alert because Modal is implemented on every
 * platform this app ships to, including web, and Alert is not. See
 * utils/dialog.js for the failures that forced this.
 */
import React, { useEffect, useState } from 'react';
import {
  Modal, View, Text, TextInput, Pressable, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { subscribe, settle } from '../../utils/dialog';

export default function DialogHost() {
  const t = useTheme();
  const [spec, setSpec] = useState(null);
  const [value, setValue] = useState('');

  useEffect(() => subscribe((next) => {
    setSpec(next);
    setValue(next?.defaultValue ?? '');
  }), []);

  if (!spec) return null;

  const isPrompt = spec.kind === 'prompt';
  const answer = (btn) => {
    if (isPrompt) settle(btn.style === 'cancel' ? null : value);
    else settle(btn.text);
  };
  const cancelBtn = spec.buttons.find((b) => b.style === 'cancel');

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={() => settle(isPrompt ? null : (cancelBtn?.text ?? spec.buttons[0].text))}
    >
      <KeyboardAvoidingView
        style={{
          flex: 1, justifyContent: 'center', padding: t.space[5],
          backgroundColor: 'rgba(61,38,69,.45)',
        }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View
          accessibilityViewIsModal
          accessibilityRole="alert"
          style={{
            backgroundColor: t.color.raised,
            borderRadius: t.radius.xl,
            padding: t.space[5],
            gap: t.space[3],
            ...t.elevation[2],
          }}
        >
          {!!spec.title && (
            <Text style={[t.type('h3'), { color: t.color.textPrimary }]}>{spec.title}</Text>
          )}
          {!!spec.message && (
            <Text style={[t.type('body'), { color: t.color.textSecondary }]}>{spec.message}</Text>
          )}

          {isPrompt && (
            <TextInput
              value={value}
              onChangeText={setValue}
              placeholder={spec.placeholder}
              placeholderTextColor={t.color.textSecondary}
              multiline={spec.multiline}
              secureTextEntry={!!spec.secure}
              autoCapitalize={spec.secure ? 'none' : 'sentences'}
              autoFocus
              accessibilityLabel={spec.placeholder || spec.title}
              onSubmitEditing={() => { if (!spec.multiline) settle(value); }}
              style={{
                minHeight: spec.multiline ? 120 : t.controlHeight.input,
                textAlignVertical: spec.multiline ? 'top' : 'center',
                backgroundColor: t.color.ground,
                borderRadius: t.radius.md,
                borderWidth: 1, borderColor: t.color.border,
                paddingHorizontal: t.space[4], paddingVertical: t.space[3],
                color: t.color.textPrimary,
                ...t.type('body'),
              }}
            />
          )}

          <View style={{
            flexDirection: 'row', justifyContent: 'flex-end', gap: t.space[2],
            marginTop: t.space[2], flexWrap: 'wrap',
          }}>
            {spec.buttons.map((b) => {
              const cancel = b.style === 'cancel';
              const danger = b.style === 'destructive';
              return (
                <Pressable
                  key={b.text}
                  onPress={() => answer(b)}
                  accessibilityRole="button"
                  accessibilityLabel={b.text}
                  style={({ pressed }) => ({
                    minHeight: t.tapTarget,
                    paddingHorizontal: t.space[4],
                    justifyContent: 'center',
                    borderRadius: t.radius.pill,
                    backgroundColor: cancel ? 'transparent' : (danger ? t.color.danger : t.color.accent),
                    opacity: pressed ? 0.75 : 1,
                  })}
                >
                  <Text style={[t.type('body'), {
                    fontWeight: '600',
                    color: cancel ? t.color.textSecondary : '#fff',
                  }]}>
                    {b.text}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
