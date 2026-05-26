import type { Section } from '../../types'
import { pageHref } from '../utils'

export function renderCtaFinale(section: Section, linkMode: 'static' | 'preview' = 'static'): string {
  const headline     = section.fields['headline']?.value as string
  const lead         = section.fields['lead']?.value as string
  const ctaLabel     = section.fields['ctaLabel']?.value as string
  const phoneRaw     = section.fields['phoneRaw']?.value as string | undefined
  const phoneDisplay = section.fields['phoneDisplay']?.value as string | undefined
  const microcopy    = section.fields['microcopy']?.value as string | undefined

  const ctaHref = pageHref('kontakt', linkMode)

  // Wariant z telefonem (index) / bez telefonu (proces).
  // Jeśli phoneRaw jest obecny — renderuj link tel + domyślny microcopy.
  // Jeśli brak phoneRaw — użyj pola microcopy (np. "Odpowiadam w ciągu 24h. Bez zobowiązań.").
  const microcopyHtml = phoneRaw
    ? `lub zadzwoń: <a href="tel:${phoneRaw}" class="cta-tel-link" aria-label="Zadzwoń: ${phoneDisplay}">${phoneDisplay}</a> — Odpowiadam w ciągu 24h.`
    : (microcopy ?? 'Odpowiadam w ciągu 24h.')

  return `<!-- SEKCJA: cta-finale -->
<section id="cta-finale" class="section bg-surface reveal" aria-labelledby="cta-finale-heading">
  <div class="container">
    <div class="cta-finale-inner">
      <h2 id="cta-finale-heading" class="f-headline">
        ${headline}
      </h2>
      <p class="f-lead">
        ${lead}
      </p>
      <div>
        <a href="${ctaHref}" class="btn-primary cta-lg btn-shimmer btn-pulse btn-magnetic"
          aria-label="${ctaLabel} — przejdź do formularza kontaktowego">
          ${ctaLabel}
        </a>
        <p class="btn-micro pulse-text text-center mt-3">
          ${microcopyHtml}
        </p>
      </div>
    </div>
  </div>
</section>`
}
