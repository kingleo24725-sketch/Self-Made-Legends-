/**
 * Dads & Daughters Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 * Proprietary and confidential. Unauthorized copying, distribution,
 * or use of this file, via any medium, is strictly prohibited.
 *
 * Tile layout per docs/video-rooms.md §5.4:
 *   2 -> stacked 50/50 | 3-4 -> 2x2 grid | 5+ -> active speaker + strip
 * Minor tiles carry NO location, NO last name, NO age display.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

export function TileOverlay({ name, speaking, muted, connection }) {
  const t = useTheme();
  return (
    <View style={styles.overlay}>
      <View
        style={styles.row}
        accessibilityLabel={`${name}${speaking ? ', speaking' : ''}${muted ? ', muted' : ''}`}
      >
        {muted && <Text style={styles.icon}>🔇</Text>}
        {speaking && !muted && <Text style={styles.icon}>🔊</Text>}
        <Text style={[t.type('caption'), { color: '#fff' }]} numberOfLines={1}>{name}</Text>
        <View style={[styles.dot, { backgroundColor: connectionColor(connection, t) }]} />
      </View>
    </View>
  );
}

function connectionColor(q, t) {
  if (q === 'poor') return t.color.danger;
  if (q === 'fair') return t.color.warning;
  return t.color.success;
}

export function Tile({ children, speaking, avatarInitial, cameraOff, gradient }) {
  const t = useTheme();
  return (
    <View style={[
      styles.tile,
      {
        borderRadius: t.radius.lg,
        borderWidth: speaking ? 3 : 0,
        borderColor: t.color.accent,       // active speaker = Rose Gold
        backgroundColor: t.color.plumSoft,
      },
    ]}>
      {/* Camera off -> avatar on the mode gradient, never a black box. */}
      {cameraOff
        ? <View style={[styles.avatarFill, { backgroundColor: gradient?.[0] ?? t.color.accent }]}>
            <Text style={[t.type('h1'), { color: '#fff' }]}>{avatarInitial}</Text>
          </View>
        : children}
    </View>
  );
}

export default function TileGrid({ tracks = [], renderTrack }) {
  const count = tracks.length;
  const layout = count <= 4 ? 'grid' : 'spotlight';

  if (layout === 'spotlight') {
    const [active, ...rest] = tracks;
    return (
      <View style={{ flex: 1 }}>
        <View style={{ flex: 0.65 }}>{renderTrack(active, true)}</View>
        <View style={styles.strip}>{rest.slice(0, 6).map((tr) => renderTrack(tr, false))}</View>
      </View>
    );
  }

  return (
    <View style={[styles.grid, count === 2 && styles.stack]}>
      {tracks.map((tr) => renderTrack(tr, false))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 8 },
  stack: { flexDirection: 'column' },
  tile: { flex: 1, minWidth: '45%', overflow: 'hidden' },
  strip: { flex: 0.35, flexDirection: 'row', gap: 8, padding: 8 },
  overlay: { position: 'absolute', bottom: 8, left: 8, right: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  icon: { fontSize: 12 },
  dot: { width: 8, height: 8, borderRadius: 4, marginLeft: 'auto' },
  avatarFill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
