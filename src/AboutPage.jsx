import Nav from './components/Nav.jsx'
import Footer from './components/Footer.jsx'
import { Reveal, Stagger, RevealItem } from './components/Reveal.jsx'
import { Tag } from './components/Bits.jsx'
import { SITE, linksFor } from './data.js'
import './styles/components.css'
import './styles/page.css'
import './styles/about.css'

const L = linksFor('about')

/* The road to Look Estate Sales, as the live page tells it. Every stop below
   comes out of the story alongside it — no dates invented to fill the rail. */
const MILESTONES = [
  { k: 'Michigan State University', d: 'Sales and service management — where the partnership started.' },
  { k: 'NCAA, nationwide', d: 'Recruiting, training and overseeing hundreds of staff across the southeast.' },
  { k: 'Distressed real estate', d: 'Buying and renovating property, and bringing it back to market.' },
  { k: 'Game Time Vendors Inc.', d: 'Built into a successful company — and then sold.' },
  { k: 'Destin, Florida', d: 'Four years owning and operating a Dairy Queen franchise.' },
  { k: 'Look Estate Sales LLC', d: 'Home to Michigan, and into the industry they had loved as shoppers.' },
]

const SERVICES = [
  {
    k: 'Estate liquidation',
    d: 'Our team of experts specializes in the professional liquidation of estate assets, ensuring a seamless and efficient process for families. We provide comprehensive services, from cataloging and pricing to marketing and selling, to help you get the best value for your belongings.',
  },
  {
    k: 'Estate appraisals',
    d: 'Trust our appraisers to provide accurate and detailed valuations of your estate assets. We utilize industry-leading techniques and market data to ensure you receive a fair assessment of your belongings.',
  },
  {
    k: 'Clean out',
    d: 'After most sales there will be items inside your home that just did not sell. We have solutions such as donation coordination, disposal, consignment and bulk liquidation options. Our goal is to maximize returns for our clients and prepare your home for listing and sale.',
  },
]

