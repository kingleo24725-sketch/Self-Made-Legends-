/**
 * Dad + Daughter Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 * Proprietary and confidential. Unauthorized copying, distribution,
 * or use of this file, via any medium, is strictly prohibited.
 *
 * Shown for the instant between "the app has mounted" and "we know whether
 * this person is signed in". AuthContext starts in status 'loading' while it
 * reads the refresh token; the navigator used to have no screen for that
 * state, and a navigator with zero screens is not an empty screen — React
 * Navigation throws, and the app dies before its first paint.
 *
 * It usually lasts a few milliseconds. It has to exist anyway.
 */
import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useTheme } from '../context/ThemeContext';

export default function BootScreen() {
  const t = useTheme();
  return (
    <View
      accessibilityLabel="Loading"
      style={{
        flex: 1,
        backgroundColor: t.color.ground,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <ActivityIndicator color={t.color.accent} />
    </View>
  );
}
