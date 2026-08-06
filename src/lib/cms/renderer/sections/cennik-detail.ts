/**
 * cennik-detail — sekcja cennikowa na stronie /proces.
 *
 * Prawie identyczna z pricing.ts, ale:
 *   - id="cennik" (nie "pricing") → renderPage NIE wyciąga stąd pricingStandardAmount
 *     i NIE renderuje schema.org JSON-LD (poprawne — proces.html reference nie ma schema.org)
 *   - aria-labelledby="cennik-heading"
 *   - Treść stopki: "poza pakietami" (nie "niestandardowy zakres")
 *
 * JEDYNE ŹRÓDŁO CENY: pakiety (standard, extended) NIE są polami w sekcji cennik-detail.
 * Renderer dostaje je przez ctx.indexPricing z sekcji index.pricing.
 * Klient zmienia cenę RAZ (index.pricing) — zmienia się na home I na /proces.
 *
 * DŁUG-CENNIK-1: cta-finale.lead na home i /proces zawiera cenę jako wolny tekst
 * ("Od 4 500 zł netto"). V1 nie pilnuje richtext — klient może zmienić pricing.standard.amount
 * i zapomnieć zaktualizować ten tekst. Do rozwiązania w Etapie 2:
 *   opcja A — template injection: lead interpoluje wartość z ctx.indexPricing
 *   opcja B — miękka walidacja W-soft porównująca lead z pricing.standard.amount
 */
import type { Section, PricingPackage } from '../../types'
import type { Lang } from '../context'
import { pageHref } from '../utils'
import { t } from '../i18n'

function renderPackage(pkg: PricingPackage, featured: boolean, linkMode: 'static' | 'preview', lang: Lang): string {
  const s = t(lang)
  const cardClass  = featured ? 'pricing-card featured interactive-card' : 'pricing-card interactive-card'
  const labelClass = featured ? 'section-label accent-text mb-3'         : 'section-label mb-3'

  const featuresHtml = pkg.features
    .map(f => `          <li>${f}</li>`)
    .join('\n')

  const ctaHref = pageHref('kontakt', linkMode)

  return `
      <div class="${cardClass}">
        <span class="${labelClass}">${pkg.label}</span>
        <div class="pricing-price" aria-label="${pkg.ariaLabel}">${pkg.amount}</div>
        <p class="pricing-note">${s.pricing.noteSuffix(pkg.deliveryNote)}</p>
        <ul class="pricing-features" aria-label="${s.pricing.packageContentsAria(pkg.label)}">
${featuresHtml}
        </ul>
        <a href="${ctaHref}" class="btn-primary btn-shimmer btn-magnetic"
          aria-label="${s.cennikDetail.orderPackageAriaWithForm(pkg.label)}">
          ${pkg.ctaLabel}
        </a>
        <p class="btn-micro mt-3">${pkg.ctaMicrocopy}</p>
      </div>`
}

export function renderCennikDetail(
  section: Section,
  linkMode: 'static' | 'preview' = 'static',
  pricing?: { standard: PricingPackage; extended: PricingPackage },
  lang: Lang = 'pl',
): string {
  const s = t(lang)
  // Fail-fast: cennik-detail nie ma własnych pól price — zależy od ctx.indexPricing.
  // Jeśli index nie ma sekcji pricing, błąd jest głośny (nie cicha pusta kwota).
  if (!pricing) {
    throw new Error(
      '[cennik-detail] brak ctx.indexPricing — model nie zawiera sekcji "pricing" na stronie "index". ' +
      'cennik-detail czyta ceny z index.pricing jako jedynego źródła prawdy.'
    )
  }

  const sectionHeadline = section.fields['sectionHeadline']?.value as string
  const sectionLead     = section.fields['sectionLead']?.value as string
  const { standard, extended } = pricing  // jedyne źródło: index.pricing przez ctx

  const kontaktHref = pageHref('kontakt', linkMode)

  return `<!-- SEKCJA: cennik-detail -->
<section id="cennik" class="section bg-surface reveal" aria-labelledby="cennik-heading">
  <div class="container">
    <div class="section-header">
      <span class="section-label">${s.pricing.label}</span>
      <h2 id="cennik-heading" class="f-headline">${sectionHeadline}</h2>
      <p class="f-lead mt-4">
        ${sectionLead}
      </p>
    </div>

    <div class="grid-2 stagger-reveal">
${renderPackage(standard, false, linkMode, lang)}
${renderPackage(extended, true, linkMode, lang)}
    </div>

    <p class="pricing-note-center">
      ${s.cennikDetail.biggerProject}
      <a href="${kontaktHref}" class="accent-text"
        aria-label="${s.pricing.quoteAria}">${s.pricing.quoteLink}</a>
    </p>
  </div>
</section>`
}
