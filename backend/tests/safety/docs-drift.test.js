/**
 * Dad + Daughter Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 * Proprietary and confidential. Unauthorized use is prohibited.
 *
 * docs/api-reference.md §6.4 is described as the canonical schema, and the
 * migration was originally generated from it. They drifted: the doc still
 * carried the pre-rename tier enum, so regenerating from it would have
 * produced a database the code could not use. These tests keep them in step.
 */
const fs = require('fs');
const path = require('path');

const read = (rel) => fs.readFileSync(path.join(__dirname, '../../..', rel), 'utf8');
const stripComments = (sql) => sql.split('\n')
  .filter((l) => !l.trim().startsWith('--'))
  .map((l) => l.replace(/\s+$/, ''))
  .filter((l) => l.length)
  .join('\n');

describe('schema doc matches the migration', () => {
  const doc = read('docs/api-reference.md').match(/```sql\n([\s\S]*?)\n```/)[1];
  const full = read('backend/src/config/migrations/001_initial_schema.sql');
  const mig = full.slice(full.indexOf('-- ═══ IDENTITY'),
                         full.indexOf('-- ═══ TABLES REFERENCED BY THE APP'));

  test('every statement in the doc appears in the migration', () => {
    expect(stripComments(mig)).toContain(stripComments(doc).slice(0, 400));
  });

  test('the tier enum agrees', () => {
    const of = (s) => s.match(/CREATE TYPE tier_code AS ENUM \(([^)]*)\)/)[1];
    expect(of(doc)).toBe(of(mig));
  });

  test('table counts agree', () => {
    const count = (s) => (s.match(/^CREATE TABLE/gm) || []).length;
    expect(count(doc)).toBe(count(mig));
  });
});

describe('documented routes exist', () => {
  const docs = ['docs/api-reference.md', 'docs/ai-tryon.md',
                'docs/video-rooms.md', 'docs/stripe-flow.md'].map(read).join('\n');

  test('no route is still documented under the retired /v1 prefix', () => {
    const stale = [...docs.matchAll(/`\/v1\/[^`]*`/g)].map((m) => m[0]);
    expect(stale).toEqual([]);
  });

  test('the server mounts every documented top-level group', () => {
    const server = read('backend/src/server.js');
    ['auth', 'tryon', 'video', 'stripe', 'webhooks'].forEach((g) => {
      expect(server).toContain(`/api/${g}`);
    });
  });
});
