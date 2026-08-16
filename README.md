# Look Estate Sales — website

A single-page React site for Look Estate Sales (personal property
liquidation, Oakland Township, MI), fronted by a scroll-driven walk up to the
house. Built with Vite + React + Framer Motion.

## What's inside

- **The walk-up** (`src/components/CineHero.jsx`). Scrolling walks you up the
  driveway, onto the porch, through the front door and into the house — the real
  footage, redrawn as a coloured illustration. Scroll sets a target time and the
  video is *played* toward it rather than scrubbed frame by frame, so every frame
  on screen is a real decoded frame. Five text beats are pinned to moments in the
  footage and are motion-tracked to it — each line rides the patch of house it
  was placed over. See *The walkthrough* below.
- **Scroll-reveal animations** through the rest of the page (fade + rise,
  staggered), with a count-up on the key stats. Motion respects
  `prefers-reduced-motion`. The hero is the exception, on purpose — see
  *The walkthrough*.
- **All the content from lookestatesales.com**: the estate-sale pitch, services
  (liquidation, evaluation, clean-out), what you handle (personal property, real
  estate, commercial), the online auctions section, the one-call process,
  reviews/trust badges, and the blog links.
- **The brand's own colours** — navy, white and the sign's red, over the site's
  link blue. `#046BD2 / #045CB4 / #111111 / #334155 / #1E293B / #D1D5DB /
  #F0F5FA` are lifted straight from lookestatesales.com's Astra globals;
  `#C20E1F` and `#08234E` are sampled off the LOOK yard sign (the red arrow and
  the navy type). Tokens live at the top of `src/styles/index.css`.

## Run locally

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # outputs to dist/
npm run preview  # preview the production build
```

Requires Node 18+.

## Deploy to GitHub Pages (automatic)

1. Create a new GitHub repo and push this folder to the `main` branch.
2. In the repo, go to **Settings → Pages** and set **Source: GitHub Actions**.
3. Every push to `main` runs `.github/workflows/deploy.yml`, which builds the
   site and publishes it. Your URL will be
   `https://<user>.github.io/<repo>/`.

The build uses `base: './'` (relative asset paths) in `vite.config.js`, so it
works whether the repo is a project page (`/<repo>/`) or a user page
(`<user>.github.io`) — no config change needed.

### Custom domain

Add your domain in **Settings → Pages → Custom domain** and create a
`public/CNAME` file containing the domain (e.g. `lookestatesales.com`).

## Editing content

- **Contact details / nav** — `src/data.js`
- **Copy and sections** — `src/components/Sections.jsx`, `CineHero.jsx`, `Footer.jsx`
- **The scroll beats** — the `BEATS` array at the top of `CineHero.jsx`. Each
  entry is a window in SECONDS of footage (`in`/`full`/`hold`/`out`) plus where
  the copy sits as a percentage of the frame at `full`, so a line stays with the
  shot it describes however tall the section is. How much of the camera's motion
  it then takes on is `TRACK_PAN` / `TRACK_ZOOM` just below.
- **Colors, fonts, spacing** — CSS variables at the top of `src/styles/index.css`

## The walkthrough

`media-src/hero.mp4` is the original phone clip; `public/media/walk.mp4` is the
re-encode the page plays, with `walk-sm.mp4` for phones (picked at runtime by
viewport width) and `walk-poster.jpg` for first paint. It is not a colour grade
— the footage is redrawn as an illustration, because grading a grainy handheld
phone clip only makes the grain look deliberate.

