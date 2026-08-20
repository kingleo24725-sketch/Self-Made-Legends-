# 05 — Live Video Rooms Integration

> **DAD + DAUGHTER BEAUTY BOND™ — A SELF-MADE LEGENDS LLC (SML) PRODUCT**
> © 2026 **Self-Made Legends LLC (SML)**. All rights reserved.
> Owner: **Self-Made Legends LLC (SML)** · MIT licensed with SML attribution.
> A standalone SML product — **not** part of The Self-Made Legends Come Up.

**Provider:** LiveKit Cloud (SFU) — chosen for self-host escape hatch, server-side
per-track control, and data channels for the Shared Glam Panel.
Alternates evaluated: Daily.co, Agora, 100ms.

---

## 5.1 Room Types & Safety Envelope

| Room type | Code | Size | Who may join | Recording | Chat | Moderation |
|---|---|---|---|---|---|---|
| **Family Room** | `family` | 2–8 | Guardian-invited only (family + trusted circle) | Off by default; guardian-enabled, all parties notified + on-screen indicator | Text OK for 13+, **absent** for U13 | Closed room — none needed |
| **Dad + Daughter Live Lesson** | `lesson` | 2–200 | Verified creator hosts; families attend | Creator's own track only; **minor tracks dropped pre-encode** | Moderated, slow-mode, no links | Creator + staff mod + auto-classifier |
| **Best Friend Glam** | `bff` | 2–4 | Teen + guardian-approved friends only | **Hard off** — not implementable in this room type | Text OK (13+) | Auto audio/video classifier |
| **Global Glam** | `global` | ≤ 50 | **16+ only** | Off | Moderated + slow-mode | Staff mod + classifier + report queue |

### The four hard rules

1. **No U13 in any room with a non-trusted-circle adult.** Enforced at join, not at
   invite.
2. **No 1:1 adult↔minor room** unless the adult is the linked guardian or an
   approved trusted-circle member.
3. **No DMs for U13, anywhere in the product.** The feature does not exist for that
   account type — it is not "disabled."
4. **A minor's video track never enters a recording**, in any room type, under any
   setting. Enforced in the egress pipeline, not by policy.

---

## 5.2 Room Creation

### `POST /v1/rooms`

```jsonc
// → request
{
  "type": "family",
  "name": "Friday Glam Night",
  "invitees": ["prf_zaria", "prf_auntie_rae"],
  "scheduledFor": "2026-08-22T23:00:00Z",   // optional
  "sharedLookId": "look_soft_glam"          // optional; seeds the Glam Panel
}

// ← 201
{
  "roomId": "rm_01J8Y...",
  "type": "family",
  "livekitRoom": "bb_family_01J8Y",
  "hostProfileId": "prf_marcus",
  "joinCode": "GLAM-4821",         // family rooms only; rotates each session
  "maxParticipants": 8,
  "recordingEnabled": false,
  "expiresAt": "2026-08-23T02:00:00Z"
}
```

```ts
// apps/api/src/routes/rooms.ts
rooms.post('/', requireAuth, async (req, res) => {
  const { type, invitees = [] } = req.body as CreateRoomBody
  const profile = req.profile!

  // 1. Who may CREATE which room type
  const rules: Record<RoomType, () => boolean> = {
    family: () => profile.ageBand === 'adult',            // guardians create family rooms
    lesson: () => profile.isVerifiedCreator,
    bff:    () => profile.ageBand === 'teen' || profile.ageBand === 'adult',
    global: () => profile.ageBand === 'adult' || profile.age >= 16,
  }
  if (!rules[type]()) return res.status(403).json({ error: 'not_allowed_to_create' })

  // 2. Entitlement (room minutes) — safety is never gated, capacity is
  await assertRoomQuota(profile, type)

  // 3. Validate every invitee against the safety matrix BEFORE the room exists
  for (const inviteeId of invitees) {
    const check = await canJoin(inviteeId, { type, hostProfileId: profile.id })
    if (!check.ok) return res.status(403).json({ error: check.reason, profileId: inviteeId })
  }

  const room = await livekit.createRoom({
    name: `bb_${type}_${ulid()}`,
    emptyTimeout: 300,
    maxParticipants: MAX[type],
    metadata: JSON.stringify({ type, hostProfileId: profile.id, sml: 'beauty-bond' }),
  })

  const record = await db.rooms.create({ /* … */ })
  await notifyInvitees(record, invitees)     // guardian-routed for minors
  res.status(201).json(serialize(record))
})
```

### The join authorization matrix — one function, used everywhere

