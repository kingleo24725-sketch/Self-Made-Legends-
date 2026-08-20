/**
 * Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 *
 * Chat control is ABSENT (not disabled) for U13 accounts.
 * PanicButton is always mounted and always reachable in one tap.
 * docs/wireframes.md W-51, docs/video-rooms.md §5.4-5.7.
 */
import React, { useState } from 'react';
import { View, Text, SafeAreaView, Alert } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../hooks/useAuth';
import { useRoomToken } from '../hooks/useRoom';
import TileGrid, { Tile, TileOverlay } from '../components/VideoTiles/TileGrid';
import PanicButton from '../components/Buttons/PanicButton';
import Card from '../components/Cards/Card';
import SecondaryButton from '../components/Buttons/SecondaryButton';
import { AGE_BANDS } from '../utils/constants';

export default function LiveRoomScreen({ route, navigation }) {
  const t = useTheme();
  const { profile } = useAuth();
  const roomId = route?.params?.roomId;
  const { token, url, capabilities, error } = useRoomToken(roomId);
  const [tracks] = useState(route?.params?.tracks ?? []);

  const isChild = profile?.ageBand === AGE_BANDS.CHILD;

  // A 403 on token refresh means permission was revoked mid-call — leave now.
  React.useEffect(() => {
    if (error?.status === 403) {
      Alert.alert('Room closed', 'This room is no longer available.');
      navigation.goBack();
    }
  }, [error, navigation]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.color.midnight }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: t.gutter, gap: t.space[3] }}>
        <Text style={[t.type('caption'), { color: t.color.danger }]}>● LIVE</Text>
        <Text style={[t.type('body'), { color: '#fff', flex: 1 }]}>
          {route?.params?.name ?? 'Family Room'}
        </Text>
        <Text style={[t.type('caption'), { color: '#fff' }]}>👥 {tracks.length}</Text>
      </View>

      <View style={{ flex: 1 }}>
        <TileGrid
          tracks={tracks}
          renderTrack={(tr, isActive) => (
            <Tile key={tr?.id ?? Math.random()} speaking={isActive}
                  cameraOff={!tr?.videoEnabled} avatarInitial={(tr?.name ?? '?')[0]}
                  gradient={t.color.gradient}>
              <TileOverlay name={tr?.name} speaking={isActive} muted={tr?.muted}
                           connection={tr?.connection} />
            </Tile>
          )}
        />
      </View>

      {/* SHARED GLAM PANEL — synced look + step over the data channel */}
      <Card style={{ margin: t.gutter }}>
        <Text style={[t.type('overline'), { color: t.color.textSecondary }]}>SHARED GLAM PANEL</Text>
        <Text style={[t.type('h3'), { color: t.color.textPrimary }]}>Soft Glam</Text>
        <Text style={[t.type('bodySm'), { color: t.color.textSecondary }]}>
          Step 2/5 — Blush on the apples
        </Text>
        {/* Renders on EACH device locally — no face image crosses the room. */}
        <SecondaryButton title="Everyone try it" onPress={() => {}} style={{ marginTop: t.space[3] }} />
      </Card>

      <View style={{ flexDirection: 'row', justifyContent: 'space-around', paddingVertical: t.space[3] }}>
        <Control label="cam" icon="🎥" />
        <Control label="mic" icon="🎤" />
        <Control label="tryon" icon="✨" />
        {/* Chat control does not render for U13 — the feature does not exist. */}
        {!isChild && <Control label="chat" icon="💬" />}
        <Control label="react" icon="😊" />
        <Control label="end" icon="⏹" onPress={() => navigation.goBack()} />
      </View>

      <PanicButton roomId={roomId} onExited={(msg) => {
        Alert.alert('You’re out', msg);
        navigation.goBack();
      }} />
    </SafeAreaView>
  );
}

function Control({ label, icon, onPress }) {
  const t = useTheme();
  return (
    <View style={{ alignItems: 'center', minWidth: t.tapTarget }}>
      <Text style={{ fontSize: 22 }} onPress={onPress} accessibilityRole="button"
            accessibilityLabel={label}>{icon}</Text>
      <Text style={[t.type('caption'), { color: '#fff' }]}>{label}</Text>
    </View>
  );
}
