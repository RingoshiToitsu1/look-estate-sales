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
const BONE = [238, 240, 244]
const WARM = [255, 214, 150]
const WARM_D = [58, 42, 30]
const WOOD = [124, 84, 54]
const WOOD_D = [86, 58, 38]
const SIDING = [176, 186, 200]   // white siding, seen at dusk
const INT_WALL = [122, 104, 88]  // interior, lit only by lamps
const INT_CEIL = [74, 64, 56]

export const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v)
export const lerp = (a, b, t) => a + (b - a) * t
export const mix = (c1, c2, t) => [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)]
export const rgb = (c) => `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`

/* Text beats. Each is pinned to a world point; `d0` is the distance at which
   it renders at its natural size, so it grows as the camera closes in. */
export const BEATS = [
  { at: [1.5, 2.95, 6], d0: 11 },
  { at: [0.3, 2.5, 16.5], d0: 8 },
  { at: [0, 3.25, 25.2], d0: 7.5 },
  { at: [0, 1.95, 36], d0: 7 },
  { at: [0, 1.65, 50], d0: 6 },
]

export const SIGN = { x: -2.75, z: 5.4, halfW: 1.15, y0: 0.95, y1: 2.55 }

/* ============================================================
   Scene
   ============================================================ */
export function buildScene(signTex = null) {
  const faces = []

  /* shade: how much light the surface catches, before fog. */
  const face = (pts, col, shade = 1, opts = {}) =>
    faces.push({ pts, col, shade, glow: opts.glow || 0, tex: opts.tex || null })

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
    slab(-2.1, z, 2.1, Math.min(z + 2.4, 24.6), 0, mix(base, WARM, warmth * 0.5), 1)
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
    WHITE, 1, { tex: signTex }
  )

  /* ---- the house: facade split around the door opening ---- */
  const FW = 7.4 // facade half-width
  const DOOR_HW = 1.0, DOOR_H = 2.35
  wallZ(DOOR_Z, -FW, -DOOR_HW, 0, 5.4, SIDING, 0.82)
  wallZ(DOOR_Z, DOOR_HW, FW, 0, 5.4, SIDING, 0.82)
  wallZ(DOOR_Z, -DOOR_HW, DOOR_HW, DOOR_H, 5.4, SIDING, 0.82)
  face([[-FW, 5.4, DOOR_Z], [FW, 5.4, DOOR_Z], [0, 7.3, DOOR_Z]], mix(SIDING, NAVY, 0.3), 0.75) // gable
  stripSlab(-FW - 0.4, DOOR_Z, FW + 0.4, DOOR_Z + 9, 5.4, NAVY_D, 0.7) // roof, seen from the drive
  wallZ(DOOR_Z - 0.1, -FW - 0.5, FW + 0.5, 5.4, 5.64, NAVY, 0.9) // eaves

  // porch: step, columns, overhang
  slab(-3.4, 24.6, 3.4, DOOR_Z, 0.44, mix(SIDING, NAVY, 0.12), 0.85)
  wallZ(24.6, -3.4, 3.4, 0, 0.44, mix(SIDING, NAVY, 0.34), 0.75)
  box(-2.7, 25.1, 0.26, 3.1, 0.26, SIDING, 0.44)
  box(2.7, 25.1, 0.26, 3.1, 0.26, SIDING, 0.44)
  slab(-3.4, 24.7, 3.4, DOOR_Z, 3.62, mix(SIDING, NAVY, 0.45), 0.6)
  wallZ(24.68, -3.4, 3.4, 3.5, 3.78, SIDING, 0.82)

  // windows, lit from inside
  for (const wx of [-5.9, -3.6, 3.6, 5.9]) {
    const half = 0.78
    wallZ(DOOR_Z - 0.05, wx - half - 0.1, wx + half + 0.1, 1.15, 3.15, mix(SIDING, NAVY, 0.45), 0.8)
    wallZ(DOOR_Z - 0.06, wx - half, wx + half, 1.25, 3.05, WARM, 1, { glow: 0.85 })
  }

  // the open door, and the light it throws down the steps
  face(
    [[-DOOR_HW, 0, DOOR_Z + 0.05], [-DOOR_HW + 0.28, 0, DOOR_Z + 1.95],
     [-DOOR_HW + 0.28, DOOR_H, DOOR_Z + 1.95], [-DOOR_HW, DOOR_H, DOOR_Z + 0.05]],
    RED, 0.72
  )
  wallZ(DOOR_Z - 0.02, -DOOR_HW - 0.14, -DOOR_HW, 0, DOOR_H + 0.14, mix(SIDING, RED, 0.2), 0.85)
  wallZ(DOOR_Z - 0.02, DOOR_HW, DOOR_HW + 0.14, 0, DOOR_H + 0.14, mix(SIDING, RED, 0.2), 0.85)
  wallZ(DOOR_Z - 0.02, -DOOR_HW - 0.14, DOOR_HW + 0.14, DOOR_H, DOOR_H + 0.14, mix(SIDING, RED, 0.2), 0.85)
  slab(-1.5, 24.4, 1.5, DOOR_Z, 0.455, mix(WARM, [70, 58, 50], 0.3), 1, { glow: 0.22 })

  /* ---- inside: the hall, then the living room ---- */
  const HALL_HW = 2.6, HALL_END = 38, ROOM_HW = 5.6, ROOM_END = 52
  floorAround(-HALL_HW, DOOR_Z, HALL_HW, HALL_END, 0, WOOD, 0.92, [-1.1, DOOR_Z + 1, 1.1, HALL_END - 2])
  stripSlab(-HALL_HW, DOOR_Z, HALL_HW, HALL_END, 2.95, INT_CEIL, 0.9)
  wallX(-HALL_HW, DOOR_Z, HALL_END, 0, 2.95, INT_WALL, 0.78)
  wallX(HALL_HW, DOOR_Z, HALL_END, 0, 2.95, INT_WALL, 0.88)
  wallZ(DOOR_Z + 0.02, -HALL_HW, -DOOR_HW, 0, 2.95, INT_WALL, 0.7)
  wallZ(DOOR_Z + 0.02, DOOR_HW, HALL_HW, 0, 2.95, INT_WALL, 0.7)
  wallZ(DOOR_Z + 0.02, -DOOR_HW, DOOR_HW, DOOR_H, 2.95, INT_WALL, 0.7)

  // runner, hall table, a lamp on it
  stripSlab(-1.1, DOOR_Z + 1, 1.1, HALL_END - 2, 0, mix(NAVY, WHITE, 0.15), 0.95)
  box(-2.1, 31, 0.5, 0.78, 1.3, WOOD_D, 0)
  box(-2.1, 31, 0.26, 0.42, 0.26, WARM, 0.78)

  // pictures down the hall
  for (const z of [29, 32.5, 35.5]) {
    wallX(-HALL_HW + 0.04, z, z + 0.9, 1.35, 2.15, mix(WOOD_D, WHITE, 0.35), 0.8)
    wallX(HALL_HW - 0.04, z + 1.2, z + 2.1, 1.4, 2.1, mix(WOOD_D, WHITE, 0.25), 0.85)
  }

  // ceiling lights
  for (const z of [30, 35, 41, 47]) {
    const hw = z < HALL_END ? 0.5 : 0.8
    slab(-hw, z, hw, z + 0.5, z < HALL_END ? 2.93 : 3.28, WARM, 1, { glow: 0.7 })
  }

  floorAround(-ROOM_HW, HALL_END, ROOM_HW, ROOM_END, 0, WOOD, 0.92, [-4.1, 44, 4.1, 51])
  stripSlab(-ROOM_HW, HALL_END, ROOM_HW, ROOM_END, 3.3, INT_CEIL, 0.88)
  wallX(-ROOM_HW, HALL_END, ROOM_END, 0, 3.3, INT_WALL, 0.78)
  wallX(ROOM_HW, HALL_END, ROOM_END, 0, 3.3, INT_WALL, 0.88)
  wallZ(ROOM_END, -ROOM_HW, ROOM_HW, 0, 3.3, INT_WALL, 0.95)
  // the wall the hallway punches through
  wallZ(HALL_END, -ROOM_HW, -HALL_HW, 0, 3.3, INT_WALL, 0.62)
  wallZ(HALL_END, HALL_HW, ROOM_HW, 0, 3.3, INT_WALL, 0.62)
  wallZ(HALL_END, -HALL_HW, HALL_HW, 2.95, 3.3, INT_WALL, 0.62)

  // living room: rug, sofa, chair, table, shelves, fireplace — the sale
  const RUG = mix(NAVY, WHITE, 0.22), RUG_IN = mix(NAVY, WHITE, 0.34)
  stripSlab(-4.1, 44, 4.1, 44.4, 0, RUG, 0.95)
  stripSlab(-4.1, 50.6, 4.1, 51, 0, RUG, 0.95)
  stripSlab(-4.1, 44.4, -3.8, 50.6, 0, RUG, 0.95)
  stripSlab(3.8, 44.4, 4.1, 50.6, 0, RUG, 0.95)
  stripSlab(-3.8, 44.4, 3.8, 50.6, 0, RUG_IN, 0.95)
  box(-3.6, 49.4, 1.05, 0.82, 2.9, NAVY, 0) // sofa
  box(-3.85, 49.4, 0.42, 1.35, 2.9, mix(NAVY, WHITE, 0.08), 0)
  box(3.2, 48.4, 1.05, 0.78, 1.1, RED_D, 0) // armchair
  box(3.5, 48.4, 0.4, 1.2, 1.1, RED, 0)
  box(-0.2, 49.2, 1.7, 0.44, 0.95, WOOD_D, 0) // coffee table
  box(-0.2, 49.2, 1.5, 0.06, 0.8, mix(WOOD, WHITE, 0.2), 0.44)
  box(-4.7, 46.6, 0.5, 1.45, 0.5, WOOD_D, 0) // floor lamp
  box(-4.7, 46.6, 0.34, 0.42, 0.34, WARM, 1.45)
  box(4.9, 46.8, 0.6, 2.1, 2.4, WOOD_D, 0) // bookcase
  for (let i = 0; i < 4; i++) box(4.9, 46.8, 0.52, 0.06, 2.3, mix(WOOD, WHITE, 0.3), 0.45 + i * 0.45)
  box(0, 51.5, 2.8, 1.4, 0.7, mix(INT_WALL, WHITE, 0.5), 0) // fireplace
  wallZ(51.14, -0.85, 0.85, 0.15, 1.05, WARM, 1, { glow: 0.8 })
  box(0, 51.5, 3.2, 0.12, 0.85, mix(INT_WALL, WHITE, 0.35), 1.4) // mantel
  wallZ(ROOM_END - 0.05, -1.3, 1.3, 1.85, 2.95, mix(NAVY, WHITE, 0.3), 0.9) // mirror

  // tagged lots waiting to sell — the price-tag motif, in the round
  const lots = [[-3.4, 39.8, 0.9], [-2.1, 40.6, 0.55], [3.1, 40.1, 0.75], [4.1, 41.4, 0.5], [-1.9, 45.6, 0.65], [2.3, 45.2, 0.85], [4.5, 50.4, 0.7]]
  for (const [x, z, h] of lots) {
    box(x, z, 0.8, h, 0.8, mix(WOOD, BONE, 0.45), 0)
    // the tag: white card with a red edge, hung on the face turned toward us
    wallZ(z - 0.42, x - 0.2, x + 0.2, h - 0.34, h - 0.06, WHITE, 1)
    wallZ(z - 0.43, x - 0.23, x + 0.23, h - 0.37, h - 0.32, RED, 1)
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
  const x = Math.sin(prog * Math.PI) * 0.5 * (1 - clamp((z - 20) / 8))
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
    let maxZ = -Infinity, sum = 0
    for (const q of fc.pts) {
      if (q[2] > maxZ) maxZ = q[2]
      sum += q[2]
    }
    if (maxZ <= near) continue
    const depth = sum / fc.pts.length - cam.z
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
    const col = mix(fc.col.map((c) => c * lit), fog, fc.glow ? t * 0.35 : t)
    items.push({ scr, col, depth, tex: fc.tex, glow: fc.glow, box: [minX, minY, maxX, maxY] })
  }

  items.sort((a, b) => b.depth - a.depth)
  return { items, sky: mix(NAVY_D, WARM_D, inside), fog, inside }
}

/** Where a beat's anchor lands on screen, and how big and visible it is. */
export function beatAt(beat, cam, view) {
  const dz = beat.at[2] - cam.z
  if (dz <= 0.6) return null
  const s = view.f / dz
  return {
    x: (view.cx + (beat.at[0] - cam.x) * s) / view.dpr,
    y: (view.cy - (beat.at[1] - cam.y) * s) / view.dpr,
    /* Honest perspective ratio, floored so distant copy stays readable and
       capped so it doesn't blow past the frame on its way by. */
    scale: clamp(beat.d0 / dz, 0.42, 1.9),
    /* Arrives out of the distance, falls away as it passes the camera. */
    opacity: Math.min(clamp((26 - dz) / 9), clamp((dz - 1.9) / 2.6)),
  }
}
