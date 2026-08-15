/* ============================================================
   THE WALK-UP — scene, camera and projector.
   ============================================================
   Pure geometry and maths, no DOM: CineHero.jsx owns the canvas and paints
   what drawList() hands back, and scripts/preview-scene.mjs renders the same
   list to SVG so the scene can be eyeballed without a browser.

   World units are metres. +z runs away from the viewer, +y is up, the camera
   walks up the driveway along z with its eye at ~1.55. Geometry never moves;
   only the camera does.

   Faces are painter-sorted per frame, so coplanar surfaces need a few
   millimetres of separation to stay stable — hence the small nudges on
   driveway seams, window trim and picture frames.
   ============================================================ */

/* ---- camera path ---- */
export const CAM_START = -6
export const CAM_END = 44
export const EYE = 1.55
export const DOOR_Z = 26
export const FOV = 0.92 // radians, vertical

/* ---- palette (src/styles/index.css says where these come from) ---- */
const NAVY = [8, 35, 78]
const NAVY_D = [5, 19, 46]
const RED = [194, 14, 31]
const RED_D = [140, 10, 22]
const WHITE = [255, 255, 255]
const CREAM = [244, 230, 205]   // the sign board, and the copy that sits over it
const BONE = [238, 240, 244]
const WARM = [255, 214, 150]
/* Emissive surfaces — windows, lamps, the fire. Deliberately well below the
   white of the copy: these are the brightest things in the frame, and the
   headline has to read over the house they light. */
const LIT = [204, 162, 110]
const WARM_D = [58, 42, 30]
const WOOD = [124, 84, 54]
const WOOD_D = [86, 58, 38]
const SIDING = [138, 148, 166]   // white siding, seen at dusk
const INT_WALL = [110, 94, 80]   // interior, lit only by lamps
const INT_CEIL = [74, 64, 56]

export const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v)
export const lerp = (a, b, t) => a + (b - a) * t
export const mix = (c1, c2, t) => [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)]
export const rgb = (c) => `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`

/* Text beats. Each is pinned to a world point; `d0` is the distance at which
   it renders at its natural size, so it grows as the camera closes in. */
export const BEATS = [
  { at: [2.35, 3.0, 6], d0: 11 },
  { at: [0.3, 2.5, 16.5], d0: 8 },
  { at: [0, 3.25, 25.2], d0: 7.5 },
  { at: [0, 1.95, 36], d0: 7 },
  { at: [0, 1.65, 50], d0: 6 },
]

/* Set back a little further than a real yard sign would be: the extra metre
   is what keeps the whole board — mark included — inside a phone's frame. */
export const SIGN = { x: -3.3, z: 6.8, halfW: 1.15, y0: 0.95, y1: 2.55 }

/* ============================================================
   Scene
   ============================================================ */
