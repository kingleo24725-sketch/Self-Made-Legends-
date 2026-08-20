/**
 * Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 *
 * Flow: POST /api/video/token -> connect to LiveKit -> render video tiles.
 *
 * SAFETY (docs/video-rooms.md §5.4-5.7):
 *   - Chat control is ABSENT for U13 accounts — not disabled, absent.
 *   - PanicButton is always mounted, one tap, no confirmation dialog.
 *   - A 403 on token refresh means permission was revoked mid-call: leave now.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, SafeAreaView, Alert, ActivityIndicator, Pressable } from 'react-native';
import {
  LiveKitRoom, useTracks, VideoTrack, useDataChannel, useLocalParticipant,
} from '@livekit/react-native';
import { Track } from 'livekit-client';

import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../hooks/useAuth';
import { useRoomToken } from '../hooks/useRoom';
import { useGlamPanel } from '../hooks/useGlamPanel';
import TileGrid, { Tile, TileOverlay } from '../components/VideoTiles/TileGrid';
import PanicButton from '../components/Buttons/PanicButton';
import Card from '../components/Cards/Card';
import SecondaryButton from '../components/Buttons/SecondaryButton';
import { AGE_BANDS } from '../utils/constants';

export default function LiveRoomScreen({ route, navigation }) {
  const t = useTheme();
  const roomId = route?.params?.roomId;
  const { token, url, capabilities, error } = useRoomToken(roomId);

  useEffect(() => {
    if (error?.status === 403) {
      Alert.alert('Room closed', 'This room is no longer available to you.');
      navigation.goBack();
    }
  }, [error, navigation]);

  if (!token) {
    return (
      <SafeAreaView style={{
        flex: 1, backgroundColor: t.color.midnight,
        alignItems: 'center', justifyContent: 'center',
      }}>
        <ActivityIndicator color={t.color.accent} />
        <Text style={[t.type('caption'), { color: '#fff', marginTop: 12 }]}>
          Joining…
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <LiveKitRoom
      serverUrl={url}
      token={token}
      connect
      audio
      video
      options={{
        adaptiveStream: true,   // downgrade subscribed quality on weak networks
        dynacast: true,         // stop publishing layers nobody is watching
        videoCaptureDefaults: {
          resolution: { width: 720, height: 1280, frameRate: 24 },
        },
      }}
      onDisconnected={() => navigation.goBack()}
      onError={(e) => Alert.alert('Connection', e?.message ?? 'Our side, not yours.')}
    >
      <RoomBody roomId={roomId} capabilities={capabilities}
                name={route?.params?.name} navigation={navigation} />
    </LiveKitRoom>
  );
}

function RoomBody({ roomId, capabilities, name, navigation }) {
  const t = useTheme();
  const { profile } = useAuth();
  const { localParticipant } = useLocalParticipant();
  const tracks = useTracks([Track.Source.Camera], { onlySubscribed: true });

  const [camOn, setCamOn] = useState(true);
  const [micOn, setMicOn] = useState(true);

  const isChild = profile?.ageBand === AGE_BANDS.CHILD;
  const isHost = capabilities?.canInvite;

  const send = useCallback((msg) => {
    localParticipant?.publishData(
      new TextEncoder().encode(JSON.stringify(msg)), { reliable: true, topic: 'glam' });
  }, [localParticipant]);

  const glam = useGlamPanel(roomId, { isHost, send });
  useDataChannel('glam', (msg) => glam.onMessage(msg.payload));

  async function toggleCam() {
    await localParticipant?.setCameraEnabled(!camOn);
    setCamOn(!camOn);
  }
  async function toggleMic() {
    await localParticipant?.setMicrophoneEnabled(!micOn);
    setMicOn(!micOn);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.color.midnight }}>
      <View style={{
        flexDirection: 'row', alignItems: 'center', padding: t.gutter, gap: t.space[3],
      }}>
        <Text style={[t.type('caption'), { color: t.color.danger }]}>● LIVE</Text>
        <Text style={[t.type('body'), { color: '#fff', flex: 1 }]} numberOfLines={1}>
          {name ?? 'Glam Room'}
        </Text>
        <Text style={[t.type('caption'), { color: '#fff' }]}>👥 {tracks.length}</Text>
      </View>

      <View style={{ flex: 1 }}>
        <TileGrid
          tracks={tracks}
          renderTrack={(tr, isActive) => {
            const meta = safeParse(tr?.participant?.metadata);
            return (
              <Tile
                key={tr.participant.identity}
                speaking={tr.participant.isSpeaking || isActive}
                cameraOff={!tr.publication?.isSubscribed || tr.publication?.isMuted}
                avatarInitial={(tr.participant.name ?? '?')[0]}
                gradient={t.color.gradient}
              >
                <VideoTrack trackRef={tr} objectFit="cover"
                            style={{ width: '100%', height: '100%' }} />
                {/* Minor tiles carry no location, no last name, no age. */}
                <TileOverlay
                  name={tr.participant.name}
                  speaking={tr.participant.isSpeaking}
                  muted={!tr.participant.isMicrophoneEnabled}
                  connection={tr.participant.connectionQuality}
                />
              </Tile>
            );
          }}
        />
      </View>

      {/* SHARED GLAM PANEL — synced over the data channel */}
      {glam.state && (
        <Card style={{ margin: t.gutter }}>
          <Text style={[t.type('overline'), { color: t.color.textSecondary }]}>
            SHARED GLAM PANEL
          </Text>
          <Text style={[t.type('h3'), { color: t.color.textPrimary }]}>
            {glam.state.lookName ?? 'Soft Glam'}
          </Text>
          <Text style={[t.type('bodySm'), { color: t.color.textSecondary }]}>
            Step {glam.state.step + 1} / {glam.state.totalSteps}
          </Text>
          {/* Renders locally on each device — no face image crosses the room. */}
          <SecondaryButton title="Everyone try it" onPress={glam.everyoneTryIt}
            style={{ marginTop: t.space[3] }} />
          {isHost && (
            <SecondaryButton title="Next step"
              onPress={() => glam.advance(glam.state.step + 1)}
              style={{ marginTop: t.space[2] }} />
          )}
        </Card>
      )}

      <View style={{
        flexDirection: 'row', justifyContent: 'space-around', paddingVertical: t.space[3],
      }}>
        <Control label="cam" icon={camOn ? '🎥' : '🚫'} onPress={toggleCam} />
        <Control label="mic" icon={micOn ? '🎤' : '🔇'} onPress={toggleMic} />
        <Control label="try-on" icon="✨" onPress={() => navigation.navigate('TryOn')} />
        {/* Chat does not render for U13 — the feature does not exist for them. */}
        {!isChild && capabilities?.chat && <Control label="chat" icon="💬" onPress={() => {}} />}
        <Control label="react" icon="😊" onPress={() => send({ t: 'reaction', emoji: '💛' })} />
        <Control label="leave" icon="⏹" onPress={() => navigation.goBack()} />
      </View>

      <PanicButton roomId={roomId} onExited={(msg) => {
        Alert.alert("You're out", msg);
        navigation.goBack();
      }} />
    </SafeAreaView>
  );
}

function Control({ label, icon, onPress }) {
  const t = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label}
      style={{ alignItems: 'center', minWidth: t.tapTarget, minHeight: t.tapTarget,
               justifyContent: 'center' }}>
      <Text style={{ fontSize: 22 }}>{icon}</Text>
      <Text style={[t.type('caption'), { color: '#fff' }]}>{label}</Text>
    </Pressable>
  );
}

function safeParse(s) {
  try { return JSON.parse(s || '{}'); } catch { return {}; }
}