export default function AboutPage() {
  return (
    <>
      <Nav page="about" solid />

      <main>
        <section className="phero">
          <div className="wrap">
            <Reveal>
              <div className="eyebrow-row"><Tag onDark>About us</Tag></div>
            </Reveal>
            <Reveal delay={0.05}>
              <h1 className="phero__title">
                Two Roberts, and one
                <br /><span className="serif-italic serif-italic--onDark">standard of service.</span>
              </h1>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="phero__lede">
                Stadium operations, distressed real estate, a Dairy Queen in Destin — and one
                thing running through all of it. Robert McPherson and Robert Channer brought
                that back to Michigan and put it into estate sales.
              </p>
            </Reveal>
            <Reveal delay={0.15}>
              <div className="phero__actions">
                <a className="btn btn--red" href={SITE.phoneHref}>Call {SITE.phone}</a>
                <a className="link-arrow link-arrow--light" href="#story">
                  Read the story <span aria-hidden="true">→</span>
                </a>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ---------------- Who we are ---------------- */}
        <section className="section story" id="story">
          <div className="wrap story__grid">
            <div className="story__copy">
              <Reveal>
                <div className="eyebrow-row"><Tag>Who we are</Tag></div>
              </Reveal>
              <Reveal delay={0.05}>
                <h2 className="h-section">From the stadium gates to the front door.</h2>
              </Reveal>

              <Reveal delay={0.1}>
                <div className="story__prose">
                  <p>
                    Robert McPherson and Robert Channer began working together with a shared
                    dedication to creating value through excellent customer service. Their early
                    business ventures demonstrated their ability to identify opportunities and
                    deliver results, leading them to the stadium and event management industry.
                    Starting with sales and service management at Michigan State University, they
                    quickly recognized the potential to expand their expertise. Their work with
                    NCAA university athletic departments across the country grew, and they soon
                    found themselves managing a large team, recruiting, training, and overseeing
                    hundreds of staff members throughout the southeastern United States.
                  </p>
                  <p>
                    With a strong entrepreneurial spirit, Robert and Robert branched out into real
                    estate, purchasing and renovating distressed properties to bring them back to
                    market. This experience in property transformation naturally led them to
                    develop a passion for the estate sale industry. Over the years, they attended
                    estate sales across the country as avid shoppers, gaining valuable insight
                    into what buyers are seeking and how to price items for success.
                  </p>
                  <p>
                    After years of growing their business, they made the decision to sell their
                    successful company, Game Time Vendors Inc, and embraced a new challenge by
                    purchasing and operating a Dairy Queen franchise in Destin, Florida. Their
                    dedication to outstanding customer service was evident throughout their four
                    years of ownership, as they applied the same principles of value creation and
                    customer care that had driven their earlier successes. However, the call of
                    family and the allure of Michigan's natural beauty, with its four distinct
                    seasons, ultimately drew them back home.
                  </p>
                  <p>
                    Upon their return to Michigan, Robert and Robert channeled their enthusiasm
                    and passion for the estate sale industry into formalizing Look Estate Sales
                    LLC. With their extensive background in customer service and a deep
                    understanding of the estate sale market, they were well-equipped to make a
                    significant impact in this new venture. Their strong connection to Michigan's
                    automotive history also fueled their appreciation for classic and antique
                    automobiles, adding another layer of expertise to the services they offer.
                  </p>
                  <p>
                    At Look Estate Sales, Robert and Robert approach each sale with a commitment
                    to traditional customer service values — offering warm greetings, providing
                    personal assistance, and ensuring professional presentation of all items. They
                    stay current on market trends through industry associations like the Antiques
                    &amp; Collectibles National Association (ACNA) and leverage extensive resources
                    to accurately evaluate and price items. Their dedication to excellence has
                    earned them glowing reviews, with customers praising their professionalism,
                    attention to detail, and genuine care for both clients and shoppers.
                  </p>
                  <p>
                    When you choose Look Estate Sales, you're selecting a team that understands
                    the intricacies of estate sales, values transparency and fairness, and is
                    passionate about bringing forgotten treasures back to life. Robert and Robert
                    are deeply committed to serving the southeastern Michigan community with
                    integrity, enthusiasm, and a genuine love for the work they do.
                  </p>
                </div>
              </Reveal>
            </div>

            <div className="story__aside">
              <Reveal delay={0.1}>
                <figure className="story__figure">
                  <img
                    src="https://lookestatesales.com/wp-content/uploads/2024/07/RobRob-Counter-Greeting.jpg"
                    alt="Robert and Robert greeting a customer at the checkout counter of an estate sale"
                    loading="lazy"
                  />
                  <figcaption>Robert and Robert, at the counter where every sale ends.</figcaption>
                </figure>
              </Reveal>

              <Stagger className="rail" gap={0.06}>
                {MILESTONES.map((m, i) => (
                  <RevealItem key={m.k} className="rail__item">
                    <span className="rail__num">{String(i + 1).padStart(2, '0')}</span>
                    <h3 className="rail__k">{m.k}</h3>
                    <p className="rail__d">{m.d}</p>
                  </RevealItem>
                ))}
              </Stagger>
            </div>
          </div>
        </section>

        {/* ---------------- Mission ---------------- */}
        <section className="mission">
          <div className="wrap">
            <Reveal>
              <div className="eyebrow-row eyebrow-row--center"><Tag onDark>Our mission</Tag></div>
            </Reveal>
            <Reveal delay={0.05}>
              <blockquote className="mission__quote">
                To provide a professional approach to
                <span className="serif-italic serif-italic--onDark"> maximizing the value</span> of
                our clients' estate.
              </blockquote>
            </Reveal>
          </div>
        </section>

        {/* ---------------- What we do best ---------------- */}
        <section className="section best">
          <div className="wrap">
            <div className="services__head">
              <Reveal>
                <div className="eyebrow-row"><Tag>What we do best</Tag></div>
              </Reveal>
              <Reveal delay={0.05}>
                <h2 className="h-section">It all starts with a free consultation.</h2>
              </Reveal>
              <Reveal delay={0.1}>
                <p className="services__intro">
                  We will custom tailor the perfect solution for your estate. We handle everything
                  from the preparations, marketing, cleaning and so much more.
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
          </div>
        </section>

        {/* ---------------- Service to shoppers / crowd control ---------------- */}
        <section className="section crowd">
          <div className="wrap crowd__grid">
            <Reveal className="crowd__figure">
              <img
                src="https://lookestatesales.com/wp-content/uploads/2024/07/Estate-Sale-Home.jpg"
                alt="A Look Estate Sales event underway, with directional signs and managed parking"
                loading="lazy"
              />
            </Reveal>

            <div className="crowd__copy">
              <Reveal>
                <div className="eyebrow-row"><Tag>Crowd control</Tag></div>
              </Reveal>
              <Reveal delay={0.05}>
                <h2 className="h-section">
                  The service is for the shoppers.
                  <br /><span className="serif-italic">The result is for you.</span>
                </h2>
              </Reveal>
              <Reveal delay={0.1}>
                <div className="crowd__prose">
                  <p>
                    We go above and beyond to provide exceptional service to our legion of
                    shoppers. We greet shoppers, hold the door, help carry items to the car and
                    even coordinate local deliveries to help secure more sales for our clients.
                  </p>
                  <p>
                    That is why we have so many shoppers come to our events. That extra service
                    makes a difference for them and our clients.
                  </p>
                  <p>
                    We take special care to direct traffic to your sale for maximum value, while
                    also paying close attention to the neighborhood lawns. Our traffic control and
                    no-parking signs keep people from accidentally causing damage.
                  </p>
                </div>
              </Reveal>
              <Reveal delay={0.15}>
                <a className="link-arrow" href={L.consult}>
                  Start with a free walk-through <span aria-hidden="true">→</span>
                </a>
              </Reveal>
            </div>
          </div>
        </section>

        <section className="passure">
          <div className="wrap">
            <Reveal>
              <p className="passure__line">
                Fully insured with liability and workers' compensation coverage.
              </p>
            </Reveal>
            <Reveal delay={0.05}>
              <div className="reviews__badges passure__badges">
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
                <span className="reviews__badge">ACNA member</span>
                <span className="reviews__badge">Liability &amp; Workers' Comp</span>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      <Footer page="about" />
    </>
  )
}
