import { useEffect, useRef } from 'react'
import { SITE } from '../data.js'
import { BEATS, beatAt, buildScene, camAt, drawList, rgb, viewFor } from '../scene.js'

/* ============================================================
   CINEMATIC INTRO — the walk-up, rendered rather than filmed.
   ============================================================
   Scroll walks a camera up the driveway, past the yard sign, onto the porch,
   through the front door and into the living room. The scene is real geometry
   (src/scene.js), drawn to a canvas at whatever scroll position you're at — so
   unlike a still sequence there is nothing to blend between and nothing to go
   soft. The reference walkthrough it recreates is media-src/hero.mp4.

   The text beats are anchored to points in the same world and pushed through
   the same projector, so they sit IN the scene: they slide, grow and fall away
   with the camera rather than being pasted on the front.

   This file owns the browser end of it — the canvas, the sign artwork, the
   scroll loop. The maths lives in src/scene.js and can be rendered headlessly
   with `node scripts/preview-scene.mjs`.
   ============================================================ */

export default function CineHero() {
  const secRef = useRef(null)
  const canvasRef = useRef(null)

  useEffect(() => {
    const sec = secRef.current
    const cvs = canvasRef.current
    if (!sec || !cvs || !cvs.getContext) return
    const ctx = cvs.getContext('2d')
    const beatEls = Array.from(sec.querySelectorAll('[data-beat]'))
    sec.classList.add('cine--on')

    let dirty = true

    /* ---- the sign artwork, painted once into an offscreen canvas ----
       The board is parallel to the screen, so its projection is always an
       upright rectangle and the artwork can be blitted straight in. */
    const signTex = document.createElement('canvas')
    signTex.width = 460
    signTex.height = 320
    const drawSign = () => {
      const c = signTex.getContext('2d')
      const W = signTex.width, H = signTex.height
      c.clearRect(0, 0, W, H)
      c.fillStyle = '#fff'
      c.fillRect(0, 0, W, H)
      c.strokeStyle = '#0d2a55'
      c.lineWidth = 6
      c.strokeRect(3, 3, W - 6, H - 6)

      // house-and-magnifier mark
      c.strokeStyle = '#c20e1f'
      c.lineWidth = 13
      c.lineJoin = 'round'
      c.beginPath()
      c.moveTo(34, 104); c.lineTo(84, 62); c.lineTo(134, 104); c.lineTo(134, 152); c.lineTo(34, 152); c.closePath()
      c.stroke()
      c.beginPath(); c.arc(78, 112, 22, 0, Math.PI * 2); c.stroke()
      c.lineCap = 'round'
      c.beginPath(); c.moveTo(94, 128); c.lineTo(116, 150); c.stroke()

      c.textBaseline = 'alphabetic'
      c.fillStyle = '#0d55a8'
      c.font = 'bold 84px "Hanken Grotesk", system-ui, sans-serif'
      c.fillText('LOOK', 152, 132)
      c.fillStyle = '#0d2a55'
      c.font = 'bold 44px "Hanken Grotesk", system-ui, sans-serif'
      c.fillText('ESTATE SALES', 36, 196)

      c.fillStyle = '#c20e1f'
      c.fillRect(28, 216, W - 56, 58)
      c.fillStyle = '#fff'
      c.font = 'bold 34px "Hanken Grotesk", system-ui, sans-serif'
      c.fillText(SITE.phone, 116, 256)
    }
    drawSign()
    // the board is painted before the webfont lands; repaint when it does
    if (document.fonts?.ready) document.fonts.ready.then(() => { drawSign(); dirty = true })

    const faces = buildScene(signTex)

    /* ---- canvas ---- */
    let view = viewFor(window.innerWidth, window.innerHeight, 1)
    const size = () => {
      const r = cvs.getBoundingClientRect()
      view = viewFor(r.width || window.innerWidth, r.height || window.innerHeight, Math.min(window.devicePixelRatio || 1, 2))
      cvs.width = view.W
      cvs.height = view.H
      dirty = true
    }

    const render = (p) => {
      const cam = camAt(p)
      const { items, sky, fog } = drawList(faces, cam, view)
      const { W, H, cx, cy } = view

      const g = ctx.createLinearGradient(0, 0, 0, H)
      g.addColorStop(0, rgb(sky))
      g.addColorStop(1, rgb(fog))
      ctx.fillStyle = g
      ctx.fillRect(0, 0, W, H)

      for (const it of items) {
        ctx.beginPath()
        ctx.moveTo(it.scr[0][0], it.scr[0][1])
        for (let i = 1; i < it.scr.length; i++) ctx.lineTo(it.scr[i][0], it.scr[i][1])
        ctx.closePath()
        ctx.fillStyle = rgb(it.col)
        ctx.fill()

        if (it.tex) {
          const [x0, y0, x1, y1] = it.box
          ctx.save()
          ctx.clip()
          ctx.drawImage(it.tex, x0, y0, x1 - x0, y1 - y0)
          ctx.restore()
        }
        if (it.glow) {
          const [x0, y0, x1, y1] = it.box
          const mx = (x0 + x1) / 2, my = (y0 + y1) / 2
          const r = Math.max(x1 - x0, y1 - y0) * 1.7
          const rg = ctx.createRadialGradient(mx, my, 0, mx, my, r)
          rg.addColorStop(0, `rgba(255,206,140,${0.45 * it.glow})`)
          rg.addColorStop(1, 'rgba(255,206,140,0)')
          ctx.globalCompositeOperation = 'lighter'
          ctx.fillStyle = rg
          ctx.fillRect(mx - r, my - r, r * 2, r * 2)
          ctx.globalCompositeOperation = 'source-over'
        }
      }

      /* vignette — pushes the eye down the driveway */
      const v = ctx.createRadialGradient(cx, cy, Math.min(W, H) * 0.34, cx, cy, Math.max(W, H) * 0.78)
      v.addColorStop(0, 'rgba(0,0,0,0)')
      v.addColorStop(1, 'rgba(2,8,20,0.55)')
      ctx.fillStyle = v
      ctx.fillRect(0, 0, W, H)

      /* ---- the beats, tracked to their anchors in the scene ---- */
      for (let i = 0; i < beatEls.length; i++) {
        const el = beatEls[i]
        const b = beatAt(BEATS[i], cam, view)
        if (!b || b.opacity < 0.01) {
          el.style.opacity = 0
          el.style.visibility = 'hidden'
          continue
        }
        el.style.opacity = b.opacity.toFixed(3)
        el.style.visibility = 'visible'
        el.style.transform =
          `translate(-50%, -50%) translate(${b.x.toFixed(1)}px, ${b.y.toFixed(1)}px) scale(${b.scale.toFixed(3)})`
      }
    }

    /* ---- scroll loop ---- */
    let lastP = -1, running = false
    const frame = () => {
      if (!running) return
      const span = sec.offsetHeight - window.innerHeight
      const p = span > 0 ? Math.min(1, Math.max(0, -sec.getBoundingClientRect().top / span)) : 0
      if (dirty || Math.abs(p - lastP) > 0.00012) {
        render(p)
        lastP = p
        dirty = false
      }
      requestAnimationFrame(frame)
    }

    size()
    window.addEventListener('resize', size)
    window.addEventListener('orientationchange', size)

    /* Only burn frames while the stage is on screen. */
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting && !running) { running = true; requestAnimationFrame(frame) }
        else if (!e.isIntersecting) { running = false }
      })
    }, { rootMargin: '15% 0px' })
    io.observe(sec)

    return () => {
      running = false
      io.disconnect()
      window.removeEventListener('resize', size)
      window.removeEventListener('orientationchange', size)
    }
  }, [])

  return (
    <section className="cine" id="top" ref={secRef}>
      <div className="cine__stage">
        <canvas className="cine__canvas" ref={canvasRef} aria-hidden="true" />

        <div className="cine__beats">
          <div className="cine__beat" data-beat="0">
            <span className="tag tag--onDark">Est. Southeast Michigan</span>
            <h1 className="cine__title">
              A lifetime of belongings,
              <br />
              <span className="serif-italic serif-italic--onDark">valued</span> with care.
            </h1>
            <span className="cine__cue" aria-hidden="true">Scroll to walk the sale</span>
          </div>

          <div className="cine__beat" data-beat="1">
            <p className="cine__lead">We come to the house.</p>
            <p className="cine__note">Estate sales · appraisals · clean-outs · online auctions</p>
          </div>

          <div className="cine__beat" data-beat="2">
            <p className="cine__lead">
              One call gets us <b>through the door.</b>
            </p>
            <p className="cine__note">Evaluate · stage · price · sell · clear</p>
          </div>

          <div className="cine__beat" data-beat="3">
            <p className="cine__lead">Room by room, drawer by drawer.</p>
            <p className="cine__note">Nothing leaves before it's valued</p>
          </div>

          <div className="cine__beat" data-beat="4">
            <p className="cine__lead cine__lead--big">
              Then <b>95% of it sells.</b>
            </p>
            <p className="cine__note">And we hand back an empty house.</p>
            <div className="cine__actions">
              <a className="btn btn--primary" href={SITE.consult} target="_blank" rel="noreferrer">
                Book a free consultation
              </a>
              <a className="btn btn--ghostDark" href={SITE.phoneHref}>
                Call {SITE.phone}
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
