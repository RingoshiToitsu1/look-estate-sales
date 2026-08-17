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
  { label: 'Services', href: '#services' },
  { label: 'Auctions', href: '#auctions' },
  { label: 'How it works', href: '#process' },
  { label: 'Reviews', href: '#reviews' },
  { label: 'FAQs', href: 'https://lookestatesales.com/faqs/', external: true },
]

/**
 * Nav and Footer are shared by two pages that sit at different depths — the
 * landing page at the site root, the contact page one level down. Every link
 * is resolved relative to the page asking, never from '/', so the same markup
 * works on a project Pages URL (/look-estate-sales/) and on a custom domain
 * at the root.
 */
export function linksFor(page = 'home') {
  const onContact = page === 'contact'
  const up = onContact ? '../' : ''
  return {
    // The brand mark: scrolls to the top at home, goes home from anywhere else.
    home: onContact ? '../' : '#top',
    // The one CTA the whole site points at.
    consult: onContact ? '#start' : './contact/',
    nav: NAV.map((item) =>
      item.external ? item : { ...item, href: up + item.href },
    ),
  }
}
