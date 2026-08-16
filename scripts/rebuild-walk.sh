#!/usr/bin/env bash
#
# Rebuild the hero walkthrough from a new clip, end to end.
#
#   scripts/rebuild-walk.sh <source-clip> <start-seconds>
#   scripts/rebuild-walk.sh ~/Downloads/walk2.mp4 6.5
#
# Does everything: copies the clip in, draws it, encodes both cuts, makes the
# poster, and re-measures the camera track. The one thing it will not do for you
# is re-cut the BEATS times in src/components/CineHero.jsx — it prints what it
# knows at the end so you can.
#
# START is the reason this script exists. It has to be identical in the encode
# and in the track or the copy will be pinned to a shot the page never shows,
# and it used to be hardcoded in two files. Here it is one argument.
#
# ffmpeg and ffprobe come from PATH, or set FFMPEG= / FFPROBE=.
set -euo pipefail

SRC_IN=${1:-}
START=${2:-}
FF=${FFMPEG:-ffmpeg}
FP=${FFPROBE:-ffprobe}

if [ -z "$SRC_IN" ] || [ -z "$START" ]; then
  sed -n '3,18p' "$0" | sed 's/^# \{0,1\}//'
  exit 1
fi
[ -f "$SRC_IN" ] || { echo "no such file: $SRC_IN" >&2; exit 1; }
command -v "$FF" >/dev/null || { echo "ffmpeg not found (set FFMPEG=)" >&2; exit 1; }
command -v "$FP" >/dev/null || { echo "ffprobe not found (set FFPROBE=)" >&2; exit 1; }

cd "$(dirname "$0")/.."

# ---- the source ----
if [ "$(readlink -f "$SRC_IN")" != "$(readlink -f media-src/hero.mp4)" ]; then
  mkdir -p media-src
  cp "$SRC_IN" media-src/hero.mp4
  echo "copied $SRC_IN -> media-src/hero.mp4"
fi
SRC=media-src/hero.mp4

SRC_FPS=$($FP -v error -select_streams v:0 -show_entries stream=r_frame_rate -of csv=p=0 "$SRC" | awk -F/ '{printf "%.0f", $1/($2==""?1:$2)}')
SRC_DUR=$($FP -v error -show_entries format=duration -of csv=p=0 "$SRC")
echo "source: ${SRC_FPS}fps, ${SRC_DUR}s"

# The page plays 60. If the camera already shot 60 there is nothing to invent
# and interpolating would only soften real frames; below that, minterpolate
# synthesises the in-betweens. See README, "Frame rate".
if [ "$SRC_FPS" -ge 60 ]; then
  RATE_STEP="fps=60"
  echo "source is 60fps or better — no interpolation needed"
else
  RATE_STEP="minterpolate=fps=60:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1"
  echo "interpolating ${SRC_FPS} -> 60fps (this is most of the encode time)"
fi

# ---- how big, and how good ----
# The stage is `object-fit: cover` over the whole viewport, so the file is
# stretched to the window's width no matter what it is. At 1024 that was a 2x
# upscale on an ordinary laptop and it looked it. 1920 lands 1:1 on the common
# desktop and is a soft 1.33x on a 2560 panel, which is the forgiving direction.
# The phone cut is 1280 because a 400px-wide phone at DPR 3 is asking for 1200.
OUT_W=${OUT_W:-1920}
SM_W=${SM_W:-1280}
# -tune animation is not decoration: it is built for exactly this kind of
# flat-region, hard-edged picture, and it buys most of the file back. At 1920
# crf 26 tuned is indistinguishable from crf 19 untuned on a 2x blowup of the
# sign, at a third of the bytes.
CRF=${CRF:-26}
SM_CRF=${SM_CRF:-29}

