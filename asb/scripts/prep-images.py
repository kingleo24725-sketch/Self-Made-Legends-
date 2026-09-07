#!/usr/bin/env python3
"""
Prepare Rose's crest artwork for the site.

Drop the original images (the ones with the "Made with AI" badge) into asb/assets-raw/,
then run:  python3 scripts/prep-images.py

For every image it writes to asb/public/img/:
  <name>.jpg          badge removed, full black background (page backgrounds)
  <name>-cutout.png   badge removed AND the black outside the shield made transparent (logo use)

The badge is found automatically: a bright white pill in the top strip of the image,
sitting on pure black. It is painted over with the surrounding black, so nothing of
the crest itself is touched.
"""
import sys
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "assets-raw"
OUT = ROOT / "public" / "img"
OUT.mkdir(parents=True, exist_ok=True)


def find_badge(img: Image.Image):
    """Return (left, top, right, bottom) of the bright badge in the top 12% of the image, or None."""
    w, h = img.size
    strip_h = max(1, int(h * 0.12))
    strip = img.crop((0, 0, w, strip_h)).convert("L")
    px = strip.load()
    xs, ys = [], []
    for y in range(strip_h):
        for x in range(w):
            if px[x, y] > 225:  # white pill; the gold border is much darker than this
                xs.append(x); ys.append(y)
    if len(xs) < 200:
        return None
    pad = 10
    return (max(0, min(xs) - pad), max(0, min(ys) - pad), min(w, max(xs) + pad), min(strip_h, max(ys) + pad))


def remove_badge(img: Image.Image) -> Image.Image:
    box = find_badge(img)
    out = img.convert("RGB")
    if not box:
        print("   no badge found, leaving image as is")
        return out
    # Sample the background just outside the badge so the patch matches exactly.
    l, t, r, b = box
    sample = out.crop((max(0, l - 25), t, l, b)).resize((1, 1), Image.BOX).getpixel((0, 0))
    ImageDraw.Draw(out).rectangle(box, fill=sample)
    print(f"   badge removed at {box}")
    return out


def cutout(img: Image.Image) -> Image.Image:
    """Make the black exterior (connected to the image edges) transparent; keep black inside the shield."""
    rgb = img.convert("RGB")
    w, h = rgb.size
    marker = (255, 0, 255)
    for corner in [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1), (w // 2, 0), (w // 2, h - 1), (0, h // 2), (w - 1, h // 2)]:
        if rgb.getpixel(corner) != marker:
            ImageDraw.floodfill(rgb, corner, marker, thresh=40)
    alpha = Image.new("L", (w, h), 255)
    apx, rpx = alpha.load(), rgb.load()
    for y in range(h):
        for x in range(w):
            if rpx[x, y] == marker:
                apx[x, y] = 0
    result = img.convert("RGBA")
    result.putalpha(alpha)
    return result.crop(alpha.getbbox())


def main():
    files = sorted(p for p in RAW.iterdir() if p.suffix.lower() in {".png", ".jpg", ".jpeg", ".webp"}) if RAW.exists() else []
    if not files:
        print(f"No images found in {RAW}. Drop the originals there and run again.")
        sys.exit(1)
    for path in files:
        print(f"-> {path.name}")
        img = Image.open(path)
        clean = remove_badge(img)
        name = path.stem.lower().replace(" ", "-")
        clean.save(OUT / f"{name}.jpg", quality=92)
        cutout(clean).save(OUT / f"{name}-cutout.png")
        print(f"   wrote img/{name}.jpg and img/{name}-cutout.png")


if __name__ == "__main__":
    main()
