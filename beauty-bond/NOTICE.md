# NOTICE — Ownership, Copyright & Intellectual Property

```
════════════════════════════════════════════════════════════════════
                     B E A U T Y   B O N D ™
              A SELF-MADE LEGENDS LLC (SML) PRODUCT

        © 2026 Self-Made Legends LLC (SML). All rights reserved.
              PROPRIETARY AND CONFIDENTIAL — DO NOT DISTRIBUTE
════════════════════════════════════════════════════════════════════
```

---

## 1. Ownership

| Field | Value |
|---|---|
| **Product** | Beauty Bond™ (working title: *Dad + Daughter Beauty Bond*) |
| **Owner** | **Self-Made Legends LLC (SML)** |
| **Entity type** | Limited Liability Company |
| **Copyright holder** | Self-Made Legends LLC (SML) |
| **Copyright year** | 2026 |
| **Status** | Proprietary — internal specification |
| **Classification** | Confidential business information & trade secret |
| **Related SML product** | The Self-Made Legends Come Up (**separate product** — see §5) |

**Self-Made Legends LLC (SML) is the sole and exclusive owner** of all right, title,
and interest in and to Beauty Bond, including without limitation the product concept,
name, feature design, user experience, wireframes, information architecture, system
architecture, data models, API contracts, brand system, color palette, typography
selections, logo concepts, iconography, copy, voice guidelines, and every document in
this specification set.

---

## 2. Scope of This Notice

This notice covers every file in the `beauty-bond` repository:

- `README.md` — product overview and separation rules
- `NOTICE.md` — this file
- `LICENSE` — SML proprietary license
- `BOOTSTRAP.md` — repository extraction procedure
- `app/**` — React Native frontend source
- `backend/**` — Node.js API source
- `infra/**` — Docker, Kubernetes, Terraform, CI/CD
- `docs/architecture.md` — product definition, IA, module specs
- `docs/wireframes.md` — screen wireframes and annotations
- `docs/stripe-flow.md` — subscription and billing architecture
- `docs/ai-tryon.md` — AI try-on pipeline
- `docs/video-rooms.md` — live video architecture
- `docs/api-reference.md` — stack, schema, API surface
- `docs/branding.md` — brand and design system

…and every artifact derived from them: application source code, compiled binaries,
marketing sites, press kits, PDF exports, Bond Book keepsakes, design files, and
prototypes.

---

## 3. Required Attribution Stamp

**Every document, file, screen, export, and deliverable must carry the SML mark.**

### 3.1 Document header (Markdown)

```markdown
> **BEAUTY BOND™ — A SELF-MADE LEGENDS LLC (SML) PRODUCT**
> © 2026 **Self-Made Legends LLC (SML)**. All rights reserved.
> Owner: **Self-Made Legends LLC (SML)** · Proprietary and confidential.
> A standalone SML product — **not** part of The Self-Made Legends Come Up.
```

### 3.2 Source file header (TypeScript / JavaScript)

```ts
/**
 * Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 * Proprietary and confidential. Unauthorized copying, distribution, or use
 * of this file, via any medium, is strictly prohibited.
 */
```

### 3.3 In-app attribution

| Surface | Required text |
|---|---|
| Splash screen | `from Self-Made Legends` (below the wordmark) |
| Settings → About | `Beauty Bond™ v{version}` / `© 2026 Self-Made Legends LLC (SML)` |
| App Store / Play listing | Seller: **Self-Made Legends LLC** |
| Legal footer (web) | `© 2026 Self-Made Legends LLC (SML). All rights reserved.` |
| Bond Book export (print) | Back page: `Made with Beauty Bond™ · A Self-Made Legends LLC (SML) product` |
| Email footer | `Beauty Bond™ · Self-Made Legends LLC (SML)` |
| Design exports & prototypes | Footer mark per `docs/branding.md` §7.9 |

### 3.4 Statement descriptor

Card statements read **`SML BEAUTY BOND`** — deliberately distinct from any other SML
product descriptor.

---