```ts
// apps/api/src/services/roomSafety.ts
export async function canJoin(
  profileId: string,
  room: { type: RoomType; hostProfileId: string; roomId?: string },
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const p = await db.profiles.get(profileId)

  // --- Age floors -------------------------------------------------------
  if (room.type === 'global' && p.age < 16) return no('global_rooms_16_plus')
  if (room.type === 'bff'    && p.age < 13) return no('bff_rooms_13_plus')
  if (room.type === 'lesson' && p.ageBand === 'child') {
    const perm = await db.guardianPermissions.get(p.id)
    if (!perm.live_lessons) return no('guardian_permission_required')
  }

  // --- Guardian permission for ANY video, for ANY minor -----------------
  if (p.ageBand !== 'adult') {
    const perm = await db.guardianPermissions.get(p.id)
    if (!perm.video_rooms) return no('guardian_permission_required')
  }

  // --- Rule 1: no U13 with non-trusted adults ---------------------------
  if (p.ageBand === 'child') {
    if (room.type === 'global' || room.type === 'bff') return no('room_type_forbidden_for_child')

    const others = room.roomId
      ? await db.roomParticipants.list(room.roomId)
      : [{ profileId: room.hostProfileId }]

    for (const o of others) {
      const other = await db.profiles.get(o.profileId)
      if (other.ageBand !== 'adult') continue
      const trusted = await db.trustedCircle.contains(p.guardianId, other.id)
      const isGuardian = other.id === p.guardianId
      if (!trusted && !isGuardian && room.type !== 'lesson') return no('untrusted_adult_present')
      // In lesson rooms, only a background-checked verified creator may be present
      if (room.type === 'lesson' && !other.isVerifiedCreator && !trusted && !isGuardian)
        return no('untrusted_adult_present')
    }
  }

  // --- Rule 2: no 1:1 adult↔minor ---------------------------------------
  if (p.ageBand !== 'adult' && room.type === 'family') {
    const host = await db.profiles.get(room.hostProfileId)
    const trusted = await db.trustedCircle.contains(p.guardianId, host.id)
    if (host.ageBand === 'adult' && host.id !== p.guardianId && !trusted)
      return no('one_to_one_adult_minor_forbidden')
  }

  // --- BFF: friendship must be guardian-approved -------------------------
  if (room.type === 'bff' && p.ageBand === 'teen') {
    const approved = await db.friendships.isApproved(p.id, room.hostProfileId)
    if (!approved) return no('friend_not_guardian_approved')
  }

  // --- Blocks & suspensions ---------------------------------------------
  if (await db.blocks.between(p.id, room.hostProfileId)) return no('blocked')
  if (p.suspendedUntil && p.suspendedUntil > new Date()) return no('account_suspended')

  return { ok: true }
}
const no = (reason: string) => ({ ok: false as const, reason })
```

---

## 5.3 Token Generation

Tokens are **short-lived (10 min), single-room, single-identity, permission-scoped**,
and minted only after `canJoin()` passes. The client never constructs a token.

### `POST /api/video/token`

```ts
import { AccessToken } from 'livekit-server-sdk'

rooms.post('/:roomId/token', requireAuth, async (req, res) => {
  const room = await db.rooms.get(req.params.roomId)
  const profile = req.profile!

  // Re-check on EVERY token mint — permissions may have changed since the invite
  const check = await canJoin(profile.id, {
    type: room.type, hostProfileId: room.host_profile_id, roomId: room.id,
  })
  if (!check.ok) return res.status(403).json({ error: check.reason })

  await assertRoomQuota(profile, room.type)

  const isHost = room.host_profile_id === profile.id
  const isMinor = profile.ageBand !== 'adult'

  const at = new AccessToken(
    process.env.LIVEKIT_API_KEY!, process.env.LIVEKIT_API_SECRET!,
    {
      identity: profile.id,                 // stable → server-side track control
      name: profile.display_name,
      ttl: '10m',
      metadata: JSON.stringify({
        ageBand: profile.ageBand,           // read by egress + moderation
        isMinor,
        guardianId: profile.guardian_id,
        avatarUrl: profile.avatar_url,
      }),
    })

  at.addGrant({
    room: room.livekit_room,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,                   // Shared Glam Panel channel
    canUpdateOwnMetadata: true,
    roomAdmin: isHost,                      // host can mute/remove
    // Minors are NEVER recordable: recorder cannot subscribe to these tracks
    canPublishSources: ['camera', 'microphone'],
    hidden: false,
    recorder: false,
  })

  res.json({
    token: at.toJwt(),
    url: process.env.LIVEKIT_WS_URL,
    roomId: room.id,
    expiresIn: 600,
    capabilities: {
      chat: !(profile.ageBand === 'child'),   // U13: control does not render
      recording: room.recording_enabled && !isMinor,
      canInvite: isHost && profile.ageBand === 'adult',
    },
  })
})
```

