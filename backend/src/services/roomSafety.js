/**
 * Dad + Daughter Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 *
 * ══════════════════════════════════════════════════════════════════════
 *  THE JOIN AUTHORIZATION MATRIX.
 *  One function, used at invite time AND on every token mint. Requires
 *  100% test coverage — docs/api-reference.md §6.10.
 *
 *  Four hard rules (docs/video-rooms.md §5.1):
 *    1. No U13 in any room with a non-trusted-circle adult.
 *    2. No 1:1 adult<->minor room unless guardian or trusted circle.
 *    3. No DMs for U13 anywhere in the product.
 *    4. A minor's video track never enters a recording.
 * ══════════════════════════════════════════════════════════════════════
 */
const db = require('../config/db');
const { ageFromBirthDate } = require('../middleware/requireAgeBand');

const no = (reason) => ({ ok: false, reason });
const yes = () => ({ ok: true });

async function canJoin(profileId, room) {
  const p = await db.one('SELECT * FROM profiles WHERE id = $1 AND deleted_at IS NULL',
                         [profileId]);
  if (!p) return no('profile_not_found');

  const age = ageFromBirthDate(p.birth_date);

  /* ── Age floors ───────────────────────────────────────────────── */
  if (room.type === 'global' && age < 16) return no('global_rooms_16_plus');
  if (room.type === 'bff' && age < 13) return no('bff_rooms_13_plus');

  /* ── Guardian permission for ANY video, for ANY minor ─────────── */
  if (p.age_band !== 'adult') {
    const perms = await db.one(
      'SELECT * FROM guardian_permissions WHERE child_profile_id = $1', [p.id]);
    if (!perms || !perms.video_rooms) return no('guardian_permission_required');
    if (room.type === 'lesson' && !perms.live_lessons) return no('guardian_permission_required');
    if (room.type === 'bff' && !perms.bff_rooms) return no('guardian_permission_required');
  }

  /* ── Rule 1: no U13 with non-trusted adults ───────────────────── */
  if (p.age_band === 'child') {
    if (room.type === 'global' || room.type === 'bff') {
      return no('room_type_forbidden_for_child');
    }

    const others = room.roomId
      ? await db.query('SELECT profile_id FROM room_participants WHERE room_id = $1 AND left_at IS NULL',
                       [room.roomId])
      : [{ profile_id: room.hostProfileId }];

    for (const o of others) {
      if (o.profile_id === p.id) continue;
      const other = await db.one('SELECT * FROM profiles WHERE id = $1', [o.profile_id]);
      if (!other || other.age_band !== 'adult') continue;

      const isGuardian = other.id === p.guardian_id;
      const trusted = await isTrusted(p.guardian_id, other.id);

      if (isGuardian || trusted) continue;

      // In lesson rooms, only a background-checked verified creator may be present.
      if (room.type === 'lesson' && other.is_verified_creator) continue;

      return no('untrusted_adult_present');
    }
  }

  /* ── Rule 2: no 1:1 adult<->minor ─────────────────────────────── */
  if (p.age_band !== 'adult' && room.type === 'family') {
    const host = await db.one('SELECT * FROM profiles WHERE id = $1', [room.hostProfileId]);
    if (host && host.age_band === 'adult' && host.id !== p.guardian_id) {
      const trusted = await isTrusted(p.guardian_id, host.id);
      if (!trusted) return no('one_to_one_adult_minor_forbidden');
    }
  }

  /* ── BFF: friendship must be guardian-approved ────────────────── */
  if (room.type === 'bff' && p.age_band === 'teen') {
    const approved = await db.one(
      `SELECT 1 FROM friendships
        WHERE status = 'approved'
          AND ((a_profile_id = $1 AND b_profile_id = $2)
            OR (a_profile_id = $2 AND b_profile_id = $1))`,
      [p.id, room.hostProfileId]);
    if (!approved) return no('friend_not_guardian_approved');
  }

  /* ── Blocks & suspensions ─────────────────────────────────────── */
  const blocked = await db.one(
    `SELECT 1 FROM blocks
      WHERE (blocker_profile_id = $1 AND blocked_profile_id = $2)
         OR (blocker_profile_id = $2 AND blocked_profile_id = $1)`,
    [p.id, room.hostProfileId]);
  if (blocked) return no('blocked');

  if (p.suspended_until && new Date(p.suspended_until) > new Date()) {
    return no('account_suspended');
  }

  return yes();
}

async function isTrusted(guardianProfileId, adultProfileId) {
  if (!guardianProfileId) return false;
  const row = await db.one(
    `SELECT 1 FROM trusted_circle
      WHERE guardian_profile_id = $1 AND adult_profile_id = $2`,
    [guardianProfileId, adultProfileId]);
  return !!row;
}

module.exports = { canJoin, isTrusted };
