# Look Estate Sales — website

A single-page React site for Look Estate Sales (personal property
liquidation, Oakland Township, MI), fronted by a scroll-driven walk up to the
house. Built with Vite + React + Framer Motion.

## What's inside

- **The walk-up** (`src/components/CineHero.jsx`). Scrolling walks you up the
  driveway, past the banner, onto the porch, through the front door and into the
  house — in the real footage, graded. Scroll sets a target time and the video is
  *played* toward it rather than scrubbed frame by frame, so every frame on
  screen is a real decoded frame. Five text beats are pinned to moments in the
  footage and drift with the shot. See *The walkthrough* below.
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
  the copy sits as a percentage of the frame, so a line stays with the shot it
  describes however tall the section is.
- **Colors, fonts, spacing** — CSS variables at the top of `src/styles/index.css`

## The walkthrough

`media-src/hero.mp4` is the original phone clip; `public/media/walk.mp4` is the
graded re-encode the page plays, with `walk-sm.mp4` for phones (picked at
runtime by viewport width) and `walk-poster.jpg` for first paint. To rebuild
them after a re-shoot:

```bash
GRADE="hqdn3d=4:3:6:6,eq=contrast=1.14:saturation=0.92:gamma=0.97,\
colorbalance=rs=-0.05:bs=0.10:rm=0.02:bm=-0.02:rh=0.07:bh=-0.06,\
unsharp=5:5:0.5,vignette=PI/5"

ffmpeg -i media-src/hero.mp4 -vf "$GRADE,fps=24,scale=1024:-2" -an \
  -c:v libx264 -preset slow -crf 31 -g 24 -keyint_min 24 -sc_threshold 0 \
  -pix_fmt yuv420p -movflags +faststart public/media/walk.mp4
```

Three parts of that carry their weight:

- **hqdn3d** — handheld phone footage is full of sensor noise, which is
  expensive to encode and compresses into mush. Denoising first is what takes
  the file from 23MB to 6MB at the same apparent quality.
- **`-g 24 -keyint_min 24 -sc_threshold 0`** — a keyframe every second. Scrolling
  back up is the one case that has to seek, and seeks land on keyframes.
- **the vignette and colour balance** — cool shadows, warm highlights. It is
  what makes a phone walkthrough read as deliberate.

Beat timings are seconds into the clip, so re-cutting the footage means moving
those numbers. Check one by pulling the frame it lands on:

```bash
ffmpeg -ss 19 -i public/media/walk.mp4 -frames:v 1 beat2.jpg
```

## A note on images

The photos in the Intro and Process sections currently load from the existing
`lookestatesales.com` media library. They belong to the same business, but for
a fully self-contained repo you can download them into `public/media/` and
update the `src` paths in `src/components/Sections.jsx`.
