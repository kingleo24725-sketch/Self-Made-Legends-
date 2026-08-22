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
