#!/usr/bin/env python3
"""
Dad + Daughter Beauty Bond™ — a Self-Made Legends LLC (SML) product.
Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
Licensed under the MIT License with SML attribution — see LICENSE.

Generates every splash, icon, and store-listing asset from ONE source file:

    app/assets/images/cover.png     (portrait, 2:3, >= 1024x1536)

Run:  python3 app/scripts/generate-splash-assets.py

WHY EDGE-EXTENSION, NOT CROPPING
--------------------------------
The cover is 2:3. Modern phones are ~9:19.5. Filling the screen with
`resizeMode: cover` would crop ~31% of the WIDTH on every current phone,
slicing both ends off the "Dad + Daughter Beauty Bond" wordmark, and 54% of
the HEIGHT on a landscape tablet.

So full-bleed variants are built by *extending* the artwork instead: a blurred,
scaled-up copy of the cover fills the target canvas, and the untouched cover is
composited on top at `contain` scale. The bokeh background continues naturally
past the artwork's edges and nothing is ever cut off.
"""
import sys, pathlib
from PIL import Image, ImageDraw, ImageFilter

ROOT = pathlib.Path(__file__).resolve().parents[2]
SRC = ROOT / 'app' / 'assets' / 'images' / 'cover.png'
OUT = ROOT / 'app' / 'assets' / 'images' / 'generated'

MIN_W, MIN_H = 1024, 1536
TARGET_AR = 2 / 3
AR_TOLERANCE = 0.02

# Flat fallback for the NATIVE splash, which renders before any JS and only
# supports a solid colour. Sampled from the cover's warm bokeh edge.
BRAND_BG = '#E9B78E'

ANDROID_SPLASH = {                      # density: width (dp-scaled px)
    'mdpi': 320, 'hdpi': 480, 'xhdpi': 640, 'xxhdpi': 960, 'xxxhdpi': 1280,
}

FULL_BLEED = [                          # name, w, h  — edge-extended, no crop
    ('splash-phone-portrait',   1284, 2778),
    ('splash-phone-landscape',  2778, 1284),
    ('splash-tablet-portrait',  2048, 2732),
    ('splash-tablet-landscape', 2732, 2048),
]

STORE = [
    ('store/ios-app-icon',            1024, 1024),   # App Store icon
    ('store/play-icon',                512,  512),   # Play Store icon
    ('store/play-feature-graphic',    1024,  500),   # Play feature graphic
    ('store/ios-screenshot-6.7',      1290, 2796),   # iPhone 6.7"
    ('store/ios-screenshot-6.5',      1242, 2688),   # iPhone 6.5"
    ('store/ipad-screenshot-12.9',    2048, 2732),   # iPad Pro 12.9"
    ('store/play-screenshot-phone',   1080, 1920),
]


def load_source() -> Image.Image:
    if not SRC.exists():
        sys.exit(f'ERROR: source not found: {SRC}\n'
                 f'Place the cover art there, then re-run.')
    img = Image.open(SRC).convert('RGBA')
    w, h = img.size
    if w < MIN_W or h < MIN_H:
        sys.exit(f'ERROR: cover is {w}x{h}; need at least {MIN_W}x{MIN_H}. '
                 f'Upscaling would soften the wordmark.')
    ar = w / h
    if abs(ar - TARGET_AR) > AR_TOLERANCE:
        print(f'WARNING: aspect {ar:.3f} is not 2:3 ({TARGET_AR:.3f}). '
              f'Generated art may sit off-centre.')
    return img


