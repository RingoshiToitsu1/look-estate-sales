/* Render the walk-up scene to an SVG contact sheet, without a browser.
 *
 *   node scripts/preview-scene.mjs [out.svg] [panelWidth]
 *
 * Eight camera positions across the scroll, laid out four across, with the
 * text-beat anchors marked as crosses so you can see where the copy will
 * actually sit. It runs the same src/scene.js the page runs, so what you see
 * here is what the canvas paints — minus the sign artwork, the glow passes and
 * the vignette, which are the browser's half of the job.
 */
import { writeFileSync } from 'node:fs'
import { BEATS, beatAt, buildScene, camAt, drawList, rgb, viewFor } from '../src/scene.js'

const out = process.argv[2] || 'scene-preview.svg'
const PW = Number(process.argv[3] || 460)
const PH = Math.round((PW * 9) / 16)
const COLS = 4
const STOPS = [0, 0.14, 0.28, 0.42, 0.56, 0.7, 0.85, 1]

/* Near-clipped geometry projects to coordinates tens of thousands of pixels
   outside the frame, which the canvas handles happily and SVG rasterisers do
   not. Clip each polygon to the panel before writing it out. */
const clipRect = (pts, w, h) => {
  const edges = [
    (p) => p[0] >= 0, (p) => p[0] <= w,
    (p) => p[1] >= 0, (p) => p[1] <= h,
  ]
  const cross = [
    (a, b) => (0 - a[0]) / (b[0] - a[0]), (a, b) => (w - a[0]) / (b[0] - a[0]),
    (a, b) => (0 - a[1]) / (b[1] - a[1]), (a, b) => (h - a[1]) / (b[1] - a[1]),
  ]
  let poly = pts
  for (let e = 0; e < 4; e++) {
    const out = []
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length]
      const ain = edges[e](a), bin = edges[e](b)
      if (ain) out.push(a)
      if (ain !== bin) {
        const t = cross[e](a, b)
        out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t])
      }
    }
    poly = out
    if (!poly.length) return poly
  }
  return poly
}

const faces = buildScene(null)
const view = viewFor(PW, PH, 1)
const panels = []

STOPS.forEach((p, i) => {
  const cam = camAt(p)
  const { items, sky, fog } = drawList(faces, cam, view)
  const px = (i % COLS) * PW
  const py = Math.floor(i / COLS) * PH

  const body = items
    .map((it) => {
      const clipped = clipRect(it.scr, PW, PH)
      if (clipped.length < 3) return ''
      const pts = clipped.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
      const tex = it.tex ? ' stroke="#c20e1f" stroke-width="2"' : ''
      return `<polygon points="${pts}" fill="${rgb(it.col)}"${tex}/>`
    })
    .join('')

  const marks = BEATS.map((b, n) => {
    const s = beatAt(n, cam, view)
    if (!s || s.opacity < 0.02) return ''
    const o = s.opacity.toFixed(2)
    return (
      `<g opacity="${o}"><circle cx="${s.x.toFixed(1)}" cy="${s.y.toFixed(1)}" r="7" fill="none" stroke="#7FC0FF" stroke-width="2"/>` +
      `<text x="${(s.x + 11).toFixed(1)}" y="${(s.y + 4).toFixed(1)}" fill="#7FC0FF" font-family="monospace" font-size="11">` +
      `${n} ×${s.scale.toFixed(2)}</text></g>`
    )
  }).join('')

  panels.push(
    `<defs><linearGradient id="sky${i}" x1="0" y1="0" x2="0" y2="1">` +
      `<stop offset="0" stop-color="${rgb(sky)}"/><stop offset="1" stop-color="${rgb(fog)}"/></linearGradient>` +
      `<clipPath id="clip${i}"><rect width="${PW}" height="${PH}"/></clipPath></defs>` +
      `<g transform="translate(${px},${py})" clip-path="url(#clip${i})">` +
      `<rect width="${PW}" height="${PH}" fill="url(#sky${i})"/>${body}${marks}` +
      `<text x="8" y="16" fill="#7FC0FF" font-family="monospace" font-size="12">` +
      `p=${p.toFixed(2)} z=${cam.z.toFixed(1)}</text>` +
      `<rect width="${PW}" height="${PH}" fill="none" stroke="#000" stroke-width="2"/></g>`
  )
})

const W = PW * COLS
const H = PH * Math.ceil(STOPS.length / COLS)
writeFileSync(
  out,
  `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${panels.join('')}</svg>`
)
console.log(`${out} — ${STOPS.length} panels at ${PW}×${PH}`)