export function buildScene(tex = {}) {
  const faces = []

  /* shade: how much light the surface catches, before fog. */
  /* `proud` is how far a face is mounted in front of the surface behind it —
     a window in a facade, a picture on a wall, a tag on a crate. Those sit a
     few centimetres out, which is nowhere near enough for a centroid to sort
     them reliably against the metres-wide wall they hang on, so they declare
     the intent instead and drawList pulls them forward by that much. Keep the
     values well under the clearance to whatever stands in front (a bookcase is
     0.7m off the wall), or they will jump ahead of that too. */
  const face = (pts, col, shade = 1, opts = {}) =>
    faces.push({ pts, col, shade, glow: opts.glow || 0, tex: opts.tex || null, proud: opts.proud || 0 })

  /* A horizontal slab of ground, floor or ceiling. */
  const slab = (x0, z0, x1, z1, y, col, shade, opts) =>
    face([[x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1]], col, shade, opts)

  /* Vertical planes: one running along z at a fixed x, one along x at a fixed z. */
  const wallX = (x, z0, z1, y0, y1, col, shade, opts) =>
    face([[x, y0, z0], [x, y0, z1], [x, y1, z1], [x, y1, z0]], col, shade, opts)
  const wallZ = (z, x0, x1, y0, y1, col, shade, opts) =>
    face([[x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z]], col, shade, opts)

  /* Big horizontal surfaces get cut into z-strips. Two reasons: a painter's
     sort keys off one depth per face, so a floor spanning fourteen metres
     sorts as a single distance and loses to (or beats) everything standing on
     it; and strips take the distance fog individually, which is what gives a
     long floor or ceiling its gradient. */
  const stripSlab = (x0, z0, x1, z1, y, col, shade, opts, step = 2) => {
    for (let z = z0; z < z1 - 1e-6; z += step) slab(x0, z, x1, Math.min(z + step, z1), y, col, shade, opts)
  }

  /* Same again for a wall that runs across the view rather than into it. The
     facade is fifteen metres wide, and one centroid for it sits four metres out
     to the side of the door — far enough that the hallway just inside sorted in
     front of the house. */
  const wallZRun = (z, x0, x1, y0, y1, col, shade, opts, step = 2) => {
    for (let x = x0; x < x1 - 1e-6; x += step) wallZ(z, x, Math.min(x + step, x1), y0, y1, col, shade, opts)
  }

  /* A long wall, cut into z-segments. One depth for a fourteen-metre wall
     sorts the whole thing by its midpoint, so everything past that point in the
     room ends up painted over — furniture reads as buried in the wall. */
  const wallRunX = (x, z0, z1, y0, y1, col, shade, opts, step = 2) => {
    for (let z = z0; z < z1 - 1e-6; z += step) wallX(x, z, Math.min(z + step, z1), y0, y1, col, shade, opts)
  }

  /* Anything lying ON a floor — a rug, a runner — is cut OUT of the floor
     rather than laid over it. Overlapping coplanar surfaces have no stable
     painter's order at all, so the fix is to not overlap them. */
  const floorAround = (x0, z0, x1, z1, y, col, shade, hole, step = 2) => {
    const [hx0, hz0, hx1, hz1] = hole
    stripSlab(x0, z0, x1, hz0, y, col, shade, undefined, step)
    stripSlab(x0, hz1, x1, z1, y, col, shade, undefined, step)
    stripSlab(x0, hz0, hx0, hz1, y, col, shade, undefined, step)
    stripSlab(hx1, hz0, x1, hz1, y, col, shade, undefined, step)
  }

  /* The five visible faces of an axis-aligned box (the underside never shows). */
  const box = (cx, cz, w, h, d, col, y0 = 0) => {
    const x0 = cx - w / 2, x1 = cx + w / 2, z0 = cz - d / 2, z1 = cz + d / 2, y1 = y0 + h
    slab(x0, z0, x1, z1, y1, col, 1.0)
    wallZ(z0, x0, x1, y0, y1, col, 0.86)
    wallZ(z1, x0, x1, y0, y1, col, 0.6)
    wallX(x0, z0, z1, y0, y1, col, 0.72)
    wallX(x1, z0, z1, y0, y1, col, 0.78)
  }

  /* ---- ground and driveway ----
     Lawn, verge and driveway are laid side by side rather than stacked, so no
     two of them ever fight for the same pixels. */
  stripSlab(-60, -22, -2.62, DOOR_Z, 0, [10, 32, 60], 1, undefined, 4)
  stripSlab(2.62, -22, 60, DOOR_Z, 0, [10, 32, 60], 1, undefined, 4)
  stripSlab(-2.62, -22, -2.1, 24.6, 0, [16, 40, 70], 1, undefined, 4)
  stripSlab(2.1, -22, 2.62, 24.6, 0, [16, 40, 70], 1, undefined, 4)
  /* Paving bands: alternating tone gives the eye something to measure speed
     against, and the last few pick up the light coming out of the door. */
  for (let z = -22, i = 0; z < 24.6; z += 2.4, i++) {
    const warmth = clamp((z - 15) / 11) * 0.5
    const base = i % 2 ? [24, 48, 80] : [31, 57, 92]
    slab(-2.1, z, 2.1, Math.min(z + 2.4, 24.6), 0, mix(base, LIT, warmth * 0.34), 1)
  }

  /* ---- trees: billboard silhouettes, thinning out toward the house ---- */
  const trees = [
    [-5.2, 1.5, 2.9], [5.6, 3.5, 3.2], [-7.4, 7, 3.6], [6.2, 9.5, 2.6],
    [-5.8, 12.5, 3.1], [7.8, 14, 3.8], [-8.2, 17.5, 3.3], [5.4, 19, 2.4],
    [-6.4, 21.5, 2.8], [8.6, 22.5, 3.5], [-11, 9, 4.2], [11, 6, 4.4],
  ]
  for (const [x, z, h] of trees) {
    const w = h * 0.42
    face([[x - 0.12, 0, z], [x + 0.12, 0, z], [x + 0.12, h * 0.42, z], [x - 0.12, h * 0.42, z]], [10, 26, 44], 1)
    face([[x - w, h * 0.3, z], [x + w, h * 0.3, z], [x, h, z]], [7, 22, 40], 1)
    face([[x - w * 0.72, h * 0.55, z], [x + w * 0.72, h * 0.55, z], [x, h * 1.18, z]], [9, 27, 46], 1)
  }

  /* ---- the yard sign: the logo, right where the walk starts ---- */
  face(
    [[SIGN.x - 0.11, 0, SIGN.z], [SIGN.x + 0.11, 0, SIGN.z], [SIGN.x + 0.11, 0.95, SIGN.z], [SIGN.x - 0.11, 0.95, SIGN.z]],
    [190, 195, 200], 0.9
  )
  face(
    [[SIGN.x - SIGN.halfW, SIGN.y0, SIGN.z], [SIGN.x + SIGN.halfW, SIGN.y0, SIGN.z],
     [SIGN.x + SIGN.halfW, SIGN.y1, SIGN.z], [SIGN.x - SIGN.halfW, SIGN.y1, SIGN.z]],
    CREAM, 1, { tex: tex.sign }
  )

  /* ---- the house ----
     A two-storey colonial: lap siding, shuttered sash windows, a columned
     portico under its pediment, dormers and a chimney on a side-gabled roof.
     It is all flat quads. What makes it read as a house rather than a box is
     the TRIM — thin bands of a lighter or darker tone everywhere a real house
     has a lap joint, a sill, a lintel, a corner board or a fascia. */
  const FW = 7.4                       // facade half-width
  const EAVE = 5.9                     // where the wall stops and the roof starts
  const RIDGE_Y = 7.9, RIDGE_Z = 30.6
  const DOOR_HW = 1.0, DOOR_H = 2.35
  const TRIM = mix(SIDING, WHITE, 0.28)
  const SHUTTER = mix(NAVY, SIDING, 0.16)
  const ROOF = mix(NAVY_D, [34, 38, 50], 0.55)
  const BRICK = [92, 60, 52]

  // the wall itself, split around the doorway
  wallZRun(DOOR_Z, -FW, -DOOR_HW, 0, EAVE, SIDING, 0.76)
  wallZRun(DOOR_Z, DOOR_HW, FW, 0, EAVE, SIDING, 0.76)
  wallZ(DOOR_Z, -DOOR_HW, DOOR_HW, DOOR_H, EAVE, SIDING, 0.76)

  /* Lap courses. One shadow line every 42cm is the whole difference between
     siding and a painted panel; the doorway has to be stepped around. */
  for (let y = 0.42; y < EAVE - 0.12; y += 0.42) {
    const c = mix(SIDING, NAVY_D, 0.34)
    if (y < DOOR_H) {
      wallZ(DOOR_Z - 0.01, -FW, -DOOR_HW, y, y + 0.045, c, 0.8, { proud: 0.4 })
      wallZ(DOOR_Z - 0.01, DOOR_HW, FW, y, y + 0.045, c, 0.8, { proud: 0.4 })
    } else {
      wallZ(DOOR_Z - 0.01, -FW, FW, y, y + 0.045, c, 0.8, { proud: 0.4 })
    }
  }
  // storey band and corner boards
  wallZ(DOOR_Z - 0.02, -FW, FW, 3.04, 3.22, TRIM, 0.86, { proud: 0.44 })
  wallZ(DOOR_Z - 0.02, -FW, -FW + 0.26, 0, EAVE, TRIM, 0.82, { proud: 0.44 })
  wallZ(DOOR_Z - 0.02, FW - 0.26, FW, 0, EAVE, TRIM, 0.82, { proud: 0.44 })
  wallZ(DOOR_Z - 0.02, -FW, FW, EAVE - 0.24, EAVE, TRIM, 0.9, { proud: 0.44 })

  /* A sash window: casing, lit glass, muntins, sill and a pair of shutters.
     Six pieces of trim, and it stops being a glowing rectangle. */
  const sashWindow = (cx, y0, y1, hw) => {
    const my = (y0 + y1) / 2
    wallZ(DOOR_Z - 0.03, cx - hw - 0.13, cx + hw + 0.13, y0 - 0.11, y1 + 0.13, TRIM, 0.92, { proud: 0.56 })
    wallZ(DOOR_Z - 0.04, cx - hw, cx + hw, y0, y1, LIT, 0.86, { glow: 0.24, proud: 0.6 })
    wallZ(DOOR_Z - 0.05, cx - 0.025, cx + 0.025, y0, y1, TRIM, 0.95, { proud: 0.64 })
    wallZ(DOOR_Z - 0.05, cx - hw, cx + hw, my - 0.03, my + 0.03, TRIM, 0.95, { proud: 0.64 })
    wallZ(DOOR_Z - 0.06, cx - hw - 0.2, cx + hw + 0.2, y0 - 0.18, y0 - 0.09, TRIM, 1, { proud: 0.68 })
    wallZ(DOOR_Z - 0.02, cx - hw - 0.46, cx - hw - 0.15, y0 - 0.05, y1 + 0.07, SHUTTER, 0.78, { proud: 0.52 })
    wallZ(DOOR_Z - 0.02, cx + hw + 0.15, cx + hw + 0.46, y0 - 0.05, y1 + 0.07, SHUTTER, 0.78, { proud: 0.52 })
  }
  for (const cx of [-5.9, -3.4, 3.4, 5.9]) sashWindow(cx, 1.15, 2.78, 0.72)
  for (const cx of [-5.9, -3.4, 0, 3.4, 5.9]) sashWindow(cx, 3.62, 5.0, 0.62)

  /* The doorway: casing, a fanlight over it, sidelights either side, and a
     little entablature on top — the part of a colonial you actually look at. */
  wallZ(DOOR_Z - 0.02, -DOOR_HW - 0.16, -DOOR_HW, 0, DOOR_H + 0.16, TRIM, 0.9, { proud: 0.56 })
  wallZ(DOOR_Z - 0.02, DOOR_HW, DOOR_HW + 0.16, 0, DOOR_H + 0.16, TRIM, 0.9, { proud: 0.56 })
  wallZ(DOOR_Z - 0.02, -DOOR_HW - 0.16, DOOR_HW + 0.16, DOOR_H, DOOR_H + 0.16, TRIM, 0.94, { proud: 0.56 })
  wallZ(DOOR_Z - 0.03, -DOOR_HW - 0.5, DOOR_HW + 0.5, DOOR_H + 0.16, DOOR_H + 0.34, TRIM, 1, { proud: 0.6 })
  wallZ(DOOR_Z - 0.04, -0.72, 0.72, DOOR_H + 0.36, DOOR_H + 0.72, LIT, 0.86, { glow: 0.22, proud: 0.62 })
  for (const sx of [-1.34, 1.34]) {
    wallZ(DOOR_Z - 0.03, sx - 0.16, sx + 0.16, 0.5, DOOR_H - 0.05, LIT, 0.8, { glow: 0.16, proud: 0.6 })
    wallZ(DOOR_Z - 0.02, sx - 0.24, sx + 0.24, 0.34, 0.5, TRIM, 0.9, { proud: 0.56 })
  }

  // the open door, swung back into the hall
  face(
    [[-DOOR_HW, 0, DOOR_Z + 0.05], [-DOOR_HW + 0.28, 0, DOOR_Z + 1.95],
     [-DOOR_HW + 0.28, DOOR_H, DOOR_Z + 1.95], [-DOOR_HW, DOOR_H, DOOR_Z + 0.05]],
    RED, 0.72
  )

  /* Roof: side-gabled, sloping away from the eave. Banded along the slope both
     so it sorts and so the fog steps across it. */
  const BANDS = 5
  for (let i = 0; i < BANDS; i++) {
    const t0 = i / BANDS, t1 = (i + 1) / BANDS
    const z0 = 25.45 + (RIDGE_Z - 25.45) * t0, z1 = 25.45 + (RIDGE_Z - 25.45) * t1
    const y0 = EAVE + (RIDGE_Y - EAVE) * t0, y1 = EAVE + (RIDGE_Y - EAVE) * t1
    face([[-FW - 0.6, y0, z0], [FW + 0.6, y0, z0], [FW + 0.6, y1, z1], [-FW - 0.6, y1, z1]], ROOF, 0.74 - i * 0.035)
  }
  slab(-FW - 0.6, 25.45, FW + 0.6, DOOR_Z, EAVE, mix(TRIM, NAVY, 0.35), 0.55)   // soffit
  wallZ(25.44, -FW - 0.6, FW + 0.6, EAVE, EAVE + 0.28, TRIM, 0.82)              // fascia
  wallZ(25.42, -FW - 0.6, FW + 0.6, EAVE - 0.1, EAVE, mix(NAVY_D, NAVY, 0.4), 0.9) // gutter

  // dormers on the slope
  for (const dx of [-3.4, 3.4]) {
    const dz = 27.5
    const by = EAVE + (RIDGE_Y - EAVE) * ((dz - 25.45) / (RIDGE_Z - 25.45)) - 0.35
    box(dx, dz + 0.55, 1.55, 1.1, 1.1, SIDING, by)
    face([[dx - 0.86, by + 1.1, dz], [dx + 0.86, by + 1.1, dz], [dx, by + 1.78, dz]], mix(SIDING, NAVY, 0.28), 0.82)
    wallZ(dz - 0.02, dx - 0.62, dx + 0.62, by + 1.06, by + 1.2, TRIM, 0.95, { proud: 0.3 })
    wallZ(dz - 0.03, dx - 0.4, dx + 0.4, by + 0.2, by + 0.95, LIT, 0.86, { glow: 0.2, proud: 0.34 })
  }

  // chimney
  box(6.1, 29.4, 1.05, 3.6, 1.05, BRICK, 6.0)
  box(6.1, 29.4, 1.25, 0.16, 1.25, mix(BRICK, WHITE, 0.25), 9.6)

  /* ---- the portico ---- */
  for (let i = 0; i < 3; i++) {   // steps
    const y = 0.15 * i
    slab(-2.6 + i * 0.1, 23.9 + i * 0.24, 2.6 - i * 0.1, 24.62, y + 0.15, mix(SIDING, NAVY, 0.2), 0.9)
    wallZ(23.9 + i * 0.24, -2.6 + i * 0.1, 2.6 - i * 0.1, y, y + 0.15, mix(SIDING, NAVY, 0.42), 0.72)
  }
  slab(-3.5, 24.6, 3.5, DOOR_Z, 0.45, mix(SIDING, NAVY, 0.14), 0.88)              // deck
  wallZ(24.6, -3.5, 3.5, 0.28, 0.45, mix(SIDING, NAVY, 0.4), 0.74)
  for (const cx of [-3.05, -1.75, 1.75, 3.05]) {                                   // columns
    box(cx, 25.15, 0.34, 0.14, 0.34, TRIM, 0.45)
    box(cx, 25.15, 0.26, 3.0, 0.26, SIDING, 0.59)
    box(cx, 25.15, 0.36, 0.16, 0.36, TRIM, 3.59)
  }
  for (const [a, b] of [[-3.05, -1.75], [1.75, 3.05]]) {                            // railings
    box((a + b) / 2, 25.15, b - a - 0.3, 0.1, 0.14, TRIM, 1.0)
    box((a + b) / 2, 25.15, b - a - 0.3, 0.08, 0.14, TRIM, 0.5)
    for (let x = a + 0.28; x < b - 0.2; x += 0.22) box(x, 25.15, 0.06, 0.5, 0.06, TRIM, 0.52)
  }
  slab(-3.6, 24.5, 3.6, DOOR_Z, 3.75, mix(SIDING, NAVY, 0.5), 0.55)                // portico ceiling
  wallZ(24.48, -3.6, 3.6, 3.75, 4.02, TRIM, 0.8)                                   // its fascia
  face([[-3.6, 4.02, 24.5], [3.6, 4.02, 24.5], [0, 5.25, 24.5]], mix(SIDING, NAVY, 0.2), 0.85)  // pediment
  face([[-3.3, 4.06, 24.46], [3.3, 4.06, 24.46], [0, 5.02, 24.46]], mix(SIDING, NAVY, 0.34), 0.8)
  // porch lanterns either side of the door
  for (const lx of [-1.85, 1.85]) {
    box(lx, 25.9, 0.16, 0.34, 0.16, LIT, 2.35)
    box(lx, 25.9, 0.2, 0.06, 0.2, mix(NAVY_D, NAVY, 0.5), 2.69)
  }

  /* Bunting along the portico rail — the red, white and blue that hangs at
     every one of these sales. */
  for (const bx of [-2.4, 0, 2.4]) {
    /* Shade rather than colour does the work here: the copy passes right over
       this bunting on the way to the door, and a white band at full strength
       is the brightest thing in the frame. */
    const cols = [[RED, 0.82], [CREAM, 0.68], [NAVY, 0.95]]
    for (let i = 0; i < 3; i++) {
      const x0 = bx - 0.54 + i * 0.36, x1 = x0 + 0.36
      const [c, sh] = cols[i]
      wallZ(24.44, x0, x1, 3.34, 3.74, c, sh)
      face([[x0, 3.34, 24.44], [x1, 3.34, 24.44], [(x0 + x1) / 2, 3.08, 24.44]], c, sh * 0.92)
    }
  }

  // light out of the doorway, onto the deck and down the steps
  slab(-1.5, 24.5, 1.5, DOOR_Z, 0.46, mix(LIT, [70, 58, 50], 0.42), 1, { glow: 0.12 })

  /* ---- planting ---- */
  for (const [bx, bz, bw, bh] of [
    [-6.2, 25.4, 1.5, 0.85], [-4.6, 25.4, 1.2, 0.65], [-3.0, 25.4, 1.0, 0.5],
    [3.0, 25.4, 1.0, 0.5], [4.6, 25.4, 1.2, 0.68], [6.2, 25.4, 1.5, 0.88],
  ]) {
    box(bx, bz, bw, bh * 0.6, 0.9, [16, 40, 34], 0)
    face([[bx - bw / 2, bh * 0.6, bz - 0.45], [bx + bw / 2, bh * 0.6, bz - 0.45], [bx, bh + 0.3, bz - 0.45]], [13, 34, 30], 0.95)
  }
  for (const ux of [-2.55, 2.55]) {   // urns flanking the steps
    box(ux, 24.9, 0.42, 0.5, 0.42, mix(SIDING, NAVY, 0.3), 0.45)
    face([[ux - 0.3, 0.95, 24.7], [ux + 0.3, 0.95, 24.7], [ux, 1.7, 24.7]], [15, 38, 32], 0.95)
  }
  for (const lz of [15.5, 20.5]) {    // lamp posts down the drive
    for (const lx of [-2.95, 2.95]) {
      box(lx, lz, 0.14, 2.1, 0.14, mix(NAVY_D, NAVY, 0.6), 0)
      box(lx, lz, 0.3, 0.34, 0.3, LIT, 2.1)
      slab(lx - 0.2, lz - 0.2, lx + 0.2, lz + 0.2, 2.44, mix(NAVY_D, NAVY, 0.4), 0.9)
    }
  }

  /* ---- inside: the hall, then the living room ---- */
  const HALL_HW = 2.6, HALL_END = 38, ROOM_HW = 5.6, ROOM_END = 52
  floorAround(-HALL_HW, DOOR_Z, HALL_HW, HALL_END, 0, WOOD, 0.92, [-1.1, DOOR_Z + 1, 1.1, HALL_END - 2])
  stripSlab(-HALL_HW, DOOR_Z, HALL_HW, HALL_END, 2.95, INT_CEIL, 0.9)
  wallRunX(-HALL_HW, DOOR_Z, HALL_END, 0, 2.95, INT_WALL, 0.78)
  wallRunX(HALL_HW, DOOR_Z, HALL_END, 0, 2.95, INT_WALL, 0.88)
  wallZ(DOOR_Z + 0.5, -HALL_HW, -DOOR_HW, 0, 2.95, INT_WALL, 0.7)
  wallZ(DOOR_Z + 0.5, DOOR_HW, HALL_HW, 0, 2.95, INT_WALL, 0.7)
  wallZ(DOOR_Z + 0.5, -DOOR_HW, DOOR_HW, DOOR_H, 2.95, INT_WALL, 0.7)
  // the reveal you pass through: the thickness of the wall in the opening
  wallX(-DOOR_HW, DOOR_Z, DOOR_Z + 0.5, 0, DOOR_H, mix(INT_WALL, WHITE, 0.25), 0.62)
  wallX(DOOR_HW, DOOR_Z, DOOR_Z + 0.5, 0, DOOR_H, mix(INT_WALL, WHITE, 0.25), 0.7)
  slab(-DOOR_HW, DOOR_Z, DOOR_HW, DOOR_Z + 0.5, DOOR_H, mix(INT_WALL, WHITE, 0.15), 0.5)

  /* Trim. A baseboard, panelling under a chair rail, a crown at the ceiling:
     three thin bands are the whole difference between a corridor and a hall.
     Each runs in segments like the wall it hangs on — a twelve-metre band with
     one centroid would lose to the near end of its own wall. */
  const INT_TRIM = mix(INT_WALL, WHITE, 0.46)
  const WAINSCOT = mix(INT_WALL, WHITE, 0.2)
  for (const [wx, sh] of [[-HALL_HW, 0.78], [HALL_HW, 0.88]]) {
    const dx = wx < 0 ? 0.04 : -0.04
    wallRunX(wx + dx, DOOR_Z, HALL_END, 0, 0.17, INT_TRIM, sh, { proud: 0.46 })
    wallRunX(wx + dx * 0.6, DOOR_Z, HALL_END, 0.17, 0.94, WAINSCOT, sh, { proud: 0.44 })
    wallRunX(wx + dx, DOOR_Z, HALL_END, 0.94, 1.05, INT_TRIM, sh, { proud: 0.46 })
    wallRunX(wx + dx, DOOR_Z, HALL_END, 2.76, 2.95, INT_TRIM, sh, { proud: 0.46 })
    for (let z = DOOR_Z + 0.9; z < HALL_END - 1.2; z += 1.6) {
      wallX(wx + dx * 1.8, z, z + 1.15, 0.3, 0.82, mix(WAINSCOT, WHITE, 0.14), sh, { proud: 0.5 })
    }
  }

  // runner
  stripSlab(-1.1, DOOR_Z + 1, 1.1, HALL_END - 2, 0, mix(NAVY, WHITE, 0.15), 0.95)
  stripSlab(-0.86, DOOR_Z + 1.3, 0.86, HALL_END - 2.3, 0, mix(NAVY, WHITE, 0.3), 0.95)

  /* Console table under a mirror — legs, not a block. Nothing in a house is a
     solid lump to the floor, and the gap under a table is most of what tells
     you it is furniture. */
  box(-2.15, 31, 0.5, 0.06, 1.4, mix(WOOD, WHITE, 0.22), 0.76)
  box(-2.15, 31, 0.44, 0.05, 1.3, WOOD_D, 0.5)
  for (const lz of [30.42, 31.58]) {
    box(-2.34, lz, 0.07, 0.76, 0.07, WOOD_D, 0)
    box(-1.96, lz, 0.07, 0.76, 0.07, WOOD_D, 0)
  }
  box(-2.15, 30.72, 0.24, 0.36, 0.24, LIT, 0.82)
  box(-2.15, 31.36, 0.2, 0.26, 0.2, mix(NAVY, WHITE, 0.3), 0.82)
  wallX(-HALL_HW + 0.05, 30.3, 31.7, 1.45, 2.45, mix(WOOD_D, WHITE, 0.3), 0.78, { proud: 0.6 })
  wallX(-HALL_HW + 0.07, 30.42, 31.58, 1.55, 2.35, mix(NAVY, WHITE, 0.28), 0.78, { proud: 0.62 })

  /* Pictures, matted and framed rather than flat rectangles. */
  const framedX = (wx, z0, z1, y0, y1, sh) => {
    const dx = wx < 0 ? 0.04 : -0.04
    wallX(wx + dx, z0, z1, y0, y1, mix(WOOD_D, WHITE, 0.2), sh, { proud: 0.58 })
    wallX(wx + dx * 1.5, z0 + 0.09, z1 - 0.09, y0 + 0.09, y1 - 0.09, mix(BONE, WARM, 0.45), sh, { proud: 0.6 })
    wallX(wx + dx * 2, z0 + 0.19, z1 - 0.19, y0 + 0.19, y1 - 0.19, mix(NAVY, WARM, 0.32), sh, { proud: 0.62 })
  }
  for (const z of [33.2, 35.4]) framedX(-HALL_HW, z, z + 0.95, 1.4, 2.2, 0.8)
  for (const z of [29.4, 31.8, 34.6]) framedX(HALL_HW, z, z + 0.9, 1.45, 2.15, 0.85)

  /* The staircase — a hall in a house like this has one, and a flight of
     treads climbing out of frame says "estate" faster than any amount of
     furniture. */
  for (let i = 0; i < 10; i++) {
    const y = i * 0.19, z = 33.6 + i * 0.29
    box(1.88, z, 1.4, 0.19, 0.29, mix(WOOD, WHITE, 0.05), y)
    box(1.88, z - 0.02, 1.44, 0.035, 0.3, mix(WOOD, WHITE, 0.3), y + 0.19)
    if (i % 2 === 0) box(1.2, z, 0.07, 0.95 + y, 0.07, WOOD_D, y + 0.19)
  }

  // ceiling lights
  for (const z of [30, 35, 41, 47]) {
    const hw = z < HALL_END ? 0.5 : 0.8
    slab(-hw, z, hw, z + 0.5, z < HALL_END ? 2.93 : 3.28, LIT, 0.9, { glow: 0.34 })
  }

  floorAround(-ROOM_HW, HALL_END, ROOM_HW, ROOM_END, 0, WOOD, 0.92, [-4.1, 44, 4.1, 51])
  stripSlab(-ROOM_HW, HALL_END, ROOM_HW, ROOM_END, 3.3, INT_CEIL, 0.88)
  wallRunX(-ROOM_HW, HALL_END, ROOM_END, 0, 3.3, INT_WALL, 0.78)
  wallRunX(ROOM_HW, HALL_END, ROOM_END, 0, 3.3, INT_WALL, 0.88)
  for (const [wx, sh] of [[-ROOM_HW, 0.78], [ROOM_HW, 0.88]]) {
    const dx = wx < 0 ? 0.04 : -0.04
    wallRunX(wx + dx, HALL_END, ROOM_END, 0, 0.19, INT_TRIM, sh, { proud: 0.46 })
    wallRunX(wx + dx, HALL_END, ROOM_END, 3.06, 3.3, INT_TRIM, sh, { proud: 0.46 })
  }
  wallZ(ROOM_END - 0.03, -ROOM_HW, ROOM_HW, 0, 0.19, INT_TRIM, 0.95, { proud: 0.4 })
  wallZ(ROOM_END - 0.03, -ROOM_HW, ROOM_HW, 3.06, 3.3, INT_TRIM, 0.95, { proud: 0.4 })
  // ceiling beams, in thirds so no single face spans the room
  for (const bz of [41.2, 44.8, 48.4, 51.2]) {
    for (const bx of [-3.73, 0, 3.73]) box(bx, bz, 3.73, 0.2, 0.28, mix(WOOD_D, INT_CEIL, 0.45), 3.1)
  }
  wallZ(ROOM_END, -ROOM_HW, ROOM_HW, 0, 3.3, INT_WALL, 0.95)
  // the wall the hallway punches through
  wallZ(HALL_END, -ROOM_HW, -HALL_HW, 0, 3.3, INT_WALL, 0.62)
  wallZ(HALL_END, HALL_HW, ROOM_HW, 0, 3.3, INT_WALL, 0.62)
  wallZ(HALL_END, -HALL_HW, HALL_HW, 2.95, 3.3, INT_WALL, 0.62)
  // the cased opening between the two
  wallZ(HALL_END - 0.03, -HALL_HW - 0.22, -HALL_HW + 0.16, 0, 3.02, INT_TRIM, 0.66, { proud: 0.5 })
  wallZ(HALL_END - 0.03, HALL_HW - 0.16, HALL_HW + 0.22, 0, 3.02, INT_TRIM, 0.66, { proud: 0.5 })
  wallZ(HALL_END - 0.03, -HALL_HW - 0.22, HALL_HW + 0.22, 2.78, 3.02, INT_TRIM, 0.68, { proud: 0.5 })

  /* ---- the living room, staged as a sale ----
     Not a furnished room: a room that has been WORKED. Draped display tables,
     everything out where it can be seen, glass for the small valuable things,
     lamps lit on every surface, and a tag on all of it. */
  const LINEN = mix(BONE, WARM, 0.3)
  const RUG = mix(NAVY, WHITE, 0.22), RUG_IN = mix(NAVY, WHITE, 0.34)
  stripSlab(-4.1, 44, 4.1, 44.4, 0, RUG, 0.95)
  stripSlab(-4.1, 50.6, 4.1, 51, 0, RUG, 0.95)
  stripSlab(-4.1, 44.4, -3.8, 50.6, 0, RUG, 0.95)
  stripSlab(3.8, 44.4, 4.1, 50.6, 0, RUG, 0.95)
  floorAround(-3.8, 44.4, 3.8, 50.6, 0, RUG_IN, 0.95, [-1.95, 46.2, 1.95, 48.8])
  floorAround(-1.95, 46.2, 1.95, 48.8, 0, mix(RED_D, WOOD_D, 0.5), 0.95, [-1.2, 46.9, 1.2, 48.1])
  stripSlab(-1.2, 46.9, 1.2, 48.1, 0, mix(BONE, WARM, 0.55), 0.95)

  /* A price tag hung on the face of something, turned toward the camera. */
  const tag = (x, z, y) => {
    wallZ(z - 0.005, x - 0.16, x + 0.16, y - 0.22, y, CREAM, 1, { proud: 0.3 })
    wallZ(z - 0.015, x - 0.185, x + 0.185, y - 0.255, y - 0.205, RED, 1, { proud: 0.32 })
  }

  /* A draped table with its lots set out on top. `items` are [dx, dz, w, h, d,
     colour] relative to the table centre; the last one usually gets the tag. */
  const displayTable = (cx, cz, w, d, items, h = 0.76) => {
    box(cx, cz, w * 0.94, h, d * 0.92, LINEN, 0)            // the drape
    box(cx, cz, w, 0.05, d, mix(WOOD, WHITE, 0.15), h)      // the top
    for (const [dx, dz, iw, ih, id, col, lit] of items) {
      box(cx + dx, cz + dz, iw, ih, id, col, h + 0.05)
      if (lit) box(cx + dx, cz + dz, iw * 0.72, 0.04, id * 0.72, LIT, h + 0.05 + ih)
    }
    tag(cx + w * 0.28, cz - d / 2, h - 0.06)
  }

  // seating group, angled around the fireplace
  /* Seating. Everything stands on legs with daylight under it — a sofa that
     meets the floor along its whole length reads as a crate, whatever colour
     it is. Arms and a back give it a silhouette from the side as well. */
  box(-3.6, 49.4, 1.05, 0.6, 2.9, NAVY, 0.2)                              // sofa seat
  box(-3.85, 49.4, 0.44, 1.15, 2.9, mix(NAVY, WHITE, 0.1), 0.2)           // back
  box(-3.55, 48.12, 1.15, 0.32, 0.34, mix(NAVY, WHITE, 0.06), 0.5)        // arms
  box(-3.55, 50.68, 1.15, 0.32, 0.34, mix(NAVY, WHITE, 0.06), 0.5)
  for (const [lx, lz] of [[-3.25, 48.15], [-3.95, 48.15], [-3.25, 50.65], [-3.95, 50.65]]) {
    box(lx, lz, 0.09, 0.2, 0.09, WOOD_D, 0)
  }
  box(-3.5, 48.75, 0.52, 0.16, 0.5, mix(BONE, WARM, 0.4), 0.8)            // cushions
  box(-3.5, 50.05, 0.52, 0.16, 0.5, mix(RED, WHITE, 0.35), 0.8)
  tag(-3.05, 47.95, 0.74)

  const wingChair = (cx, cz, col) => {
    box(cx, cz, 1.0, 0.42, 1.05, col, 0.22)                                // seat
    box(cx + 0.3, cz, 0.4, 1.15, 1.05, mix(col, WHITE, 0.12), 0.22)        // back
    box(cx - 0.06, cz - 0.5, 0.86, 0.26, 0.16, mix(col, WHITE, 0.08), 0.6) // arms
    box(cx - 0.06, cz + 0.5, 0.86, 0.26, 0.16, mix(col, WHITE, 0.08), 0.6)
    box(cx, cz, 0.78, 0.14, 0.82, mix(col, BONE, 0.3), 0.62)               // cushion
    for (const [lx, lz] of [[cx - 0.4, cz - 0.42], [cx + 0.4, cz - 0.42], [cx - 0.4, cz + 0.42], [cx + 0.4, cz + 0.42]]) {
      box(lx, lz, 0.08, 0.22, 0.08, WOOD_D, 0)
    }
  }
  wingChair(3.15, 48.4, RED_D)
  wingChair(3.3, 50.4, mix(WOOD_D, RED, 0.3))
  tag(3.15, 47.85, 0.72)

  // coffee table, laid out with books and a bowl — on legs, with a shelf under
  box(-0.2, 49.2, 1.7, 0.06, 0.95, mix(WOOD, WHITE, 0.2), 0.42)
  box(-0.2, 49.2, 1.5, 0.05, 0.78, WOOD_D, 0.2)
  for (const [lx, lz] of [[-0.95, 48.82], [0.55, 48.82], [-0.95, 49.58], [0.55, 49.58]]) {
    box(lx, lz, 0.08, 0.42, 0.08, WOOD_D, 0)
  }
  box(-0.55, 49.05, 0.42, 0.09, 0.32, mix(BONE, WOOD, 0.3), 0.5) // stacked books
  box(-0.55, 49.05, 0.38, 0.07, 0.28, mix(NAVY, WHITE, 0.25), 0.59)
  box(0.3, 49.35, 0.34, 0.18, 0.34, mix(NAVY, WHITE, 0.45), 0.5) // bowl
  tag(0.62, 48.72, 0.42)
  // the same logo again, printed small: a card propped on the coffee table
  face(
    [[-0.35, 0.5, 48.88], [0.21, 0.5, 48.88], [0.21, 0.89, 48.88], [-0.35, 0.89, 48.88]],
    WHITE, 1, { tex: tex.sign }
  )

  // display tables — the heart of the boutique look
  /* The checkout table under its branded navy cover — the shot the reference
     clip ends on, and the one piece of staging that had to be in here by name.
     The cover's front panel faces the camera square on, so the artwork blits
     into it flat, the same trick the yard sign uses. */
  const CHK = { x: -2.35, z: 42.6, w: 2.4, d: 1.0, h: 0.8 }
  box(CHK.x, CHK.z, CHK.w, CHK.h, CHK.d, NAVY, 0)
  face(
    [[CHK.x - CHK.w / 2, 0.02, CHK.z - CHK.d / 2 - 0.02], [CHK.x + CHK.w / 2, 0.02, CHK.z - CHK.d / 2 - 0.02],
     [CHK.x + CHK.w / 2, CHK.h, CHK.z - CHK.d / 2 - 0.02], [CHK.x - CHK.w / 2, CHK.h, CHK.z - CHK.d / 2 - 0.02]],
    NAVY, 1, { tex: tex.cover, proud: 0.3 }
  )
  box(CHK.x, CHK.z, CHK.w + 0.06, 0.05, CHK.d + 0.06, mix(NAVY, WHITE, 0.12), CHK.h)
  box(CHK.x - 0.75, CHK.z - 0.1, 0.4, 0.22, 0.3, mix(WOOD_D, WHITE, 0.2), 0.85)  // cash box
  box(CHK.x + 0.1, CHK.z + 0.05, 0.5, 0.06, 0.36, CREAM, 0.85)                   // tag stock
  box(CHK.x + 0.75, CHK.z - 0.05, 0.3, 0.36, 0.3, LIT, 0.85)                     // lamp
  displayTable(2.4, 42.2, 1.6, 0.9, [
    [-0.5, 0.05, 0.34, 0.28, 0.24, LIT, true],                 // lamp, lit
    [0, -0.1, 0.4, 0.12, 0.3, mix(BONE, WHITE, 0.5)],          // stacked china
    [0, -0.1, 0.34, 0.1, 0.26, mix(BONE, WHITE, 0.7)],
    [0.5, 0.08, 0.24, 0.36, 0.24, mix(NAVY, WHITE, 0.15)],
  ])
  displayTable(-4.6, 45.6, 1.0, 2.0, [
    [0, -0.55, 0.3, 0.4, 0.3, mix(WOOD, RED, 0.25)],
    [0, 0.1, 0.34, 0.26, 0.34, mix(BONE, WARM, 0.35)],
    [0, 0.7, 0.26, 0.5, 0.26, mix(NAVY, WHITE, 0.2)],
  ])

  // glass case for the small valuable things, lit from within
  box(4.6, 44.6, 0.75, 0.85, 1.8, WOOD_D, 0)
  box(4.6, 44.6, 0.7, 0.5, 1.72, mix(NAVY, WARM, 0.25), 0.85)
  wallZ(43.72, 4.3, 4.9, 0.95, 1.3, LIT, 0.9, { glow: 0.24, proud: 0.3 })
  box(4.6, 44.6, 0.74, 0.05, 1.76, mix(BONE, WHITE, 0.6), 1.35)
  tag(4.6, 43.7, 0.8)

  // sideboard under the window, lamps on it
  box(-4.85, 41.4, 0.55, 0.9, 1.9, WOOD_D, 0)
  box(-4.85, 40.9, 0.3, 0.42, 0.3, LIT, 0.9)
  box(-4.85, 42, 0.26, 0.34, 0.26, mix(NAVY, WHITE, 0.3), 0.9)
  tag(-4.6, 40.45, 0.84)

  // curtained window on the left wall — night outside, room reflected warm
  wallX(-ROOM_HW + 0.05, 46.6, 49.4, 0.9, 2.5, mix(NAVY_D, NAVY, 0.5), 0.7, { proud: 0.55 })
  wallX(-ROOM_HW + 0.06, 46.4, 46.75, 0.6, 2.7, LINEN, 0.72, { proud: 0.6 })
  wallX(-ROOM_HW + 0.06, 49.25, 49.6, 0.6, 2.7, LINEN, 0.72, { proud: 0.6 })
  wallX(-ROOM_HW + 0.07, 46.3, 49.7, 2.56, 2.88, mix(LINEN, NAVY, 0.12), 0.74, { proud: 0.62 })

  box(-4.7, 46.6, 0.5, 1.45, 0.5, WOOD_D, 0) // floor lamp
  box(-4.7, 46.6, 0.34, 0.42, 0.34, LIT, 1.45)

  // bookcase, shelves loaded and tagged
  box(4.9, 46.8, 0.6, 2.1, 2.4, WOOD_D, 0)
  for (let i = 0; i < 4; i++) {
    const y = 0.45 + i * 0.45
    box(4.9, 46.8, 0.52, 0.06, 2.3, mix(WOOD, WHITE, 0.3), y)
    box(4.86, 46.1 + (i % 2) * 0.3, 0.3, 0.26, 0.5, mix(BONE, WOOD, 0.35 + i * 0.1), y + 0.06)
    box(4.86, 47.3 - (i % 2) * 0.25, 0.28, 0.2, 0.36, mix(NAVY, WHITE, 0.2 + i * 0.12), y + 0.06)
  }

  /* The chimneypiece: hearth, pilasters either side, a header across and a
     mantel shelf over it, with the fire set back in the opening. */
  box(0, 51.9, 3.5, 0.14, 0.62, mix(INT_WALL, WHITE, 0.16), 0)            // hearth
  box(-1.32, 51.62, 0.46, 1.48, 0.58, mix(INT_WALL, WHITE, 0.36), 0)      // pilasters
  box(1.32, 51.62, 0.46, 1.48, 0.58, mix(INT_WALL, WHITE, 0.36), 0)
  box(0, 51.62, 3.1, 0.32, 0.58, mix(INT_WALL, WHITE, 0.3), 1.48)         // header
  box(0, 51.6, 3.46, 0.12, 0.78, mix(INT_WALL, WHITE, 0.42), 1.8)         // mantel shelf
  wallZ(51.32, -1.05, 1.05, 0.06, 1.46, [24, 17, 14], 0.9, { proud: 0.28 })    // firebox
  wallZ(51.3, -0.82, 0.82, 0.1, 0.82, LIT, 0.95, { glow: 0.42, proud: 0.3 })   // the fire
  box(-1.2, 51.5, 0.11, 0.44, 0.11, mix(WOOD, WHITE, 0.5), 1.92)          // candlesticks
  box(-0.98, 51.5, 0.09, 0.33, 0.09, mix(WOOD, WHITE, 0.5), 1.92)
  box(1.12, 51.5, 0.26, 0.36, 0.26, mix(NAVY, WHITE, 0.25), 1.92)         // vase
  wallZ(ROOM_END - 0.04, -1.52, 1.52, 2.05, 3.02, mix(INT_TRIM, WHITE, 0.3), 0.94, { proud: 0.5 })
  wallZ(ROOM_END - 0.05, -1.36, 1.36, 2.16, 2.9, mix(NAVY, WHITE, 0.34), 0.9, { proud: 0.52 })
  for (const [a, b] of [[-3.1, -1.9], [1.9, 3.1]]) {
    wallZ(ROOM_END - 0.04, a, b, 1.5, 2.6, mix(WOOD_D, WHITE, 0.24), 0.92, { proud: 0.5 })
    wallZ(ROOM_END - 0.05, a + 0.1, b - 0.1, 1.6, 2.5, mix(BONE, WARM, 0.45), 0.92, { proud: 0.52 })
    wallZ(ROOM_END - 0.06, a + 0.2, b - 0.2, 1.7, 2.4, mix(NAVY, WARM, 0.3), 0.92, { proud: 0.54 })
  }

  // art hung down both side walls, the way a sale gets priced up
  for (const z of [39.4, 42.6]) framedX(-ROOM_HW, z, z + 1.05, 1.62, 2.52, 0.78)
  for (const z of [39.9, 42.2, 49.4]) framedX(ROOM_HW, z, z + 0.95, 1.7, 2.48, 0.86)

  // pin-spots over the display tables
  for (const [x, z] of [[-2.5, 42.6], [2.4, 42.2]]) {
    box(x, z, 0.06, 0.5, 0.06, WOOD_D, 2.6)
    slab(x - 0.22, z - 0.22, x + 0.22, z + 0.22, 2.6, LIT, 0.95, { glow: 0.26 })
  }
  /* Chandelier over the seating: rose, stem, tier, four candle lamps. */
  slab(-0.62, 48.82, 0.22, 49.42, 3.09, mix(INT_TRIM, WHITE, 0.25), 0.55)
  box(-0.2, 49.12, 0.07, 0.6, 0.07, mix(WOOD_D, WHITE, 0.3), 2.5)
  box(-0.2, 49.12, 0.62, 0.1, 0.62, mix(WOOD_D, WHITE, 0.4), 2.42)
  for (const [ax, az] of [[-0.5, 49.12], [0.1, 49.12], [-0.2, 48.82], [-0.2, 49.42]]) {
    box(ax, az, 0.14, 0.2, 0.14, LIT, 2.3)
  }
  slab(-0.5, 48.82, 0.1, 49.42, 2.28, LIT, 1, { glow: 0.3 })

  // crated and boxed lots, still being carried through
  const lots = [[-3.4, 39.8, 0.9], [-2.1, 40.6, 0.55], [3.1, 40.1, 0.75], [4.1, 41.4, 0.5], [-1.6, 46.4, 0.62], [1.9, 46.1, 0.8], [4.5, 50.4, 0.7]]
  for (const [x, z, h] of lots) {
    box(x, z, 0.8, h, 0.8, mix(WOOD, BONE, 0.45), 0)
    tag(x, z - 0.4, h - 0.06)
  }

  return faces
}

