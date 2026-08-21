# Assets

> Dads & Daughters Beauty Bond™ — © 2026 Self-Made Legends LLC (SML).
> All rights reserved. Proprietary and confidential.

| Folder | Contents |
|---|---|
| `icons/` | UI icons — Lucide base, 2px stroke, rounded caps, 24px grid. Beauty-specific icons (brush types, shade drop, bond link) drawn bespoke. |
| `illustrations/` | Empty-state and onboarding art. **Real families, real skin texture, unretouched.** Every cultural collection ships photography of that heritage — casting is contractual, not aspirational (`docs/branding.md` §7.5). |
| `fonts/` | Fraunces (display), Inter (body), Nunito (child accounts) — bundled, SIL OFL. |

## Bundled fonts

```
fonts/Fraunces.ttf     variable, SOFT/WONK/opsz/wght
fonts/Inter.ttf        variable, opsz/wght
fonts/Nunito.ttf       variable, wght
```

Load them with `expo-font` before the first render so the opening frame is not
in a fallback face.

## Rules

- No retouched or face-tuned skin in any asset, ever (`docs/branding.md` §7.10).
- Hands in frame wherever possible — this is a tactile product about people
  touching each other's faces.
- Decorative art is `aria-hidden`; anything conveying meaning needs a label.
