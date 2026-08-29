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

/**
 * WHERE THE API IS.
 *
 * On web: always same-origin `/api`, never a configured URL. The browser build
 * is served BY the Beauty Bond API (backend/src/server.js mounts public/web),
 * so the server is by definition the one that sent the page. That makes the
 * web app correct at whatever domain it is deployed to, with no config edit and
 * no rebuild.
 *
 * This is not a shortcut. A hardcoded absolute URL here previously pointed at
 * `web-production-75d20c.up.railway.app`, which is THE SELF-MADE LEGENDS COME
 * UP — a different SML product — because the repo root's railway.json deploys
 * `src/api-server.js`. Beauty Bond's own backend had never been deployed at
 * all. Same-origin cannot make that mistake.
 *
 * On native there is no origin to inherit, so the URL must be configured. An
 * unset value stays EMPTY rather than falling back to localhost: on a phone,
 * localhost is the phone, so that fallback turns "nobody configured a server"
 * into a confusing connection error. utils/api.js reports the empty case, and
 * HealthBanner names it on the first screen.
 */
export const API_BASE_URL = Platform.OS === 'web'
  ? '/api'
  : (extra.apiBaseUrl || '');

/** False when a native build shipped without a server. Drives the banner. */
export const API_CONFIGURED = API_BASE_URL !== '';

/**
 * /health lives at the server ROOT, outside /api, and must answer with no
 * credentials — that is what makes it a reachability probe.
 */
export const HEALTH_URL = Platform.OS === 'web'
  ? '/health'
  : `${API_BASE_URL.replace(/\/+$/, '').replace(/\/api$/, '')}/health`;

/** Beauty Bond's /health says so. Anything else answering is the wrong service. */
export const EXPECTED_PRODUCT = 'beauty-bond';
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
