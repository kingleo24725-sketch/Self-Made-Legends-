/**
 * Dad + Daughter Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 * Proprietary and confidential. Unauthorized copying, distribution,
 * or use of this file, via any medium, is strictly prohibited.
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

  // Child-safe UI keys off AGE BAND, not mode: a 9-year-old can pick any mode,
  // so tying 56px targets and simplified copy to a mode would miss them.
  const theme = useMemo(
    () => buildTheme({
      scheme,
      mode: profile?.mode ?? MODES.SOLO_GIRL,
      isChild: profile?.ageBand === 'child',
      reduceMotion,
      remembrance: !!profile?.remembranceMode,
    }),
    [scheme, profile?.mode, profile?.ageBand, reduceMotion, profile?.remembranceMode]);

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
};
