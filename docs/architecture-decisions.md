# Architecture Decisions

> **BEAUTY BOND™ — A SELF-MADE LEGENDS LLC (SML) PRODUCT**
> © 2026 **Self-Made Legends LLC (SML)**. All rights reserved.
> Owner: **Self-Made Legends LLC (SML)** · Proprietary and confidential.

Each decision below states the choice, the reasoning, what was rejected, and the
cost we accepted. Where a decision is driven by child-safety law rather than
engineering taste, that is called out — those are the ones not to revisit casually.

---

## ADR-001 — Database: **PostgreSQL**

**Decision:** PostgreSQL 16, not MongoDB.

**Why:**

1. **The data is inherently relational.** A guardian has profiles; a profile has
   permissions, consents, progress, a shade profile, bond pairs, room participation,
   and a subscription that belongs to a *different* profile (the guardian's). Almost
   every safety question is a join: *"is this adult in this child's guardian's trusted
   circle?"* In Mongo that is either an application-side join or a denormalized copy
   that can drift. **A stale denormalized copy of a safety relationship is a child
   safety incident**, not a cache-invalidation bug.

2. **Constraints enforce safety at the last line of defense.** `minor_needs_guardian`
   and `bff_never_records` are `CHECK` constraints — verified in this repo to reject
   bad rows. A careless service-layer change cannot create an unparented child profile
   or a recordable teen room. Mongo's schema validation is weaker and easier to bypass.

3. **Row-level security.** The Healing Journal must be invisible to guardians for 13+
   profiles. Postgres RLS enforces that in the database, keyed off a per-request
   `app.profile_id`. There is no equivalent in Mongo.

4. **Transactions across tables are routine here.** Provisioning a child account writes
   `profiles` + `guardian_permissions` + `guardian_consents` atomically. Half of that
   committing is a broken safety state.

5. **Correct money.** Subscriptions, quotas, and entitlement audit want real
   transactions and exact numerics.

**Rejected — MongoDB:** flexible documents suit content that varies in shape
(lessons, glam presets, wireframe-ish CMS payloads). We keep that benefit by using
`jsonb` columns for exactly those fields (`lessons.steps`, `looks.layers`,
`rooms.glam_state`), which gives document flexibility *inside* a relational schema.

**Cost accepted:** migrations are a real step, and schema changes need care. Worth it.

---

## ADR-002 — Auth: **JWT (short-lived access + rotating refresh)**

**Decision:** Stateless JWT access tokens (15 min) with rotating refresh tokens
(30 days) in `expo-secure-store`. Not server-side sessions.

**Why:**

1. **Mobile clients have no cookie jar worth relying on.** React Native + a future web
   companion + potential third-party surfaces all speak `Authorization: Bearer` cleanly.
   Session cookies mean CORS and CSRF work for no gain here.
2. **The token carries `profileId`, not just `userId`.** One guardian device switches
   between their own profile and a child's. Encoding the *active profile* in the token
   makes every downstream gate — age band, guardian permission, entitlement — read from
   one trusted place.
3. **Horizontal scale without sticky sessions or a session store on the hot path.**

**The revocation problem, and how it's handled.** A stateless token cannot be revoked
mid-flight, which matters here more than in a normal app: a guardian revoking video
permission must actually eject the child. Two mitigations:

- **15-minute access tokens** bound the window.
- **The room token is the real control.** LiveKit tokens are 10-minute, single-room,
  and every refresh re-runs the *full* `canJoin()` check server-side. A revoked
  permission ejects the child at the next refresh, and `POST /panic` force-disconnects
  immediately via the LiveKit server API. **Safety enforcement does not depend on the
  JWT expiring.**
- Refresh tokens rotate on use, so a stolen refresh token is detectable.

**Rejected — server-side sessions:** simpler revocation, but adds a store lookup to
every request and does not solve the mid-call ejection problem anyway (that needs the
video SDK's server API regardless).

---

## ADR-003 — Video: **LiveKit Cloud**

**Decision:** LiveKit Cloud. Evaluated against Daily, Agora, and Twilio Video.

**Why LiveKit:**

1. **Server-side per-track control.** Recording must *structurally* exclude a minor's
   track — `startTrackCompositeEgress` takes explicit track IDs, so adult-only
   recording is enforced by the API shape rather than by remembering to filter. This is
   the single strongest reason.
2. **`removeParticipant` from the server** makes the panic button and guardian
   force-disconnect real, not advisory.
3. **Data channels** carry the Shared Glam Panel with no second realtime service.
4. **Open-source escape hatch.** LiveKit can be self-hosted. For a product handling
   children's video, not being permanently captive to one vendor's pricing or policy
   is a meaningful risk reduction.
5. Simulcast, dynacast, and adaptive stream are first-class, which matters for families
   on poor connections.

**Rejected:**

- **Twilio Video — disqualified.** Twilio announced end-of-life for Programmable Video
  (shut down for most customers in late 2024). Building on it now would be building on
  a discontinued product. Verify current status before reconsidering.
- **Agora** — strong global infrastructure and low-latency performance, genuinely a
  fine choice. Rejected on data-governance grounds: for a COPPA/GDPR-K product,
  simpler, more auditable data-residency and subprocessor answers matter, and the
  self-host option is not there.
- **Daily** — excellent DX and the closest runner-up; prebuilt UI would have saved
  frontend time. Rejected because we do not want their prebuilt UI (our room screen is
  custom and safety-specific), and LiveKit's per-track egress control is a better fit
  for the minor-exclusion requirement.

**Cost accepted:** more UI to build than Daily's prebuilt, and we own more of the
client integration.

---

## ADR-004 — AI Try-On: **provider abstraction, mock by default**

**Decision:** `services/mlProvider.js` defines the interface; a `mock` provider ships
for development and an `http` provider calls a real Vision/ML service.

**Why:** the interesting engineering is the *contract*, not the model — age
sanitization, the geometry lock, quota metering, retention. Those are fully implemented
and tested against the mock, so swapping in a real provider is one module.

**Safety property that survives the swap:** every provider must return
`deltaLandmarkPx`, and `aiService.render()` rejects any result above 0.5px. A provider
that alters facial geometry fails closed regardless of vendor.

**Guard:** `getProvider()` **throws if the mock is selected in production** — a mock
returning fake renders to real families is worse than an outage.

---

## ADR-005 — Backend framework: **Express**

**Decision:** Express 4, not Fastify.

**Why:** the requested structure (`api/ services/ controllers/ middleware/`) is the
conventional Express layout, ubiquitous middleware ordering semantics matter here
(the raw-body webhook route *must* precede `express.json()`, and the age gate *must*
precede the entitlement gate), and the team-familiarity argument is real for a product
where reviewers need to spot a safety-ordering mistake quickly.

**Rejected — Fastify:** measurably faster with better built-in schema validation. Not
chosen because throughput is not the constraint (this is a video/ML-bound product) and
Express's ubiquity aids auditability. Revisit if request throughput becomes a real
bottleneck — the controller/service split makes that migration mechanical.

---

## ADR-006 — Child-safe UI keys off **age band**, not mode

**Decision:** 56px tap targets, Nunito, simplified copy, and absent chat controls are
driven by `profile.ageBand === 'child'`, not by the selected mode.

**Why:** an earlier draft tied child-safe UI to a "Little Legend" mode. That was wrong:
a 9-year-old can select *any* mode, and would then have lost the larger targets and the
protections. Age band is the property that actually predicts who is holding the phone.

Modes now describe *relationships* (Dad + Daughter, Guardian + Daughter, Solo Girl…),
which is what they should have described all along. Guardian + Daughter Mode also
covers the families the original mode list missed — grandparents, aunts, foster and
chosen family.

---

## ADR-007 — Two independent gates, in a fixed order

**Decision:** `requireAgeBand` (compliance) always runs before `requireEntitlement`
(commercial). Age-restricted rejections return **403**, never 402.

**Why:** 402 means "pay to unlock." Returning it for an age lock would advertise that a
9-year-old's parent could buy access to Level 6 content. No tier, coupon, promo, or
admin flag overrides an age gate. A test walks the route table and fails the build if
the order is ever inverted.
