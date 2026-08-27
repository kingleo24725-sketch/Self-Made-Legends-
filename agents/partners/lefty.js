/**
 * Self-Made Legends — Lefty Distribution adapter
 * Copyright (c) 2026 Self-Made Legends LLC. All Rights Reserved.
 *
 * ⚠️  UNVERIFIED. No public API documentation for Lefty Distribution could be
 *     found on 27 August 2026. Everything below — endpoint paths, field
 *     names, auth scheme, response shape — is a placeholder modelled on how
 *     3PL APIs are normally built.
 *
 *     DO NOT point this at production until someone has read their real
 *     documentation and corrected it. It runs in mock mode by default
 *     precisely so that an unconfigured deploy cannot quietly send garbage
 *     to a live partner.
 *
 * To go live: set LEFTY_API_BASE and LEFTY_API_KEY, then fix the three
 * translate* functions below to match their actual contract. Nothing outside
 * this file should need to change.
 */

'use strict';

const BASE = process.env.LEFTY_API_BASE || '';
const KEY = process.env.LEFTY_API_KEY || '';
const LIVE = Boolean(BASE && KEY);

/** What Lefty can do. In mock mode these are assumptions, clearly labelled. */
async function capabilities() {
  if (!LIVE) {
    return {
      name: 'Lefty Distribution',
      role: 'distributor',
      available: true,
      mock: true,
      unverified: 'No API documentation available; capabilities below are assumed, not confirmed.',
      ships_to: ['US', 'CA'],
      services: [
        { level: 'standard', transit_days: [3, 5] },
        { level: 'express', transit_days: [1, 2] },
      ],
      handling_days: 1,
      accepts: ['apparel', 'hats', 'accessories', 'underwear'],
      not_confirmed: ['footwear', 'heels', 'jewellery'],
    };
  }

  const res = await call('GET', '/v1/capabilities');
  return translateCapabilities(res);
}

async function quote(order) {
  if (!LIVE) {
    return {
      mock: true,
      partner: 'lefty',
      currency: 'USD',
      shipping_cost: null,
      note: 'Mock mode — no real quote. Configure LEFTY_API_BASE and LEFTY_API_KEY.',
    };
  }
  return translateQuote(await call('POST', '/v1/quotes', translateOrder(order)));
}

async function submit(order) {
  if (!LIVE) {
    return {
      mock: true,
      partner: 'lefty',
      reference: 'MOCK-' + Date.now().toString(36).toUpperCase(),
      status: 'accepted_mock',
      note: 'Nothing was sent anywhere. This is mock mode.',
    };
  }
  return translateSubmit(await call('POST', '/v1/orders', translateOrder(order)));
}

/* ── the three functions to fix when the real docs arrive ────────────────── */

function translateCapabilities(raw) { return { name: 'Lefty Distribution', role: 'distributor', available: true, raw }; }
function translateOrder(order) { return order; }
function translateQuote(raw) { return { partner: 'lefty', raw }; }
function translateSubmit(raw) { return { partner: 'lefty', raw }; }

async function call(method, path, body) {
  const res = await fetch(BASE.replace(/\/$/, '') + path, {
    method,
    headers: {
      'Authorization': `Bearer ${KEY}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    // The body usually carries the real reason; the status alone rarely does.
    const text = await res.text().catch(() => '');
    throw new Error(`Lefty ${method} ${path} → ${res.status}: ${text.slice(0, 400)}`);
  }
  return res.json();
}

module.exports = { capabilities, quote, submit, LIVE };
