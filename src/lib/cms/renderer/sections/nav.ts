import type { Section } from '../../types'
import type { RenderContext } from '../context'
import { rootHref } from '../utils'
import { t } from '../i18n'

export function renderNav(section: Section, ctx: RenderContext): string {
  const s = t(ctx.lang)
  const logoText = section.fields['logoText']?.value as string
  const ctaLabel = section.fields['ctaLabel']?.value as string

  const logoHref = rootHref('index',   ctx.basePath, ctx.linkMode)
  const ctaHref  = rootHref('kontakt', ctx.basePath, ctx.linkMode)

  const navLinksHtml = ctx.navPages
    .map(p => {
      const href = rootHref(p.slug, ctx.basePath, ctx.linkMode)
      const current = p.slug === ctx.currentPage ? ' aria-current="page"' : ''
      return `        <li><a href="${href}"${current}>${p.navLabel}</a></li>`
    })
    .join('\n')

  const overlayLinksHtml = ctx.navPages
    .map(p => {
      const href = rootHref(p.slug, ctx.basePath, ctx.linkMode)
      const current = p.slug === ctx.currentPage ? ' aria-current="page"' : ''
      return `    <li><a href="${href}"${current}>${p.navLabel}</a></li>`
    })
    .join('\n')

  if (ctx.showCurrentInFooter) {
    return `<!-- SEKCJA: nawigacja -->
<header class="nav" role="banner">
  <div class="container nav-inner">
    <a href="${logoHref}" class="nav-logo" aria-label="${logoText}${s.shared.logoHomeSuffix}">${logoText}</a>
    <nav aria-label="${s.nav.mainNavAria}">
      <ul class="nav-links" role="list">
${navLinksHtml}
      </ul>
    </nav>
    <a href="${ctaHref}" class="btn-primary nav-cta" aria-label="${ctaLabel}${s.nav.ctaAriaSuffixShort}">${ctaLabel}</a>
    <button class="nav-hamburger" id="nav-toggle"
      aria-label="${s.nav.openMenuAriaShort}" aria-expanded="false" aria-controls="nav-overlay">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
        stroke-linejoin="round" aria-hidden="true" focusable="false">
        <line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="6" x2="20" y2="6"/>
        <line x1="4" y1="18" x2="20" y2="18"/>
      </svg>
    </button>
  </div>
</header>

<div class="nav-overlay" id="nav-overlay" role="dialog"
  aria-modal="true" aria-label="${s.nav.overlayAria}" hidden>
  <div class="nav-overlay-top">
    <span class="nav-logo">${logoText}</span>
    <button id="nav-close" aria-label="${s.nav.closeMenuAriaShort}">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
        stroke-linejoin="round" aria-hidden="true" focusable="false">
        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
    </button>
  </div>
  <ul class="nav-overlay-links" role="list">
${overlayLinksHtml}
  </ul>
  <div class="nav-overlay-bottom">
    <a href="${ctaHref}" class="btn-primary" aria-label="${ctaLabel}">${ctaLabel}</a>
    <p class="btn-micro">${s.nav.responseTime}</p>
  </div>
</div>`
  }

  // nav-tel pojawia się tylko na stronie głównej (index.html).
  // proces.html i inne podstrony nie mają nav-tel — zgodnie z referencją.
  const navTelHtml = ctx.currentPage === 'index'
    ? `\n    <a href="tel:${ctx.contactPhone}" class="nav-tel" aria-label="${s.shared.callAriaPrefix}${ctx.contactPhoneDisplay}">${ctx.contactPhoneDisplay}</a>`
    : ''

  return `<!-- SEKCJA: nawigacja -->
<header class="nav header-animate" role="banner">
  <div class="container nav-inner">
    <a href="${logoHref}" class="nav-logo" aria-label="${logoText}${s.shared.logoHomeSuffix}">
      ${logoText}
    </a>
    <nav aria-label="${s.nav.mainNavAria}">
      <ul class="nav-links" role="list">
${navLinksHtml}
      </ul>
    </nav>${navTelHtml}
    <a href="${ctaHref}" class="btn-primary nav-cta btn-shimmer btn-pulse btn-magnetic"
      aria-label="${ctaLabel}${s.nav.ctaAriaSuffix}">
      ${ctaLabel}
    </a>
    <button class="nav-hamburger" id="nav-toggle"
      aria-label="${s.nav.openMenuAria}" aria-expanded="false" aria-controls="nav-overlay">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
    </button>
  </div>
</header>

<!-- Mobile nav overlay -->
<div class="nav-overlay" id="nav-overlay" role="dialog"
  aria-modal="true" aria-label="${s.nav.overlayAria}" hidden>
  <div class="nav-overlay-top">
    <span class="nav-logo">${logoText}</span>
    <button class="nav-overlay-close" id="nav-close" aria-label="${s.nav.closeMenuAria}">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </button>
  </div>
  <ul class="nav-overlay-links" role="list">
${overlayLinksHtml}
  </ul>
  <div class="nav-overlay-bottom">
    <a href="${ctaHref}" class="btn-primary btn-shimmer flex-center">${ctaLabel}</a>
    <p class="btn-micro text-center">${s.nav.responseTime}</p>
  </div>
</div>`
}
