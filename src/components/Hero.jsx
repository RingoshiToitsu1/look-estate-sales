import { motion, useReducedMotion } from 'framer-motion'
import { SITE } from '../data.js'

const reveal = (delay) => ({
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.9, delay, ease: [0.22, 1, 0.36, 1] },
})

export default function Hero() {
  const reduce = useReducedMotion()

  return (
    <section className="hero" id="top">
      <div className="hero__media">
        <video
          className="hero__video"
          autoPlay
          muted
          loop
          playsInline
          poster="./media/poster.jpg"
          preload="auto"
        >
          <source src="./media/hero.mp4" type="video/mp4" />
        </video>
        <div className="hero__scrim" />
      </div>

      <div className="hero__content wrap">
        <motion.span className="hero__eyebrow" {...(reduce ? {} : reveal(0.1))}>
          <span className="tag tag--onDark">Est. Southeast Michigan</span>
        </motion.span>

        <motion.h1 className="hero__title" {...(reduce ? {} : reveal(0.2))}>
          A lifetime of belongings,
          <br />
          <span className="serif-italic">valued</span> with care.
        </motion.h1>

        <motion.p className="hero__sub" {...(reduce ? {} : reveal(0.34))}>
          Full-service estate sales, appraisals, clean-outs and online auctions.
          One call handles the whole house — even the house itself.
        </motion.p>

        <motion.div className="hero__actions" {...(reduce ? {} : reveal(0.46))}>
          <a className="btn btn--brass" href={SITE.consult} target="_blank" rel="noreferrer">
            Book a free consultation
          </a>
          <a className="btn btn--ghostDark" href={SITE.phoneHref}>
            Call {SITE.phone}
          </a>
        </motion.div>
      </div>

      <motion.a
        href="#sales"
        className="hero__scroll"
        aria-label="Scroll to content"
        {...(reduce ? {} : { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { delay: 1.1, duration: 0.8 } })}
      >
        <span>Scroll</span>
        <span className="hero__scroll-line" aria-hidden="true" />
      </motion.a>
    </section>
  )
}
