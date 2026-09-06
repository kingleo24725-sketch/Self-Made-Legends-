/**
 * Dad + Daughter Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 * Proprietary and confidential. Unauthorized use is prohibited.
 *
 * The limiter is skipped under test, so this cannot observe a 429. What it
 * can pin is the two things that made the limiter wrong in production:
 * whose bucket a request lands in, and what the bucket is spent on.
 */
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const config = require('../../src/config');
const { keyFor } = require('../../src/middleware/rateLimit');

const server = fs.readFileSync(path.join(__dirname, '../../src/server.js'), 'utf8');

describe('rate-limit buckets are per person, not per address', () => {
  const ip = '203.0.113.9';

  test('a valid bearer token keys on its user, before any auth middleware ran', () => {
    const token = jwt.sign({ userId: 'user-1', profileId: 'p-1' }, config.jwt.secret);
    const req = { ip, headers: { authorization: `Bearer ${token}` } };
    expect(keyFor(req)).toBe('u:user-1');
  });

  test('two people on one router get two buckets', () => {
    const a = jwt.sign({ userId: 'dad' }, config.jwt.secret);
    const b = jwt.sign({ userId: 'daughter' }, config.jwt.secret);
    expect(keyFor({ ip, headers: { authorization: `Bearer ${a}` } }))
      .not.toBe(keyFor({ ip, headers: { authorization: `Bearer ${b}` } }));
  });

  test('no token keys on the address', () => {
    expect(keyFor({ ip, headers: {} })).toBe(ip);
  });

  test('a forged or expired token does not get its own bucket', () => {
    const forged = jwt.sign({ userId: 'attacker' }, 'not-our-secret');
    const expired = jwt.sign({ userId: 'user-1' }, config.jwt.secret, { expiresIn: -10 });
    expect(keyFor({ ip, headers: { authorization: `Bearer ${forged}` } })).toBe(ip);
    expect(keyFor({ ip, headers: { authorization: `Bearer ${expired}` } })).toBe(ip);
  });
});

describe('what the bucket is spent on', () => {
  test('the limiter guards /api only — not the web bundle, not /health', () => {
    expect(server).toMatch(/app\.use\('\/api',\s*limits\.standard\)/);
    expect(server).not.toMatch(/app\.use\(limits\.standard\)/);
  });

  test('exactly one proxy hop is trusted in production, none elsewhere', () => {
    expect(server).toMatch(/app\.set\('trust proxy',\s*config\.env === 'production' \? 1 : false\)/);
  });
});
