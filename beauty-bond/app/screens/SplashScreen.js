/**
 * Dads & Daughters Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 * Proprietary and confidential. Unauthorized copying, distribution,
 * or use of this file, via any medium, is strictly prohibited.
 *
 * The JS splash that takes over from the native one, so the handoff has no
 * flash of a different colour.
 *
 * WHY `contain` AND NOT `cover`
 * -----------------------------
 * The cover art is 2:3. Phones are ~9:19.5. `cover` would crop ~31% of the
 * WIDTH on every current phone — slicing both ends off the wordmark — and 54%
 * of the HEIGHT on a landscape tablet. So the artwork is contained and the
 * surrounding space is filled with a matched gradient, which means the faces,
 * the wordmark, and the SML credit line are ALWAYS fully visible on every
 * device and orientation.
 *
 * Verified with `npm run assets:verify`.
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Image, Animated, StyleSheet, useWindowDimensions,
  AccessibilityInfo, Platform,
} from 'react-native';
import * as ExpoSplashScreen from 'expo-splash-screen';

import { brand, accent } from '../styles/colors';

/** Matches app.json `splash.backgroundColor` — a mismatch shows as a flash. */
export const SPLASH_BG = '#E9B78E';
export const SPLASH_BG_DARK = accent.midnight;

const COVER = require('../assets/images/generated/splash.png');

// Keep the native splash up until the first frame is ready to draw.
ExpoSplashScreen.preventAutoHideAsync().catch(() => {});

export default function SplashScreen({ onFinish, minimumMs = 900 }) {
  const { width, height } = useWindowDimensions();
  const fade = useRef(new Animated.Value(0)).current;
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => {});
  }, []);

  const finish = useCallback(() => { onFinish?.(); }, [onFinish]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      await ExpoSplashScreen.hideAsync().catch(() => {});
      if (cancelled) return;

      // prefers-reduced-motion: no animation, just hold then hand off.
      if (reduceMotion) {
        fade.setValue(1);
        setTimeout(() => { if (!cancelled) finish(); }, minimumMs);
        return;
      }

      Animated.sequence([
        Animated.timing(fade, {
          toValue: 1, duration: 400, useNativeDriver: true,
        }),
        Animated.delay(minimumMs),
        Animated.timing(fade, {
          toValue: 0, duration: 300, useNativeDriver: true,
        }),
      ]).start(({ finished }) => { if (finished && !cancelled) finish(); });
    }

    run();
    return () => { cancelled = true; };
  }, [fade, finish, minimumMs, reduceMotion]);

  // Contain-fit, computed rather than relying on resizeMode, so the exact
  // drawn box is known and the gradient can be sized to meet it.
  const COVER_AR = 2 / 3;
  const screenAR = width / height;
  const drawn = screenAR > COVER_AR
    ? { width: height * COVER_AR, height }
    : { width, height: width / COVER_AR };

  return (
    <View style={[styles.root, { backgroundColor: SPLASH_BG }]}>
      {/* Ambient wash behind the letterboxed edges so the join is invisible. */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={[styles.wash, { backgroundColor: '#D8A9C0', opacity: 0.55 }]} />
        <View style={[styles.washBottom, { backgroundColor: '#E4B07E', opacity: 0.6 }]} />
      </View>

      <Animated.View style={{ opacity: fade }}>
        <Image
          source={COVER}
          style={{ width: drawn.width, height: drawn.height }}
          resizeMode="contain"
          // Decorative: the wordmark is baked into the art, so the label
          // carries the meaning for screen-reader users.
          accessible
          accessibilityRole="image"
          accessibilityLabel="Dads & Daughters Beauty Bond, a Self-Made Legends experience"
          fadeDuration={0}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  wash: { position: 'absolute', top: 0, left: 0, right: 0, height: '45%' },
  washBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '45%' },
});

/**
 * Full-bleed variant. Uses the pre-generated edge-extended art for the current
 * orientation, so it fills the screen with NO crop. Heavier (~850KB–1.4MB per
 * variant) — prefer the default unless a full-bleed cover is a hard requirement.
 */
export function FullBleedSplash({ onFinish }) {
  const { width, height } = useWindowDimensions();
  const landscape = width > height;
  const tablet = Math.min(width, height) >= 600;

  const source = tablet
    ? (landscape
        ? require('../assets/images/generated/splash-tablet-landscape.jpg')
        : require('../assets/images/generated/splash-tablet-portrait.jpg'))
    : (landscape
        ? require('../assets/images/generated/splash-phone-landscape.jpg')
        : require('../assets/images/generated/splash-phone-portrait.jpg'));

  useEffect(() => {
    ExpoSplashScreen.hideAsync().catch(() => {});
    const t = setTimeout(() => onFinish?.(), 1400);
    return () => clearTimeout(t);
  }, [onFinish]);

  return (
    <View style={[styles.root, { backgroundColor: SPLASH_BG }]}>
      <Image
        source={source}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
        accessible
        accessibilityRole="image"
        accessibilityLabel="Dads & Daughters Beauty Bond, a Self-Made Legends experience"
        fadeDuration={0}
      />
    </View>
  );
}
