import { SITE } from '../data.js'
import { Reveal, Stagger, RevealItem } from './Reveal.jsx'
import { Tag, CountUp } from './Bits.jsx'

/* ---------------- Intro: what an estate sale with Look looks like ------------- */
export function Intro() {
  return (
    <section className="section intro" id="sales">
      <div className="wrap intro__grid">
        <div className="intro__lead">
          <Reveal><div className="eyebrow-row"><Tag>The event</Tag></div></Reveal>
          <Reveal delay={0.05}>
            <h2 className="h-section">
              We run the sale so the family
              doesn't have to.
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="intro__body">
              Shoppers come to us because we understand value. Families hire us because
              that understanding gets them the most for an estate. We handle everything —
              evaluating, cleaning, staging, pricing and advertising — then sweep the house
              clean at the end. Our directional signs are the ones people follow: bold,
              placed where they matter, pulling real traffic to your door.
            </p>
          </Reveal>
          <Reveal delay={0.15}>
            <a className="link-arrow" href={SITE.consult} target="_blank" rel="noreferrer">
              Start with a free walk-through <span aria-hidden="true">→</span>
            </a>
          </Reveal>
        </div>

        <Stagger className="intro__figures">
          <RevealItem className="intro__figure intro__figure--tall">
            <img
              src="https://lookestatesales.com/wp-content/uploads/2024/07/Estate-Sale-Home.jpg"
              alt="A Look Estate Sales event underway at a suburban home, signs directing shoppers"
              loading="lazy"
            />
            <span className="intro__cap">Signs that actually drive traffic.</span>
          </RevealItem>
          <RevealItem className="intro__figure">
            <img
              src="https://lookestatesales.com/wp-content/uploads/2024/08/Service-with-a-smile-1-717x1024.jpg"
              alt="A Look Estate Sales team member greeting shoppers"
              loading="lazy"
            />
            <span className="intro__cap">Service with a smile.</span>
          </RevealItem>
        </Stagger>
      </div>
    </section>
  )
}

/* ---------------- Stats band ---------------- */
export function Stats() {
  const items = [
    { n: 95, suffix: '%', label: 'Average sell-through on furniture, antiques, tools, vehicles and more' },
    { n: 0, prefix: '$', label: 'Upfront cost — we earn our commission by earning you top dollar' },
    { n: 1, suffix: '', label: 'One call handles organizing, marketing, selling and clean-out' },
    { n: 5, suffix: '★', label: 'Star-rated service, fully insured and BBB accredited' },
  ]
  return (
    <section className="section stats">
      <div className="wrap">
        <Reveal><div className="eyebrow-row eyebrow-row--center"><Tag onDark>By the numbers</Tag></div></Reveal>
        <Stagger className="stats__grid">
          {items.map((it, i) => (
            <RevealItem key={i} className="stat">
              <div className="stat__num">
                {it.prefix || ''}
                <CountUp end={it.n} suffix={it.suffix} />
              </div>
              <p className="stat__label">{it.label}</p>
            </RevealItem>
          ))}
        </Stagger>
      </div>
    </section>
  )
}

/* ---------------- Services ---------------- */
const SERVICES = [
  {
    k: 'Estate liquidation',
    d: 'Whole-house sales run end to end — cataloging, pricing, marketing and selling, from the everyday to the extraordinary.',
  },
  {
    k: 'Estate evaluation',
    d: 'Accurate valuations backed by price data from thousands of past sales, with specialists brought in for items of unusual worth.',
  },
  {
    k: 'Clean-out',
    d: "Whatever's left, we clear. You get a clean, swept house and a fresh start — all from one phone call.",
  },
]

const HANDLE = [
  { k: 'Personal property', d: 'Priced in the open, plainly and fairly, so shoppers buy with confidence and buy more.' },
  { k: 'Real estate', d: 'Licensed Realtors sell the home itself as part of the one-call process, with Berkshire Hathaway Kee Realty.' },
  { k: 'Commercial & industrial', d: 'When your business changes, we evaluate, market and sell commercial and industrial property too.' },
]