/* ============================================================
   Camera and projection
   ============================================================ */
export function camAt(prog) {
  const z = lerp(CAM_START, CAM_END, prog)
  /* A walked line, not a rail: a slight arc that straightens out as the porch
     comes up, plus a shallow bob, and a step up over the threshold. */
  /* Starting a step to the left of the driveway's centre keeps the yard sign
     inside the frame on a narrow phone, where the horizontal field is less than
     half a desktop's; the step closes over the first stretch of the walk. Both
     sign and opening copy shift with it, so the gap between them is unchanged. */
  const x = Math.sin(prog * Math.PI) * 0.5 * (1 - clamp((z - 20) / 8)) - 0.45 * (1 - clamp(prog / 0.18))
  const y = EYE + Math.sin(z * 1.05) * 0.022 + clamp((z - DOOR_Z) / 1.2) * 0.44
  return { x, y, z }
}

/** View frustum for a canvas of w×h CSS px at a given device pixel ratio. */
export function viewFor(w, h, dpr = 1) {
  const W = Math.max(1, Math.round(w * dpr))
  const H = Math.max(1, Math.round(h * dpr))
  /* Portrait phones get a wider field, so the house still fits the frame. */
  const fov = w < 700 ? FOV * 1.22 : FOV
  return {
    W, H, dpr,
    cx: W / 2,
    cy: H * 0.54, // horizon a little below centre: we're walking, not flying
    f: H / 2 / Math.tan(fov / 2),
  }
}

