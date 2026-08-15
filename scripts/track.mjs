/* Estimate the camera's path through the walkthrough, so the copy on the hero
   can be pinned to points in the house rather than slid along a hand-drawn
   curve.

   Per frame pair this solves a similarity — pan plus zoom, no rotation, which
   is all a person walking forward with a phone actually produces — by
   coarse-to-fine SAD search on a small greyscale pyramid. The result is
   accumulated into a cumulative transform per frame and written as a JS module.

   Tracking runs on the ORIGINAL footage, not the drawn re-encode: the drawing
   flattens exactly the texture a matcher needs. Frame timing is identical
   (same -ss, same fps), so the indices line up with what the page plays.

   Run from the repo root, after re-encoding the video:
     node scripts/track.mjs            # or FFMPEG=/path/to/ffmpeg node ...
   START must match the -ss the encode used, or the copy will track a shot the
   page never shows. */
import { execFileSync } from 'node:child_process'
import { writeFileSync, mkdirSync } from 'node:fs'

const FF = process.env.FFMPEG || 'ffmpeg'
const SRC = 'media-src/hero.mp4'
const START = 4.0
const W = 160, H = 90            // tracking resolution
const OUT = 'src/data/track.js'

/* ---- decode the whole clip as raw grey ---- */
const raw = execFileSync(FF, [
  '-v', 'error', '-ss', String(START), '-i', SRC,
  '-vf', `fps=24,scale=${W}:${H}`, '-pix_fmt', 'gray',
  '-f', 'rawvideo', '-',
], { maxBuffer: 1 << 30 })

const N = Math.floor(raw.length / (W * H))
const frames = []
for (let i = 0; i < N; i++) frames.push(raw.subarray(i * W * H, (i + 1) * W * H))
console.log(`${N} frames at ${W}x${H}`)

/* half-resolution copies for the coarse pass */
const half = frames.map((f) => {
  const hw = W >> 1, hh = H >> 1
  const o = new Uint8Array(hw * hh)
  for (let y = 0; y < hh; y++)
    for (let x = 0; x < hw; x++) {
      const s = (y * 2) * W + x * 2
      o[y * hw + x] = (f[s] + f[s + 1] + f[s + W] + f[s + W + 1]) >> 2
    }
  return o
})

/* Cost of matching the window of `cur` at [x0,x1)x[y0,y1) against `prev`
   shifted by (tx, ty). Pure translation, integer or sub-pixel via bilinear.

   Everything here is translation-only on purpose. An earlier version searched
   scale directly against the whole frame, and it drifted badly: zooming in
   resamples the source, resampling blurs it, and a blurrier candidate scores a
   lower SAD whether or not it is the right answer. So the search never sees a
   scale term, and scale is recovered afterwards from how four independent
   window matches diverge — each of those is a plain shift, with nothing to bias
   it either way. */
function cost(prev, cur, w, tx, ty, x0, y0, x1, y1) {
  let sum = 0, n = 0
  const ix0 = Math.floor(tx), iy0 = Math.floor(ty)
  const fx = tx - ix0, fy = ty - iy0
  for (let y = y0; y < y1; y += 2) {
    for (let x = x0; x < x1; x += 2) {
      const px = x - ix0, py = y - iy0
      if (px < 1 || py < 1 || px >= w - 2) continue
      const i = py * w + px
      if (i < 0 || i + w + 1 >= prev.length) continue
      const v = fx || fy
        ? prev[i] * (1 - fx) * (1 - fy) + prev[i - 1] * fx * (1 - fy) +
          prev[i - w] * (1 - fx) * fy + prev[i - w - 1] * fx * fy
        : prev[i]
      sum += Math.abs(v - cur[y * w + x])
      n++
    }
  }
  return n > 20 ? sum / n : 1e9
}

/* how much there is to match on, in a window — flat sky matches everything */
function texture(f, w, x0, y0, x1, y1) {
  let s = 0, ss = 0, n = 0
  for (let y = y0; y < y1; y += 2)
    for (let x = x0; x < x1; x += 2) { const v = f[y * w + x]; s += v; ss += v * v; n++ }
  return n ? Math.sqrt(ss / n - (s / n) ** 2) : 0
}

/* best integer shift of one window, then a sub-pixel refine */
function matchWindow(prev, cur, w, box, gx, gy, range) {
  const [x0, y0, x1, y1] = box
  let best = Infinity, bx = gx, by = gy
  for (let ty = gy - range; ty <= gy + range; ty++)
    for (let tx = gx - range; tx <= gx + range; tx++) {
      const c = cost(prev, cur, w, tx, ty, x0, y0, x1, y1)
      if (c < best) { best = c; bx = tx; by = ty }
    }
  const dx = sub(cost(prev, cur, w, bx - 1, by, x0, y0, x1, y1), best,
                 cost(prev, cur, w, bx + 1, by, x0, y0, x1, y1))
  const dy = sub(cost(prev, cur, w, bx, by - 1, x0, y0, x1, y1), best,
                 cost(prev, cur, w, bx, by + 1, x0, y0, x1, y1))
  return { tx: bx + dx, ty: by + dy, cost: best }
}

/* parabola through three samples -> sub-step minimum */
const sub = (a, b, c) => {
  const d = a - 2 * b + c
  return Math.abs(d) < 1e-9 ? 0 : Math.max(-0.5, Math.min(0.5, (a - c) / (2 * d)))
}

/* Four windows, one per quadrant, inset from the frame edge — the border is
   the part that leaves the picture as the camera moves. */
