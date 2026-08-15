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
# the flag is in frame until ~1.15s; 1.5 opens on the house coming out
# from behind the trees
START=1.5

DRAW="hqdn3d=12:18:18:24,bilateral=sigmaS=26:sigmaR=0.17,split[base][e];\
[base]lutyuv=y='clip(round(val/40)*40,20,236)',\
colorlevels=romin=0.08:gomin=0.08:bomin=0.08,\
eq=saturation=1.55:contrast=0.99:brightness=0.02,format=gbrp[c];\
[e]format=gray,gblur=sigma=1.0,edgedetect=low=0.045:high=0.13,negate,erosion,\
erosion,gblur=sigma=0.45,format=gbrp[ink];\
[c][ink]blend=all_mode=multiply:all_opacity=1.0,format=yuv420p"

ffmpeg -ss $START -i media-src/hero.mp4 \
  -filter_complex "[0:v]fps=24,scale=1024:-2,${DRAW},split[big][small];\
[small]scale=640:-2[sm]" \
  -map "[big]" -an -c:v libx264 -preset slow -crf 33 -g 24 -keyint_min 24 \
    -sc_threshold 0 -pix_fmt yuv420p -movflags +faststart public/media/walk.mp4 \
  -map "[sm]" -an -c:v libx264 -preset slow -crf 34 -g 24 -keyint_min 24 \
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
  posterized image, the lines trace the banding instead of the objects. The
  `erosion` after `negate` is what fattens hairlines into something that still
  reads at 1024 wide.
- **`-g 24 -keyint_min 24 -sc_threshold 0`** — a keyframe every second. Scrolling
  back up is the one case that has to seek, and seeks land on keyframes.

Flat areas and hard lines encode cheaply, so this comes out smaller than the
graded version did (4.1MB / 1.6MB) despite the higher CRF.

There is a strength ceiling worth knowing about. Pushed further — coarser
posterize, a second bilateral pass — the exteriors keep improving but the
interiors stop working: the staged settee dissolves into a blob, and a room that
doesn't read as furnished is the one thing this section cannot afford. The
values above sit just under that.

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
ffmpeg -ss 17.5 -i public/media/walk.mp4 -frames:v 1 beat2.jpg
```

## A note on images

The photos in the Intro and Process sections currently load from the existing
`lookestatesales.com` media library. They belong to the same business, but for
a fully self-contained repo you can download them into `public/media/` and
update the `src` paths in `src/components/Sections.jsx`.