/* Clip a polygon against the near plane, so geometry we walk through opens up
   around us instead of popping out of existence. */
function clipNear(pts, nz) {
  const out = []
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length]
    const ain = a[2] >= nz, bin = b[2] >= nz
    if (ain) out.push(a)
    if (ain !== bin) {
      const t = (nz - a[2]) / (b[2] - a[2])
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, nz])
    }
  }
  return out
}

/**
 * Project the scene for one camera position.
 * Returns the polygons to paint, far to near, plus the backdrop they sit on.
 */
export function drawList(faces, cam, view) {
  const { W, H, cx, cy, f } = view
  const near = cam.z + 0.28
  /* How far through the door we are: swings the whole picture from a navy
     night to the warm inside of the house. */
  const inside = clamp((cam.z - DOOR_Z + 3) / 6)
  const fog = mix([9, 30, 58], WARM_D, inside)
  const fogStart = lerp(14, 6, inside)
  const fogEnd = lerp(46, 26, inside)
  const items = []

  for (const fc of faces) {
    let maxZ = -Infinity, sum = 0, cx3 = 0, cy3 = 0
    const n = fc.pts.length
    for (const q of fc.pts) {
      if (q[2] > maxZ) maxZ = q[2]
      cx3 += q[0]
      cy3 += q[1]
      sum += q[2]
    }
    if (maxZ <= near) continue
    /* Distance from the camera, not distance along z. A side wall and the
       bookcase standing against it are at much the same z, and it is the metre
       and a half between them ACROSS the room that decides which occludes the
       other — a z-only key gets that backwards and paints the wall over the
       furniture. */
    const depth = Math.hypot(cx3 / n - cam.x, cy3 / n - cam.y, sum / n - cam.z) - fc.proud
    if (depth > fogEnd + 14) continue
    const poly = clipNear(fc.pts, near)
    if (poly.length < 3) continue

    const scr = new Array(poly.length)
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
    for (let i = 0; i < poly.length; i++) {
      const s = f / (poly[i][2] - cam.z)
      const X = cx + (poly[i][0] - cam.x) * s
      const Y = cy - (poly[i][1] - cam.y) * s
      scr[i] = [X, Y]
      if (X < minX) minX = X
      if (X > maxX) maxX = X
      if (Y < minY) minY = Y
      if (Y > maxY) maxY = Y
    }
    if (maxX < 0 || minX > W || maxY < 0 || minY > H) continue

    const t = clamp((depth - fogStart) / (fogEnd - fogStart))
    const lit = fc.glow ? 1 : fc.shade * lerp(1, 0.82, clamp(depth / 40))
    const col = mix(fc.col.map((c) => c * lit), fog, fc.glow ? t * 0.62 : t)
    items.push({ scr, col, depth, tex: fc.tex, glow: fc.glow, box: [minX, minY, maxX, maxY] })
  }

  items.sort((a, b) => b.depth - a.depth)
  return { items, sky: mix(NAVY_D, WARM_D, inside), fog, inside }
}

