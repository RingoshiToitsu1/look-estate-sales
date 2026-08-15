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
  `prefers-reduced-motion`.
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
# opens on the house sitting across the driveway with the porch in view. The
# yard flag runs to ~1.15s and the swing through the trees to about 3.5s;
# neither is what the first frame of a page selling a house should be.
START=4.0

DRAW="hqdn3d=12:18:18:24,bilateral=sigmaS=20:sigmaR=0.15,split[base][e];\
[base]lutyuv=y='clip(round(val/48)*48,20,236)',\
colorlevels=romin=0.08:gomin=0.08:bomin=0.08,\
eq=saturation=1.60:contrast=1.0:brightness=0.02,format=gbrp[c];\
[e]format=gray,gblur=sigma=0.85,edgedetect=low=0.026:high=0.08,negate,\
erosion,erosion,format=gbrp[ink];\
[c][ink]blend=all_mode=multiply:all_opacity=1.0,format=yuv420p"

ffmpeg -ss $START -i media-src/hero.mp4 \
  -filter_complex "[0:v]fps=12,scale=1024:-2,${DRAW},split[big][small];\
[small]scale=640:-2[sm]" \
  -map "[big]" -an -c:v libx264 -preset slow -crf 33 -g 12 -keyint_min 12 \
    -sc_threshold 0 -pix_fmt yuv420p -movflags +faststart public/media/walk.mp4 \
  -map "[sm]" -an -c:v libx264 -preset slow -crf 34 -g 12 -keyint_min 12 \
    -sc_threshold 0 -pix_fmt yuv420p -movflags +faststart public/media/walk-sm.mp4

ffmpeg -i public/media/walk.mp4 -frames:v 1 -q:v 4 public/media/walk-poster.jpg
```

What each part is doing, and why it is in that order:

- **hqdn3d then bilateral** — denoise, then flatten. Bilateral is the one that
  makes it look painted: it averages within an area but refuses to average
  across an edge, so a brick wall becomes one tone while its outline survives.
- **`lutyuv` on Y only** — posterizing each RGB channel separately makes a
  near-grey gradient cross its thresholds at different points per channel, which
  is where the rainbow blotching on walls and carpet came from. Quantizing
  brightness alone keeps hue continuous.
- **the ink branch splits off *before* the posterize** — drawn from the
  posterized image, the lines trace the banding instead of the objects. The two
  `erosion` passes after `negate` are what fatten hairlines into outlines heavy
  enough to read as drawn; without them the whole thing looks like a filter
  rather than a picture.
- **`fps=12`** — on twos, the cadence of limited hand animation. This is what
  makes it read as animation rather than as video with an effect on it, and it
  is worth understanding as a deliberate choice and not a performance
  compromise: at 24 the same frames look like slightly odd footage. `CineHero`
  has a matching `VIDEO_FPS` that snaps the tracked copy to the same grid, so
  the copy steps with the picture instead of gliding across it.
- **`-g 12 -keyint_min 12 -sc_threshold 0`** — a keyframe every second. Scrolling
  back up is the one case that has to seek, and seeks land on keyframes.

Flat areas and hard lines encode cheaply, and half the frames are gone, so this
comes out well under the graded version: 3.9MB / 1.4MB.

There is a strength ceiling worth knowing about, and it is set by the interiors,
not the exteriors. Pushed past the values above — coarser posterize, a second
bilateral pass, `sigmaS` much over 20 — the outside keeps getting better while
the staged settee in the living room melts into a shapeless blob. A room that
does not read as furnished is the one thing this section cannot afford, so that
is the wall. Quantizing the chroma planes as well as the luma is a separate dead
end: it looks like a cartoon in the sense that a 1970s printing error looks like
a cartoon.

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

## A note on images

The photos in the Intro and Process sections currently load from the existing
`lookestatesales.com` media library. They belong to the same business, but for
a fully self-contained repo you can download them into `public/media/` and
update the `src` paths in `src/components/Sections.jsx`.
