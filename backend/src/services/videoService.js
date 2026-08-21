/**
 * Dads & Daughters Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 * Proprietary and confidential. Unauthorized copying, distribution,
 * or use of this file, via any medium, is strictly prohibited.
 *
 * LiveKit room + token management. docs/video-rooms.md §5.2, §5.3, §5.8.
 */
const { AccessToken, RoomServiceClient, EgressClient } = require('livekit-server-sdk');
const config = require('../config');
const db = require('../config/db');
const { canJoin } = require('./roomSafety');

/**
 * Built on first use, not at import. The SDK throws on an undefined URL, which
 * would take the whole API down at boot on a deploy where video is not yet
 * configured — see src/config/index.js.
 */
let _roomService, _egressClient;

function requireVideoConfigured() {
  if (!config.enabled.video) {
    const e = new Error('video_not_configured');
    e.status = 503;
    e.publicMessage = 'Glam Rooms are not available yet.';
    throw e;
  }
}

function roomServiceClient() {
  requireVideoConfigured();
  _roomService ||= new RoomServiceClient(
    config.livekit.wsUrl, config.livekit.apiKey, config.livekit.apiSecret);
  return _roomService;
}

function egress() {
  requireVideoConfigured();
  _egressClient ||= new EgressClient(
    config.livekit.wsUrl, config.livekit.apiKey, config.livekit.apiSecret);
  return _egressClient;
}

const MAX_PARTICIPANTS = { family: 8, lesson: 200, bff: 4, global: 50 };

async function createRoom({ type, name, hostProfile, scheduledFor }) {
  const livekitRoom = `bb_${type}_${Date.now().toString(36)}`;

  await roomServiceClient().createRoom({
    name: livekitRoom,
    emptyTimeout: 300,
    maxParticipants: MAX_PARTICIPANTS[type],
    metadata: JSON.stringify({ type, hostProfileId: hostProfile.id, sml: 'beauty-bond' }),
  });

  return db.one(
    `INSERT INTO rooms (type, name, livekit_room, host_profile_id, max_participants,
                        recording_enabled, scheduled_for)
     VALUES ($1,$2,$3,$4,$5,false,$6) RETURNING *`,
    [type, name, livekitRoom, hostProfile.id, MAX_PARTICIPANTS[type], scheduledFor ?? null]);
}

/**
 * Mint a scoped join token. Re-runs the FULL safety check every time — a
 * guardian revoking permission mid-call ejects the child at the next refresh.
 */
async function mintToken(room, profile) {
  requireVideoConfigured();
  const check = await canJoin(profile.id, {
    type: room.type, hostProfileId: room.host_profile_id, roomId: room.id,
  });
  if (!check.ok) { const e = new Error(check.reason); e.status = 403; throw e; }

  const isHost = room.host_profile_id === profile.id;
  const isMinor = profile.age_band !== 'adult';

  const at = new AccessToken(config.livekit.apiKey, config.livekit.apiSecret, {
    identity: profile.id,            // stable -> server-side track control
    name: profile.display_name,
    ttl: '10m',
    metadata: JSON.stringify({
      ageBand: profile.age_band, isMinor, guardianId: profile.guardian_id,
    }),
  });

  at.addGrant({
    room: room.livekit_room,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,            // Shared Glam Panel channel
    canUpdateOwnMetadata: true,
    roomAdmin: isHost,
    canPublishSources: ['camera', 'microphone'],
    recorder: false,
  });

  return {
    token: await at.toJwt(),
    url: config.livekit.wsUrl,
    roomId: room.id,
    expiresIn: 600,
    capabilities: {
      // U13: the chat control does not render at all.
      chat: profile.age_band !== 'child',
      recording: room.recording_enabled && !isMinor,
      canInvite: isHost && profile.age_band === 'adult',
    },
  };
}

/** Panic: get them OUT first. Everything else is secondary. */
async function forceDisconnect(room, profileId) {
  await roomServiceClient().removeParticipant(room.livekit_room, profileId).catch(() => {});
}

async function freezeRoom(room, reason) {
  await db.query('UPDATE rooms SET frozen_at = now(), freeze_reason = $2 WHERE id = $1',
                 [room.id, reason]);
  await roomServiceClient().updateRoomMetadata(
    room.livekit_room, JSON.stringify({ frozen: true })).catch(() => {});
}

/**
 * Recording. A minor's track NEVER reaches the encoder — this is the
 * enforcement point for docs/video-rooms.md §5.1 rule 4.
 */
async function startRecording(room) {
  if (room.type === 'bff') {
    const e = new Error('recording_not_available_for_room_type'); e.status = 403; throw e;
  }

  const participants = await roomServiceClient().listParticipants(room.livekit_room);
  const adults = participants.filter((p) => {
    try { return !JSON.parse(p.metadata || '{}').isMinor; } catch { return false; }
  });

  const audioTrackIds = adults.flatMap((p) =>
    (p.tracks || []).filter((t) => t.type === 'AUDIO').map((t) => t.sid));
  const videoTrackIds = adults.flatMap((p) =>
    (p.tracks || []).filter((t) => t.type === 'VIDEO').map((t) => t.sid));

  return egress().startTrackCompositeEgress(room.livekit_room, {
    file: { filepath: `recordings/${room.id}/{time}.mp4` },
  }, { audioTrackIds, videoTrackIds });
}

module.exports = {
  roomServiceClient, createRoom, mintToken, forceDisconnect, freezeRoom,
  startRecording, requireVideoConfigured, MAX_PARTICIPANTS,
};
