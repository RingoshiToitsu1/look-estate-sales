import { useLayoutEffect, useRef } from 'react'
import { SITE } from '../data.js'
import { TRACK, TRACK_FPS } from '../data/track.js'

/* ============================================================
   CINEMATIC INTRO — the real walkthrough, driven by scroll.
   ============================================================
   This is the actual footage (public/media/walk.mp4), redrawn rather than
   graded: flattened into painted areas with ink lines over them, which is what
   gets rid of the phone-sensor grain instead of trying to hide it. Scroll
   decides where in the walk you are; the video decodes at its own framerate to
   get there. It is cut to open on the house sitting across the driveway — the
   yard flag and the swing through the trees that came before it are gone, so
   the first frame a reader sees is the thing being sold. And it runs on twos,
   at 12fps, which is the cadence that reads as animation rather than as video
   someone put a filter over.

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

   The copy is motion-tracked to the footage. src/data/track.js holds the
   camera's measured path — pan and zoom per frame, solved offline from the
   source footage — and each beat is anchored to the patch of house it was
   placed over, then carried by that track for as long as it is on screen. So
   the line about walking through the front door travels with the door. It is
   the same data the camera moved by, which is why it lands: a curve tuned by
   hand can match a shot's direction but never its timing.
   ============================================================ */

/* Beats are pinned to moments in the FOOTAGE rather than to scroll positions,
   so a line stays with the thing it describes even if the section's height
   changes. Times are seconds into the walk; x/y place the copy as a percentage
   of the frame, at the moment the beat is fully in (`full`) — from there it is
   the camera track, not a hand-drawn curve, that carries it. */
const BEATS = [
  // the opening beat starts BEFORE the clip does, so that at t=0 — which is
  // what a reader sees before touching the scroll wheel — it is already all the
  // way in rather than at the bottom of a fade
  { in: -1.5, full: -0.4, hold: 2.4, out: 3.6, x: 50, y: 64 },
  { in: 4.6, full: 5.8, hold: 8.2, out: 9.4, x: 50, y: 68 },
  { in: 10.4, full: 11.6, hold: 14.6, out: 15.8, x: 50, y: 66 },
  { in: 17.6, full: 18.8, hold: 23.0, out: 24.2, x: 50, y: 62 },
  { in: 31.4, full: 32.6, hold: 99, out: 99, x: 50, y: 58 },
]

/* The clip runs at the source footage's own 30fps. It was on twos (12fps) for a
   while, for the cadence of limited hand animation, and that read as choppy
   rather than as animation — the drawing carries the animated quality on its
   own and does not need the frame rate's help. 30 rather than 24 because 24
   would mean dropping two frames in every five of a 30fps source, and dropping
   frames unevenly is its own judder; matching the source converts nothing.

   The copy is quantised onto the same grid so it updates on real frame
   boundaries rather than between them. */
const VIDEO_FPS = 30

/* TEMPORARY — the copy is off the hero while the animation itself is being got
   right, so that judging the animation means judging the animation. Setting
   this back to true restores all five beats; nothing else was removed, and the
   track and the placement code below are untouched and still correct.

   The heading stays in the document as screen-reader-only text, because a page
   with no <h1> at all is a real cost that nobody looking at the animation would
   ever see. */
const SHOW_BEATS = false

/* How much of the camera's real motion the copy takes on. Not 1:1, and it can't
   be: the walk is straight at the house, so a point anchored beside the door
   genuinely leaves the frame within a couple of seconds, and copy that honest
   would be gone before it was read. At these values the copy moves WITH the
   shot — same direction, same moment, same easing, since it's the same numbers
   — at roughly half the amplitude, which is the part the eye actually reads as
   "that line is sitting on the house."

   Translation is soft-clamped rather than cut off (tanh): small moves come
   through untouched and only large ones compress, so the copy never slams into
   an invisible wall and parks there. Zoom is taken as a power, not a fraction,
   because it compounds — r^0.22 turns a 2x walk-in into a 1.2x growth and a
   wild 10x into 1.6x, without either one needing a special case. */
const TRACK_PAN = 0.5
const TRACK_ZOOM = 0.22
const ZOOM_MIN = 0.9
const ZOOM_MAX = 1.3

const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v)
const soft = (v, lim) => lim * Math.tanh(v / lim)

/* The camera transform at time t: where a point that sat at the centre of the
   first frame has got to, and how much everything has grown since. Linear
   interpolation between the two nearest tracked frames — the track is sampled
   at the video's own framerate, so this is only ever splitting one frame. */
const TRACK_N = TRACK.length / 3
function camAt(t) {
  const f = clamp(t * TRACK_FPS, 0, TRACK_N - 1.0001)
  const i = f | 0
  const u = f - i
  const j = i * 3
  const k = j + 3
  return {
    s: TRACK[j] + (TRACK[k] - TRACK[j]) * u,
    x: TRACK[j + 1] + (TRACK[k + 1] - TRACK[j + 1]) * u,
    y: TRACK[j + 2] + (TRACK[k + 2] - TRACK[j + 2]) * u,
  }
}

