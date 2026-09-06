/**
 * Dad + Daughter Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 * Proprietary and confidential. Unauthorized copying, distribution,
 * or use of this file, via any medium, is strictly prohibited.
 *
 * Navigation is age-aware. Little Legend mode drops to 3 tabs with 56px
 * targets; U13 accounts never see rooms with strangers or any commerce.
 * docs/wireframes.md W-11, W-12.
 */
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../context/ThemeContext';
import { AGE_BANDS } from '../utils/constants';

import BootScreen from '../screens/BootScreen';
import WelcomeScreen from '../screens/WelcomeScreen';
import { featureOn } from '../utils/config';
import SignInScreen from '../screens/SignInScreen';
import SignUpScreen from '../screens/SignUpScreen';
import AgeGateScreen from '../screens/AgeGateScreen';
import GuardianHandoffScreen from '../screens/GuardianHandoffScreen';
import ModeSelectionScreen from '../screens/ModeSelectionScreen';
import HomeScreen from '../screens/HomeScreen';
import SafeLearningScreen from '../screens/SafeLearningScreen';
import LessonPlayerScreen from '../screens/LessonPlayerScreen';
import BrushEducationScreen from '../screens/BrushEducationScreen';
import ShadeMatchScreen from '../screens/ShadeMatchScreen';
import CulturalLibraryScreen from '../screens/CulturalLibraryScreen';
import TryOnScreen from '../screens/TryOnScreen';
import LiveRoomScreen from '../screens/LiveRoomScreen';
import RoomLobbyScreen from '../screens/RoomLobbyScreen';
import BondScreen from '../screens/BondScreen';
import LegacyScreen from '../screens/LegacyScreen';
import MakeupBagScreen from '../screens/MakeupBagScreen';
import MemoryGalleryScreen from '../screens/MemoryGalleryScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SettingsScreen from '../screens/SettingsScreen';
import GuardianConsoleScreen from '../screens/GuardianConsoleScreen';
import PlanSelectionScreen from '../screens/PlanSelectionScreen';
import CollectionDetailScreen from '../screens/CollectionDetailScreen';
import DadSchoolScreen from '../screens/DadSchoolScreen';
import RespectNoteScreen from '../screens/RespectNoteScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  const { profile } = useAuth();
  const theme = useTheme();
  // Child tab set is driven by AGE BAND, not mode — a child can pick any mode.
  const isChild = profile?.ageBand === AGE_BANDS.CHILD;

  const screenOptions = {
    headerShown: false,
    tabBarActiveTintColor: theme.color.accent,
    tabBarInactiveTintColor: theme.color.textSecondary,
    tabBarStyle: { backgroundColor: theme.color.raised, height: isChild ? 88 : 72 },
    tabBarLabelStyle: { ...theme.type('caption') },
  };

  // Child accounts: 3 tabs, bigger targets, labels always visible.
  if (isChild) {
    return (
      <Tab.Navigator screenOptions={screenOptions}>
        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen name="Learn" component={SafeLearningScreen} />
        <Tab.Screen name="Play" component={BrushEducationScreen} options={{ title: 'Play' }} />
      </Tab.Navigator>
    );
  }

  return (
    <Tab.Navigator screenOptions={screenOptions}>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Learn" component={SafeLearningScreen} />
      {/* Built and switched off for v1 — utils/config.js. Left registered
          conditionally rather than removed so turning them on is one flag. */}
      {featureOn('tryOn') && (
        <Tab.Screen name="TryOn" component={TryOnScreen} options={{ title: 'Try-On' }} />
      )}
      {featureOn('rooms') && (
        <Tab.Screen name="Rooms" component={RoomLobbyScreen} />
      )}
      <Tab.Screen name="Legacy" component={LegacyScreen} options={{ title: 'Legacy' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

/**
 * Every status AuthContext can produce must map to at least one screen.
 * 'loading' — the initial state while the refresh token is read — had none,
 * so on a fresh load the navigator rendered zero children and React
 * Navigation threw "Couldn't find any screens for the navigator". On native
 * the splash's minimum duration usually hid the window; on web it did not.
 *
 * A navigator with no screens is a crash, not an empty state. So the fallback
 * below is written to catch 'loading' AND anything unrecognised: a new status
 * added to AuthContext without a screen here shows the boot spinner rather
 * than killing the app. backend/tests/safety/navigation.test.js enforces the
 * mapping.
 */
const ROUTED_STATUSES = ['anon', 'consent_pending', 'authed'];

export default function AppNavigator() {
  const { status } = useAuth();
  const booting = !ROUTED_STATUSES.includes(status);

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {booting && (
          <Stack.Screen name="Booting" component={BootScreen} />
        )}

        {status === 'anon' && (
          <Stack.Group>
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            <Stack.Screen name="AgeGate" component={AgeGateScreen} />
            <Stack.Screen name="SignIn" component={SignInScreen} />
            <Stack.Screen name="SignUp" component={SignUpScreen} />
            <Stack.Screen name="GuardianHandoff" component={GuardianHandoffScreen} />
          </Stack.Group>
        )}

        {/* A child with unfinished parental consent gets a hard wall, not the app. */}
        {status === 'consent_pending' && (
          <Stack.Screen name="GuardianHandoff" component={GuardianHandoffScreen} />
        )}

        {status === 'authed' && (
          <Stack.Group>
            <Stack.Screen name="ModeSelection" component={ModeSelectionScreen} />
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen name="LessonPlayer" component={LessonPlayerScreen} />
            <Stack.Screen name="BrushEducation" component={BrushEducationScreen} />
            {featureOn('tryOn') && (
              <Stack.Screen name="ShadeMatch" component={ShadeMatchScreen} />
            )}
            <Stack.Screen name="CulturalLibrary" component={CulturalLibraryScreen} />
            <Stack.Screen name="CollectionDetail" component={CollectionDetailScreen} />
            <Stack.Screen name="RespectNote" component={RespectNoteScreen} />
            <Stack.Screen name="DadSchool" component={DadSchoolScreen} />
            <Stack.Screen name="SafeLearning" component={SafeLearningScreen} />
            {featureOn('rooms') && (
              <Stack.Screen name="LiveRoom" component={LiveRoomScreen}
                options={{ gestureEnabled: false }} />
            )}
            <Stack.Screen name="Bond" component={BondScreen} />
            <Stack.Screen name="MakeupBag" component={MakeupBagScreen} />
            <Stack.Screen name="MemoryGallery" component={MemoryGalleryScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
            <Stack.Screen name="GuardianConsole" component={GuardianConsoleScreen} />
            <Stack.Screen name="PlanSelection" component={PlanSelectionScreen}
              options={{ presentation: 'modal' }} />
          </Stack.Group>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
