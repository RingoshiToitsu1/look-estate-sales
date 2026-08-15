# Look Estate Sales — website

A single-page React site with a scroll-reveal, video-led landing page for
Look Estate Sales (personal property liquidation, Oakland Township, MI).
Built with Vite + React + Framer Motion.

## What's inside

- **Scroll-scrubbed walkthrough** (`src/components/CineHero.jsx`). The
  walkthrough video is exploded into a still sequence and drawn to a canvas at
  whatever rate you scroll, with each frame cross-faded into the next so it
  reads as film rather than a slideshow. Four text beats fade in and out over
  the top as you go. See *Rebuilding the frames* below.
- **Scroll-reveal animations** through the rest of the page (fade + rise,
  staggered), with a count-up on the key stats. Motion respects
  `prefers-reduced-motion`.
- **All the content from lookestatesales.com**: the estate-sale pitch, the 95%
  sell-through stat, services (liquidation, evaluation, clean-out), what you
  handle (personal property, real estate, commercial), the online auctions
  section, the one-call process, reviews/trust badges, and the blog links.
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
- **The scroll beats** — the `BEATS` array and the markup in `CineHero.jsx`.
  Each beat owns a window of scroll progress (fade in, hold, fade out), so
  moving a number moves where that line appears in the walkthrough.
- **Colors, fonts, spacing** — CSS variables at the top of `src/styles/index.css`

## Rebuilding the frames

The source clip lives at `media-src/hero.mp4` — outside `public/`, so it is
kept in the repo but never shipped to the browser. To regenerate the sequence
(after replacing the clip, or to trade quality against weight):

```bash
./scripts/frames.sh              # needs ffmpeg on PATH
```

It writes `public/media/frames/f001.webp …`, prints the frame count, and the
count must match `FRAME_COUNT` in `src/components/CineHero.jsx`.

## A note on images

The photos in the Intro and Process sections currently load from the existing
`lookestatesales.com` media library. They belong to the same business, but for
a fully self-contained repo you can download them into `public/media/` and
update the `src` paths in `src/components/Sections.jsx`.
