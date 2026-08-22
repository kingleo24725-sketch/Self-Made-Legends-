/**
 * Dad + Daughter Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 * Proprietary and confidential. Unauthorized copying, distribution,
 * or use of this file, via any medium, is strictly prohibited.
 *
 * Thin API client. Handles auth headers, token refresh, and the 402
 * upgrade-required response that drives soft paywalls.
 */
import { API_BASE_URL } from './config';

let accessToken = null;
let refreshHandler = null;

export const setAccessToken = (t) => { accessToken = t; };
export const setRefreshHandler = (fn) => { refreshHandler = fn; };

export class ApiError extends Error {
  constructor(status, body) {
    super(body?.message || body?.error || 'Request failed');
    this.status = status;
    this.code = body?.error;
    this.recovery = body?.recovery;
    this.body = body;
  }
  /** 402 => show the soft paywall sheet, never a hard wall. */
  get isUpgradeRequired() { return this.status === 402; }
  /** 403 with an age reason is NOT purchasable — never offer an upgrade. */
  get isAgeGated() {
    return this.status === 403 && /age|guardian_permission|_plus$/.test(this.code || '');
  }
}

async function request(method, path, body, { retry = true } = {}) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(body && method !== 'GET' ? { 'Idempotency-Key': cryptoRandom() } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && retry && refreshHandler) {
    const ok = await refreshHandler();
    if (ok) return request(method, path, body, { retry: false });
  }

  const text = await res.text();
  const parsed = text ? JSON.parse(text) : null;
  if (!res.ok) throw new ApiError(res.status, parsed);
  return parsed;
}

function cryptoRandom() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export const api = {
  get: (p) => request('GET', p),
  post: (p, b) => request('POST', p, b),
  patch: (p, b) => request('PATCH', p, b),
  delete: (p) => request('DELETE', p),
};

export default api;
