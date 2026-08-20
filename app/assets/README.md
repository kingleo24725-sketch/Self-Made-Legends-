# Assets

> Beauty Bond™ — © 2026 Self-Made Legends LLC (SML). All rights reserved.

| Folder | Contents |
|---|---|
| `icons/` | UI icons — Lucide base, 2px stroke, rounded caps, 24px grid. Beauty-specific icons (brush types, shade drop, bond link) drawn bespoke. |
| `illustrations/` | Empty-state and onboarding art. **Real families, real skin texture, unretouched.** Every cultural collection ships photography of that heritage — casting is contractual, not aspirational (`docs/branding.md` §7.5). |
| `fonts/` | Fraunces (display), Inter (body), Nunito (child accounts). All SIL OFL — embeddable in the app and in Bond Book print exports. |

## Font files to add

```
fonts/Fraunces-VariableFont.ttf
fonts/Inter-Regular.ttf
fonts/Inter-Medium.ttf
fonts/Inter-SemiBold.ttf
fonts/Nunito-SemiBold.ttf
fonts/Nunito-Bold.ttf
```

Load them in `App.js` with `expo-font` before rendering, so the first paint is not
in a fallback face.

## Rules

- No retouched or face-tuned skin in any asset, ever (`docs/branding.md` §7.10).
- Hands in frame wherever possible — this is a tactile product about people
  touching each other's faces.
- Decorative art is `aria-hidden`; anything conveying meaning needs a label.