/* Visibility windows, in camera position rather than distance.
   ============================================================
   Beats fade on their own distance would overlap: a beat 14 metres ahead is
   already legible while the one you are walking past is still on screen, and
   the upcoming line reads THROUGH the current one. So each beat's window is
   chained to its predecessor's — nothing starts arriving until the beat before
   it has completely cleared, which means exactly one line is ever on screen.

     inFrom → fullFrom   fading in
     fullFrom → holdEnd  fully readable
     holdEnd → goneAt    falling away as the camera passes through it */
const WINDOWS = BEATS.map((b) => ({ z: b.at[2] })).map((w, i, all) => {
  const holdEnd = w.z - 4.6
  const goneAt = w.z - 2.2
  /* The opening beat is up at scroll zero; the rest wait their turn. */
  const inFrom = i === 0 ? CAM_START - 1 : all[i - 1].z - 2.2
  const fullFrom = i === 0 ? CAM_START : inFrom + Math.min(4, Math.max(0.6, (holdEnd - inFrom) * 0.45))
  return { inFrom, fullFrom, holdEnd, goneAt }
})

/** Where beat `i`'s anchor lands on screen, and how big and visible it is. */
export function beatAt(i, cam, view) {
  const beat = BEATS[i]
  const w = WINDOWS[i]
  const dz = beat.at[2] - cam.z
  if (dz <= 0.6) return null
  const s = view.f / dz
  return {
    x: (view.cx + (beat.at[0] - cam.x) * s) / view.dpr,
    y: (view.cy - (beat.at[1] - cam.y) * s) / view.dpr,
    /* Honest perspective ratio, floored so distant copy stays readable and
       capped so it doesn't blow past the frame on its way by. */
    scale: clamp(beat.d0 / dz, 0.42, 1.9),
    opacity: Math.min(
      clamp((cam.z - w.inFrom) / (w.fullFrom - w.inFrom)),
      clamp((w.goneAt - cam.z) / (w.goneAt - w.holdEnd))
    ),
  }
}
