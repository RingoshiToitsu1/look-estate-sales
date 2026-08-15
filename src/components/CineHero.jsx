import { useEffect, useRef } from 'react'
import { SITE } from '../data.js'

/* ============================================================
   CINEMATIC INTRO — the real walkthrough, driven by scroll.
   ============================================================
   This is the actual footage (public/media/walk.mp4), redrawn rather than
   graded: flattened into painted areas with ink lines over them, which is what
   gets rid of the phone-sensor grain instead of trying to hide it. Scroll
   decides where in the walk you are; the video decodes at its own framerate to
   get there. The clip starts after the yard flag has left frame, so the opening
   shot is the house coming out from behind the trees.

   Why it isn't soft any more. The first version exploded the clip into stills
   and cross-faded between them, so every scroll position BETWEEN two stills was
   a blend of both — that blend WAS the blur, and no amount of quality in the
   stills would have fixed it. This one keeps the real footage and avoids the
   blur a different way: never blend, and never scrub frame by frame. Scroll
   sets a target time and the video is PLAYED toward it — faster when you scroll
   fast, slower as you ease off, paused when you stop. Every frame on screen is
   a real decoded frame.

   Seeking is left for the two cases playback can't cover: scrolling back up
   (video only runs forwards) and jumps too big to catch. The clip is encoded
   with a keyframe every second so those land quickly.
   ============================================================ */

/* Beats are pinned to moments in the FOOTAGE rather than to scroll positions,
   so a line stays with the thing it describes even if the section's height
   changes. Times are seconds into the walk; x/y place the copy as a percentage
   of the frame; drift is how far it slides across its own window, which is what
   makes it feel carried along by the camera instead of pasted on the glass. */
const BEATS = [
  { in: 0.0, full: 0.6, hold: 4.0, out: 5.4, x: 50, y: 64, drift: [0, -26] },
  { in: 7.1, full: 8.5, hold: 12.5, out: 14.1, x: 50, y: 68, drift: [0, -22] },
  { in: 16.1, full: 17.5, hold: 21.5, out: 23.1, x: 50, y: 66, drift: [-22, -14] },
  { in: 25.5, full: 26.9, hold: 31.9, out: 33.5, x: 50, y: 62, drift: [0, -20] },
  { in: 37.1, full: 38.5, hold: 99, out: 99, x: 50, y: 58, drift: [0, -14] },
]

const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v)

export default function CineHero() {
  const secRef = useRef(null)
  const videoRef = useRef(null)

  useEffect(() => {
    const sec = secRef.current
    const v = videoRef.current
    if (!sec || !v) return
    const beatEls = Array.from(sec.querySelectorAll('[data-beat]'))
    sec.classList.add('cine--on')

    /* A phone gets the 640-wide cut: a third of the weight, into a frame a
       third of the size. */
    v.src = window.innerWidth < 760 ? './media/walk-sm.mp4' : './media/walk.mp4'
    v.load()

    let duration = 0
    const onMeta = () => { duration = v.duration || 0 }
    v.addEventListener('loadedmetadata', onMeta)

    let running = false
    const frame = () => {
      if (!running) return
      const span = sec.offsetHeight - window.innerHeight
      const p = span > 0 ? clamp(-sec.getBoundingClientRect().top / span) : 0

      if (duration) {
        const target = p * (duration - 0.08)
        const diff = target - v.currentTime

        if (diff > 0.9) {
          // too far ahead to play into — jump, then carry on playing
          v.currentTime = target
        } else if (diff > 0.04) {
          /* The normal case, and the whole trick: play toward the target at a
             rate set by how far behind we are. Real decoded frames, at whatever
             speed the reader happens to be scrolling. */
          v.playbackRate = clamp(diff * 4.5, 0.35, 4)
          if (v.paused) v.play().catch(() => {})
        } else if (diff < -0.09) {
          // scrolling back up: the one place a seek is unavoidable
          if (!v.paused) v.pause()
          v.currentTime = target
        } else if (!v.paused) {
          v.pause()
        }

        const t = v.currentTime
        for (let i = 0; i < beatEls.length; i++) {
          const b = BEATS[i]
          const el = beatEls[i]
          const o = t < b.in || t > b.out ? 0
            : t < b.full ? (t - b.in) / (b.full - b.in)
            : t <= b.hold ? 1
            : 1 - (t - b.hold) / (b.out - b.hold)
          if (o < 0.01) {
            el.style.opacity = 0
            el.style.visibility = 'hidden'
            continue
          }
          const k = clamp((t - b.in) / (Math.min(b.out, b.hold + 1.6) - b.in))
          el.style.opacity = o.toFixed(3)
          el.style.visibility = 'visible'
          el.style.left = `${b.x}%`
          el.style.top = `${b.y}%`
          el.style.transform =
            `translate(-50%, -50%) translate(${(b.drift[0] * k).toFixed(1)}px, ${(b.drift[1] * k).toFixed(1)}px)` +
            ` scale(${(0.985 + 0.03 * k).toFixed(4)})`
        }
      }
      requestAnimationFrame(frame)
    }

    // only run while the stage is on screen, and let the video go when it isn't
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting && !running) { running = true; requestAnimationFrame(frame) }
        else if (!e.isIntersecting) { running = false; v.pause() }
      })
    }, { rootMargin: '15% 0px' })
    io.observe(sec)

    return () => {
      running = false
      io.disconnect()
      v.removeEventListener('loadedmetadata', onMeta)
      v.pause()
    }
  }, [])

  return (
    <section className="cine" id="top" ref={secRef}>
      <div className="cine__stage">
        <video
          className="cine__video"
          ref={videoRef}
          muted
          playsInline
          preload="auto"
          poster="./media/walk-poster.jpg"
          aria-hidden="true"
        />
        <div className="cine__scrim" aria-hidden="true" />

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
            <p className="cine__lead cine__lead--closing">
              A professional approach to <b>maximizing the value</b> of our
              clients&rsquo; estate.
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
