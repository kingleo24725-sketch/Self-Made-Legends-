# Cover art & generated assets

> **DAD + DAUGHTER BEAUTY BOND™ — A SELF-MADE LEGENDS LLC (SML) PRODUCT**
> © 2026 **Self-Made Legends LLC (SML)**. All rights reserved.
> Proprietary and confidential.

## One source file drives everything

```
cover.png          ← the ONLY file you edit. 1024×1536 (2:3), PNG.
generated/         ← produced by npm run assets:generate. Do not edit by hand.
```

## Replacing the placeholder

`cover.png` is currently a **generated placeholder**, and
`.cover-is-placeholder` marks it as such. CI fails the release build while that
marker exists.

```bash
# 1. Drop the real artwork in, at 1024×1536 or larger, 2:3 aspect
cp ~/Downloads/beauty-bond-cover.png app/assets/images/cover.png

# 2. Clear the marker
rm app/assets/images/.cover-is-placeholder

# 3. Regenerate and verify
cd app
npm run assets:generate
npm run assets:verify:release      # must exit 0
```

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

## Two things to check before submitting

1. **The "Made with AI" badge is baked into the artwork.** Fine for a splash,
   but review it for the store listing — some marketplaces have AI-disclosure
   rules, and a badge in the corner of a feature graphic reads as an artifact
   rather than a design choice. Consider a badge-free master for store assets.

2. **Apple discourages text in launch screens** because they cannot be
   localised and can make the launch-to-first-screen transition feel abrupt.
   The wordmark is baked into this art. It will pass review, but if the
   transition feels jarring, switch the native splash to the icon on
   `#E9B78E` and keep the full cover for the JS splash only.

## Colour

`#E9B78E` — sampled from the artwork's warm bokeh edge. Set identically in
`app.json` (`expo.splash.backgroundColor`) and `screens/SplashScreen.js`
(`SPLASH_BG`). `npm run assets:verify` **fails if they drift**, because a
mismatch shows as a colour flash at the native-to-JS handoff.
