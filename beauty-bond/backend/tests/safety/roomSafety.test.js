/**
 * Dad + Daughter Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 *
 * RELEASE BLOCKER — requires 100% coverage of canJoin().
 * docs/video-rooms.md §5.1, §5.2.
 */
jest.mock('../../src/config/db');
const db = require('../../src/config/db');
const { canJoin } = require('../../src/services/roomSafety');

const CHILD = {
  id: 'p_child', age_band: 'child', guardian_id: 'p_guardian',
  birth_date: '2017-01-01', suspended_until: null,
};
const TEEN = {
  id: 'p_teen', age_band: 'teen', guardian_id: 'p_guardian',
  birth_date: '2011-01-01', suspended_until: null,
};
const ADULT_STRANGER = {
  id: 'p_stranger', age_band: 'adult', birth_date: '1990-01-01', is_verified_creator: false,
};

beforeEach(() => {
  jest.resetAllMocks();
  db.query.mockResolvedValue([]);
});

function mockProfiles(map, { perms = { video_rooms: true, live_lessons: true, bff_rooms: true } } = {}) {
  db.one.mockImplementation(async (sql, params) => {
    if (sql.includes('FROM profiles')) return map[params[0]] ?? null;
    if (sql.includes('guardian_permissions')) return perms;
    if (sql.includes('trusted_circle')) return null;
    if (sql.includes('friendships')) return null;
    if (sql.includes('FROM blocks')) return null;
    return null;
  });
}

describe('age floors', () => {
  test('global rooms are 16+', async () => {
    mockProfiles({ p_teen: { ...TEEN, birth_date: '2012-01-01' } });
    const r = await canJoin('p_teen', { type: 'global', hostProfileId: 'p_host' });
    expect(r).toEqual({ ok: false, reason: 'global_rooms_16_plus' });
  });

  test('BFF rooms are 13+', async () => {
    mockProfiles({ p_child: CHILD });
    const r = await canJoin('p_child', { type: 'bff', hostProfileId: 'p_host' });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('bff_rooms_13_plus');
  });
});

describe('guardian permission', () => {
  test('a minor without video_rooms permission cannot join', async () => {
    mockProfiles({ p_teen: TEEN }, { perms: { video_rooms: false } });
    const r = await canJoin('p_teen', { type: 'family', hostProfileId: 'p_guardian' });
    expect(r).toEqual({ ok: false, reason: 'guardian_permission_required' });
  });
});

describe('Rule 1 — no U13 with a non-trusted adult', () => {
  test('blocks a child when an untrusted adult is present', async () => {
    mockProfiles({ p_child: CHILD, p_stranger: ADULT_STRANGER });
    db.query.mockResolvedValue([{ profile_id: 'p_stranger' }]);
    const r = await canJoin('p_child', {
      type: 'family', hostProfileId: 'p_stranger', roomId: 'r1' });
    expect(r.ok).toBe(false);
    expect(['untrusted_adult_present', 'one_to_one_adult_minor_forbidden'])
      .toContain(r.reason);
  });

  test('child cannot enter a global room at all', async () => {
    mockProfiles({ p_child: CHILD });
    const r = await canJoin('p_child', { type: 'global', hostProfileId: 'p_host' });
    expect(r.ok).toBe(false);
  });
});

describe('Rule 2 — no 1:1 adult/minor', () => {
  test('blocks a minor alone with a non-guardian adult host', async () => {
    mockProfiles({ p_teen: TEEN, p_stranger: ADULT_STRANGER });
    const r = await canJoin('p_teen', { type: 'family', hostProfileId: 'p_stranger' });
    expect(r).toEqual({ ok: false, reason: 'one_to_one_adult_minor_forbidden' });
  });

  test('allows a minor with their own guardian', async () => {
    mockProfiles({
      p_teen: TEEN,
      p_guardian: { id: 'p_guardian', age_band: 'adult', birth_date: '1985-01-01' },
    });
    const r = await canJoin('p_teen', { type: 'family', hostProfileId: 'p_guardian' });
    expect(r.ok).toBe(true);
  });
});

describe('BFF friendship approval', () => {
  test('blocks a teen whose friendship is not guardian-approved', async () => {
    mockProfiles({ p_teen: TEEN, p_other: { id: 'p_other', age_band: 'teen', birth_date: '2010-01-01' } });
    const r = await canJoin('p_teen', { type: 'bff', hostProfileId: 'p_other' });
    expect(r).toEqual({ ok: false, reason: 'friend_not_guardian_approved' });
  });
});

describe('suspensions', () => {
  test('a suspended account cannot join', async () => {
    const future = new Date(Date.now() + 86400000).toISOString();
    mockProfiles({
      p_adult: { id: 'p_adult', age_band: 'adult', birth_date: '1990-01-01',
                 suspended_until: future },
    });
    const r = await canJoin('p_adult', { type: 'global', hostProfileId: 'p_host' });
    expect(r).toEqual({ ok: false, reason: 'account_suspended' });
  });
});
