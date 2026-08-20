/**
 * Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 *
 * First-run try-on consent. These promises are product commitments enforced
 * in the render pipeline, not marketing. docs/wireframes.md W-41.
 */
import React from 'react';
import { Modal, View, Text } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import PrimaryButton from '../Buttons/PrimaryButton';
import SecondaryButton from '../Buttons/SecondaryButton';

const PROMISES = [
  'Your photo is processed and then deleted within 24 hours.',
  'We never train our models on your pictures.',
  'Nothing is saved unless you tap Save.',
  'We change makeup only — never your face shape or your skin.',
];

export default function ConsentGate({ visible, onAccept, onDecline }) {
  const t = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDecline}>
      <View style={{ flex: 1, justifyContent: 'center', padding: t.gutter,
                     backgroundColor: 'rgba(61,38,69,.45)' }}>
        <View style={{ backgroundColor: t.color.raised, borderRadius: t.radius.xl,
                       padding: t.space[5], gap: t.space[3] }}>
          <Text style={[t.type('h2'), { color: t.color.textPrimary }]}>Before we start</Text>
          {PROMISES.map((p) => (
            <Text key={p} style={[t.type('body'), { color: t.color.textSecondary }]}>• {p}</Text>
          ))}
          <PrimaryButton title="I understand" onPress={onAccept} style={{ marginTop: t.space[3] }} />
          <SecondaryButton title="Not right now" onPress={onDecline} ghost />
        </View>
      </View>
    </Modal>
  );
}
