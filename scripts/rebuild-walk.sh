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

# ---- stabilisation ----
# The clip is shot walking, so every footfall is in it. libvidstab measures the
# camera's real path in one pass and re-renders it along a smoothed version of
# that path in a second, which keeps the walk toward the house and drops the
# bounce that came with it.
#
# It renders to an intermediate file rather than running inline, because the
# drawing is not the only thing that has to see these frames: track.mjs measures
# the camera path for the copy, and it has to measure the path the page actually
# plays. Two consumers of one filter string, kept in sync by hand, is the same
# trap START used to be. One file, both read it.
#
# STAB_W is above OUT_W on purpose. Stabilising costs picture: the frame is
# zoomed in far enough that no shot swings a border into view. Doing that at
# 2560 and delivering 1920 pays for the crop out of headroom that was going to
# be thrown away in the downscale anyway, so it costs nothing visible.
STABILIZE=${STABILIZE:-1}
STAB_W=${STAB_W:-2560}
# In frames, each direction, at 60fps — so 60 is a full second either side.
# Lower leaves footfalls in; much higher starts smoothing away the walk itself.
STAB_SMOOTHING=${STAB_SMOOTHING:-60}
STAB=media-src/hero-stab.mp4
TRF=media-src/hero.trf

DRAW_SRC=$SRC
if [ "$STABILIZE" = "0" ]; then
  echo "stabilisation off (STABILIZE=0)"
elif [ -f "$STAB" ] && [ "$STAB" -nt "$SRC" ] && [ -z "${STAB_FORCE:-}" ]; then
  echo "reusing $STAB (newer than the source; STAB_FORCE=1 to redo)"
  DRAW_SRC=$STAB
else
  # mincontrast is deliberately not lower than this. Dropping it to 0.1 lets the
  # detector lock onto film grain instead of corners, and the result measured
  # WORSE than not stabilising at all.
  echo "stabilising, pass 1/2 (measuring the camera path)..."
  $FF -y -v warning -stats -i "$SRC" \
    -vf "scale=${STAB_W}:-2:flags=lanczos,vidstabdetect=shakiness=8:accuracy=15:stepsize=6:mincontrast=0.2:result=${TRF}" \
    -f null -
  echo "stabilising, pass 2/2 (re-rendering along the smoothed path)..."
  $FF -y -v warning -stats -i "$SRC" \
    -vf "scale=${STAB_W}:-2:flags=lanczos,vidstabtransform=input=${TRF}:smoothing=${STAB_SMOOTHING}:optzoom=1:interpol=bicubic:crop=black" \
    -an -c:v libx264 -preset fast -crf 16 -pix_fmt yuv420p "$STAB"
  DRAW_SRC=$STAB
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

# ---- the drawing: watercolour and ink ----
# The wash. No posterise step anywhere in here, deliberately: quantising luma
# into bands is what used to turn a real shadow into a hard blotch, and there
# are no bands in watercolour. The curve lifts the black point to 0.15 so that
# shadows stay translucent — in a watercolour the darkest thing on the paper is
# the ink, never a shadow — and the rest of it stays close to linear so bright
# rooms keep their tonal separation instead of crowding into cream.
#
# sigmaS and the blur sigmas are in PIXELS, so they only mean this at 1920.
WASH="bilateral=sigmaS=30:sigmaR=0.16,bilateral=sigmaS=18:sigmaR=0.10,\
format=yuv444p,gblur=sigma=8:planes=6,format=gbrp,\
curves=all='0/0.15 0.25/0.37 0.5/0.57 0.75/0.80 1/0.99',\
colorbalance=rs=-0.02:bs=0.05:rm=0.02:bm=0.00:rh=0.05:gh=0.015:bh=-0.035,\
eq=saturation=1.02:contrast=1.05:brightness=0.005,vibrance=intensity=0.14"

# The luminous part: a blurred highlight pass screened back over the wash. The
# threshold is high on purpose — bloom everything and an already-bright room
# goes flat white, which is the failure this setting was tuned against.
BLOOM="split[b1][b2];\
[b2]curves=all='0/0 0.6/0.05 0.85/0.45 1/1',gblur=sigma=26[glow];\
[b1][glow]blend=all_mode=screen:all_opacity=0.18"

# Ink. One erosion for line weight, and the line is lifted off pure black to a
# warm dark (~51,43,38): ink on paper is never 0,0,0, and true black drawn over
# a lifted wash is exactly what reads as harsh.
INK="bilateral=sigmaS=10:sigmaR=0.06,format=yuv444p,extractplanes=y+u+v[ey][eu][ev];\
[ey]gblur=sigma=0.6,edgedetect=low=0.02:high=0.06[ly];\
[eu]gblur=sigma=0.6,edgedetect=low=0.016:high=0.045[lu];\
[ev]gblur=sigma=0.6,edgedetect=low=0.016:high=0.045[lv];\
[ly][lu]blend=all_mode=lighten[l1];\
[l1][lv]blend=all_mode=lighten,negate,erosion,format=gbrp,\
curves=r='0/0.20 1/1':g='0/0.17 1/1':b='0/0.15 1/1'[ink]"

