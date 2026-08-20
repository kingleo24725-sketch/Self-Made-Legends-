/**
 * Dad + Daughter Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 * Licensed under the MIT License with SML attribution — see LICENSE.
 *
 * Entry point. Provider order matters:
 *   Auth -> Theme (reads profile.mode) -> Subscription -> Stripe -> Navigator
 */
import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StripeProvider } from '@stripe/stripe-react-native';

import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { SubscriptionProvider } from './context/SubscriptionContext';
import AppNavigator from './navigation/AppNavigator';
import SplashScreen from './screens/SplashScreen';
import { STRIPE_PUBLISHABLE_KEY } from './utils/config';

export default function App() {
  const [splashDone, setSplashDone] = useState(false);

  // The cover art holds the screen while providers initialise, then fades out.
  if (!splashDone) return <SplashScreen onFinish={() => setSplashDone(true)} />;

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ThemeProvider>
          <SubscriptionProvider>
            <StripeProvider
              publishableKey={STRIPE_PUBLISHABLE_KEY}
              merchantIdentifier="merchant.com.selfmadelegends.beautybond"
            >
              <StatusBar style="auto" />
              <AppNavigator />
            </StripeProvider>
          </SubscriptionProvider>
        </ThemeProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
