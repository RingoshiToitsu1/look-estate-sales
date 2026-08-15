import { useEffect, useRef } from 'react'
import { SITE } from '../data.js'

/* ============================================================
   CINEMATIC INTRO — the walkthrough, scrubbed by scroll.
   ============================================================
   hero.mp4 was exploded into a still sequence (public/media/frames,
   scripts/frames.sh) and is played back on a canvas at whatever rate the
   reader scrolls. Two reasons it isn't a <video> with currentTime driven by
   scroll: seeking an h264 stream backwards is slow and stutters badly on
   iOS, and stills let adjacent frames be CROSS-FADED into each other, so a
   2.5fps sequence reads as continuous motion rather than a slideshow.

   The stage is sticky inside a tall section; text beats fade in and out of
   their own scroll windows over the top. Without JS the section collapses to
   a normal one-screen hero over the poster image (see .cine in
   components.css), so the copy is never trapped behind the effect. */

const FRAME_COUNT = 117
const frameSrc = (i) => `./media/frames/f${String(i + 1).padStart(3, '0')}.webp`

/* Each beat owns a window of scroll progress: fades in over [in→full],
   holds to [hold], fades out by [out]. Values are 0..1 of the section. */
const BEATS = [
  { in: -0.6, full: 0, hold: 0.13, out: 0.22 },
  { in: 0.27, full: 0.34, hold: 0.44, out: 0.52 },
  { in: 0.55, full: 0.62, hold: 0.70, out: 0.77 },
  { in: 0.83, full: 0.90, hold: 9, out: 9 },
]

export default function CineHero() {
  const secRef = useRef(null)
  const canvasRef = useRef(null)

  useEffect(() => {
    const sec = secRef.current
    const cvs = canvasRef.current
    if (!sec || !cvs || !cvs.getContext) return
    const ctx = cvs.getContext('2d')
    const beats = Array.from(sec.querySelectorAll('[data-beat]'))

    sec.classList.add('cine--on')

    /* ---- frames ---- */
    const imgs = new Array(FRAME_COUNT)
    const ready = new Array(FRAME_COUNT).fill(false)
    let loadedCount = 0
    let dirty = true

    const load = (i) => new Promise((done) => {
      const img = new Image()
      img.decoding = 'async'
      img.onload = () => { imgs[i] = img; ready[i] = true; loadedCount++; dirty = true; done() }
      img.onerror = done
      img.src = frameSrc(i)
    })

    /* First frame first so the stage paints immediately, then the rest in
       order at a modest concurrency — in order, because that is the order a
       reader scrolling from the top will ask for them. */
    let cancelled = false
    load(0).then(async () => {
      let next = 1
      const worker = async () => {
        while (!cancelled && next < FRAME_COUNT) await load(next++)
      }
      await Promise.all([worker(), worker(), worker(), worker()])
    })

    /* Nearest frame that has actually arrived, searching outward, so early
       scrolling shows the closest thing available instead of a blank stage. */
    const nearest = (i) => {
      if (ready[i]) return i
      for (let d = 1; d < FRAME_COUNT; d++) {
        if (ready[i - d]) return i - d
        if (ready[i + d]) return i + d
      }
      return -1
    }

    /* ---- canvas ---- */
    let dpr = 1, W = 0, H = 0
    const size = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      const r = cvs.getBoundingClientRect()
      W = cvs.width = Math.max(1, Math.round((r.width || window.innerWidth) * dpr))
      H = cvs.height = Math.max(1, Math.round((r.height || window.innerHeight) * dpr))
      dirty = true
    }

    /* object-fit: cover, by hand. */
    const paint = (img, alpha) => {
      if (!img) return
      const s = Math.max(W / img.width, H / img.height)
      const w = img.width * s, h = img.height * s
      ctx.globalAlpha = alpha
      ctx.drawImage(img, (W - w) / 2, (H - h) / 2, w, h)
      ctx.globalAlpha = 1
    }

    /* ---- scrub ---- */
    let p = 0, lastDrawn = -1, lastBlend = -1, running = false

    const clamp = (v) => (v < 0 ? 0 : v > 1 ? 1 : v)
    const opacityOf = (b, prog) => {
      if (prog < b.in || prog > b.out) return 0
      if (prog < b.full) return (prog - b.in) / (b.full - b.in)
      if (prog <= b.hold) return 1
      return 1 - (prog - b.hold) / (b.out - b.hold)
    }

    const frame = () => {
      if (!running) return
      const rect = sec.getBoundingClientRect()
      const span = sec.offsetHeight - window.innerHeight
      p = span > 0 ? clamp(-rect.top / span) : 0

      const exact = p * (FRAME_COUNT - 1)
      const i = Math.floor(exact)
      const blend = exact - i

      /* Redraw when the frame pair or the blend between them has moved
         enough to be visible — or when a new image has just landed. */
      if (dirty || i !== lastDrawn || Math.abs(blend - lastBlend) > 0.01) {
        const a = nearest(i)
        if (a >= 0) {
          ctx.clearRect(0, 0, W, H)
          paint(imgs[a], 1)
          /* The cross-fade: the next still laid over the current one at the
             fractional position between them. This is what turns 2.5fps of
             stills into something that reads as film. */
          if (blend > 0.01 && ready[i + 1]) paint(imgs[i + 1], blend)
        }
        lastDrawn = i
        lastBlend = blend
        dirty = false

        for (const el of beats) {
          const o = opacityOf(BEATS[+el.dataset.beat], p)
          el.style.opacity = o
          el.style.visibility = o < 0.01 ? 'hidden' : 'visible'
          el.style.filter = o > 0.995 ? 'none' : `blur(${((1 - o) * 7).toFixed(2)}px)`
          el.style.transform = `translate(-50%, -50%) translateY(${((1 - o) * 18).toFixed(1)}px)`
        }
        sec.style.setProperty('--p', p.toFixed(4))
      }
      requestAnimationFrame(frame)
    }

    size()
    /* Mobile toolbars fire resize on every scroll direction change, so this
       has to stay cheap: re-measure the backing store, nothing else. */
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
      cancelled = true
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
        <div className="cine__scrim" aria-hidden="true" />

        <div className="cine__beats">
          <div className="cine__beat" data-beat="0">
            <span className="tag tag--onDark">Est. Southeast Michigan</span>
            <h1 className="cine__title">
              A lifetime of belongings,
              <br />
              <span className="serif-italic serif-italic--onDark">valued</span> with care.
            </h1>
            <p className="cine__sub">
              Full-service estate sales, appraisals, clean-outs and online auctions.
            </p>
            <span className="cine__cue" aria-hidden="true">Scroll to walk the sale</span>
          </div>

          <div className="cine__beat" data-beat="1">
            <p className="cine__lead">
              We sort it, stage it and price it — <b>in the house</b>, room by room.
            </p>
            <p className="cine__note">Nothing leaves before it's valued.</p>
          </div>

          <div className="cine__beat" data-beat="2">
            <p className="cine__lead">
              Then the doors open, and <b>95% of it sells.</b>
            </p>
            <p className="cine__note">Average sell-through across our sales</p>
          </div>

          <div className="cine__beat" data-beat="3">
            <p className="cine__lead cine__lead--big">One call does it all.</p>
            <p className="cine__note">
              Evaluating, staging, pricing, selling, clean-out — and the house itself.
            </p>
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
