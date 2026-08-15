# Look Estate Sales — website

A single-page React site for Look Estate Sales (personal property
liquidation, Oakland Township, MI), fronted by a scroll-driven walk up to the
house. Built with Vite + React + Framer Motion.

## What's inside

- **The walk-up** (`src/scene.js` + `src/components/CineHero.jsx`). Scrolling
  walks a camera up the driveway, past the yard sign, onto the porch, through
  the front door and into the living room — drawn as real geometry through a
  small perspective projector, so every scroll position is rendered exactly and
  nothing goes soft. Five text beats are pinned to points in that scene and
  pushed through the same projector, so they slide, grow and fall away with the
  camera instead of sitting on top of it. See *The scene* below.
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
- **The scroll beats** — copy lives in `CineHero.jsx`, placement in the `BEATS`
  array in `src/scene.js`. Each entry is a world point `[x, y, z]` plus the
  distance at which it renders full size, so moving a beat's `z` moves where
  along the walk it appears; `beatAt()` derives its fade and scale from there.
- **Colors, fonts, spacing** — CSS variables at the top of `src/styles/index.css`

## The scene

`src/scene.js` is pure geometry and maths — no DOM. It builds the world once in
metres (+z away from the viewer, y up, eye height 1.55), moves a camera along
it, and hands back the polygons to paint. `CineHero.jsx` owns the browser half:
the canvas, the yard-sign artwork and the scroll loop.

Because the scene has no DOM in it, it can be rendered without a browser:

```bash
node scripts/preview-scene.mjs out.svg     # eight camera positions, contact sheet
```

Open the SVG to check composition after moving anything. The blue circles mark
where each text beat's anchor lands, with its perspective scale.

Two gotchas worth knowing before editing the scene:

- Faces are painter-sorted by one depth each, so **large surfaces are cut into
  strips** (`stripSlab`) and **anything lying on a floor is cut out of it**
  (`floorAround`) rather than laid on top. Overlapping coplanar surfaces have no
  stable order.
- The camera stops at `CAM_END`, roughly eight metres from the back wall, and
  only sees about ±0.86 × distance sideways — so furniture meant to be visible
  in the final frame has to sit deeper in the room than a floor plan suggests.

Two textures are painted in the browser and blitted onto faces that sit square
to the camera (`CineHero.jsx`): the yard sign at the top of the driveway, and
the branded cover on the checkout table inside. Both use the business's own
logo — `public/media/logo.png` for the white board and `logo-onnavy.png` for the
table cover — recoloured from the site's white PNG, not redrawn.

`media-src/hero.mp4` is the reference walkthrough the scene recreates. It lives
outside `public/`, so it stays in the repo but is never shipped to the browser.

## A note on images

The photos in the Intro and Process sections currently load from the existing
`lookestatesales.com` media library. They belong to the same business, but for
a fully self-contained repo you can download them into `public/media/` and
update the `src` paths in `src/components/Sections.jsx`.
