import type { Section } from '../../types'
import type { RenderContext } from '../context'
import { pageHref } from '../utils'
import { t } from '../i18n'

export function renderHero(section: Section, ctx: RenderContext): string {
  const s = t(ctx.lang)
  const tag = section.fields['tag']?.value as string
  const headline = section.fields['headline']?.value as string
  const subheadlinePrefix = section.fields['subheadlinePrefix']?.value as string
  const ctaPrimaryLabel = section.fields['ctaPrimaryLabel']?.value as string
  const ctaMicrocopy = section.fields['ctaMicrocopy']?.value as string
  const ctaSecondaryLabel = section.fields['ctaSecondaryLabel']?.value as string

  // single source: "4 500" -> "4 500 zł" to match &nbsp; in reference HTML
  const pricingAmount = ctx.pricingStandardAmount ?? '4 500'
  const formattedAmount = pricingAmount.replace(/ /g, ' ') + ' ' + s.hero.priceUnit

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
          ${subheadlinePrefix} ${s.hero.pricePrefix}<span class="mono-text accent-text">${formattedAmount}</span>${s.hero.priceSuffix}
        </p>

        <div class="hero-cta-row stagger-item stagger-3">
          <a href="${ctaPrimaryHref}" class="btn-primary btn-shimmer btn-pulse btn-magnetic"
            aria-label="${ctaPrimaryLabel}${s.hero.ctaPrimaryAriaSuffix}">
            ${ctaPrimaryLabel}
          </a>
          <a href="${ctaSecondaryHref}" class="btn-ghost"
            aria-label="${ctaSecondaryLabel}${s.hero.ctaSecondaryAriaSuffix}">
            ${ctaSecondaryLabel}
          </a>
        </div>
        <p class="btn-micro">${ctaMicrocopy}</p>
        <p class="hero-tel-row">${s.shared.callAriaPrefix}<a href="tel:${ctx.contactPhone}" aria-label="${s.shared.callAtNumberAriaPrefix}${ctx.contactPhoneDisplay}">${ctx.contactPhoneDisplay}</a></p>
      </div>

      <div class="hero-visual stagger-item stagger-3 interactive-card"
        aria-label="${s.hero.visualAria}">
        <redesign-animator class="w-full h-full"></redesign-animator>
      </div>

    </div>
  </div>
</section>`
}
