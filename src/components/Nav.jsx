import { useEffect, useState } from 'react'
import { SITE, linksFor } from '../data.js'

/**
 * @param page   which page is rendering this — decides how links resolve.
 * @param solid  start with the filled navy bar. The landing page earns it by
 *               scrolling; pages without a dark hero need it from the first
 *               paint, or white nav type lands on a white background.
 */
export default function Nav({ page = 'home', solid = false }) {
  const [scrolled, setScrolled] = useState(solid)
  const [open, setOpen] = useState(false)
  const L = linksFor(page)

  useEffect(() => {
    if (solid) return
    const onScroll = () => setScrolled(window.scrollY > 40)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [solid])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <header className={`nav${scrolled ? ' nav--solid' : ''}`}>
      <div className="nav__inner wrap">
        <a href={L.home} className="nav__brand" aria-label={SITE.name}>
          <span className="nav__mark" aria-hidden="true">
            {/* The sign's mark: a house with a magnifier inside it. */}
            <svg viewBox="0 0 40 40" width="30" height="30">
              <path
                d="M6.5 18.5 20 7.5l13.5 11v14h-27z"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinejoin="round"
              />
              <circle cx="19" cy="21" r="5" fill="none" stroke="currentColor" strokeWidth="2.4" />
              <path d="M22.8 24.8 27.6 29.6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
            </svg>
          </span>
          <span className="nav__word">Look<span className="nav__word-sub">Estate Sales</span></span>
        </a>

        <nav className="nav__links" aria-label="Primary">
          {L.nav.map((item) => (
            <a
              key={item.label}
              href={item.href}
              target={item.external ? '_blank' : undefined}
              rel={item.external ? 'noreferrer' : undefined}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="nav__cta">
          <a className="nav__phone" href={SITE.phoneHref}>{SITE.phone}</a>
          <a className="btn btn--primary nav__book" href={L.consult}>
            Book a consultation
          </a>
        </div>

        <button
          className="nav__toggle"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span className={`nav__bars${open ? ' is-open' : ''}`} />
        </button>
      </div>

      {open && (
        <div className="nav__drawer" onClick={() => setOpen(false)}>
          <div className="nav__drawer-inner" onClick={(e) => e.stopPropagation()}>
            {L.nav.map((item) => (
              <a
                key={item.label}
                href={item.href}
                target={item.external ? '_blank' : undefined}
                rel={item.external ? 'noreferrer' : undefined}
                onClick={() => setOpen(false)}
              >
                {item.label}
              </a>
            ))}
            <a className="btn btn--primary" href={L.consult} onClick={() => setOpen(false)}>
              Book a consultation
            </a>
            <a className="nav__drawer-phone" href={SITE.phoneHref}>Call {SITE.phone}</a>
          </div>
        </div>
      )}
    </header>
  )
}