**Token rules:**

- TTL 10 min; the client refreshes via the same endpoint, which **re-runs the full
  safety check** — a guardian revoking permission mid-call ejects the child at the
  next refresh (and immediately via §5.7 force-disconnect).
- `identity` = profile ID, so a server can `removeParticipant` / `mutePublishedTrack`
  by identity.
- Guardians receive a **join notification** for every room a child enters, with room
  type, host, and participant list.

---

## 5.4 Client — Video Tiles

```tsx
// apps/mobile/src/features/rooms/RoomScreen.tsx
import {
  LiveKitRoom, useTracks, VideoTrack, useDataChannel, useLocalParticipant,
} from '@livekit/react-native'

export function RoomScreen({ roomId }: { roomId: string }) {
  const { token, url, capabilities } = useRoomToken(roomId)   // refreshes every 8 min

  return (
    <LiveKitRoom
      serverUrl={url}
      token={token}
      connect
      audio
      video
      options={{
        adaptiveStream: true,          // downgrade subscribed quality on weak networks
        dynacast: true,                // stop publishing layers nobody watches
        videoCaptureDefaults: { resolution: { width: 720, height: 1280, frameRate: 24 } },
        publishDefaults: {
          simulcast: true,
          videoSimulcastLayers: [Layers.h180, Layers.h360, Layers.h720],
        },
      }}
      onDisconnected={handleDisconnect}
    >
      <RoomHeader roomId={roomId} />
      <TileGrid />
      <SharedGlamPanel roomId={roomId} />
      <RoomControls capabilities={capabilities} />
      <PanicButton roomId={roomId} />     {/* always mounted, always reachable */}
    </LiveKitRoom>
  )
}

function TileGrid() {
  const tracks = useTracks([Track.Source.Camera], { onlySubscribed: true })

  // ≤4 → grid; >4 → active speaker pinned + paginated 6-up strip
  const layout = tracks.length <= 4 ? 'grid' : 'spotlight'

  return (
    <View style={layout === 'grid' ? s.grid : s.spotlight}>
      {tracks.map(t => (
        <Tile key={t.participant.identity}>
          <VideoTrack trackRef={t} objectFit="cover" />
          <TileOverlay
            name={t.participant.name}
            speaking={t.participant.isSpeaking}      // Rose Gold border
            muted={!t.participant.isMicrophoneEnabled}
            isMinor={JSON.parse(t.participant.metadata ?? '{}').isMinor}
          />
        </Tile>
      ))}
    </View>
  )
}
```

**Tile spec (design-binding):**

| Count | Layout |
|---|---|
| 2 | Stacked 50/50 portrait; side-by-side in landscape |
| 3–4 | 2×2 grid, equal |
| 5–8 | Active speaker 60% + scrollable strip |
| Lesson (>8) | Creator 75% + reaction bar; attendee tiles **off by default** |

- Active-speaker border: 3 px Rose Gold, 150 ms ease.
- Connection quality dot per tile (green/amber/red).
- Camera-off → avatar + initial on the profile's mode gradient, never a black box.
- **Minor tiles carry no location, no last-name, no age display.**

---

## 5.5 Shared Glam Panel

The feature that makes a Beauty Bond room different from a video call: everyone sees
the same look and the same step, synchronized over the LiveKit **data channel**
(reliable, topic `glam`).

```ts
// packages/shared/glamPanel.ts
export type GlamPanelState = {
  lookId: string
  step: number
  totalSteps: number
  layerFocus: 'lip' | 'cheek' | 'eye' | 'brow' | 'lash' | 'glow' | null
  shadeId: string | null
  hostIdentity: string
  updatedAt: number          // Lamport-ish clock for last-writer-wins
}

export type GlamMessage =
  | { t: 'state'; state: GlamPanelState }          // host broadcast
  | { t: 'request_step'; step: number }            // participant asks to move
  | { t: 'try_local'; shadeId: string }            // "everyone try it" fan-out
  | { t: 'reaction'; emoji: string }
```

