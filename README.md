# Look Estate Sales — website

A single-page React site with a scroll-reveal, video-led landing page for
Look Estate Sales (personal property liquidation, Oakland Township, MI).
Built with Vite + React + Framer Motion.

## What's inside

- **Cinematic hero** using your walkthrough video (`public/media/hero.mp4`),
  tone-mapped from the original iPhone HDR clip to standard color and
  compressed for the web (~6 MB, 1280×720, with a poster image for instant paint).
- **Scroll-reveal animations** throughout (fade + rise, staggered), with a
  count-up on the key stats. All motion respects `prefers-reduced-motion`.
- **All the content from lookestatesales.com**: the estate-sale pitch, the 95%
  sell-through stat, services (liquidation, evaluation, clean-out), what you
  handle (personal property, real estate, commercial), the online auctions
  section, the one-call process, reviews/trust badges, and the blog links.
- A heritage/auction-house look: deep pine + antique brass, Fraunces + Hanken
  Grotesk, and a recurring **price-tag motif** (estate sales tag and price
  everything).

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
- **Copy and sections** — `src/components/Sections.jsx`, `Hero.jsx`, `Footer.jsx`
- **Colors, fonts, spacing** — CSS variables at the top of `src/styles/index.css`
- **Replace the video** — drop a new `hero.mp4` (and `poster.jpg`) into
  `public/media/`. Keep it muted and roughly 1280×720 for fast loading.

## A note on images

The photos in the Intro and Process sections currently load from the existing
`lookestatesales.com` media library. They belong to the same business, but for
a fully self-contained repo you can download them into `public/media/` and
update the `src` paths in `src/components/Sections.jsx`.
