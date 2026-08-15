import { motion, useReducedMotion } from 'framer-motion'

/**
 * Reveal — fades + rises its children as they scroll into view.
 * Respects prefers-reduced-motion (renders statically).
 */
export function Reveal({ children, delay = 0, y = 26, className, as = 'div' }) {
  const reduce = useReducedMotion()
  const MotionTag = motion[as] || motion.div

  if (reduce) {
    const Tag = as
    return <Tag className={className}>{children}</Tag>
  }

  return (
    <MotionTag
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -12% 0px' }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </MotionTag>
  )
}

/**
 * Stagger — reveals children in sequence. Pair with <RevealItem>.
 */
export function Stagger({ children, className, gap = 0.09 }) {
  const reduce = useReducedMotion()
  if (reduce) return <div className={className}>{children}</div>
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '0px 0px -10% 0px' }}
      variants={{ show: { transition: { staggerChildren: gap } } }}
    >
      {children}
    </motion.div>
  )
}

export function RevealItem({ children, className, y = 24 }) {
  const reduce = useReducedMotion()
  if (reduce) return <div className={className}>{children}</div>
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y },
        show: { opacity: 1, y: 0, transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] } },
      }}
    >
      {children}
    </motion.div>
  )
}