# hqdn3d runs ahead of the edge detect: grain the detector can see becomes ink
# it draws. Light enough to leave the brick coursing and the window frames.
DRAW="${RATE_STEP},scale=${OUT_W}:-2:flags=lanczos,hqdn3d=4:6:6:8,split[forwash][foredge];\
[forwash]${WASH},${BLOOM}[c];\
[foredge]${INK};\
[c][ink]blend=all_mode=multiply:all_opacity=1.0,\
vignette=PI/9,unsharp=5:5:0.5:5:5:0.0"

# ---- depth of field ----
# There is no depth map in a phone clip, so this is not true DOF: it is a radial
# falloff, sharp through the middle and softening toward the corners, which is
# what a fast lens does anyway and what the eye reads as depth. The mask is
# generated once as an image rather than computed per frame, because geq is far
# too slow to run 1700 times for a picture that never changes.
DOF_SIGMA=${DOF_SIGMA:-3.2}
DOFMASK=media-src/dofmask.png
OUT_H=$($FP -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 "$DRAW_SRC" \
  | awk -F, -v w="$OUT_W" '{h=int(w*$2/$1); print (h%2? h+1 : h)}')
$FF -y -v error -f lavfi -i "color=black:s=${OUT_W}x${OUT_H},format=gray,\
geq=lum='255*clip((hypot((X-W/2)/(W/2),(Y-H/2)/(H/2))-0.55)/0.5,0,1)',format=rgb24" \
  -frames:v 1 "$DOFMASK"
# The mask is a still, so as a looped input it never ends. maskedmerge has no
# framesync `shortest`, so the length is pinned with -t instead: bounded by
# construction rather than by hoping the graph ends when the video does.
DRAWN_DUR=$(awk -v d="$SRC_DUR" -v s="$START" 'BEGIN{printf "%.3f", d-s}')

mkdir -p public/media
echo "painting at ${OUT_W}x${OUT_H} (crf ${CRF}) and ${SM_W}w (crf ${SM_CRF})..."
# The phone cut is a downscale of the PAINTED picture, not a second painting, so
# both cuts are the same artwork and the ink thins with the frame rather than
# being redrawn at a size it was never tuned for.
# GOP is 30, down from 60: scrolling back up is the one move that forces a real
# seek, and a half-second keyframe interval halves what has to be decoded to
# satisfy it.
$FF -y -v warning -stats -ss "$START" -i "$DRAW_SRC" -loop 1 -t "$DRAWN_DUR" -i "$DOFMASK" \
  -filter_complex "[0:v]${DRAW},format=gbrp,split[shp][sft];\
[sft]gblur=sigma=${DOF_SIGMA}[bl];[1:v]format=gbrp,scale=${OUT_W}:${OUT_H}[m];\
[shp][bl][m]maskedmerge,format=yuv420p,split[big][small];\
[small]scale=${SM_W}:-2:flags=lanczos[sm]" \
  -map "[big]" -an -c:v libx264 -preset slow -tune animation -crf "$CRF" \
    -profile:v high -g 30 -keyint_min 30 \
    -sc_threshold 0 -pix_fmt yuv420p -movflags +faststart public/media/walk.mp4 \
  -map "[sm]" -an -c:v libx264 -preset slow -tune animation -crf "$SM_CRF" \
    -profile:v high -g 30 -keyint_min 30 \
    -sc_threshold 0 -pix_fmt yuv420p -movflags +faststart public/media/walk-sm.mp4

$FF -y -v error -i public/media/walk.mp4 -frames:v 1 -q:v 2 public/media/walk-poster.jpg

# ---- cache busting ----
# Vite fingerprints what it bundles, but public/ is copied through verbatim, so
# these three keep the same URL forever and a browser goes on serving the copy
# it already has. The poster is the one you notice: the video is big enough to
# be range-requested and tends to revalidate, so the page comes back with the
# new walk behind a first frame from some previous version of the artwork.
# Stamping the URL with a hash of the bytes means the address changes exactly
# when the picture does, and never when it does not.
MEDIA_V=$(cat public/media/walk.mp4 public/media/walk-sm.mp4 public/media/walk-poster.jpg | md5sum | cut -c1-10)
cat > src/data/media.js <<JSEOF
/* GENERATED — do not edit by hand. See scripts/rebuild-walk.sh.
   A hash of the three media files, stamped onto their URLs so that a rebuild
   invalidates the browser's copy and nothing else does. */
export const MEDIA_V = '${MEDIA_V}'
JSEOF
echo "media version ${MEDIA_V}"

# ---- the camera track, from the same START ----
echo "measuring the camera track..."
WALK_SRC=$DRAW_SRC WALK_START=$START FFMPEG=$FF node scripts/track.mjs

DUR=$($FP -v error -show_entries format=duration -of csv=p=0 public/media/walk.mp4)
echo
echo "done. clip is ${DUR}s"
ls -la public/media/
echo
echo "Left to do by hand: the BEATS times in src/components/CineHero.jsx are"
echo "seconds into THIS clip, and the old ones point at the old footage. Check"
echo "where one lands with:"
echo "    $FF -ss <seconds> -i public/media/walk.mp4 -frames:v 1 /tmp/beat.jpg"
