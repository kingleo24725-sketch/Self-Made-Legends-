/**
 * Dad + Daughter Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 * Proprietary and confidential. Unauthorized copying, distribution,
 * or use of this file, via any medium, is strictly prohibited.
 *
 * RELEASE BLOCKER — requires 100% coverage of canJoin().
 * docs/video-rooms.md §5.1, §5.2.
 */
jest.mock('../../src/config/db');
const db = require('../../src/config/db');
const { canJoin, isTrusted } = require('../../src/services/roomSafety');

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

/**
 * ══════════════════════════════════════════════════════════════════════
 * The paths above are the ones a well-formed request takes. jest.config.js
 * demands 100% lines and 90% branches of this file, and it was at 97.7/81.7 —
 * every gap below is a real refusal that no test had ever made fire.
 *
 * A safety rule that has never been observed refusing anyone is a rule nobody
 * has evidence works.
 * ══════════════════════════════════════════════════════════════════════
 */
describe('refusals that had never been exercised', () => {
  test('a profile that does not exist is refused, not treated as an adult', async () => {
    mockProfiles({});
    const r = await canJoin('p_ghost', { type: 'family', hostProfileId: 'p_guardian' });
    expect(r).toEqual({ ok: false, reason: 'profile_not_found' });
  });

  test('a deleted or unknown participant mid-room is skipped, not trusted', async () => {
    // db.one returns null for the other participant: they left between the
    // presence read and the profile read. Skipping is right; assuming adult
    // would be wrong in both directions.
    mockProfiles({ p_child: CHILD, p_guardian: { id: 'p_guardian', age_band: 'adult',
                                                 birth_date: '1985-01-01' } });
    db.query.mockResolvedValue([{ profile_id: 'p_child' }, { profile_id: 'p_vanished' }]);
    const r = await canJoin('p_child', { type: 'family', roomId: 'r1',
                                         hostProfileId: 'p_guardian' });
    expect(r).toEqual({ ok: true });
  });

  test('another MINOR in the room is not an untrusted adult', async () => {
    mockProfiles({
      p_child: CHILD,
      p_sister: { id: 'p_sister', age_band: 'child', birth_date: '2015-06-01',
                  guardian_id: 'p_guardian' },
      p_guardian: { id: 'p_guardian', age_band: 'adult', birth_date: '1985-01-01' },
    });
    db.query.mockResolvedValue([{ profile_id: 'p_sister' }]);
    const r = await canJoin('p_child', { type: 'family', roomId: 'r1',
                                         hostProfileId: 'p_guardian' });
    expect(r).toEqual({ ok: true });
  });
});

describe('guardian permissions are per-room-type, not one switch', () => {
  test('video_rooms on but live_lessons off still blocks a lesson', async () => {
    mockProfiles({ p_teen: TEEN }, {
      perms: { video_rooms: true, live_lessons: false, bff_rooms: true },
    });
    const r = await canJoin('p_teen', { type: 'lesson', hostProfileId: 'p_teacher' });
    expect(r).toEqual({ ok: false, reason: 'guardian_permission_required' });
  });

  test('video_rooms on but bff_rooms off still blocks a BFF room', async () => {
    mockProfiles({ p_teen: TEEN }, {
      perms: { video_rooms: true, live_lessons: true, bff_rooms: false },
    });
    const r = await canJoin('p_teen', { type: 'bff', hostProfileId: 'p_friend' });
    expect(r).toEqual({ ok: false, reason: 'guardian_permission_required' });
  });
});

describe('the age floor and the age band are separate defences', () => {
  /**
   * age_band and birth_date can disagree — a band set at signup and a birth
   * date corrected later, or a bad import. The age floor catches the ordinary
   * case; THIS is the line that catches the inconsistent one, and it had never
   * run because no test ever produced a disagreement.
   */
  test('a child-banded profile is refused a global room even if the date says 16', async () => {
    mockProfiles({ p_child: { ...CHILD, birth_date: '2008-01-01' } });
    const r = await canJoin('p_child', { type: 'global', hostProfileId: 'p_host' });
    expect(r).toEqual({ ok: false, reason: 'room_type_forbidden_for_child' });
  });

  test('the same profile is refused a BFF room for the same reason', async () => {
    mockProfiles({ p_child: { ...CHILD, birth_date: '2008-01-01' } });
    const r = await canJoin('p_child', { type: 'bff', hostProfileId: 'p_host' });
    expect(r).toEqual({ ok: false, reason: 'room_type_forbidden_for_child' });
  });
});