export function Services() {
  return (
    <section className="section services" id="services">
      <div className="wrap">
        <div className="services__head">
          <Reveal><div className="eyebrow-row"><Tag>What we do</Tag></div></Reveal>
          <Reveal delay={0.05}>
            <h2 className="h-section">Everything has value.<br />We find it, price it, and sell it.</h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="services__intro">
              Antiques, home goods, coins, precious metals, clocks, artwork, vehicles,
              boats, RVs, tractors — we work with owners, executors, guardians and legal
              professionals to turn a full house into fair value.
            </p>
          </Reveal>
        </div>

        <Stagger className="services__grid">
          {SERVICES.map((s, i) => (
            <RevealItem key={s.k} className="svc">
              <span className="svc__index">{String(i + 1).padStart(2, '0')}</span>
              <h3 className="svc__title">{s.k}</h3>
              <p className="svc__body">{s.d}</p>
            </RevealItem>
          ))}
        </Stagger>

        <div className="handle">
          <Reveal><h3 className="handle__title">One call covers all of it</h3></Reveal>
          <Stagger className="handle__grid" gap={0.07}>
            {HANDLE.map((h) => (
              <RevealItem key={h.k} className="handle__item">
                <h4>{h.k}</h4>
                <p>{h.d}</p>
              </RevealItem>
            ))}
          </Stagger>
        </div>
      </div>
    </section>
  )
}

