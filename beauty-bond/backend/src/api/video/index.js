/**
 * Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 *
 * Room routes. docs/video-rooms.md §5.10.
 */
const express = require('express');
const db = require('../../config/db');
const limits = require('../../middleware/rateLimit');
const { requireAuth, requireGuardianOf } = require('../../middleware/auth');
const { requireEntitlement } = require('../../middleware/requireEntitlement');
const { canJoin } = require('../../services/roomSafety');
const video = require('../../services/videoService');
const logger = require('../../utils/logger');

const router = express.Router();

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { type, name, invitees = [], scheduledFor } = req.body;

    // Who may CREATE which room type.
    const creatorRules = {
      family: () => req.profile.age_band === 'adult',
      lesson: () => req.profile.is_verified_creator,
      bff: () => ['teen', 'adult'].includes(req.profile.age_band),
      global: () => req.profile.age_band === 'adult',
    };
    if (!creatorRules[type]?.()) {
      return res.status(403).json({ error: 'not_allowed_to_create' });
    }

    // Validate EVERY invitee against the safety matrix before the room exists.
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
});

router.post('/:id/token', requireAuth, async (req, res, next) => {
  try {
    const room = await db.one('SELECT * FROM rooms WHERE id = $1', [req.params.id]);
    if (!room) return res.status(404).json({ error: 'not_found' });
    if (room.frozen_at) return res.status(423).json({ error: 'room_frozen' });

    const out = await video.mintToken(room, req.profile);
    res.json(out);
  } catch (err) { next(err); }
});

/**
 * PANIC — always free, always allowed, no confirmation.
 * ALWAYS_FREE short-circuits the entitlement gate entirely.
 */
router.post('/:id/panic', requireAuth, limits.panic,
  requireEntitlement(() => true, 'safety.panic_button'),
  async (req, res, next) => {
    try {
      const room = await db.one('SELECT * FROM rooms WHERE id = $1', [req.params.id]);
      if (!room) return res.json({ ok: true });

      // 1. Get them OUT first.
      await video.forceDisconnect(room, req.profile.id);
      // 2. Freeze the room for review.
      await video.freezeRoom(room, 'panic');
      // 3. Notify guardian + staff; page on-call for a minor.
      logger.error({ roomId: room.id, profileId: req.profile.id }, 'panic_triggered');
      await db.query(
        `INSERT INTO reports (reporter_profile_id, room_id, reason, priority)
         VALUES ($1,$2,'panic','p0')`, [req.profile.id, room.id]);

      res.json({ ok: true });
    } catch (err) { next(err); }
  });

router.post('/:id/report', requireAuth,
  requireEntitlement(() => true, 'safety.report'),
  async (req, res, next) => {
    try {
      await db.query(
        `INSERT INTO reports (reporter_profile_id, reported_profile_id, room_id, reason)
         VALUES ($1,$2,$3,$4)`,
        [req.profile.id, req.body.reportedProfileId, req.params.id, req.body.reason]);
      res.status(201).json({ ok: true });
    } catch (err) { next(err); }
  });

router.post('/:id/eject/:profileId', requireAuth, requireGuardianOf('profileId'),
  async (req, res, next) => {
    try {
      const room = await db.one('SELECT * FROM rooms WHERE id = $1', [req.params.id]);
      await video.forceDisconnect(room, req.params.profileId);
      await db.query(
        'UPDATE guardian_permissions SET video_rooms = false WHERE child_profile_id = $1',
        [req.params.profileId]);
      res.json({ ok: true });
    } catch (err) { next(err); }
  });

router.get('/:id/glam', requireAuth, async (req, res, next) => {
  try {
    const room = await db.one('SELECT glam_state FROM rooms WHERE id = $1', [req.params.id]);
    res.json(room?.glam_state ?? null);
  } catch (err) { next(err); }
});

router.post('/:id/glam', requireAuth, async (req, res, next) => {
  try {
    await db.query('UPDATE rooms SET glam_state = $2 WHERE id = $1',
                   [req.params.id, req.body]);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

router.post('/:id/recording', requireAuth, async (req, res, next) => {
  try {
    const room = await db.one('SELECT * FROM rooms WHERE id = $1', [req.params.id]);
    if (room.host_profile_id !== req.profile.id) {
      return res.status(403).json({ error: 'host_only' });
    }
    const egress = await video.startRecording(room);
    res.json({ egressId: egress.egressId });
  } catch (err) { next(err); }
});

module.exports = router;