## 4. Trademarks

### 4.1 SML marks (to file / maintain)

Owned by Self-Made Legends LLC (SML):

| Mark | Use | Class |
|---|---|---|
| `SELF-MADE LEGENDS` | House mark | 9, 41, 42 |
| `SML` | House abbreviation | 9, 41, 42 |
| `BEAUTY BOND` | Product name | 9, 41, 44 |
| `BOND METER` | Feature | 9, 41 |
| `DAD SCHOOL` | Feature | 9, 41 |
| `LITTLE LEGEND` | Mode | 9, 41 |
| `LETTERS FORWARD` | Feature | 9, 41, 45 |
| `BOND BOOK` | Product/keepsake | 16, 9 |
| `GLAM ROOMS` | Feature | 9, 38, 41 |

Use `™` on first prominent appearance in any document or screen until registration
issues, then `®`.

### 4.2 Third-party marks

Fenty Beauty, Rare Beauty, Huda Beauty, MAC, NARS, Pat McGrath Labs, Black Opal,
Juvia's Place, Uoma Beauty, Danessa Myricks, Mented, Beauty Bakerie, Milk Makeup,
e.l.f., Maybelline, L'Oréal, Charlotte Tilbury, Anastasia Beverly Hills, Tarte,
Glossier, Stripe, LiveKit, Apple, Google, and all other marks referenced are the
property of their respective owners.

**They appear solely as catalog-integration targets and shade-matching references.**
No affiliation, sponsorship, partnership, or endorsement by any of these companies is
claimed or implied. Any such relationship requires a separate executed agreement with
Self-Made Legends LLC (SML). Nominative fair use only: brand names may identify a
product a user owns or is matched to; brand logos may not be used in SML marketing
without written permission.

---

## 5. Product Separation Declaration

**Beauty Bond and The Self-Made Legends Come Up are two distinct products, both owned
by Self-Made Legends LLC (SML). They are not the same app and must never be merged,
co-branded as one, or presented as versions of each other.**

| | The Self-Made Legends Come Up | Beauty Bond |
|---|---|---|
| Owner | Self-Made Legends LLC (SML) | Self-Made Legends LLC (SML) |
| Product | Simulated trading game | Family beauty-bonding platform |
| Audience | Adults | Families with children |
| Economy | SML Bucks, loot boxes, leaderboards | **None** |
| Codebase | Separate | Separate |
| Database & accounts | Separate | Separate |
| Stripe account | **Shared SML account** | **Shared SML account** (isolated in code) |
| Repository | `Self-Made-Legends-` | `beauty-bond` (separate) |
| Brand system | Separate | Separate |
| Regulatory regime | Adult game | COPPA / GDPR-K |

Shared: **the SML house mark and the SML Stripe account.** Nothing else crosses
between them — no code, no user accounts, no currency, no application data, no SSO, no
in-app cross-promotion to minors. The shared Stripe account is a billing convenience
for the owner (one payout, one dashboard); it grants no entitlement, identity, or data
path between the two products, and the isolation that guarantees this is specified in
`docs/stripe-flow.md` §3.2.

---

## 6. Confidentiality

This specification is **confidential business information and a trade secret** of
Self-Made Legends LLC (SML). It is disclosed only to employees, contractors, and
vendors who have executed a written non-disclosure agreement with SML and who need it
to perform authorized work.

Recipients may not: publish it, post it publicly, share it outside SML, use it to
build a competing product, or train any machine-learning model on it.

All work produced under this specification by employees or contractors is **work made
for hire** and, where that doctrine does not apply, is hereby assigned in full to
Self-Made Legends LLC (SML). Contractor agreements must include an explicit IP
assignment clause naming SML before any work begins.

---

## 7. Contact

**Self-Made Legends LLC (SML)**
Product: Beauty Bond™
Owner contact: leobrown24725@yahoo.com

---

```
© 2026 Self-Made Legends LLC (SML). All rights reserved.
Beauty Bond™ is a trademark of Self-Made Legends LLC.
```
