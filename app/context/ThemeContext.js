/**
 * Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 */
import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme, AccessibilityInfo } from 'react-native';
import { buildTheme } from '../styles/theme';
import { useAuthContext } from './AuthContext';
import { MODES } from '../utils/constants';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const scheme = useColorScheme() ?? 'light';
  const { profile } = useAuthContext();
  const [reduceMotion, setReduceMotion] = React.useState(false);

  React.useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => sub?.remove?.();
  }, []);

  const theme = useMemo(
    () => buildTheme({ scheme, mode: profile?.mode ?? MODES.SOLO_GLOW, reduceMotion }),
    [scheme, profile?.mode, reduceMotion]);

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
};
