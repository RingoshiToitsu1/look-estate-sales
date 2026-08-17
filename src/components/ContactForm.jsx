import { useState } from 'react'
import { SITE } from '../data.js'

const KINDS = ['Estate Liquidation', 'Estate Appraisals']

/**
 * The enquiry form.
 *
 * GitHub Pages serves static files and nothing else, so there is no endpoint
 * to POST to: submitting composes a mail and hands it to the visitor's own
 * mail client. That has one well-known failure mode — a browser with no mail
 * handler registered swallows the click silently — so the composed message
 * stays on screen afterwards, copyable, and the phone number sits next to it.
 * Nobody who fills this in should end up with nowhere to send it.
 */
export default function ContactForm() {
  const [kind, setKind] = useState(KINDS[0])
  const [sent, setSent] = useState(null)
  const [copied, setCopied] = useState(false)

  function handleSubmit(e) {
    e.preventDefault()
    const data = new FormData(e.currentTarget)
    const v = (k) => String(data.get(k) || '').trim()

    const subject = `${kind} — ${v('name')}, ${v('zip')}`
    const body = [
      `Enquiry: ${kind}`,
      `Name: ${v('name')}`,
      `Phone: ${v('phone')}`,
      `Email: ${v('email')}`,
      `Zip code: ${v('zip')}`,
      '',
      v('message') || '(No message added.)',
      '',
      '— Sent from the contact form at lookestatesales.com',
    ].join('\r\n')

    setSent({ subject, body })
    setCopied(false)
    window.location.href = `mailto:${SITE.email}?subject=${encodeURIComponent(
      subject,
    )}&body=${encodeURIComponent(body)}`
  }

  async function copyAll() {
    if (!sent) return
    try {
      await navigator.clipboard.writeText(
        `To: ${SITE.email}\r\nSubject: ${sent.subject}\r\n\r\n${sent.body}`,
      )
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="cform">
      <h2 className="cform__title">Contact us to start selling</h2>
      <p className="cform__note">
        Tell us where you are and what you're sitting on. The walk-through is free,
        and there's no cost up front.
      </p>

      <form className="cform__form" onSubmit={handleSubmit}>
        <fieldset className="cform__kinds">
          <legend>Estate liquidation and appraisal</legend>
          {KINDS.map((k) => (
            <label
              key={k}
              className={`cform__kind${kind === k ? ' is-on' : ''}`}
            >
              <input
                type="radio"
                name="kind"
                value={k}
                checked={kind === k}
                onChange={() => setKind(k)}
              />
              <span>{k}</span>
            </label>
          ))}
        </fieldset>

        <div className="cform__field">
          <label htmlFor="cf-name">Name</label>
          <input id="cf-name" name="name" type="text" autoComplete="name" required />
        </div>

        <div className="cform__field">
          <label htmlFor="cf-email">Email</label>
          <input id="cf-email" name="email" type="email" autoComplete="email" required />
        </div>

        <div className="cform__row">
          <div className="cform__field">
            <label htmlFor="cf-phone">Phone</label>
            <input
              id="cf-phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              inputMode="tel"
              required
            />
          </div>
          <div className="cform__field">
            <label htmlFor="cf-zip">Zip code</label>
            <input
              id="cf-zip"
              name="zip"
              type="text"
              autoComplete="postal-code"
              inputMode="numeric"
              pattern="[0-9]{5}(-[0-9]{4})?"
              title="A five-digit US zip code."
              required
            />
          </div>
        </div>

        <div className="cform__field">
          <label htmlFor="cf-message">Message</label>
          <textarea
            id="cf-message"
            name="message"
            rows={4}
            placeholder="Timeline, the property, what's in the house — whatever helps."
          />
        </div>

        <button className="btn btn--primary cform__submit" type="submit">
          Send my details
        </button>

        <p className="cform__legal">
          Opens your email app with the details filled in. Nothing is stored on this site.
        </p>
      </form>

      {sent && (
        <div className="cform__sent" role="status">
          <p className="cform__sentHead">Your email app should have opened.</p>
          <p className="cform__sentBody">
            If it didn't, copy the message below and send it to{' '}
            <a href={`mailto:${SITE.email}`}>{SITE.email}</a> — or just call{' '}
            <a href={SITE.phoneHref}>{SITE.phone}</a>.
          </p>
          <pre className="cform__preview">{sent.body}</pre>
          <button type="button" className="btn btn--ghost cform__copy" onClick={copyAll}>
            {copied ? 'Copied' : 'Copy the message'}
          </button>
        </div>
      )}
    </div>
  )
}
