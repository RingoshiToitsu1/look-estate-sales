#!/usr/bin/env bash
# Rebuild the scroll-scrubbed frame sequence from the walkthrough video.
#
#   ./scripts/frames.sh            # uses media-src/hero.mp4
#   ./scripts/frames.sh clip.mp4   # or any other source
#
# The landing page does not play a video: CineHero.jsx draws these stills to a
# canvas at whatever rate the reader scrolls, cross-fading each frame into the
# next. Frames therefore need to be (a) numerous enough that the cross-fade has
# something to work with and (b) small enough that ~2 minutes of scrolling
# doesn't cost more than the video would have.
#
# The settings below land ~117 frames at ~46 KB each (≈5.4 MB total, against
# 6.4 MB for the mp4 it replaced). If you change FPS, update FRAME_COUNT in
# src/components/CineHero.jsx to match the number of files produced.
set -euo pipefail

SRC="${1:-media-src/hero.mp4}"
OUT="public/media/frames"
FPS=2.55        # stills per second of source footage
WIDTH=1120      # px; source is 1280 wide — this is the quality/weight trade
QUALITY=52      # libwebp quality

command -v ffmpeg >/dev/null || { echo "ffmpeg not found on PATH"; exit 1; }
[ -f "$SRC" ] || { echo "no source video at $SRC"; exit 1; }

rm -rf "$OUT"
mkdir -p "$OUT"

ffmpeg -v error -i "$SRC" \
  -vf "fps=$FPS,scale=$WIDTH:-2" \
  -c:v libwebp -quality "$QUALITY" -compression_level 6 -preset picture \
  "$OUT/f%03d.webp"

echo "$(ls "$OUT" | wc -l) frames -> $OUT ($(du -sh "$OUT" | cut -f1))"
echo "If the count changed, set FRAME_COUNT in src/components/CineHero.jsx."