```tsx
function SharedGlamPanel({ roomId }: { roomId: string }) {
  const [state, setState] = useState<GlamPanelState | null>(null)
  const { localParticipant } = useLocalParticipant()
  const isHost = useIsHost(roomId)

  const { send } = useDataChannel('glam', (msg) => {
    const parsed: GlamMessage = JSON.parse(new TextDecoder().decode(msg.payload))
    if (parsed.t === 'state') {
      // Last-writer-wins; ignore stale packets from a reconnecting peer
      setState(prev => (!prev || parsed.state.updatedAt > prev.updatedAt) ? parsed.state : prev)
    }
    if (parsed.t === 'try_local') applyLookLocally(parsed.shadeId)   // renders on MY device
  })

  function advance(step: number) {
    if (!isHost) return send(encode({ t: 'request_step', step }), { reliable: true })
    const next = { ...state!, step, updatedAt: Date.now() }
    setState(next)
    send(encode({ t: 'state', state: next }), { reliable: true })
    void api.post(`/v1/rooms/${roomId}/glam`, next)   // persist for late joiners
  }

  return (
    <Panel collapsible>
      <Text>{state?.lookName}</Text>
      <StepBar current={state?.step} total={state?.totalSteps} />
      <ShadeRail shades={state?.shades} onPick={s => isHost && setShade(s)} />
      <Button title="Everyone try it" onPress={() => send(encode({ t: 'try_local', shadeId: state!.shadeId! }))} />
    </Panel>
  )
}
```

**Semantics:**

- **Host owns the step.** Participants may *request*; the host advances.
- **"Everyone try it"** triggers each participant's **local, on-device** try-on
  (`ai-tryon.md` Path A). No face image ever crosses the room — critical, since
  the room may contain a child.
- Late joiners fetch `GET /v1/rooms/:id/glam` for current state, then follow the
  channel.
- Panel state persists to Postgres so a dropped host can reclaim it on rejoin.

---

## 5.6 Room-Type Implementations

### Family Room
Private, join-code + invite. Guardian is implicit host and may hand off host to
another adult. Recording off by default; enabling it shows a **persistent red banner
to every participant** and, if any minor is present, records **audio only from adults**
with all minor tracks dropped (§5.8).

### Dad + Daughter Live Lesson
Creator-hosted broadcast-style room.

- Creator must be **verified + background-checked** (`creators.youth_cleared_at`) to
  host any room a minor can join.
- Attendee video is **off by default**; a family may raise a hand to be brought on
  stage, requiring the child's guardian to be present in the room.
- Chat is moderated: slow mode 10 s, no links, no images, profanity + PII filter.
- Staff moderator seat available invisibly (`hidden: true` grant) for spot checks.

### Best Friend Glam
- Teen-only, 2–4 people, all guardian-approved friendships.
- **Recording is not implementable** in this room type — no egress config exists for it.
- Auto-classifier on audio and periodic video frames for nudity/violence/grooming
  signals → auto-terminate + guardian + staff alert.
- Guardian sees a session log (who, when, how long) — **not** content. Teens get
  privacy within an approved boundary; surveillance would defeat the point.

### Global Glam Rooms
- 16+ only, themed by region/topic ("Rio," "Lagos," "Seoul," "Bridal," "Deep Shades").
- Staff moderator required for any room > 10 participants.
- Report → immediate mute + review; 3 upheld reports = suspension.
- New accounts are **listen-only for 24 h** before they can publish.
- No location precision beyond the room's own label.

---

## 5.7 Moderation & Panic

### Panic button — one tap, no confirmation

```ts
rooms.post('/:roomId/panic', requireAuth, async (req, res) => {
  const { roomId } = req.params
  const profile = req.profile!

  // 1. Get them OUT first. Everything else is secondary.
  await livekit.removeParticipant(room.livekit_room, profile.id)

  // 2. Freeze the room for review
  await db.rooms.update(roomId, { frozen_at: new Date(), freeze_reason: 'panic' })
  await livekit.updateRoomMetadata(room.livekit_room, JSON.stringify({ frozen: true }))

  // 3. Notify guardian + staff, page on-call for minors
  await notifyGuardian(profile, 'panic_triggered', { roomId })
  await moderationQueue.push({ priority: 'p0', roomId, profileId: profile.id })
  if (profile.ageBand !== 'adult') await pageOnCall('minor_panic', { roomId })

  res.json({ ok: true })
})
```

**No "Are you sure?" dialog.** A child in trouble should never face a confirmation.

### Automated signals

| Signal | Cadence | Action |
|---|---|---|
| Audio classifier (abuse, grooming patterns) | streaming | flag → mod queue; auto-mute at high confidence |
| Video frame classifier (nudity, violence) | 1 frame / 3 s, non-family rooms | auto-terminate at high confidence |
| Chat filter (profanity, PII, links, contact-sharing) | per message | block + strike |
| Session anomalies (adult repeatedly joining minor rooms) | hourly job | account review |

**Not scanned:** Family Room content beyond join metadata, and the Healing Journal
(`architecture.md` M08). Closed family rooms are private; blanket surveillance of
a family's living room is neither proportionate nor what parents are consenting to.