def edge_extend(src: Image.Image, tw: int, th: int) -> Image.Image:
    """Fill tw x th by blurring an over-scaled copy, then centre the original."""
    sw, sh = src.size

    # 1. Background: scale to COVER the target, blur heavily, so the bokeh
    #    continues past the artwork rather than showing a hard letterbox edge.
    cover_scale = max(tw / sw, th / sh) * 1.18
    bg = src.resize((max(1, int(sw * cover_scale)), max(1, int(sh * cover_scale))),
                    Image.LANCZOS)
    bg = bg.crop((
        (bg.width - tw) // 2, (bg.height - th) // 2,
        (bg.width - tw) // 2 + tw, (bg.height - th) // 2 + th,
    )).filter(ImageFilter.GaussianBlur(max(tw, th) // 28))

    # 2. Foreground: the untouched cover, CONTAIN-scaled. Nothing is cropped.
    contain = min(tw / sw, th / sh)
    fg = src.resize((max(1, int(sw * contain)), max(1, int(sh * contain))),
                    Image.LANCZOS)

    # 3. Feather the foreground's letterboxed edges so the join dissolves into
    #    the blurred background instead of showing a hard line. Only the edges
    #    that actually letterbox are feathered; the artwork interior is untouched.
    feather = max(8, int(min(tw, th) * 0.018))
    mask = Image.new('L', fg.size, 255)
    md = ImageDraw.Draw(mask)
    horizontal_gap = fg.width < tw
    vertical_gap = fg.height < th
    for i in range(feather):
        a = int(255 * (i / feather))
        if vertical_gap:
            md.line([(0, i), (fg.width, i)], fill=a)
            md.line([(0, fg.height - 1 - i), (fg.width, fg.height - 1 - i)], fill=a)
        if horizontal_gap:
            md.line([(i, 0), (i, fg.height)], fill=a)
            md.line([(fg.width - 1 - i, 0), (fg.width - 1 - i, fg.height)], fill=a)

    canvas = Image.new('RGBA', (tw, th))
    canvas.paste(bg, (0, 0))
    canvas.paste(fg, ((tw - fg.width) // 2, (th - fg.height) // 2), mask)
    return canvas


def centre_square(src: Image.Image, size: int) -> Image.Image:
    """Icons: crop the upper-centre, where the two faces are."""
    sw, sh = src.size
    side = min(sw, sh)
    top = int(sh * 0.06)                       # bias upward to keep faces
    top = min(top, sh - side)
    box = ((sw - side) // 2, top, (sw - side) // 2 + side, top + side)
    return src.crop(box).resize((size, size), Image.LANCZOS)


def save(img: Image.Image, rel: str):
    path = OUT / f'{rel}.png'
    path.parent.mkdir(parents=True, exist_ok=True)
    img.convert('RGB').save(path, 'PNG', optimize=True)
    kb = path.stat().st_size / 1024
    print(f'  {rel + ".png":42} {img.width:>5}x{img.height:<5} {kb:7.1f} KB')


def main():
    src = load_source()
    print(f'source: {SRC.relative_to(ROOT)}  {src.width}x{src.height}\n')

    if (SRC.parent / '.cover-is-placeholder').exists():
        print('!! .cover-is-placeholder present — this is NOT the real artwork.')
        print('!! Generating anyway so the pipeline is testable.\n')

    print('splash (contain-safe source):')
    save(src, 'splash')

    print('\nandroid densities:')
    for density, width in ANDROID_SPLASH.items():
        h = int(width / (src.width / src.height))
        save(src.resize((width, h), Image.LANCZOS), f'android/{density}/splash')

    print('\nios scales:')
    for scale in (1, 2, 3):
        w = 414 * scale
        h = int(w / (src.width / src.height))
        save(src.resize((w, h), Image.LANCZOS), f'ios/splash@{scale}x')

    print('\nfull-bleed (edge-extended, zero crop):')
    for name, w, h in FULL_BLEED:
        save(edge_extend(src, w, h), name)

    print('\nicons:')
    save(centre_square(src, 1024), 'icon')
    save(centre_square(src, 1024), 'adaptive-icon-foreground')

    print('\nstore listing:')
    for name, w, h in STORE:
        if w == h:
            save(centre_square(src, w), name)
        else:
            save(edge_extend(src, w, h), name)

    print(f'\nDone. Output: {OUT.relative_to(ROOT)}')


if __name__ == '__main__':
    main()
