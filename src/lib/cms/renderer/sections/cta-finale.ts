import type { Section } from '../../types'
import type { RenderContext } from '../context'
import { pageHref } from '../utils'

export function renderCtaFinale(section: Section, ctx: RenderContext): string {
  const headline  = section.fields['headline']?.value as string
  const lead      = section.fields['lead']?.value as string
  const ctaLabel  = section.fields['ctaLabel']?.value as string
  const microcopy = section.fields['microcopy']?.value as string | undefined

  const ctaHref = pageHref('kontakt', ctx.linkMode)

  // Brak pola microcopy = wariant z telefonem (index).
  // Obecność microcopy = wariant tekstowy (portfolio, proces).
  const microcopyHtml = microcopy
    ? microcopy
    : `lub zadzwoń: <a href="tel:${ctx.contactPhone}" class="cta-tel-link" aria-label="Zadzwoń: ${ctx.contactPhoneDisplay}">${ctx.contactPhoneDisplay}</a> — Odpowiadam w ciągu 24h.`

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
