import { SITE, NAV } from '../data.js'
import { Reveal } from './Reveal.jsx'

export default function Footer() {
  return (
    <footer className="footer" id="contact">
      <div className="wrap">
        <Reveal>
          <div className="footer__cta">
            <h2 className="footer__ctaTitle">
              This could be your sign.
              <br /><span className="serif-italic">One call away.</span>
            </h2>
            <a className="btn btn--brass" href={SITE.consult} target="_blank" rel="noreferrer">
              Schedule a consultation
            </a>
          </div>
        </Reveal>

        <div className="footer__grid">
          <div className="footer__brand">
            <span className="footer__word">Look<span>Estate Sales</span></span>
            <p className="footer__ins">
              Personal property liquidation. Fully insured with liability and workers'
              compensation coverage.
            </p>
          </div>

          <nav className="footer__nav" aria-label="Footer">
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
            <a href="https://lookestatesales.com/about/" target="_blank" rel="noreferrer">About</a>
            <a href="https://lookestatesales.com/resources/" target="_blank" rel="noreferrer">Resources</a>
          </nav>

          <div className="footer__contact">
            <a href={SITE.phoneHref} className="footer__phone">{SITE.phone}</a>
            <a href={`mailto:${SITE.email}`}>{SITE.email}</a>
            <p className="footer__addr">{SITE.address}</p>
            <div className="footer__socials">
              <a href={SITE.facebook} target="_blank" rel="noreferrer">Facebook</a>
              <a href={SITE.instagram} target="_blank" rel="noreferrer">Instagram</a>
            </div>
          </div>
        </div>

        <div className="footer__base">
          <span>© {new Date().getFullYear()} Look Estate Sales LLC</span>
          <span>Oakland Township, Michigan</span>
        </div>
      </div>
    </footer>
  )
}