const QUADS = (() => {
  const qw = Math.round(W * 0.30), qh = Math.round(H * 0.30)
  const out = []
  for (const cy of [0.28, 0.72])
    for (const cx of [0.28, 0.72]) {
      const x0 = Math.round(W * cx - qw / 2), y0 = Math.round(H * cy - qh / 2)
      out.push({
        box: [x0, y0, x0 + qw, y0 + qh],
        // centre of the window, relative to the centre of the frame
        cx: W * cx - W / 2,
        cy: H * cy - H / 2,
      })
    }
  return out
})()

function estimate(i) {
  const prev = frames[i - 1], cur = frames[i]

  // coarse whole-frame shift at half res, +/- 7px (= +/- 14 at full)
  const hw = W >> 1, hh = H >> 1
  const hbox = [Math.round(hw * 0.16), Math.round(hh * 0.16),
                Math.round(hw * 0.84), Math.round(hh * 0.84)]
  let best = Infinity, gx = 0, gy = 0
  for (let ty = -7; ty <= 7; ty++)
    for (let tx = -7; tx <= 7; tx++) {
      const c = cost(half[i - 1], half[i], hw, tx, ty, hbox[0], hbox[1], hbox[2], hbox[3])
      if (c < best) { best = c; gx = tx; gy = ty }
    }
  gx *= 2; gy *= 2

  // each quadrant on its own, around that guess
  const pts = []
  for (const q of QUADS) {
    if (texture(cur, W, q.box[0], q.box[1], q.box[2], q.box[3]) < 6) continue
    pts.push({ ...q, ...matchWindow(prev, cur, W, q.box, gx, gy, 4) })
  }
  if (pts.length < 3) {
    const g = matchWindow(prev, cur, W, [Math.round(W * 0.16), Math.round(H * 0.16),
      Math.round(W * 0.84), Math.round(H * 0.84)], gx, gy, 2)
    return { s: 1, tx: g.tx, ty: g.ty }
  }

  /* Fit p -> s*p + t to the four displacements. With the windows arranged
     symmetrically the normal equations collapse to a ratio of dot products:
     how much the windows moved APART is the zoom, where they moved together is
     the pan. */
  let mcx = 0, mcy = 0, mux = 0, muy = 0
  for (const p of pts) { mcx += p.cx; mcy += p.cy; mux += p.cx + p.tx; muy += p.cy + p.ty }
  mcx /= pts.length; mcy /= pts.length; mux /= pts.length; muy /= pts.length
  let num = 0, den = 0
  for (const p of pts) {
    const ax = p.cx - mcx, ay = p.cy - mcy
    num += ax * (p.cx + p.tx - mux) + ay * (p.cy + p.ty - muy)
    den += ax * ax + ay * ay
  }
  let s = den > 1 ? num / den : 1
  // a person walking cannot zoom a frame by more than a couple of percent in
  // 1/24s; anything past that is a mismatch, not a move
  s = Math.max(0.985, Math.min(1.025, s))
  return { s, tx: mux - s * mcx, ty: muy - s * mcy }
}

/* ---- accumulate ---- */
// cumulative C_i: a point p (frame coords, origin at centre) in frame 0 shows
// up at C_i.s * p + C_i.t in frame i.
const cum = [{ s: 1, tx: 0, ty: 0 }]
for (let i = 1; i < N; i++) {
  const d = estimate(i)
  const p = cum[i - 1]
  cum.push({ s: p.s * d.s, tx: d.s * p.tx + d.tx, ty: d.s * p.ty + d.ty })
  if (i % 120 === 0) process.stdout.write(`  ${i}/${N}\r`)
}

/* A frame-to-frame estimate is noisy; the camera is not. Smooth the path with
   a short centred window — anything jittery left in here would show up as the
   copy twitching. */
const R = 3
const sm = cum.map((_, i) => {
  let s = 0, x = 0, y = 0, n = 0
  for (let k = Math.max(0, i - R); k <= Math.min(N - 1, i + R); k++) {
    s += cum[k].s; x += cum[k].tx; y += cum[k].ty; n++
  }
  return { s: s / n, tx: x / n, ty: y / n }
})

/* Store translation in units of frame WIDTH so the runtime can scale it by
   whatever the video is actually rendered at. */
const flat = []
for (const c of sm) {
  flat.push(+c.s.toFixed(4), +(c.tx / W).toFixed(5), +(c.ty / W).toFixed(5))
}

const last = sm[N - 1]
console.log(`\ntotal zoom x${last.s.toFixed(2)}, pan ${(last.tx / W).toFixed(3)}w ${(last.ty / W).toFixed(3)}w`)

mkdirSync('src/data', { recursive: true })
writeFileSync(OUT, `/* GENERATED — do not edit by hand. See README, "The walkthrough".
   The camera's path through public/media/walk.mp4, measured from the source
   footage: for every frame at 24fps, the cumulative similarity that maps a
   point in frame 0 to where it appears in frame i.

   Triples of [scale, x, y]. Translation is in units of frame WIDTH, measured
   from the centre of the frame, so it survives whatever size the video ends up
   rendered at. CineHero uses it to keep each beat of copy sitting on the same
   patch of house while the camera walks past it. */
export const TRACK_FPS = 24
export const TRACK = [
${flat.reduce((rows, v, i) => {
  if (i % 12 === 0) rows.push([])
  rows[rows.length - 1].push(v)
  return rows
}, []).map((r) => '  ' + r.join(', ')).join(',\n')},
]
`)
console.log('wrote', OUT)
