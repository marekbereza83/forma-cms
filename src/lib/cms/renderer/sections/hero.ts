import type { Section } from '../../types'
import type { RenderContext } from '../context'
import { pageHref } from '../utils'

export function renderHero(section: Section, ctx: RenderContext): string {
  const tag = section.fields['tag']?.value as string
  const headline = section.fields['headline']?.value as string
  const subheadlinePrefix = section.fields['subheadlinePrefix']?.value as string
  const ctaPrimaryLabel = section.fields['ctaPrimaryLabel']?.value as string
  const ctaMicrocopy = section.fields['ctaMicrocopy']?.value as string
  const ctaSecondaryLabel = section.fields['ctaSecondaryLabel']?.value as string

  // single source: "4 500" -> "4 500 zł" to match &nbsp; in reference HTML
  const pricingAmount = ctx.pricingStandardAmount ?? '4 500'
  const formattedAmount = pricingAmount.replace(/ /g, ' ') + ' zł'

  const ctaPrimaryHref   = pageHref('kontakt',   ctx.linkMode)
  const ctaSecondaryHref = pageHref('portfolio',  ctx.linkMode)

  return `<!-- SEKCJA: hero -->
<section id="hero" class="hero-section bg-base" aria-labelledby="hero-heading">
  <div class="container">
    <div class="hero-inner">

      <div class="hero-text">
        <span class="tag tag-inline stagger-item stagger-1">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true" focusable="false"><polyline points="20 6 9 17 4 12"/></svg>
          ${tag}
        </span>

        <h1 id="hero-heading" class="f-display stagger-item stagger-2">
          ${headline}
        </h1>

        <p class="f-lead max-52 stagger-item stagger-2">
          ${subheadlinePrefix} Od <span class="mono-text accent-text">${formattedAmount}</span> netto.
        </p>

        <div class="hero-cta-row stagger-item stagger-3">
          <div class="hero-cta-group">
            <a href="${ctaPrimaryHref}" class="btn-primary btn-shimmer btn-pulse btn-magnetic"
              aria-label="${ctaPrimaryLabel} — wypełnij formularz kontaktowy">
              ${ctaPrimaryLabel}
            </a>
            <span class="btn-micro pulse-text">${ctaMicrocopy}</span>
          </div>
          <a href="${ctaSecondaryHref}" class="btn-ghost"
            aria-label="${ctaSecondaryLabel} — case study Kancelaria Wojtas">
            ${ctaSecondaryLabel}
          </a>
        </div>
        <p class="hero-tel-row">lub zadzwoń: <a href="tel:${ctx.contactPhone}" aria-label="Zadzwoń pod numer ${ctx.contactPhoneDisplay}">${ctx.contactPhoneDisplay}</a></p>
      </div>

      <div class="hero-visual stagger-item stagger-3 interactive-card"
        aria-label="Demonstracja systemu PACTA — animacja procesu redesignu">
        <redesign-animator class="w-full h-full"></redesign-animator>
      </div>

    </div>
  </div>
</section>`
}
