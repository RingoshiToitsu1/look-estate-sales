import Nav from './components/Nav.jsx'
import Footer from './components/Footer.jsx'
import ContactForm from './components/ContactForm.jsx'
import { Reveal, Stagger, RevealItem } from './components/Reveal.jsx'
import { Tag } from './components/Bits.jsx'
import { SITE } from './data.js'
import './styles/components.css'
import './styles/contact.css'

const DETAILS = [
  {
    k: 'Call us',
    v: SITE.phone,
    href: SITE.phoneHref,
    d: 'The fastest way to get an answer. Ask for Robert.',
  },
  {
    k: 'Email',
    v: SITE.email,
    href: `mailto:${SITE.email}`,
    d: 'Send photos of anything you want valued.',
  },
  {
    k: 'Office',
    v: SITE.address,
    d: 'Serving Oakland, Macomb and the rest of Southeast Michigan.',
  },
]

export default function ContactPage() {
  return (
    <>
      <Nav page="contact" solid />

      <main>
        <section className="chero">
          <div className="wrap">
            <Reveal>
              <div className="eyebrow-row"><Tag onDark>Contact us</Tag></div>
            </Reveal>
            <Reveal delay={0.05}>
              <h1 className="chero__title">
                We sell, so you can
                <br /><span className="serif-italic serif-italic--onDark">move forward.</span>
              </h1>
            </Reveal>
            <Reveal delay={0.1}>
              <div className="chero__actions">
                <a className="btn btn--red" href={SITE.phoneHref}>Call {SITE.phone}</a>
                <a className="link-arrow link-arrow--light" href="#start">
                  Or send us the details <span aria-hidden="true">→</span>
                </a>
              </div>
            </Reveal>
          </div>
        </section>

        <section className="section cmain" id="start">
          <div className="wrap cmain__grid">
            <div className="cmain__copy">
              <Reveal>
                <div className="eyebrow-row"><Tag>Get in touch</Tag></div>
              </Reveal>
              <Reveal delay={0.05}>
                <h2 className="h-section">One call handles all of it.</h2>
              </Reveal>

              <Reveal delay={0.1}>
                <div className="cmain__prose">
                  <p>
                    At LookEstateSales.com, we are your trusted, one-call solution for
                    comprehensive estate liquidation. With our extensive experience and
                    personalized approach, we handle every aspect of your estate needs, from
                    managing the sale of your real estate to organizing and liquidating the
                    contents of your home.
                  </p>
                  <p>
                    We meticulously organize, stage, price, and promote your items, ensuring
                    everything aligns with your timeline and goals.
                  </p>
                  <p>
                    We understand that downsizing can be a challenging experience, which is why
                    we're dedicated to making the process as smooth and stress-free as possible.
                    By partnering with us, you can be confident that we will maximize the value
                    of your belongings and ensure a successful sale.
                  </p>
                </div>
              </Reveal>

              <Stagger className="cdetails" gap={0.07}>
                {DETAILS.map((d) => (
                  <RevealItem key={d.k} className="cdetail">
                    <span className="cdetail__k">{d.k}</span>
                    {d.href ? (
                      <a className="cdetail__v" href={d.href}>{d.v}</a>
                    ) : (
                      <span className="cdetail__v">{d.v}</span>
                    )}
                    <p className="cdetail__d">{d.d}</p>
                  </RevealItem>
                ))}
              </Stagger>
            </div>

            <Reveal delay={0.1} className="cmain__formCol">
              <ContactForm />
            </Reveal>
          </div>
        </section>

        <section className="cassure">
          <div className="wrap">
            <Reveal>
              <p className="cassure__line">
                Fully insured with liability and workers' compensation coverage.
              </p>
            </Reveal>
            <Reveal delay={0.05}>
              <div className="reviews__badges cassure__badges">
                <a
                  href="https://www.bbb.org/us/mi/oakland/profile/estate-sales/look-estate-sales-llc-0332-90058135/"
                  target="_blank"
                  rel="noreferrer"
                  className="reviews__badge"
                >
                  BBB Accredited
                </a>
                <a
                  href="https://mccbiz.macombcountychamber.com/list/member/look-estate-sales-944774"
                  target="_blank"
                  rel="noreferrer"
                  className="reviews__badge"
                >
                  Macomb County Chamber
                </a>
                <span className="reviews__badge">Liability &amp; Workers' Comp</span>
                <span className="reviews__badge">No cost up front</span>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      <Footer page="contact" />
    </>
  )
}