export default function CineHero() {
  const secRef = useRef(null)
  const videoRef = useRef(null)

  useLayoutEffect(() => {
    const sec = secRef.current
    const v = videoRef.current
    if (!sec || !v) return
    const beatEls = Array.from(sec.querySelectorAll('[data-beat]'))

    /* No prefers-reduced-motion opt-out here, and that is deliberate rather than
       an oversight. It was tried, and it took the walkthrough away from anyone
       whose OS has animation effects switched off — which on Windows is a great
       many people who have never thought about it and are not expecting a page
       to withhold its main content over it. This section IS the page; a still of
       it is not a reduced version, it is a broken one. The motion is also
       entirely scroll-driven: nothing moves unless the reader moves it, which is
       the behaviour the setting exists to ask for. The reveals further down the
       page, which do animate on their own, still honour it. */
    sec.classList.add('cine--on')

    // resting position; everything after this is transform-only, per frame
    beatEls.forEach((el, i) => {
      el.style.left = `${BEATS[i].x}%`
      el.style.top = `${BEATS[i].y}%`
    })

    /* A phone gets the 640-wide cut: a third of the weight, into a frame a
       third of the size. */
    v.src = window.innerWidth < 760 ? './media/walk-sm.mp4' : './media/walk.mp4'
    v.load()

    let duration = 0

    /* The track is in units of the video's own frame width, which is not the
       width of anything on the page: the video is object-fit: cover, so it is
       scaled up until it fills the stage and the overflow is cropped. This is
       the factor that turns tracked motion into pixels on screen — and it moves
       whenever the window does. */
    let renderedW = 0
    /* How far each beat is allowed to travel: whatever room is left between it
       and the edge of the stage, less a margin. Derived per beat from its own
       measured box rather than picked as a fraction of the viewport, because
       the closing beat is a sentence and two buttons where the first is four
       words — a limit generous enough for one is off the side of a phone for
       the other. Paired with the tanh, this makes leaving the stage impossible
       rather than unlikely. */
    const lims = BEATS.map(() => ({ x: 0, y: 0 }))
    const measure = () => {
      const r = v.getBoundingClientRect()
      const ar = (v.videoWidth || 1024) / (v.videoHeight || 576)
      renderedW = Math.max(r.width, r.height * ar)
      beatEls.forEach((el, i) => {
        lims[i].x = Math.max(24, ((r.width - el.offsetWidth) / 2) * 0.85)
        lims[i].y = Math.max(24, ((r.height - el.offsetHeight) / 2) * 0.8)
      })
    }
    const onMeta = () => { duration = v.duration || 0; measure() }
    v.addEventListener('loadedmetadata', onMeta)
    window.addEventListener('resize', measure)

    /* Where each beat is anchored: the camera transform at the moment it is
       fully on screen, plus its resting position in the frame — both in the
       track's coordinates, which are width units measured from frame centre. */
    const anchors = BEATS.map((b) => ({
      cam: camAt(b.full),
      px: (b.x - 50) / 100,
      py: ((b.y - 50) / 100) * ((v.videoHeight || 576) / (v.videoWidth || 1024)),
    }))

    /* Put every beat where it belongs for a given moment of footage. Pulled out
       of the scroll loop so it can also be run once, synchronously, before the
       browser's first paint — see the layout effect this all sits in. */
    const place = (rawT) => {
      if (!renderedW) measure()
      const t = Math.floor(rawT * VIDEO_FPS) / VIDEO_FPS
      const now = camAt(t)

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

        /* Where the patch of house this line was placed on has moved to.
           `now` and the anchor are both measured from frame 0, so composing
           one with the inverse of the other gives the camera's move over just
           this beat's window — which is why a beat entering, holding and
           leaving all read as the same continuous shot. */
        const a = anchors[i]
        const r = now.s / a.cam.s
        const ox = now.x - r * a.cam.x
        const oy = now.y - r * a.cam.y
        const dx = (r * a.px + ox - a.px) * renderedW
        const dy = (r * a.py + oy - a.py) * renderedW

        el.style.opacity = o.toFixed(3)
        el.style.visibility = 'visible'
        el.style.transform =
          `translate(-50%, -50%) translate(${soft(dx * TRACK_PAN, lims[i].x).toFixed(1)}px, ` +
          `${soft(dy * TRACK_PAN, lims[i].y).toFixed(1)}px)` +
          ` scale(${clamp(Math.pow(r, TRACK_ZOOM), ZOOM_MIN, ZOOM_MAX).toFixed(4)})`
      }
    }

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

        place(v.currentTime)
      }
      requestAnimationFrame(frame)
    }

    // only run while the stage is on screen, and let the video go when it isn't
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        // re-measure on the way in: web fonts landing changes how wide the copy is
        if (e.isIntersecting && !running) { measure(); running = true; requestAnimationFrame(frame) }
        else if (!e.isIntersecting) { running = false; v.pause() }
      })
    }, { rootMargin: '15% 0px' })
    io.observe(sec)

    /* The reader arrives at the top of the page with the video on its first
       frame, so that is what the copy is placed against — still inside the
       layout effect, so it lands before the browser's first paint and the
       opening line is simply there rather than appearing.

       Only when they actually are at the top, though. A refresh half way down
       the page restores the scroll position, and placing for t=0 there would
       put the opening beat on screen for exactly one frame before the loop
       corrected it — the same flash, moved. Leaving the beats hidden for that
       one frame is invisible; showing the wrong one is not.

       And it goes LAST, after the observer is already watching. Placing copy is
       cosmetic; driving the video is the section. Anything that ever throws in
       here must not be able to take the scroll stage down with it. */
    try {
      if (sec.getBoundingClientRect().top > -1) place(0)
    } catch (err) {
      console.error('CineHero: initial beat placement failed', err)
    }

    return () => {
      running = false
      io.disconnect()
      v.removeEventListener('loadedmetadata', onMeta)
      window.removeEventListener('resize', measure)
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
        {/* The scrim exists to give the copy a floor to stand on. With the copy
            off, it is just darkening the animation for no one. */}
        {SHOW_BEATS && <div className="cine__scrim" aria-hidden="true" />}

        {!SHOW_BEATS && (
          <h1 className="sr-only">
            Look Estate Sales — a lifetime of belongings, valued with care.
          </h1>
        )}

        {SHOW_BEATS && (
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
        )}
      </div>
    </section>
  )
}
