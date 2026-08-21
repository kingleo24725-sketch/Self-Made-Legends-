/**
 * Dads & Daughters Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 * Proprietary and confidential. Unauthorized copying, distribution,
 * or use of this file, via any medium, is strictly prohibited.
 */
const db = require('../config/db');
const video = require('../services/videoService');
const { canJoin } = require('../services/roomSafety');
const logger = require('../utils/logger');

const CREATOR_RULES = {
  family: (p) => p.age_band === 'adult',
  lesson: (p) => p.is_verified_creator,
  bff: (p) => ['teen', 'adult'].includes(p.age_band),
  global: (p) => p.age_band === 'adult',
};

async function createRoom(req, res, next) {
  try {
    const { type, name, invitees = [], scheduledFor } = req.body;
    if (!CREATOR_RULES[type]) return res.status(400).json({ error: 'unknown_room_type' });
    if (!CREATOR_RULES[type](req.profile)) {
      return res.status(403).json({ error: 'not_allowed_to_create' });
    }

    // Validate every invitee BEFORE the room exists.
    for (const inviteeId of invitees) {
      const check = await canJoin(inviteeId, { type, hostProfileId: req.profile.id });
      if (!check.ok) {
        return res.status(403).json({ error: check.reason, profileId: inviteeId });
      }
    }

    const room = await video.createRoom({
      type, name, hostProfile: req.profile, scheduledFor });
    res.status(201).json(room);
  } catch (err) { next(err); }
}

/**
 * POST /api/video/token
 *
 * Body: { roomId } or { type, name } to create-and-join in one call.
 * Re-runs the FULL safety check on every mint — a guardian revoking
 * permission mid-call ejects the child at the next refresh.
 */
async function issueToken(req, res, next) {
  try {
    let room;

    if (req.body.roomId) {
      room = await db.one('SELECT * FROM rooms WHERE id = $1', [req.body.roomId]);
      if (!room) return res.status(404).json({ error: 'room_not_found' });
    } else if (req.body.type) {
      if (!CREATOR_RULES[req.body.type]?.(req.profile)) {
        return res.status(403).json({ error: 'not_allowed_to_create' });
      }
      room = await video.createRoom({
        type: req.body.type, name: req.body.name, hostProfile: req.profile });
    } else {
      return res.status(400).json({ error: 'room_id_or_type_required' });
    }

    if (room.frozen_at) return res.status(423).json({ error: 'room_frozen' });

    const out = await video.mintToken(room, req.profile);
    res.json(out);
  } catch (err) { next(err); }
}

async function listRooms(req, res, next) {
  try {
    const rooms = await db.query(
      `SELECT r.* FROM rooms r
        WHERE r.ended_at IS NULL
          AND (r.host_profile_id = $1
               OR EXISTS (SELECT 1 FROM room_participants rp
                           WHERE rp.room_id = r.id AND rp.profile_id = $1))
        ORDER BY r.created_at DESC LIMIT 20`, [req.profile.id]).catch(() => []);
    res.json({ rooms });
  } catch (err) { next(err); }
}

/** Panic: get them OUT first. Everything else is secondary. */
async function panic(req, res, next) {
  try {
    const room = await db.one('SELECT * FROM rooms WHERE id = $1', [req.params.id]);
    if (!room) return res.json({ ok: true });

    await video.forceDisconnect(room, req.profile.id);
    await video.freezeRoom(room, 'panic');

    logger.error({ roomId: room.id, profileId: req.profile.id }, 'panic_triggered');
    await db.query(
      `INSERT INTO reports (reporter_profile_id, room_id, reason, priority)
       VALUES ($1,$2,'panic','p0')`, [req.profile.id, room.id]).catch(() => {});

    res.json({ ok: true, message: "You're out. We've let your grown-up know." });
  } catch (err) { next(err); }
}

async function report(req, res, next) {
  try {
    await db.query(
      `INSERT INTO reports (reporter_profile_id, reported_profile_id, room_id, reason)
       VALUES ($1,$2,$3,$4)`,
      [req.profile.id, req.body.reportedProfileId, req.params.id, req.body.reason]);
    res.status(201).json({ ok: true });
  } catch (err) { next(err); }
}

async function eject(req, res, next) {
  try {
    const room = await db.one('SELECT * FROM rooms WHERE id = $1', [req.params.id]);
    await video.forceDisconnect(room, req.params.profileId);
    await db.query(
      'UPDATE guardian_permissions SET video_rooms = false WHERE child_profile_id = $1',
      [req.params.profileId]);
    res.json({ ok: true });
  } catch (err) { next(err); }
}

async function getGlam(req, res, next) {
  try {
    const room = await db.one('SELECT glam_state FROM rooms WHERE id = $1', [req.params.id]);
    res.json(room?.glam_state ?? null);
  } catch (err) { next(err); }
}

async function setGlam(req, res, next) {
  try {
    await db.query('UPDATE rooms SET glam_state = $2 WHERE id = $1',
                   [req.params.id, req.body]);
    res.json({ ok: true });
  } catch (err) { next(err); }
}

async function startRecording(req, res, next) {
  try {
    const room = await db.one('SELECT * FROM rooms WHERE id = $1', [req.params.id]);
    if (room.host_profile_id !== req.profile.id) {
      return res.status(403).json({ error: 'host_only' });
    }
    const egress = await video.startRecording(room);
    res.json({ egressId: egress.egressId });
  } catch (err) { next(err); }
}

module.exports = {
  createRoom, issueToken, listRooms, panic, report, eject,
  getGlam, setGlam, startRecording,
};
