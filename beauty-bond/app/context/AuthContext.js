/**
 * Dad + Daughter Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 */
import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import api, { setAccessToken, setRefreshHandler } from '../utils/api';
import { AGE_BANDS } from '../utils/constants';

const AuthContext = createContext(null);
const REFRESH_KEY = 'bb.refreshToken';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);   // active profile (may be a child)
  const [profiles, setProfiles] = useState([]);
  const [status, setStatus] = useState('loading'); // loading|anon|authed|consent_pending

  const refresh = useCallback(async () => {
    const stored = await SecureStore.getItemAsync(REFRESH_KEY);
    if (!stored) return false;
    try {
      const { accessToken, refreshToken } = await api.post('/auth/refresh', { refreshToken: stored });
      setAccessToken(accessToken);
      await SecureStore.setItemAsync(REFRESH_KEY, refreshToken); // rotating
      return true;
    } catch {
      await SecureStore.deleteItemAsync(REFRESH_KEY);
      return false;
    }
  }, []);

  useEffect(() => { setRefreshHandler(refresh); }, [refresh]);

  const load = useCallback(async () => {
    try {
      const me = await api.get('/me');
      setUser(me.user);
      setProfiles(me.profiles || []);
      setProfile(me.profiles?.[0] ?? null);
      // A child account with unfinished parental consent cannot enter the app.
      setStatus(me.consentPending ? 'consent_pending' : 'authed');
    } catch {
      setStatus('anon');
    }
  }, []);

  useEffect(() => { (async () => { (await refresh()) ? load() : setStatus('anon'); })(); }, [refresh, load]);

  async function login(email, password) {
    const { accessToken, refreshToken } = await api.post('/auth/login', { email, password });
    setAccessToken(accessToken);
    await SecureStore.setItemAsync(REFRESH_KEY, refreshToken);
    await load();
  }

  async function logout() {
    await api.post('/auth/logout').catch(() => {});
    await SecureStore.deleteItemAsync(REFRESH_KEY);
    setAccessToken(null);
    setUser(null); setProfile(null); setProfiles([]);
    setStatus('anon');
  }

  const value = useMemo(() => ({
    user, profile, profiles, status,
    isChild: profile?.ageBand === AGE_BANDS.CHILD,
    isTeen: profile?.ageBand === AGE_BANDS.TEEN,
    isAdult: profile?.ageBand === AGE_BANDS.ADULT,
    login, logout, reload: load, switchProfile: setProfile,
  }), [user, profile, profiles, status, load]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuthContext = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used inside <AuthProvider>');
  return ctx;
};