describe('invite time, before the room exists', () => {
  /**
   * canJoin runs at INVITE time as well as on every token mint, and at invite
   * time there is no roomId and no room_participants rows — so the check falls
   * back to the host alone. Without this the invite path was unverified.
   */
  test('with no roomId, the host is the participant considered', async () => {
    mockProfiles({ p_child: CHILD, p_stranger: ADULT_STRANGER });
    const r = await canJoin('p_child', { type: 'family', hostProfileId: 'p_stranger' });
    expect(r).toEqual({ ok: false, reason: 'untrusted_adult_present' });
  });

  test('and a guardian host is fine', async () => {
    mockProfiles({ p_child: CHILD,
                   p_guardian: { id: 'p_guardian', age_band: 'adult',
                                 birth_date: '1985-01-01' } });
    const r = await canJoin('p_child', { type: 'family', hostProfileId: 'p_guardian' });
    expect(r).toEqual({ ok: true });
  });
});

describe('a verified creator is the ONE adult exception, and only in lessons', () => {
  const CREATOR = { id: 'p_creator', age_band: 'adult', birth_date: '1988-01-01',
                    is_verified_creator: true };

  test('a background-checked creator may teach a child', async () => {
    mockProfiles({ p_child: CHILD, p_creator: CREATOR });
    db.query.mockResolvedValue([{ profile_id: 'p_creator' }]);
    const r = await canJoin('p_child', { type: 'lesson', roomId: 'r1',
                                         hostProfileId: 'p_creator' });
    expect(r).toEqual({ ok: true });
  });

  test('the same creator in a FAMILY room is still an untrusted adult', async () => {
    // The exception is scoped to lessons on purpose. Verification is not a
    // general-purpose pass into a child's private room.
    mockProfiles({ p_child: CHILD, p_creator: CREATOR });
    db.query.mockResolvedValue([{ profile_id: 'p_creator' }]);
    const r = await canJoin('p_child', { type: 'family', roomId: 'r1',
                                         hostProfileId: 'p_creator' });
    expect(r).toEqual({ ok: false, reason: 'untrusted_adult_present' });
  });
});

describe('blocks outrank everything else', () => {
  test('a block refuses the join even between two adults', async () => {
    mockProfiles({ p_adult: { id: 'p_adult', age_band: 'adult',
                              birth_date: '1990-01-01', suspended_until: null } });
    db.one.mockImplementation(async (sql, params) => {
      if (sql.includes('FROM blocks')) return { '?column?': 1 };
      if (sql.includes('FROM profiles')) {
        return params[0] === 'p_adult'
          ? { id: 'p_adult', age_band: 'adult', birth_date: '1990-01-01',
              suspended_until: null }
          : null;
      }
      return null;
    });
    const r = await canJoin('p_adult', { type: 'global', hostProfileId: 'p_host' });
    expect(r).toEqual({ ok: false, reason: 'blocked' });
  });
});

describe('isTrusted', () => {
  test('a minor with no guardian on file trusts nobody', async () => {
    // Fails closed: no guardian means no one has been vouched for, so the
    // trusted-circle lookup is never even made.
    mockProfiles({});
    expect(await isTrusted(null, 'p_stranger')).toBe(false);
    expect(await isTrusted(undefined, 'p_stranger')).toBe(false);
  });

  test('a real trusted-circle row is what makes an adult trusted', async () => {
    db.one.mockImplementation(async (sql) =>
      (sql.includes('trusted_circle') ? { '?column?': 1 } : null));
    expect(await isTrusted('p_guardian', 'p_aunt')).toBe(true);
  });
});
