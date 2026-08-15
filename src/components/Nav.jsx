import { useEffect, useState } from 'react'
import { SITE, NAV } from '../data.js'

export default function Nav() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <header className={`nav${scrolled ? ' nav--solid' : ''}`}>
      <div className="nav__inner wrap">
        <a href="#top" className="nav__brand" aria-label={SITE.name}>
          <span className="nav__mark" aria-hidden="true">
            <svg viewBox="0 0 40 40" width="30" height="30">
              <g transform="rotate(-18 20 20)">
                <path d="M11 13h11l7 7-9 9-11-11v-5z" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
                <circle cx="15.5" cy="17.5" r="2.1" fill="currentColor" />
              </g>
            </svg>
          </span>
          <span className="nav__word">Look<span className="nav__word-sub">Estate Sales</span></span>
        </a>

        <nav className="nav__links" aria-label="Primary">
          {NAV.map((item) => (
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
          <a className="btn btn--brass nav__book" href={SITE.consult} target="_blank" rel="noreferrer">
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
            {NAV.map((item) => (
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
            <a className="btn btn--brass" href={SITE.consult} target="_blank" rel="noreferrer">
              Book a consultation
            </a>
            <a className="nav__drawer-phone" href={SITE.phoneHref}>Call {SITE.phone}</a>
          </div>
        </div>
      )}
    </header>
  )
}
