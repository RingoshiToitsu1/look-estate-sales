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
phone clip only makes the grain look deliberate. To rebuild after a re-shoot:

```bash
# The first frame is a still that everybody sees and most people judge the
# page on, so it is chosen as a composition, not as a start time: the porch
# centred, the house filling the upper two thirds, the tree framing the left.
# Earlier starts have the yard flag (to ~1.15s), the swing through the trees
# (to ~3.5s), or the house small behind a tree over an empty driveway (to ~8s).
START=9.0

# The paint. Flatten into areas, correct the tungsten cast the rooms were shot
# under, step the brightness, then blur those steps back into gradients — the
# posterize decides where tone changes, the blur decides how abruptly.
FILL="bilateral=sigmaS=24:sigmaR=0.18,bilateral=sigmaS=12:sigmaR=0.10,\
colorbalance=rm=-0.06:bm=0.08:rh=-0.03:bh=0.04,\
lutyuv=y='clip(round(val/24)*24,24,236)',gblur=sigma=3.4,\
colorlevels=romin=0.09:gomin=0.09:bomin=0.09,\
eq=saturation=1.35:contrast=1.03:brightness=0.02,format=gbrp"

# The ink, off its own lightly-smoothed branch so the blur above never touches
# it: soft colour, hard line.
INK="bilateral=sigmaS=8:sigmaR=0.07,format=yuv444p,extractplanes=y+u+v[ey][eu][ev];\
[ey]gblur=sigma=0.7,edgedetect=low=0.022:high=0.07[ly];\
[eu]gblur=sigma=0.7,edgedetect=low=0.018:high=0.05[lu];\
[ev]gblur=sigma=0.7,edgedetect=low=0.018:high=0.05[lv];\
[ly][lu]blend=all_mode=lighten[l1];\
[l1][lv]blend=all_mode=lighten,negate,erosion,erosion,erosion,format=gbrp[ink]"

DRAW="fps=30,scale=1024:-2,hqdn3d=14:20:20:26,split[forfill][foredge];\
[forfill]${FILL}[c];\
[foredge]${INK};\
[c][ink]blend=all_mode=multiply:all_opacity=1.0,format=yuv420p"

ffmpeg -ss $START -i media-src/hero.mp4 \
  -filter_complex "[0:v]${DRAW},split[big][small];[small]scale=640:-2[sm]" \
  -map "[big]" -an -c:v libx264 -preset slow -crf 34 -g 30 -keyint_min 30 \
    -sc_threshold 0 -pix_fmt yuv420p -movflags +faststart public/media/walk.mp4 \
  -map "[sm]" -an -c:v libx264 -preset slow -crf 35 -g 30 -keyint_min 30 \
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
  So the fill branch gets `sigmaS=24` twice over and the ink branch gets
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
- **`gblur=sigma=3.4` right after the posterize** — this pair is the whole
  colour treatment. The posterize decides *where* tone changes; the blur decides
  how abruptly. Alone, the posterize gives hard-edged cel steps, which read as
  banding on a wall. Blurred back out, the same steps become soft gradients that
  still change where a painter would have changed them. It only touches the fill
  branch, so the lines stay hard: soft colour, hard ink.
- **`fps=30`, matching the source** — see *Frame rate* below.
- **`colorbalance`** — the rooms were shot under table lamps, and pushing
  saturation on a tungsten cast turns every interior into a wall of orange. It
  is a white balance, not a look; without it the staircase and the living room
  come out the same colour as the wood floor.
- **`-g 30 -keyint_min 30 -sc_threshold 0`** — a keyframe every second. Scrolling
  back up is the one case that has to seek, and seeks land on keyframes.

Smooth gradients and small frame-to-frame deltas both compress well, so this
comes out under the graded version it replaced despite running at 30fps:
3.1MB / 1.2MB.

### Frame rate

**The source is 30fps.** That is the ceiling on real motion, and it is the first
thing to know before touching this. Encoding at 60 without doing anything else
duplicates every frame: twice the file, identical motion, no benefit whatsoever.

It has been at three different rates, and the reasoning is worth keeping:

- **12fps (on twos)** — the cadence of limited hand animation, and the intuition
  that the frame rate should carry the animated quality. It doesn't. It reads as
  choppy, not as animated. The drawing is what makes it animation; the frame
  rate just has to stay out of the way.
- **24fps** — the cinematic default, and wrong here for a mechanical reason:
  30 into 24 means discarding two frames in every five, unevenly. That judder is
  a conversion artifact, not a look.
- **30fps** — matches the source exactly, converts nothing, and is what ships.

Genuine 60fps is possible, by synthesising the in-between frames:
`minterpolate=fps=60:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1` in front
of the draw chain. It was tried, and it is clean — no warping even on the
fastest interior pan, because the flat painted areas give the motion estimator
an easy time. It is not shipped for one reason, and it is not file size: the
hero drives playback at up to 4x `playbackRate` while you scroll, so a 60fps
clip asks the browser to decode 240 frames a second during exactly the fast
scroll where it is most likely to start dropping them. Choppiness caused by
dropped frames under load is worse than the smoothness gained, and it lands on
whoever has the slowest machine. 30fps at 4x is already 120.

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
