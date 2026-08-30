# NOTICE — Ownership, Copyright & Intellectual Property

```
════════════════════════════════════════════════════════════════════
       D A D   +   D A U G H T E R   B E A U T Y   B O N D ™
              A SELF-MADE LEGENDS LLC (SML) PRODUCT

        © 2026 Self-Made Legends LLC (SML). All rights reserved.
        PROPRIETARY AND CONFIDENTIAL — DO NOT DISTRIBUTE
        No license granted except by written agreement — see LICENSE
════════════════════════════════════════════════════════════════════
```

---

## 1. Ownership

| Field | Value |
|---|---|
| **Product** | **Dad + Daughter Beauty Bond™** |
| **Owner** | **Self-Made Legends LLC (SML)** |
| **Entity type** | Limited Liability Company |
| **Copyright holder** | Self-Made Legends LLC (SML) |
| **Copyright year** | 2026 |
| **Status** | Proprietary — confidential, not for distribution |
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

This notice covers every file in the `dads-daughters-beauty-bond` repository:

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
> **DAD + DAUGHTER BEAUTY BOND™ — A SELF-MADE LEGENDS LLC (SML) PRODUCT**
> © 2026 **Self-Made Legends LLC (SML)**. All rights reserved.
> Owner: **Self-Made Legends LLC (SML)** · Proprietary and confidential.
> A standalone SML product — **not** part of The Self-Made Legends Come Up.
```

### 3.2 Source file header (TypeScript / JavaScript)

```ts
/**
 * Dad + Daughter Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 * Proprietary and confidential. Unauthorized copying, distribution,
 * or use of this file, via any medium, is strictly prohibited.
 */
```

### 3.3 In-app attribution

| Surface | Required text |
|---|---|
| Splash screen | `Dad + Daughter Beauty Bond™` / `from Self-Made Legends` |
| Settings → About | `Dad + Daughter Beauty Bond™ v{version}` / `© 2026 Self-Made Legends LLC (SML)` |
| App Store / Play listing | Seller: **Self-Made Legends LLC** |
| Legal footer (web) | `© 2026 Self-Made Legends LLC (SML). All rights reserved.` |
| Bond Book export (print) | Back page: `Made with Dad + Daughter Beauty Bond™ · A Self-Made Legends LLC (SML) product` |
| Email footer | `Dad + Daughter Beauty Bond™ · Self-Made Legends LLC (SML)` |
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
| `DAD + DAUGHTER BEAUTY BOND` | Product name | 9, 41, 44 |
| `BEAUTY BOND` | Short mark | 9, 41, 44 |
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
| Repository | `Self-Made-Legends-` | `dads-daughters-beauty-bond` (separate) |
| Brand system | Separate | Separate |
| Regulatory regime | Adult game | COPPA / GDPR-K |

Shared: **the SML house mark and the SML Stripe account.** Nothing else crosses
between them — no code, no user accounts, no currency, no application data, no SSO, no
in-app cross-promotion to minors. The shared Stripe account is a billing convenience
for the owner (one payout, one dashboard); it grants no entitlement, identity, or data
path between the two products, and the isolation that guarantees this is specified in
`docs/stripe-flow.md` §3.2.

---

## 6. Confidentiality & License

This repository is **proprietary and confidential**. See [`LICENSE`](LICENSE)
for the full terms.

**No license is granted** to any person or entity except by a separate written
agreement signed by an authorized representative of Self-Made Legends LLC.
Possession of a copy conveys no rights.

### Restrictions

Without SML's prior written permission, no person may copy, modify, publish,
distribute, sublicense, sell, reverse engineer, or create derivative works from
this Software; use it to build a competing product; **use it to train, fine-tune,
or evaluate any machine-learning model**; or disclose it to any third party.

### Authorized use

Employees, contractors, and vendors who have executed a written non-disclosure
agreement with SML may use the Software solely to perform work expressly
authorized by SML, for the duration of that authorization. Confidentiality
obligations survive the end of any engagement.

### Trade secret status

The Software is confidential business information and a trade secret of
Self-Made Legends LLC. That status depends on it actually being kept
confidential — public disclosure forfeits it permanently and cannot be undone.
Practical consequences:

- Repository visibility stays **private**.
- Collaborators are added only after an NDA is executed.
- Secret scanning and push protection stay **on**.
- No snippets in public issues, forums, gists, or pastebins.
- No pasting into third-party tools that retain or train on submitted data.

### Contributions

All contributions are works made for hire owned by SML. Where that doctrine does
not apply, contributors irrevocably assign their contributions to Self-Made
Legends LLC. Contractor and employment agreements must carry an explicit IP
assignment clause naming SML **before any work begins**.

### Child-safety obligation

This repository implements protections for minors (`docs/architecture.md` §1.5).
This license grants no permission to remove them. Any authorized deployment to
real families remains responsible for its own COPPA / GDPR-K / AADC compliance.

## 7. Contact

**Self-Made Legends LLC (SML)**
Product: Dad + Daughter Beauty Bond™
Owner contact: leobrown24725@yahoo.com

---

```
© 2026 Self-Made Legends LLC (SML). All rights reserved.
Dad + Daughter Beauty Bond™ is a trademark of Self-Made Legends LLC.
```