`media-src/` is **not** in git. The clip went 4K when the footage was replaced
and a 4K source is comfortably over GitHub's 100MB per-file limit, so the repo
carries only the re-encodes the page actually serves. Nothing in the build needs
the source — but `scripts/rebuild-walk.sh` does, so keep the original somewhere
you can find it. A fresh clone cannot re-cut the footage until you put a clip
back at `media-src/hero.mp4` (or pass one as the script's first argument).

### Size and quality

`walk.mp4` is 1920 wide and `walk-sm.mp4` is 1280, at crf 26 and 29 with x264's
`-tune animation`. That is a much bigger file than the 1024-wide crf-34 cut it
replaced — about 25MB against 2.5MB — and the reason is that the stage is
`object-fit: cover` over the whole viewport, so whatever the file's width is, it
gets stretched to the window's. At 1024 that was a 2x upscale on an ordinary
laptop, which is what made the drawing look soft and the sign unreadable.

The knobs are environment variables, so trading quality for weight does not mean
editing the chain:

```bash
OUT_W=1600 CRF=28 SM_CRF=31 scripts/rebuild-walk.sh media-src/hero.mp4 0
```

`-tune animation` is worth keeping whatever else changes: it is built for flat,
hard-edged pictures like this one, and at 1920 it makes crf 26 look like crf 19
did at a third of the bytes.

Two things about the filter chain are easy to get wrong. The bilateral `sigmaS`
values and the blur sigmas are in **pixels**, so they do not mean the same thing
at 1920 that they meant at 1024 — raising the width without raising them turns
the flat-region look into a much busier one. And `erosion` in the ink pass grows
the black line: three passes at 1024 is what turned every outline into a chain
of blobs, and one is enough.

### Replacing the footage

```bash
scripts/rebuild-walk.sh ~/Downloads/new-walk.mp4 6.5
#                       ^ the new clip          ^ where the first frame is
```

That is the whole job: it copies the clip in, draws it, encodes both cuts,
makes the poster, and re-measures the camera track — all from one `START`,
which is the reason the script exists. `START` has to be identical in the
encode and in the track or the copy ends up pinned to a shot the page never
shows, and it used to be hardcoded in two files.

Two things it does not do. It will not pick `START` for you — the first frame
is a still that everyone sees, so choose it as a composition (`ffmpeg -ss N -i
clip.mp4 -frames:v 1 /tmp/f.jpg` to look at a candidate). And it will not
re-cut the `BEATS` times in `CineHero.jsx`, which are seconds into the new
footage and will be pointing at the wrong shots.

**Shooting for this pipeline.** The drawing is unusually opinionated about what
it is given, and all of these come from watching it fail:

- **Shoot 60fps if the camera offers it.** The script detects it and skips
  interpolation entirely — real frames beat computed ones, and it removes about
  four minutes from the encode.
- **Walk slowly, and turn slowly.** This matters more than anything else here.
  Motion blur is baked into the frame, and flattening a blurred frame turns it
  into a smear rather than a drawing. The two weakest moments in the current
  clip are both fast pans.
- **Landscape, and 1080p is plenty** — it is scaled to 1024 wide.
- **Let the exposure settle.** Auto-exposure hunting shifts every flat colour in
  the frame at once, which is far more visible once regions are uniform than it
  is in the original footage.
- **Contrast between objects helps.** The ink detects on colour as well as
  brightness precisely because a cream settee against a cream wall nearly lost
  its outline; that is a rescue, not a guarantee.
- **Mind the lighting.** `colorbalance` in the recipe is tuned to correct the
  table-lamp tungsten these rooms were shot under. Shoot in daylight or with
  the overheads on and it will want re-tuning or removing.
- **40–60 seconds, one continuous take.** The scroll stage maps the whole clip
  across five screens, and there is no shot-change handling — a cut mid-clip
  will read as a glitch and will break the camera track across it.

To rebuild by hand instead, or to change the look:

```bash
# The first frame is a still that everybody sees and most people judge the
# page on, so it is chosen as a composition, not as a start time: the porch
# centred, the house filling the upper two thirds, the tree framing the left.
# Earlier starts have the yard flag (to ~1.15s), the swing through the trees
# (to ~3.5s), or the house small behind a tree over an empty driveway (to ~8s).
START=9.0

# The paint. Three bilateral passes, widest first, each one merging what the
# last left: a grey wall ends up ONE grey rather than fifty near-greys. Then
# the chroma planes are blurred hard so a region settles on a single colour,
# the tungsten cast the rooms were shot under is corrected, and the brightness
# is stepped.
FILL="bilateral=sigmaS=30:sigmaR=0.25,bilateral=sigmaS=20:sigmaR=0.16,\
bilateral=sigmaS=12:sigmaR=0.10,\
format=yuv444p,gblur=sigma=12:planes=6,\
colorbalance=rm=-0.06:bm=0.08:rh=-0.03:bh=0.04,\
lutyuv=y='clip(round(val/40)*40,24,236)',gblur=sigma=0.8:planes=1,\
vibrance=intensity=-0.4,\
colorlevels=romin=0.09:gomin=0.09:bomin=0.09,\
eq=saturation=1.6:contrast=1.03:brightness=0.02,format=gbrp"

# The ink, off its own lightly-smoothed branch so the blur above never touches
# it: soft colour, hard line.
INK="bilateral=sigmaS=8:sigmaR=0.07,format=yuv444p,extractplanes=y+u+v[ey][eu][ev];\
[ey]gblur=sigma=0.7,edgedetect=low=0.022:high=0.07[ly];\
[eu]gblur=sigma=0.7,edgedetect=low=0.018:high=0.05[lu];\
[ev]gblur=sigma=0.7,edgedetect=low=0.018:high=0.05[lv];\
[ly][lu]blend=all_mode=lighten[l1];\
[l1][lv]blend=all_mode=lighten,negate,erosion,erosion,erosion,format=gbrp[ink]"

# minterpolate goes first, on the original footage: it needs the texture that
# the drawing is about to remove. This is the step that makes 60 real rather
# than 30 frames printed twice, and it is most of the encode time.
DRAW="minterpolate=fps=60:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1,\
scale=1024:-2,hqdn3d=14:20:20:26,split[forfill][foredge];\
[forfill]${FILL}[c];\
[foredge]${INK};\
[c][ink]blend=all_mode=multiply:all_opacity=1.0,format=yuv420p"

ffmpeg -ss $START -i media-src/hero.mp4 \
  -filter_complex "[0:v]${DRAW},split[big][small];[small]scale=640:-2[sm]" \
  -map "[big]" -an -c:v libx264 -preset slow -crf 34 -g 60 -keyint_min 60 \
    -sc_threshold 0 -pix_fmt yuv420p -movflags +faststart public/media/walk.mp4 \
  -map "[sm]" -an -c:v libx264 -preset slow -crf 35 -g 60 -keyint_min 60 \
    -sc_threshold 0 -pix_fmt yuv420p -movflags +faststart public/media/walk-sm.mp4

ffmpeg -i public/media/walk.mp4 -frames:v 1 -q:v 2 public/media/walk-poster.jpg
```

What each part is doing, and why it is in that order:

- **hqdn3d then bilateral** — denoise, then flatten. Bilateral is the one that
  makes it look painted: it averages within an area but refuses to average
  across an edge, so a brick wall becomes one tone while its outline survives.
- **`lutyuv` on Y only** — posterizing each RGB channel separately makes a
  near-grey gradient cross its thresholds at different points per channel, which
  is where the rainbow blotching on walls and carpet came from. Quantizing
  brightness alone keeps hue continuous.
- **the ink comes off a *different* branch than the paint, and a much less
  smoothed one.** This is the single thing that decides whether the result is a
  cartoon or a smear, and it took the longest to see. The heavy bilateral is
  what makes the fills read as painted areas — and it erases, before any
  detector sees them, exactly the boundaries the outlines are supposed to draw.
  So the fill branch gets three widening passes and the ink branch gets
  `sigmaS=8` once. Turning the flattening up while the ink shared it is what
  kept dissolving the settee.
- **the outline is taken from colour as well as brightness.** `edgedetect` works
  on one plane; run it on luma alone and a cream settee against a cream wall has
  no edge to find, because the difference between them is almost entirely hue.
  The three `extractplanes` branches detect on Y, U and V and are unioned with
  `blend=lighten`, so an outline survives if *any* channel can see it. That is
  what got the back of the sofa to come out.
- **three `erosion` passes** — each one fattens the black lines by a pixel.
  Hairlines read as a filter; 3–4px lines read as drawn.
- **three bilateral passes, widest first.** One pass flattens texture; three,
  each merging what the last one left, flatten whole *regions* — which is the
  difference between a wall made of fifty near-greys and a wall that is one
  grey. This is what makes it read as drawn rather than as processed, and it is
  worth reaching for before any of the more obvious knobs.
- **`gblur=sigma=12:planes=6` — the chroma planes only.** Brightness carries the
  shapes; colour only has to say what something is made of. Blurring hue and
  saturation across a region, while leaving luma alone, settles each area on a
  single colour without softening a single edge. `vibrance=-0.4` finishes the
  job on the near-neutrals, so grey goes properly grey instead of faintly pink
  in one corner and faintly blue in another, and the saturation lift after it
  keeps the greens and the wood from going with them.
- **only `sigma=0.8` of luma blur after the posterize.** An earlier version
  needed `3.4` to hide banding on the walls. It no longer does, and the reason
  is worth keeping: banding is what you get from posterizing a *gradient*. Once
  the region is genuinely uniform there are no gradients left to band, so the
  blur that was compensating for it can come almost all the way back out — and
  the picture gets simpler and cleaner rather than softer and mushier. Simplify
  first and you stop needing to blur.
- **`minterpolate` to 60fps** — see *Frame rate* below.
- **`colorbalance`** — the rooms were shot under table lamps, and pushing
  saturation on a tungsten cast turns every interior into a wall of orange. It
  is a white balance, not a look; without it the staircase and the living room
  come out the same colour as the wood floor.
- **`-g 60 -keyint_min 60 -sc_threshold 0`** — a keyframe every second. Scrolling
  back up is the one case that has to seek, and seeks land on keyframes.

Flat regions and small frame-to-frame deltas both compress well, so 60fps costs
far less than doubling the frames suggests — 3.7MB / 1.4MB.

### Frame rate

**The source is 30fps.** That is the ceiling on *real* motion, and it is the
first thing to know before touching any of this. Encoding at 60 without doing
anything else simply duplicates every frame: twice the file, identical motion,
no benefit whatsoever.

The clip that ships is genuinely 60, because `minterpolate` synthesises the
in-between frames from the motion between the real ones — hence its position at
the very front of the chain, working on the original footage while it still has
the texture that motion estimation needs. It is worth knowing it is a real
choice with a real cost: about four minutes of encoding, and frames that were
computed rather than photographed. On this footage it holds up, with no warping
even through the fastest interior pan, because flat painted areas give the
estimator an easy time and then hide what it gets slightly wrong.

Rates that were tried and rejected, since each looks reasonable on paper:

- **12fps (on twos)** — the cadence of limited hand animation, and the intuition
  that the frame rate should carry the animated quality. It does not. It reads
  as choppy, not as animated. The drawing is what makes it animation.
- **24fps** — the cinematic default, and wrong here mechanically: 30 into 24
  discards two frames in every five, unevenly. That judder is a conversion
  artifact, not a look.
- **30fps** — correct and honest, matching the source and converting nothing.
  Only beaten because interpolation to 60 turned out to be clean and nearly
  free.

**The frame rate and `MAX_RATE` in `CineHero.jsx` are a pair, and changing one
means changing the other.** The hero catches up with the scroll by playing
faster, so the decode load is fps × rate, and the fast scroll where the rate
peaks is exactly where a browser is nearest to dropping frames — which would
undo the thing the 60 was for. The ceiling came down from 4x to 2x when the
rate went from 30 to 60, holding that product at 120 frames a second. Nothing
is lost by the lower ceiling: gaps bigger than the seek threshold jump instead
of racing, which was always the faster way to cover distance.

Two things that look obviously right and are not:

- **A single palette for the whole film.** Real cel animation is painted from
  one limited set of colours, so `palettegen` over every frame plus
  `paletteuse=dither=none` sounds exactly right, and it is not. The palette is
  built from a histogram, the long final section is a close-up of an orange wood
  floor, and so the wood takes most of the entries and every cream wall in the
  house snaps to the nearest peach. At `max_colors=64` the interiors are
  monochrome orange; 256 gets the reds and greens back and still tints the
  walls. The fills are already flat from the bilateral and the posterize — the
  palette was adding a colour cast in exchange for nothing.
- **Quantizing the chroma planes as well as the luma.** Flat colour cells are
  the idea; garish green and orange blotches are the result. It looks like a
  cartoon in the sense that a 1970s printing error looks like a cartoon.

### The motion track

The copy on the hero is tracked to the footage rather than slid along a tuned
curve. `scripts/track.mjs` measures the camera's path — pan and zoom for every
frame — and writes `src/data/track.js`; `CineHero` anchors each beat to the
patch of house it was placed over and lets the track carry it from there.

```bash
node scripts/track.mjs        # FFMPEG=/path/to/ffmpeg if it isn't on PATH
```

It runs on `media-src/hero.mp4`, not on the drawn re-encode — the drawing
flattens exactly the texture a matcher needs — with the same `-ss` and fps, so
the frames line up with what the page plays. **Re-run it after any change to
`START` or the framerate.** The grade it doesn't care about.

Two things in there took a couple of tries and are easy to get wrong again:

- **Scale is never searched directly.** Warping a frame to test a zoom resamples
  it, resampling blurs it, and a blurrier candidate wins on SAD whether or not
  it is right — so a direct search walks the zoom up every frame and compounds
  into nonsense. Instead four windows are matched by pure translation and the
  scale is read off how far apart they moved.
- **The stored transform is cumulative from frame 0**, so the numbers get large
  (the walk really does zoom by ~5000x end to end, since it starts across a
  driveway and finishes at a table). The runtime only ever uses a ratio between
  two of them, which is what makes that harmless — but it is why they are stored
  to five decimals rather than rounded to something tidier.

Beat timings are seconds into the *trimmed* clip, so changing `START` shifts all
of them by the same amount. Check one by pulling the frame it lands on:

```bash
ffmpeg -ss 15 -i public/media/walk.mp4 -frames:v 1 beat2.jpg
```

The opening beat is the exception: its window starts before the clip does
(`in: -1.5`), so that at t=0 — what a reader sees before touching the scroll
wheel — it is already fully in rather than at the bottom of its own fade. That,
plus the placement pass running in a layout effect before the browser's first
paint, is what stops the hero flashing its copy on load.

### A note on prefers-reduced-motion

The hero does not honour it, and that is a decision rather than an omission. It
was implemented — reduced motion dropped the scroll stage and showed the opening
frame as a still — and it had to come out, because it takes the walkthrough away
from everyone whose OS has animation effects switched off, which on Windows is a
lot of people who have never thought about the setting and are not expecting a
page to withhold its main content over it. This section *is* the page; a still of
it is not a reduced version of the experience, it is a broken one.

The case for leaving it as it is: nothing here moves on its own. The video only
advances when the reader scrolls, which is the behaviour the setting is asking
for in the first place. The reveals further down the page do animate by
themselves, and those still honour it.

> **The beats are currently switched off.** `SHOW_BEATS` at the top of
> `CineHero.jsx` is `false` while the animation itself is being got right, so
> that judging the animation means judging the animation. The scrim goes with
> them — it exists to give copy a floor to stand on — and the `<h1>` stays in
> the document as screen-reader-only text. Setting the flag back to `true`
> restores all of it; nothing was deleted, and the beat timings above are
> current for the 36.8s cut.

## A note on images

The photos in the Intro and Process sections currently load from the existing
`lookestatesales.com` media library. They belong to the same business, but for
a fully self-contained repo you can download them into `public/media/` and
update the `src` paths in `src/components/Sections.jsx`.
