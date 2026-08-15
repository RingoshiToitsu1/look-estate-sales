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

# ---- the drawing ----
FILL="bilateral=sigmaS=30:sigmaR=0.25,bilateral=sigmaS=20:sigmaR=0.16,\
bilateral=sigmaS=12:sigmaR=0.10,\
format=yuv444p,gblur=sigma=12:planes=6,\
colorbalance=rm=-0.06:bm=0.08:rh=-0.03:bh=0.04,\
lutyuv=y='clip(round(val/40)*40,24,236)',gblur=sigma=0.8:planes=1,\
vibrance=intensity=-0.4,\
colorlevels=romin=0.09:gomin=0.09:bomin=0.09,\
eq=saturation=1.6:contrast=1.03:brightness=0.02,format=gbrp"

INK="bilateral=sigmaS=8:sigmaR=0.07,format=yuv444p,extractplanes=y+u+v[ey][eu][ev];\
[ey]gblur=sigma=0.7,edgedetect=low=0.022:high=0.07[ly];\
[eu]gblur=sigma=0.7,edgedetect=low=0.018:high=0.05[lu];\
[ev]gblur=sigma=0.7,edgedetect=low=0.018:high=0.05[lv];\
[ly][lu]blend=all_mode=lighten[l1];\
[l1][lv]blend=all_mode=lighten,negate,erosion,erosion,erosion,format=gbrp[ink]"

DRAW="${RATE_STEP},scale=1024:-2,hqdn3d=14:20:20:26,split[forfill][foredge];\
[forfill]${FILL}[c];\
[foredge]${INK};\
[c][ink]blend=all_mode=multiply:all_opacity=1.0,format=yuv420p"

mkdir -p public/media
echo "drawing..."
$FF -y -v warning -stats -ss "$START" -i "$SRC" \
  -filter_complex "[0:v]${DRAW},split[big][small];[small]scale=640:-2[sm]" \
  -map "[big]" -an -c:v libx264 -preset slow -crf 34 -g 60 -keyint_min 60 \
    -sc_threshold 0 -pix_fmt yuv420p -movflags +faststart public/media/walk.mp4 \
  -map "[sm]" -an -c:v libx264 -preset slow -crf 35 -g 60 -keyint_min 60 \
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
