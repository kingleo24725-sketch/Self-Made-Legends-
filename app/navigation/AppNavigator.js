/**
 * Dads & Daughters Beauty Bond™ — a Self-Made Legends LLC (SML) product.
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

import WelcomeScreen from '../screens/WelcomeScreen';
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
      <Tab.Screen name="TryOn" component={TryOnScreen} options={{ title: 'Try-On' }} />
      <Tab.Screen name="Rooms" component={RoomLobbyScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { status } = useAuth();

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
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
            <Stack.Screen name="ShadeMatch" component={ShadeMatchScreen} />
            <Stack.Screen name="CulturalLibrary" component={CulturalLibraryScreen} />
            <Stack.Screen name="CollectionDetail" component={CollectionDetailScreen} />
            <Stack.Screen name="RespectNote" component={RespectNoteScreen} />
            <Stack.Screen name="DadSchool" component={DadSchoolScreen} />
            <Stack.Screen name="SafeLearning" component={SafeLearningScreen} />
            <Stack.Screen name="LiveRoom" component={LiveRoomScreen}
              options={{ gestureEnabled: false }} />
            <Stack.Screen name="Bond" component={BondScreen} />
            <Stack.Screen name="Legacy" component={LegacyScreen} />
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