### Guardian force-disconnect

```ts
rooms.post('/:roomId/eject/:profileId', requireAuth, requireGuardianOf(':profileId'),
  async (req, res) => {
    await livekit.removeParticipant(room.livekit_room, req.params.profileId)
    await db.guardianPermissions.update(req.params.profileId, { video_rooms: false })
    res.json({ ok: true })
  })
```

---

## 5.8 Recording & Egress

```ts
// Recording is opt-in, adult-only, and structurally cannot capture a minor.
async function startRecording(roomId: string, requestedBy: string) {
  const room = await db.rooms.get(roomId)
  if (room.type === 'bff') throw new Forbidden('recording_not_available_for_room_type')

  const participants = await livekit.listParticipants(room.livekit_room)
  const minors = participants.filter(p => JSON.parse(p.metadata ?? '{}').isMinor)

  // Explicit consent from every adult; guardians consent on behalf of minors —
  // and even then, minor TRACKS are excluded from the encode.
  await assertAllConsented(roomId, participants.map(p => p.identity))

  return livekit.startTrackCompositeEgress({
    roomName: room.livekit_room,
    // Only adult tracks reach the encoder. This is the enforcement point.
    audioTrackIds: adultTracks(participants, 'audio'),
    videoTrackIds: adultTracks(participants, 'video'),
    file: { filepath: `recordings/${roomId}/{time}.mp4`, s3: S3_CONFIG },
  }).then(async (egress) => {
    await db.rooms.update(roomId, { recording_egress_id: egress.egressId, recording_started_at: new Date() })
    await broadcastBanner(roomId, 'recording_started')   // persistent red banner
    if (minors.length) await notifyGuardians(minors, 'recording_started_minors_excluded')
    return egress
  })
}
```

**Retention:** recordings auto-delete after 30 days unless explicitly saved to the
Memory Gallery. Glam-room recaps in the gallery are **stills only**, generated with
all-party consent, never room video (`architecture.md` M10).

---

## 5.9 Reliability & Quality

| Concern | Handling |
|---|---|
| Weak network | `adaptiveStream` + simulcast; audio prioritized over video |
| Reconnect | Automatic, 3 attempts w/ backoff; Glam Panel state re-fetched on rejoin |
| Host drops | Host migrates to the next adult; room persists 5 min (`emptyTimeout`) |
| Echo | AEC/NS/AGC on; headphone prompt when two devices are in one room |
| Battery | 24 fps cap, 720p max publish; thermal throttle → 360p |
| Region | LiveKit Cloud regional routing; TURN over 443 for restrictive networks |
| Capacity | Lesson rooms > 50 switch to SFU broadcast mode (creator publishes, attendees subscribe) |

**Quotas** (`stripe-flow.md`): metered per profile into
`usage_counters(metric='room_minutes')` on participant disconnect, charged to the
**guardian's** tier — children never hold their own entitlement.

---

## 5.10 Room Endpoints Summary

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/video/token` | **Mint a scoped join token.** Body `{ roomId }` or `{ type, name }` to create-and-join. Re-runs the full safety check. |
| `GET` | `/api/video/rooms` | List my rooms |
| `POST` | `/api/video/rooms` | Create room (type-gated) |
| `GET`/`POST` | `/api/video/rooms/:id/glam` | Shared Glam Panel state |
| `POST` | `/api/video/rooms/:id/panic` | **Panic exit** — always free, always allowed |
| `POST` | `/api/video/rooms/:id/report` | Report a participant |
| `POST` | `/api/video/rooms/:id/eject/:profileId` | Host/guardian removal |
| `POST` | `/api/video/rooms/:id/recording` | Start (adult tracks only) |
| `POST` | `/api/webhooks/livekit` | Participant joined/left, egress status, room finished |

### LiveKit webhook → minute metering + audit

```ts
webhooks.post('/livekit', verifyLiveKitSignature, async (req, res) => {
  const event = req.body as WebhookEvent
  switch (event.event) {
    case 'participant_joined':
      await db.roomParticipants.upsert({ /* … */ joined_at: new Date() })
      await auditLog('room.join', event)                    // guardian-visible
      break
    case 'participant_left': {
      const p = await db.roomParticipants.close(event.room!.name, event.participant!.identity)
      await meterRoomMinutes(p)                             // → usage_counters
      break
    }
    case 'room_finished':
      await db.rooms.update(byLivekitName(event.room!.name), { ended_at: new Date() })
      break
  }
  res.json({ ok: true })
})
```

---

*Continue to `api-reference.md`.*
