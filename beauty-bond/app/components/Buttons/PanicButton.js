/**
 * Dad + Daughter Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 * Proprietary and confidential. Unauthorized copying, distribution,
 * or use of this file, via any medium, is strictly prohibited.
 *
 * ONE TAP, NO CONFIRMATION DIALOG.
 * A child in trouble should never face "Are you sure?"
 * Always mounted, always reachable, never gated by tier.
 * docs/video-rooms.md §5.7, docs/stripe-flow.md §3.1 ALWAYS_FREE.
 */
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { usePanic } from '../../hooks/useRoom';
import { COPY } from '../../utils/constants';

export default function PanicButton({ roomId, onExited }) {
  const t = useTheme();
  const panic = usePanic(roomId);

  async function handle() {
    await panic();          // server force-disconnects + notifies guardian + staff
    onExited?.(COPY.panicConfirmed);
  }

  return (
    <View style={{ paddingHorizontal: t.gutter, paddingBottom: t.space[3] }}>
      <Pressable
        onPress={handle}
        accessibilityRole="button"
        accessibilityLabel="Get help. Leaves the room immediately."
        style={{
          minHeight: t.tapTarget,
          flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
          borderRadius: t.radius.pill,
          borderWidth: 1.5,
          borderColor: t.color.danger,
          paddingVertical: t.space[3],
        }}
      >
        <Text style={[t.type('body'), { color: t.color.danger, fontWeight: '600' }]}>
          ⚑  Get help
        </Text>
      </Pressable>
    </View>
  );
}
