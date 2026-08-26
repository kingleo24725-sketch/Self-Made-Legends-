/**
 * Dad + Daughter Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 * Proprietary and confidential. Unauthorized copying, distribution,
 * or use of this file, via any medium, is strictly prohibited.
 *
 * Client config. NOTE: only PUBLIC values live here. No secret key is ever
 * shipped in the mobile bundle — docs/api-reference.md §6.7.
 */
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const extra = Constants.expoConfig?.extra ?? {};

export const API_BASE_URL = extra.apiBaseUrl ?? 'http://localhost:4000/api';
export const STRIPE_PUBLISHABLE_KEY = extra.stripePublishableKey ?? '';
export const LIVEKIT_WS_URL = extra.livekitWsUrl ?? '';
export const ENV = extra.env ?? 'development';

/**
 * v1 scope.
 *
 * AI Try-On and Glam Rooms are built, tested and switched OFF. The try-on
 * native module was never written, and live video with minors carries
 * moderation risk and per-minute cost a pre-revenue product cannot carry. So
 * v1 ships one thing finished — the Legacy Vault, Letters Forward and the
 * Bond Meter — rather than five things sketched.
 *
 * Nothing is deleted. Turning either back on is this flag, not a rebuild.
 *
 * This is deliberately separate from the backend's `config.enabled`, which is
 * derived from credential presence rather than intent — it cannot express
 * "we have the keys but are not shipping this yet".
 */
const FEATURE_DEFAULTS = { tryOn: false, rooms: false, billing: false };

export const FEATURES = { ...FEATURE_DEFAULTS, ...(extra.features ?? {}) };

/** @param {'tryOn'|'rooms'|'billing'} name */
export const featureOn = (name) => FEATURES[name] === true;

/**
 * The Healing Journal is NATIVE ONLY, and this is a security decision rather
 * than a porting gap.
 *
 * journalCrypto.js promises a key generated on the device, held in the OS
 * keychain as WHEN_UNLOCKED_THIS_DEVICE_ONLY, absent from every backup, and
 * unrecoverable by us — that last part is why there is no escrow and no reset
 * link. A browser has no keychain. The web build would have to keep that key in
 * localStorage, readable by any script that reaches the page.
 *
 * Shipping it anyway would leave the app making a promise it no longer keeps,
 * about a grieving child's private writing. So on web the journal is ABSENT and
 * says why, which is the same rule the rest of this file follows: a feature
 * that cannot meet its own guarantee is off, not quietly degraded.
 *
 * Deliberately NOT part of FEATURES: those are shipping decisions the owner can
 * flip. This one is a property of the platform and must not be flippable.
 */
export const journalAvailable = Platform.OS !== 'web';

/** Shown wherever the journal would have been. */
export const JOURNAL_UNAVAILABLE_REASON =
  'The Healing Journal needs your phone\u2019s secure keychain, which a web browser '
  + 'does not have. It is waiting for you in the phone app \u2014 your words are '
  + 'private there in a way they could not be here.';
