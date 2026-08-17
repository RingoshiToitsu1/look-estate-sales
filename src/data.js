export const SITE = {
  name: 'Look Estate Sales',
  phone: '248-800-6559',
  phoneHref: 'tel:+12488006559',
  email: 'Robert@LookEstateSales.com',
  address: '890 E. Romeo Rd, Oakland Township, MI 48363',
  facebook: 'https://www.facebook.com/people/Look-Estate-Sales-LLC/61558664071645',
  instagram: 'https://www.instagram.com/look.estate.sales/',
  auctions: 'https://lookestatesales.hibid.com/',
}

// Nav links. In-page anchors scroll; external ones open the live pages
// that this landing page doesn't reproduce in full.
export const NAV = [
  { label: 'Sales', href: '#sales' },
  // `page` marks a real page of ours rather than an anchor on the landing page.
  { label: 'About', page: 'about' },
  { label: 'Services', href: '#services' },
  { label: 'Auctions', href: '#auctions' },
  { label: 'How it works', href: '#process' },
  { label: 'Reviews', href: '#reviews' },
  { label: 'FAQs', href: 'https://lookestatesales.com/faqs/', external: true },
]

/**
 * Nav and Footer are shared by pages that sit at different depths — the
 * landing page at the site root, every other page one directory down. Every
 * link is resolved relative to the page asking, never from '/', so the same
 * markup works on a project Pages URL (/look-estate-sales/) and on a custom
 * domain at the root.
 */
export function linksFor(page = 'home') {
  const up = page === 'home' ? '' : '../'
  // A page never links to itself: the CTA becomes a jump to the thing you
  // came for, and the About link becomes a scroll back up.
  const pageHref = (name, self) => (page === name ? self : `${up}${name}/`)

  return {
    // The brand mark: scrolls to the top at home, goes home from anywhere else.
    home: page === 'home' ? '#top' : '../',
    // The one CTA the whole site points at.
    consult: pageHref('contact', '#start'),
    about: pageHref('about', '#top'),
    nav: NAV.map((item) => {
      if (item.external) return item
      if (item.page) return { ...item, href: pageHref(item.page, '#top') }
      // An anchor on the landing page — reachable from elsewhere by going up first.
      return { ...item, href: up + item.href }
    }),
  }
}
