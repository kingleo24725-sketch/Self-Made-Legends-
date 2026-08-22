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
