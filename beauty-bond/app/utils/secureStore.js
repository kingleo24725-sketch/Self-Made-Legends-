/**
 * Dad + Daughter Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 * Proprietary and confidential. Unauthorized copying, distribution,
 * or use of this file, via any medium, is strictly prohibited.
 *
 * One place where "where do secrets live" is decided.
 *
 * expo-secure-store has NO web implementation — calling it in a browser throws.
 * Beauty Bond now also ships as a web build (docs/get-it-on-your-phone.md),
 * because an iPhone cannot install an APK and Apple charges $99/yr before a
 * native app may run on a device. So the storage call sites need a seam.
 *
 * THE TWO BACKENDS ARE NOT EQUIVALENT, AND THAT IS THE POINT.
 *
 *   native — the OS keychain, WHEN_UNLOCKED_THIS_DEVICE_ONLY: not in an iCloud
 *            or Google backup, does not migrate to a new phone, unreadable
 *            while the device is locked.
 *
 *   web    — localStorage: readable by any script that reaches the page, and
 *            by anyone holding the unlocked device.
 *
 * The refresh token accepts that trade, because a browser app cannot sign in
 * without it and this is how every web app works. The JOURNAL KEY DOES NOT —
 * journalCrypto.js promises a key the server cannot hold and a device cannot
 * leak, and localStorage cannot keep that promise. So the journal is absent on
 * web rather than quietly weaker. See utils/config.js -> journalAvailable.
 *
 * Never add a "secure enough for now" third case here. If a secret cannot meet
 * its own stated guarantee on a platform, the feature is switched off there.
 */
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

/** Keychain flags: on this device, only while unlocked, never in a backup. */
export const SECURE_OPTS = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

const isWeb = Platform.OS === 'web';

/**
 * localStorage throws in a sandboxed iframe and in Safari private mode rather
 * than returning null, so every web path is guarded. A storage failure must
 * read as "signed out", never as a crash on the first screen.
 */
function webStorage() {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;   // storage disabled by the browser — treat as empty
  }
}

export async function getItem(key, options = SECURE_OPTS) {
  if (isWeb) return webStorage()?.getItem(key) ?? null;
  return SecureStore.getItemAsync(key, options);
}

export async function setItem(key, value, options = SECURE_OPTS) {
  if (isWeb) {
    webStorage()?.setItem(key, value);
    return;
  }
  return SecureStore.setItemAsync(key, value, options);
}

export async function deleteItem(key, options = SECURE_OPTS) {
  if (isWeb) {
    webStorage()?.removeItem(key);
    return;
  }
  return SecureStore.deleteItemAsync(key, options);
}

export default { getItem, setItem, deleteItem, SECURE_OPTS };
