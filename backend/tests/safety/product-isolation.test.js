/**
 * Dad + Daughter Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 * Proprietary and confidential. Unauthorized use is prohibited.
 *
 * RELEASE BLOCKER — the client must talk to BEAUTY BOND's server, not to the
 * other SML product sharing this repository.
 *
 * This is not hypothetical. `app/app.json` shipped with
 *
 *     "apiBaseUrl": "https://web-production-75d20c.up.railway.app/api"
 *
 * for days. That host is THE SELF-MADE LEGENDS COME UP: the repository root's
 * railway.json runs `node src/api-server.js`, and Beauty Bond's own backend had
 * never been deployed at all. Every API call 404'd, and nothing in the codebase
 * noticed — the owner did.
 *
 * docs/stripe-flow.md §3.2 already treats cross-product leakage as a first-class
 * risk for the shared Stripe account, with an ownership gate that fails closed.
 * The client's own address deserves the same treatment, so:
 *
 *   1. the web build never carries an address at all — it uses its own origin
 *   2. a native address, if set, is not the other product's
 *   3. no document tells anyone to OPEN the other product's address
 *   4. the app verifies which product answered, not merely that one did
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../../..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const { expo } = JSON.parse(read('app/app.json'));

/**
 * The Come Up deployment. Written as a pattern rather than a bare string so a
 * different Railway subdomain for the same service is still caught, and so this
 * file's own prose does not count as a violation — see the self-test below.
 */
const COME_UP_HOST = /web-production-75d20c\.up\.railway\.app/;

describe('the client points at Beauty Bond, or at nothing', () => {
  test('the web build derives its API from its own origin, never a constant', () => {
    const config = read('app/utils/config.js');
    expect(config).toMatch(/Platform\.OS === 'web'\s*\?\s*'\/api'/);
  });

  test('app.json carries no address for another product', () => {
    const url = expo.extra.apiBaseUrl ?? '';
    expect(COME_UP_HOST.test(url)).toBe(false);
  });

  test('an address, once set, is https — iOS blocks cleartext outright', () => {
    const url = expo.extra.apiBaseUrl ?? '';
    if (url !== '') expect(url.startsWith('https://')).toBe(true);
  });
});

describe('no document sends anyone to the wrong product', () => {
  const docs = fs.readdirSync(path.join(ROOT, 'docs'))
    .filter((f) => f.endsWith('.md'))
    .map((f) => ({ name: f, body: read(`docs/${f}`) }));

  test('the docs were actually found', () => {
    expect(docs.length).toBeGreaterThan(5);
  });

  /**
   * Naming the wrong host in a WARNING is correct and must stay legal —
   * get-it-on-your-phone.md explains the mistake so nobody repeats it. Putting
   * it in a fenced block is what makes it an instruction to open.
   */
  test('the Come Up address never appears as something to open or run', () => {
    const offenders = [];
    docs.forEach(({ name, body }) => {
      const fences = body.match(/```[\s\S]*?```/g) ?? [];
      fences.forEach((block) => {
        if (COME_UP_HOST.test(block)) offenders.push(name);
      });
    });
    expect(offenders).toEqual([]);
  });
});

describe('reachable is not the same as correct', () => {
  test('the health probe checks WHICH product answered', () => {
    const config = read('app/utils/config.js');
    const banner = read('app/components/HealthBanner.js');

    expect(config).toMatch(/EXPECTED_PRODUCT\s*=\s*'beauty-bond'/);
    expect(banner).toMatch(/body\.product !== EXPECTED_PRODUCT/);
  });

  test("and the server actually announces itself, so the check can pass", () => {
    expect(read('backend/src/server.js')).toMatch(/product:\s*'beauty-bond'/);
  });
});

/**
 * A guard that cannot fire is decoration. These prove the pattern matches the
 * real value that shipped, and that prose mentioning it is not a false positive.
 */
describe('the detector works', () => {
  test('it matches the address that actually shipped', () => {
    expect(COME_UP_HOST.test('https://web-production-75d20c.up.railway.app/api')).toBe(true);
  });

  test('it does not match a Beauty Bond address', () => {
    expect(COME_UP_HOST.test('https://beauty-bond-production.up.railway.app/api')).toBe(false);
  });
});
