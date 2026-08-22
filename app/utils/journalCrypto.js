/**
 * Dad + Daughter Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 * Proprietary and confidential. Unauthorized copying, distribution,
 * or use of this file, via any medium, is strictly prohibited.
 *
 * The Healing Journal — client-side encryption.
 *
 * docs/architecture.md:411 promises the journal is private, never scanned, and
 * not guardian-visible. models/Memory.js stores `ciphertext bytea` with the
 * comment "encrypted client-side; the server holds no key". This file is what
 * makes that sentence true. Before it, entries were base64 — obfuscation, not
 * encryption — and the UI deliberately did not claim otherwise.
 *
 * DESIGN
 *
 * XChaCha20-Poly1305 from @noble/ciphers: audited, pure JS (so no dev-client
 * rebuild), authenticated (a tampered entry fails to open rather than decoding
 * to garbage), and 24-byte random nonces, which removes the counter-management
 * footgun that makes AES-GCM dangerous in a mobile app that may be restored
 * from a backup.
 *
 * The key is generated on the device, stored in the OS keychain, and marked
 * WHEN_UNLOCKED_THIS_DEVICE_ONLY: it is not in an iCloud or Google backup and
 * does not migrate to a new phone.
 *
 * THE CONSEQUENCE, STATED PLAINLY
 *
 * A key that never leaves the device cannot be recovered by us, which is the
 * point — and it means a reinstall makes existing entries unreadable forever.
 * There is no escrow and no reset link, because either would be a way for
 * someone other than the writer to read a grieving child's journal.
 *
 * So entries carry a keyId. An entry written under a key this device does not
 * hold is reported as unreadable, by name, instead of crashing or rendering
 * mojibake. The UI has to say this out loud before someone writes their first
 * entry — see LegacyScreen.
 */
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import { xchacha20poly1305 } from '@noble/ciphers/chacha.js';

const KEY_STORE = 'bb.journal.key.v1';
const KEY_ID_STORE = 'bb.journal.keyid.v1';

const KEY_BYTES = 32;
const NONCE_BYTES = 24;

/** Keychain flags: on this device, only while unlocked, never in a backup. */
const SECURE_OPTS = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

/* ── base64 <-> bytes, without assuming a Buffer polyfill ──────────── */

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function toBase64(bytes) {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i];
    const b = bytes[i + 1];
    const c = bytes[i + 2];
    out += B64[a >> 2];
    out += B64[((a & 3) << 4) | ((b ?? 0) >> 4)];
    out += b === undefined ? '=' : B64[((b & 15) << 2) | ((c ?? 0) >> 6)];
    out += c === undefined ? '=' : B64[c & 63];
  }
  return out;
}

function fromBase64(text) {
  const clean = String(text).replace(/[^A-Za-z0-9+/]/g, '');
  const out = new Uint8Array((clean.length * 3) >> 2);
  let n = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const a = B64.indexOf(clean[i]);
    const b = B64.indexOf(clean[i + 1]);
    const c = B64.indexOf(clean[i + 2]);
    const d = B64.indexOf(clean[i + 3]);
    out[n++] = (a << 2) | (b >> 4);
    if (c >= 0) out[n++] = ((b & 15) << 4) | (c >> 2);
    if (d >= 0) out[n++] = ((c & 3) << 6) | d;
  }
  return out.subarray(0, n);
}

/* ── Key management ────────────────────────────────────────────────── */

let cached = null;

/**
 * The device's journal key, created on first use.
 *
 * @returns {Promise<{key: Uint8Array, keyId: string}>}
 */
export async function getJournalKey() {
  if (cached) return cached;

  const [stored, storedId] = await Promise.all([
    SecureStore.getItemAsync(KEY_STORE, SECURE_OPTS),
    SecureStore.getItemAsync(KEY_ID_STORE, SECURE_OPTS),
  ]);

  if (stored && storedId) {
    cached = { key: fromBase64(stored), keyId: storedId };
    return cached;
  }

  const key = Crypto.getRandomBytes(KEY_BYTES);
  // The id identifies WHICH key wrote an entry. It is derived from the key but
  // is not the key and cannot be reversed into it — it is safe on the server.
  const keyId = (await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256, `bb.journal.keyid:${toBase64(key)}`,
  )).slice(0, 16);

  await Promise.all([
    SecureStore.setItemAsync(KEY_STORE, toBase64(key), SECURE_OPTS),
    SecureStore.setItemAsync(KEY_ID_STORE, keyId, SECURE_OPTS),
  ]);

  cached = { key, keyId };
  return cached;
}

/** Whether this device holds a journal key at all. */
export async function hasJournalKey() {
  return !!(await SecureStore.getItemAsync(KEY_ID_STORE, SECURE_OPTS));
}

/**
 * Destroy the key. Every entry written with it becomes permanently unreadable
 * — that is what this is for, and the caller must have said so first.
 */
export async function forgetJournalKey() {
  cached = null;
  await Promise.all([
    SecureStore.deleteItemAsync(KEY_STORE, SECURE_OPTS),
    SecureStore.deleteItemAsync(KEY_ID_STORE, SECURE_OPTS),
  ]);
}

/* ── Encrypt / decrypt ─────────────────────────────────────────────── */

/**
 * @param {string} plaintext
 * @returns {Promise<{ciphertext: string, keyId: string}>} base64 nonce||sealed
 */
export async function encryptEntry(plaintext) {
  const { key, keyId } = await getJournalKey();
  const nonce = Crypto.getRandomBytes(NONCE_BYTES);
  const sealed = xchacha20poly1305(key, nonce)
    .encrypt(new TextEncoder().encode(plaintext));

  // The nonce is not secret and must travel with the ciphertext.
  const payload = new Uint8Array(nonce.length + sealed.length);
  payload.set(nonce, 0);
  payload.set(sealed, nonce.length);

  return { ciphertext: toBase64(payload), keyId };
}

/**
 * Open an entry. Returns null when this device cannot — a different key wrote
 * it, or the bytes were altered. Never throws at a screen.
 *
 * @returns {Promise<string|null>}
 */
export async function decryptEntry(ciphertextB64, entryKeyId) {
  if (!ciphertextB64) return '';

  const { key, keyId } = await getJournalKey();
  if (entryKeyId && entryKeyId !== keyId) return null;   // written elsewhere

  try {
    const payload = fromBase64(ciphertextB64);
    if (payload.length <= NONCE_BYTES) return null;

    const nonce = payload.subarray(0, NONCE_BYTES);
    const sealed = payload.subarray(NONCE_BYTES);
    // Poly1305 authenticates: a tampered entry throws rather than decoding to
    // plausible-looking nonsense.
    return new TextDecoder().decode(xchacha20poly1305(key, nonce).decrypt(sealed));
  } catch {
    return null;
  }
}

export default { getJournalKey, hasJournalKey, forgetJournalKey, encryptEntry, decryptEntry };