/* ---------------- Auctions ---------------- */
export function Auctions() {
  return (
    <section className="section auctions" id="auctions">
      <div className="wrap auctions__grid">
        <div className="auctions__copy">
          <Reveal><div className="eyebrow-row"><Tag onDark>Now online</Tag></div></Reveal>
          <Reveal delay={0.05}>
            <h2 className="h-section h-section--light">
              Local previews.
              <br /><span className="serif-italic">National</span> reach.
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="auctions__body">
              We've paired the excitement of a public estate sale with the power of online
              auctions — local previews, real-time bidding and nationwide shipping to serious
              buyers coast to coast. New online auctions are coming soon.
            </p>
          </Reveal>
          <Reveal delay={0.15}>
            <div className="auctions__actions">
              <a className="btn btn--brass" href={SITE.auctions} target="_blank" rel="noreferrer">
                See all our auctions
              </a>
              <a className="link-arrow link-arrow--light" href={SITE.consult} target="_blank" rel="noreferrer">
                Talk to us first <span aria-hidden="true">→</span>
              </a>
            </div>
          </Reveal>
        </div>

        <Reveal delay={0.1} className="auctions__card">
          <div className="auctions__cardInner">
            <p className="auctions__kicker">HiBid live</p>
            <p className="auctions__big">Bid from anywhere</p>
            <p className="auctions__note">
              Whole-house liquidations with a 95% average sell-through — furniture,
              collectibles, tools, vehicles and the home itself.
            </p>
            <a className="auctions__link" href={SITE.auctions} target="_blank" rel="noreferrer">
              lookestatesales.hibid.com
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

/* ---------------- Process / One-Call band ---------------- */
const STEPS = [
  { t: 'Call', d: 'One free in-home consultation. We look, listen and plan.' },
  { t: 'Evaluate', d: 'Every item researched and priced against real market data.' },
  { t: 'Stage & sell', d: 'We clean, stage, advertise and run the public sale or auction.' },
  { t: 'Clean out', d: "We clear what's left and hand back a swept, empty house." },
]

export function Process() {
  return (
    <section className="section process" id="process">
      <div className="wrap">
        <div className="process__head">
          <Reveal><div className="eyebrow-row"><Tag>How it works</Tag></div></Reveal>
          <Reveal delay={0.05}>
            <h2 className="h-section">
              This could be your sign.
              <br />One call away.
            </h2>
          </Reveal>
        </div>

        <Stagger className="process__steps">
          {STEPS.map((s, i) => (
            <RevealItem key={s.t} className="step">
              <span className="step__num">{String(i + 1).padStart(2, '0')}</span>
              <h3 className="step__title">{s.t}</h3>
              <p className="step__body">{s.d}</p>
            </RevealItem>
          ))}
        </Stagger>

        <Reveal delay={0.1}>
          <div className="process__cta">
            <img
              className="process__photo"
              src="https://lookestatesales.com/wp-content/uploads/2024/07/RobRob-Counter-Greeting.jpg"
              alt="Look Estate Sales owner greeting a customer at the checkout counter"
              loading="lazy"
            />
            <div className="process__ctaCopy">
              <p className="process__ctaLead">
                Our team handles the whole settlement — advertising, setup, pricing and
                clean-out — with discounted commission options and trusted, five-star service.
              </p>
              <div className="process__ctaActions">
                <a className="btn btn--brass" href={SITE.consult} target="_blank" rel="noreferrer">
                  Book a free consultation
                </a>
                <a className="btn btn--ghost" href={SITE.phoneHref}>Call {SITE.phone}</a>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

/* ---------------- Social proof / reviews ---------------- */
export function Reviews() {
  return (
    <section className="section reviews" id="reviews">
      <div className="wrap reviews__grid">
        <div>
          <Reveal><div className="eyebrow-row"><Tag>Trusted locally</Tag></div></Reveal>
          <Reveal delay={0.05}>
            <h2 className="h-section">Five-star rated, fully insured, and here to help.</h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="reviews__body">
              Families across Southeast Michigan rate Look Estate Sales five stars on Google.
              We're BBB accredited, a member of the Macomb County Chamber, and carry full
              liability and workers' compensation coverage — so you can hand over the keys
              with confidence.
            </p>
          </Reveal>
          <Reveal delay={0.15}>
            <div className="reviews__badges">
              <a href="https://www.bbb.org/us/mi/oakland/profile/estate-sales/look-estate-sales-llc-0332-90058135/" target="_blank" rel="noreferrer" className="reviews__badge">BBB Accredited</a>
              <a href="https://mccbiz.macombcountychamber.com/list/member/look-estate-sales-944774" target="_blank" rel="noreferrer" className="reviews__badge">Macomb County Chamber</a>
              <span className="reviews__badge">Liability &amp; Workers' Comp</span>
            </div>
          </Reveal>
        </div>

        <Reveal delay={0.1}>
          <div className="reviews__stars">
            <div className="reviews__starRow" aria-hidden="true">★★★★★</div>
            <p className="reviews__starLabel">Rated on Google</p>
            <p className="reviews__quote">
              “We take care of estate settlements with one phone call — the advertising,
              the setup, the pricing and the clean-out.”
            </p>
            <div className="reviews__socials">
              <a href={SITE.facebook} target="_blank" rel="noreferrer">Facebook</a>
              <a href={SITE.instagram} target="_blank" rel="noreferrer">Instagram</a>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

/* ---------------- Articles ---------------- */
const ARTICLES = [
  { t: 'Discover the hidden gems at Look Estate Sales', href: 'https://lookestatesales.com/discover-the-hidden-gems-at-look-estate-sales/', tag: 'Beauty' },
  { t: 'Insider tips for navigating estate sales', href: 'https://lookestatesales.com/insider-tips-for-navigating-estate-sales-with-look-estate-sales/', tag: 'Look inside' },
  { t: 'Navigating the estate sale process', href: 'https://lookestatesales.com/navigating-the-estate-sale-process-with-look-estate-sales/', tag: 'The counter' },
  { t: 'Unlock the value in your home', href: 'https://lookestatesales.com/unlock-the-value-in-your-home-with-look-estate-sales/', tag: 'Every item' },
]

export function Articles() {
  return (
    <section className="section articles">
      <div className="wrap">
        <div className="articles__head">
          <Reveal><div className="eyebrow-row"><Tag>From the blog</Tag></div></Reveal>
          <Reveal delay={0.05}><h2 className="h-section">Notes on getting the most for an estate</h2></Reveal>
        </div>
        <Stagger className="articles__grid" gap={0.06}>
          {ARTICLES.map((a) => (
            <RevealItem key={a.t}>
              <a className="article" href={a.href} target="_blank" rel="noreferrer">
                <span className="article__tag">{a.tag}</span>
                <h3 className="article__title">{a.t}</h3>
                <span className="article__more">Read more →</span>
              </a>
            </RevealItem>
          ))}
        </Stagger>
      </div>
    </section>
  )
}
