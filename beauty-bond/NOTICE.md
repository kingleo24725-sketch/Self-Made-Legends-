# NOTICE — Ownership, Copyright & Intellectual Property

```
════════════════════════════════════════════════════════════════════
        D A D   +   D A U G H T E R   B E A U T Y   B O N D ™
              A SELF-MADE LEGENDS LLC (SML) PRODUCT

        © 2026 Self-Made Legends LLC (SML). All rights reserved.
        MIT licensed with attribution — see LICENSE
        Trademarks are NOT licensed — see §4
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
| **Status** | Open source under MIT + attribution; marks reserved |
| **Classification** | Public source, SML-owned copyright and trademarks |
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
This is both an SML branding rule and, for redistributed copies, a condition of the
license (`LICENSE` §1).

### 3.1 Document header (Markdown)

```markdown
> **DAD + DAUGHTER BEAUTY BOND™ — A SELF-MADE LEGENDS LLC (SML) PRODUCT**
> © 2026 **Self-Made Legends LLC (SML)**. All rights reserved.
> Owner: **Self-Made Legends LLC (SML)** · MIT licensed with SML attribution.
> A standalone SML product — **not** part of The Self-Made Legends Come Up.
```

### 3.2 Source file header (TypeScript / JavaScript)

```ts
/**
 * Dad + Daughter Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 * Licensed under the MIT License with SML attribution — see LICENSE.
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
without written permission. **The MIT license conveys no rights to these marks.**

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

## 6. License

The **code and documentation** in this repository are licensed under the **MIT
License with an SML attribution requirement** — see [`LICENSE`](LICENSE).

**What you may do:** use, copy, modify, merge, publish, distribute, sublicense,
and sell copies, including commercially, provided you keep the copyright notice
and display the attribution in any user-facing About/Credits screen.

**What you may not do:** use SML's names, logos, or product marks (§4.1), imply
endorsement by or affiliation with Self-Made Legends LLC, or ship a derivative
under the Dad + Daughter Beauty Bond name. **The MIT license covers copyright,
not trademarks.** A fork must carry its own product name.

> **Deliberate choice, worth understanding.** MIT is permissive: anyone may fork
> this and build a competing product, and SML cannot prevent that. What SML
> retains is the *brand* — the name, the marks, and the goodwill attached to
> them. If the intent is instead to keep the source private and prevent
> competing use, MIT is the wrong instrument and this section should be replaced
> with a proprietary license before any public release.

### Contributions

Contributions are accepted under the same MIT terms. Work produced by SML
employees or contractors under an employment or contractor agreement remains
work made for hire owned by Self-Made Legends LLC; where that doctrine does not
apply, contributors assign their contributions to SML. Contractor agreements
should include an explicit IP assignment clause naming SML.

### Child-safety obligation

This repository implements protections for minors (§ see `docs/architecture.md`
§1.5). The license permits removing them; **the law may not.** Anyone deploying
this software or a derivative to real families is responsible for their own
COPPA / GDPR-K / AADC compliance. Removing these protections while keeping the
attribution misrepresents the original work.

## 7. Contact

**Self-Made Legends LLC (SML)**
Product: Dad + Daughter Beauty Bond™
Owner contact: leobrown24725@yahoo.com

---

```
© 2026 Self-Made Legends LLC (SML). All rights reserved.
Dad + Daughter Beauty Bond™ is a trademark of Self-Made Legends LLC.
```
