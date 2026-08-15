import { useEffect, useRef, useState } from 'react'
import { useInView, useReducedMotion } from 'framer-motion'

/** The signature price-tag chip used as an eyebrow throughout the page. */
export function Tag({ children, onDark = false }) {
  return <span className={`tag${onDark ? ' tag--onDark' : ''}`}>{children}</span>
}

/** Counts up to `end` when scrolled into view. */
export function CountUp({ end, suffix = '', duration = 1400, className }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '0px 0px -20% 0px' })
  const reduce = useReducedMotion()
  const [val, setVal] = useState(0)

  useEffect(() => {
    if (!inView) return
    if (reduce) { setVal(end); return }
    let raf
    const start = performance.now()
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      setVal(Math.round(eased * end))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [inView, end, duration, reduce])

  return (
    <span ref={ref} className={className}>
      {val}
      {suffix}
    </span>
  )
}
