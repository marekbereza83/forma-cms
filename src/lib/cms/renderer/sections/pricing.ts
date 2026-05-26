import type { Section, PricingPackage } from '../../types'
import { pageHref } from '../utils'

function renderPackage(pkg: PricingPackage, featured: boolean, linkMode: 'static' | 'preview'): string {
  const cardClass = featured
    ? 'pricing-card featured interactive-card'
    : 'pricing-card interactive-card'
  const labelClass = featured
    ? 'section-label accent-text mb-3'
    : 'section-label mb-3'

  const featuresHtml = pkg.features
    .map(f => `          <li>${f}</li>`)
    .join('\n')

  const ctaHref = pageHref('kontakt', linkMode)

  return `
      <div class="${cardClass}">
        <span class="${labelClass}">${pkg.label}</span>
        <div class="pricing-price" aria-label="${pkg.ariaLabel}">${pkg.amount}</div>
        <p class="pricing-note">zł netto &mdash; dostawa: ${pkg.deliveryNote}</p>
        <ul class="pricing-features" aria-label="Zawartość pakietu ${pkg.label}">
${featuresHtml}
        </ul>
        <a href="${ctaHref}" class="btn-primary btn-shimmer btn-magnetic"
          aria-label="Zamów stronę w pakiecie ${pkg.label === 'Rozszerzony' ? 'Rozszerzonym' : pkg.label}">
          ${pkg.ctaLabel}
        </a>
        <p class="btn-micro mt-3">${pkg.ctaMicrocopy}</p>
      </div>`
}

export function renderPricing(section: Section, linkMode: 'static' | 'preview' = 'static'): string {
  const sectionHeadline = section.fields['sectionHeadline']?.value as string
  const sectionLead = section.fields['sectionLead']?.value as string
  const standard = section.fields['standard']?.value as PricingPackage
  const extended = section.fields['extended']?.value as PricingPackage

  const kontaktHref = pageHref('kontakt', linkMode)

  return `<!-- SEKCJA: cennik -->
<section id="pricing" class="section bg-surface reveal" aria-labelledby="pricing-heading">
  <div class="container">
    <div class="section-header">
      <span class="section-label">Cennik</span>
      <h2 id="pricing-heading" class="f-headline">${sectionHeadline}</h2>
      <p class="f-lead mt-4">
        ${sectionLead}
      </p>
    </div>

    <div class="grid-2 stagger-reveal">
${renderPackage(standard, false, linkMode)}
${renderPackage(extended, true, linkMode)}
    </div>

    <p class="pricing-note-center">
      Większy projekt lub niestandardowy zakres?
      <a href="${kontaktHref}" class="accent-text"
        aria-label="Napisz po indywidualną wycenę">Napisz — wycenię indywidualnie.</a>
    </p>
  </div>
</section>`
}
