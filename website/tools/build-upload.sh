#!/usr/bin/env bash
#
# Self-Made Legends — build the InterServer upload bundle.
# Copyright (c) 2026 Self-Made Legends LLC. All Rights Reserved.
#
# Usage:  bash website/tools/build-upload.sh
# Writes: docs/selfmadelegendsz-upload.zip
#
# ─────────────────────────────────────────────────────────────────────────
#  The one rule this script exists to enforce:
#
#      index.html MUST be at the ROOT of the archive.
#
#  If the zip contains website/index.html instead, the host's File Manager
#  extracts a folder called "website" into public_html, and every page on
#  the site 404s because there is nothing at the address people visit.
#  That single mistake is the most common way a correct site goes dark, so
#  the script checks for it at the end and refuses to leave a bad archive
#  in place.
# ─────────────────────────────────────────────────────────────────────────

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SRC="$ROOT/website"
OUT="$ROOT/docs/selfmadelegendsz-upload.zip"

cd "$SRC"

# ── Stamp the build so "is the new version live?" is one URL, not a guess ──
#
# Hard-refreshing is unreliable advice; caches lie and people are told to
# clear them when nothing was wrong. A stamped file answers the question
# outright: load selfmadelegendsz.com/version.txt and read the date.
COMMIT="$(git -C "$ROOT" rev-parse --short HEAD 2>/dev/null || echo unknown)"
BUILT="$(date -u '+%Y-%m-%d %H:%M UTC')"
cat > "$SRC/version.txt" <<EOF
Self-Made Legends — selfmadelegendsz.com
build $COMMIT
uploaded from a bundle built $BUILT

If this date is older than the change you are looking for, the upload did
not take. Re-upload; it is not your browser cache.
EOF

rm -f "$OUT"
mkdir -p "$(dirname "$OUT")"

# tools/ is the build kit. It is not part of the website and must never be
# served — it would put source and intent on a public URL for no benefit.
zip -r -q "$OUT" . \
  -x 'tools/*' \
  -x '.DS_Store' -x '*/.DS_Store' \
  -x '__MACOSX/*'

# ── Verify, out loud ──────────────────────────────────────────────────────
if ! unzip -l "$OUT" | awk '{print $4}' | grep -qx 'index.html'; then
  echo "  ! index.html is NOT at the archive root. Refusing this bundle." >&2
  rm -f "$OUT"
  exit 2
fi

if unzip -l "$OUT" | awk '{print $4}' | grep -q '^tools/'; then
  echo "  ! tools/ leaked into the bundle. Refusing this bundle." >&2
  rm -f "$OUT"
  exit 2
fi

# The data directory holds collected email addresses. Without its .htaccess
# anyone can download the list by typing the path.
if ! unzip -l "$OUT" | awk '{print $4}' | grep -qx 'data/.htaccess'; then
  echo "  ! data/.htaccess is missing — the signup list would be public." >&2
  rm -f "$OUT"
  exit 2
fi

FILES=$(unzip -l "$OUT" | tail -1 | awk '{print $2}')
SIZE=$(du -h "$OUT" | cut -f1)
echo "  OK  $OUT"
echo "      $FILES files, $SIZE, build $COMMIT"
echo "      index.html at root, tools/ excluded, data/.htaccess present"