# ---- the drawing ----
# sigmaS and the blur sigmas below are in PIXELS, so they do not mean the same
# thing at 1920 that they meant at 1024. They are scaled up to hold the flat-
# region look, but deliberately under-scaled: covering slightly less picture
# than before is what lets the brick coursing and the window frames survive
# instead of melting into the wall.
FILL="bilateral=sigmaS=40:sigmaR=0.20,bilateral=sigmaS=26:sigmaR=0.13,\
bilateral=sigmaS=16:sigmaR=0.09,\
format=yuv444p,gblur=sigma=10:planes=6,\
colorbalance=rm=-0.06:bm=0.08:rh=-0.03:bh=0.04,\
lutyuv=y='clip(round(val/28)*28,20,240)',gblur=sigma=0.6:planes=1,\
vibrance=intensity=-0.3,\
colorlevels=romin=0.07:gomin=0.07:bomin=0.07,\
eq=saturation=1.55:contrast=1.05:brightness=0.015,format=gbrp"

# One erosion, where there used to be three. Erosion grows the black line, and
# three of them at 1024 was what turned every outline into a chain of blobs and
# made the sign unreadable. At this width the detected edge is already a real
# line; one pass just gives it enough weight to read as drawn rather than wiry.
INK="bilateral=sigmaS=10:sigmaR=0.06,format=yuv444p,extractplanes=y+u+v[ey][eu][ev];\
[ey]gblur=sigma=0.6,edgedetect=low=0.02:high=0.06[ly];\
[eu]gblur=sigma=0.6,edgedetect=low=0.016:high=0.045[lu];\
[ev]gblur=sigma=0.6,edgedetect=low=0.016:high=0.045[lv];\
[ly][lu]blend=all_mode=lighten[l1];\
[l1][lv]blend=all_mode=lighten,negate,erosion,format=gbrp[ink]"

# hqdn3d was 14:20:20:26, which is a lot of denoise for a 4K source and took
# the detail with the grain. Some is still wanted — it runs ahead of the edge
# detect, and grain the detector can see becomes ink it draws.
DRAW="${RATE_STEP},scale=${OUT_W}:-2:flags=lanczos,hqdn3d=6:8:8:10,split[forfill][foredge];\
[forfill]${FILL}[c];\
[foredge]${INK};\
[c][ink]blend=all_mode=multiply:all_opacity=1.0,format=yuv420p"

mkdir -p public/media
echo "drawing at ${OUT_W}w (crf ${CRF}) and ${SM_W}w (crf ${SM_CRF})..."
# The phone cut is a downscale of the DRAWN picture, not a second drawing, so
# both cuts are the same artwork and the ink thins with the frame rather than
# being redrawn at a size it was never tuned for.
# GOP is 30, down from 60: scrolling back up is the one move that forces a real
# seek, and a half-second keyframe interval halves what has to be decoded to
# satisfy it.
$FF -y -v warning -stats -ss "$START" -i "$SRC" \
  -filter_complex "[0:v]${DRAW},split[big][small];[small]scale=${SM_W}:-2:flags=lanczos[sm]" \
  -map "[big]" -an -c:v libx264 -preset slow -tune animation -crf "$CRF" \
    -profile:v high -g 30 -keyint_min 30 \
    -sc_threshold 0 -pix_fmt yuv420p -movflags +faststart public/media/walk.mp4 \
  -map "[sm]" -an -c:v libx264 -preset slow -tune animation -crf "$SM_CRF" \
    -profile:v high -g 30 -keyint_min 30 \
    -sc_threshold 0 -pix_fmt yuv420p -movflags +faststart public/media/walk-sm.mp4

$FF -y -v error -i public/media/walk.mp4 -frames:v 1 -q:v 2 public/media/walk-poster.jpg

# ---- the camera track, from the same START ----
echo "measuring the camera track..."
WALK_START=$START FFMPEG=$FF node scripts/track.mjs

DUR=$($FP -v error -show_entries format=duration -of csv=p=0 public/media/walk.mp4)
echo
echo "done. clip is ${DUR}s"
ls -la public/media/
echo
echo "Left to do by hand: the BEATS times in src/components/CineHero.jsx are"
echo "seconds into THIS clip, and the old ones point at the old footage. Check"
echo "where one lands with:"
echo "    $FF -ss <seconds> -i public/media/walk.mp4 -frames:v 1 /tmp/beat.jpg"
