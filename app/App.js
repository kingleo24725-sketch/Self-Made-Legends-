/**
 * Dad + Daughter Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 * Proprietary and confidential. Unauthorized copying, distribution,
 * or use of this file, via any medium, is strictly prohibited.
 *
 * Entry point. Provider order matters:
 *   Auth -> Theme (reads profile.mode) -> Subscription -> Navigator
 *
 * StripeProvider used to wrap the navigator. It was removed with the
 * @stripe/stripe-react-native dependency: v1 has billing switched off
 * (utils/config.js -> FEATURES.billing), and on Android that SDK needs its
 * Expo config plugin to force an AppCompat theme. Without the plugin — which
 * app.json never listed — a provider mounted this high crashes the app on
 * launch. See docs/stripe-flow.md for the restore procedure.
 */
import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';

import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { SubscriptionProvider } from './context/SubscriptionContext';
import AppNavigator from './navigation/AppNavigator';
import SplashScreen from './screens/SplashScreen';

export default function App() {
  const [splashDone, setSplashDone] = useState(false);

  // styles/typography.js names these three faces, but nothing loaded them, so
  // every heading silently fell back to the system font on device. The splash
  // holds until they are ready, so no screen renders in the wrong typeface.
  const [fontsLoaded, fontError] = useFonts({
    Fraunces: require('./assets/fonts/Fraunces.ttf'),
    Inter: require('./assets/fonts/Inter.ttf'),
    Nunito: require('./assets/fonts/Nunito.ttf'),
  });

  // A font that fails to load is a cosmetic problem, not a reason to block a
  // family from the app — fall through to system faces rather than hanging.
  const fontsSettled = fontsLoaded || !!fontError;

  // The cover art holds the screen while providers and fonts initialise.
  if (!splashDone || !fontsSettled) {
    return <SplashScreen onFinish={() => setSplashDone(true)} />;
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ThemeProvider>
          <SubscriptionProvider>
            <StatusBar style="auto" />
            <AppNavigator />
          </SubscriptionProvider>
        </ThemeProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
