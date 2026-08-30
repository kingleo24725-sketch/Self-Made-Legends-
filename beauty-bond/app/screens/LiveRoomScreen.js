/**
 * Dad + Daughter Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 * Proprietary and confidential. Unauthorized copying, distribution,
 * or use of this file, via any medium, is strictly prohibited.
 *
 * Glam Rooms are not in v1. The working LiveKit implementation is kept intact
 * at screens/_disabled/LiveRoomScreen.livekit.js, which carries the four-step
 * restore procedure.
 *
 * This placeholder exists because navigation/AppNavigator.js imports this path
 * at module scope. That import is what puts a file in the Metro bundle —
 * `featureOn('rooms')` decides whether the screen is REGISTERED, not whether
 * it is BUNDLED. So while the flag is off nothing here should reach for a
 * native module, and nothing does.
 *
 * If a build ever renders this, a route was registered without its flag.
 */
import React from 'react';
import { View, Text, SafeAreaView } from 'react-native';

import { useTheme } from '../context/ThemeContext';
import Card from '../components/Cards/Card';
import SecondaryButton from '../components/Buttons/SecondaryButton';

export default function LiveRoomScreen({ navigation }) {
  const t = useTheme();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.color.midnight }}>
      <View style={{ flex: 1, justifyContent: 'center', padding: t.gutter }}>
        <Card>
          <Text style={[t.type('overline'), { color: t.color.textSecondary }]}>
            GLAM ROOMS
          </Text>
          <Text style={[t.type('h3'), { color: t.color.textPrimary }]}>
            Not in this version
          </Text>
          <Text style={[t.type('bodySm'), {
            color: t.color.textSecondary, marginTop: t.space[2],
          }]}>
            Live rooms are built and waiting. They are switched off while
            Beauty Bond ships one thing finished — the Legacy Vault, Letters
            Forward and the Bond Meter.
          </Text>
          <SecondaryButton title="Go back" onPress={() => navigation.goBack()}
            style={{ marginTop: t.space[3] }} />
        </Card>
      </View>
    </SafeAreaView>
  );
}
