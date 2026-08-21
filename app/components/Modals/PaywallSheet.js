/**
 * Dads & Daughters Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 * Proprietary and confidential. Unauthorized copying, distribution,
 * or use of this file, via any medium, is strictly prohibited.
 *
 * SOFT paywall — never a hard wall. And never shown for an age gate:
 * age locks are not purchasable. docs/stripe-flow.md §3.5.
 */
import React from 'react';
import { Modal, View, Text } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import PrimaryButton from '../Buttons/PrimaryButton';
import SecondaryButton from '../Buttons/SecondaryButton';
import { COPY } from '../../utils/constants';

export default function PaywallSheet({ visible, capability, onUpgrade, onDismiss }) {
  const t = useTheme();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onDismiss}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(61,38,69,.35)' }}>
        <View style={{
          backgroundColor: t.color.raised,
          borderTopLeftRadius: t.radius.sheet,
          borderTopRightRadius: t.radius.sheet,
          padding: t.space[5], gap: t.space[4],
        }}>
          <Text style={[t.type('h2'), { color: t.color.textPrimary }]}>
            Unlock more together
          </Text>
          <Text style={[t.type('body'), { color: t.color.textSecondary }]}>
            {describe(capability)}
          </Text>
          <Text style={[t.type('caption'), { color: t.color.textSecondary }]}>
            🛈 {COPY.safetyAlwaysFree}
          </Text>
          <PrimaryButton title="See plans" onPress={onUpgrade} />
          <SecondaryButton title="Not now" onPress={onDismiss} ghost />
        </View>
      </View>
    </Modal>
  );
}

function describe(capability) {
  const map = {
    tryon: "You've used your free try-ons this month. Bond gives you unlimited.",
    'cultural.all': 'Bond opens every cultural collection, not just one.',
    'cultural.glamSets': 'Cultural glam sets come with Bond.',
    'legacy.letters': 'Letters Forward is part of the Legacy plan.',
    'rooms.global': 'Global Glam Rooms come with Bond.',
  };
  return map[capability] ?? 'This feature is part of a paid plan.';
}
