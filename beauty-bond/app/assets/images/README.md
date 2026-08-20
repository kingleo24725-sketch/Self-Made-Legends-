# Cover art & generated assets

> **DAD + DAUGHTER BEAUTY BOND™ — A SELF-MADE LEGENDS LLC (SML) PRODUCT**
> © 2026 **Self-Made Legends LLC (SML)**. All rights reserved.
> Proprietary and confidential.

## One source file drives everything

```
cover.png          ← the ONLY image you edit. 1024×1536 (2:3), PNG.
generated/         ← produced by npm run assets:generate. Do not edit by hand.
```

## Provenance

`cover.png` is the official Dad + Daughter Beauty Bond™ cover artwork, supplied
by Self-Made Legends LLC at native 1024×1536.

**One edit was made to the supplied file:** the "Made with AI" badge in the
top-right corner was removed. It was replaced by cloning clean bokeh from lower
in the same image, colour-matched to the local gradient and grain-matched to the
surrounding canvas texture (σ ≈ 4.0), with feathering placed outside the badge
bounds so no part of the pill survives. Nothing else in the artwork was altered.

That removal matters for the store listing: a badge in the corner of a feature
graphic reads as an artifact rather than a design choice, and some marketplaces
have their own AI-disclosure placement rules. The unmodified original remains
the master — re-run the removal from it if the crop ever changes.

## Replacing the cover

```bash
cp new-cover.png app/assets/images/cover.png    # 1024×1536 or larger, 2:3
cd app
npm run assets:generate
npm run assets:verify:release                   # must exit 0
```

## Fonts

`app/assets/fonts/` carries the three faces from `docs/branding.md` §7.4 —
Fraunces (display), Inter (body), Nunito (child accounts). All SIL OFL, so they
embed in the app and in Bond Book print exports without licensing cost.

## Why the splash is `contain`, not `cover`

The art is 2:3. Real devices are not:

| Device | Aspect | Full-bleed `cover` would lose |
|---|---|---|
| iPhone 15 Pro Max | 0.461 | **30.8% of width** — both ends of the wordmark |
| Pixel 8 Pro | 0.449 | **32.6% of width** |
| iPad Pro 12.9 portrait | 0.750 | 11.1% of height — the SML credit line |
| iPad 10.9 landscape | 1.439 | **53.7% of height** — the faces |

So the splash **contains** the artwork on a matched background. The faces, the
wordmark, and the SML credit line are always fully visible, on every device and
both orientations.

If a full-bleed splash is a hard requirement, `generated/splash-*-{portrait,landscape}.png`
are pre-built by **edge-extending** the art — a blurred, over-scaled copy fills
the surrounding space and the untouched cover sits on top, so nothing is cropped.
Use `FullBleedSplash` from `screens/SplashScreen.js`. Costs ~850 KB–1.4 MB per
variant in the bundle.

## Generated inventory

| Path | Size | Use |
|---|---|---|
| `generated/splash.png` | 1024×1536 | Native + JS splash (contain) |
| `generated/icon.png` | 1024×1024 | App icon |
| `generated/adaptive-icon-foreground.png` | 1024×1024 | Android adaptive icon |
| `generated/android/{mdpi…xxxhdpi}/splash.png` | 320→1280 wide | Android densities |
| `generated/ios/splash@{1,2,3}x.png` | 414→1242 wide | iOS scales |
| `generated/splash-phone-portrait.png` | 1284×2778 | Full-bleed phone |
| `generated/splash-phone-landscape.png` | 2778×1284 | Full-bleed phone landscape |
| `generated/splash-tablet-portrait.png` | 2048×2732 | Full-bleed tablet |
| `generated/splash-tablet-landscape.png` | 2732×2048 | Full-bleed tablet landscape |
| `generated/store/ios-app-icon.png` | 1024×1024 | App Store listing icon |
| `generated/store/play-icon.png` | 512×512 | Play Store listing icon |
| `generated/store/play-feature-graphic.png` | 1024×500 | Play feature graphic |
| `generated/store/ios-screenshot-6.7.png` | 1290×2796 | iPhone 6.7" screenshot |
| `generated/store/ios-screenshot-6.5.png` | 1242×2688 | iPhone 6.5" screenshot |
| `generated/store/ipad-screenshot-12.9.png` | 2048×2732 | iPad 12.9" screenshot |
| `generated/store/play-screenshot-phone.png` | 1080×1920 | Play phone screenshot |

## Icons crop to the faces, not the cover

`generated/icon.png` and the Android adaptive foreground crop to `FACE_BOX` in
`generate-splash-assets.py` — the two faces, with the wordmark excluded. At 60px
neither platform renders that text legibly, and a clipped half-word reads as a
mistake. The adaptive foreground is additionally scaled into the inner 64% with
transparent padding, because a launcher may mask it to a circle, a squircle, or
a rounded square.

## One thing to check before submitting

**Apple discourages text in launch screens** because they cannot be localised
and can make the launch-to-first-screen transition feel abrupt. The wordmark is
part of this artwork. It will pass review, but if the transition feels jarring,
switch the native splash to the icon on `#E9B78E` and keep the full cover for
the JS splash only.

## Colour

`#E9B78E` — sampled from the artwork's warm bokeh edge. Set identically in
`app.json` (`expo.splash.backgroundColor`) and `screens/SplashScreen.js`
(`SPLASH_BG`). `npm run assets:verify` **fails if they drift**, because a
mismatch shows as a colour flash at the native-to-JS handoff.
