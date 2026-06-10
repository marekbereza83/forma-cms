import type { Section } from '../../types'
import { pageHref } from '../utils'

export function renderNav(
  section: Section,
  currentPage: string,
  linkMode: 'static' | 'preview',
  navPages: Array<{ slug: string; navLabel: string }>
): string {
  const phoneRaw = section.fields['phoneRaw']?.value as string
  const phoneDisplay = section.fields['phoneDisplay']?.value as string
  const logoText = section.fields['logoText']?.value as string
  const ctaLabel = section.fields['ctaLabel']?.value as string

  const logoHref = pageHref('index', linkMode)
  const ctaHref  = pageHref('kontakt', linkMode)

  const navLinksHtml = navPages
    .map(p => {
      const href = pageHref(p.slug, linkMode)
      const current = p.slug === currentPage ? ' aria-current="page"' : ''
      return `        <li><a href="${href}"${current}>${p.navLabel}</a></li>`
    })
    .join('\n')

  const overlayLinksHtml = navPages
    .map(p => {
      const href = pageHref(p.slug, linkMode)
      const current = p.slug === currentPage ? ' aria-current="page"' : ''
      return `    <li><a href="${href}"${current}>${p.navLabel}</a></li>`
    })
    .join('\n')

  if (currentPage === 'kontakt') {
    return `<!-- SEKCJA: nawigacja -->
<header class="nav" role="banner">
  <div class="container nav-inner">
    <a href="${logoHref}" class="nav-logo" aria-label="${logoText} — strona główna">${logoText}</a>
    <nav aria-label="Główna nawigacja">
      <ul class="nav-links" role="list">
${navLinksHtml}
      </ul>
    </nav>
    <a href="${ctaHref}" class="btn-primary nav-cta" aria-label="Zamów stronę — kontakt">Zamów stronę</a>
    <button class="nav-hamburger" id="nav-toggle"
      aria-label="Otwórz menu" aria-expanded="false" aria-controls="nav-overlay">
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
  aria-modal="true" aria-label="Menu nawigacyjne" hidden>
  <div class="nav-overlay-top">
    <span class="nav-logo">${logoText}</span>
    <button id="nav-close" aria-label="Zamknij menu">
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
    <a href="${ctaHref}" class="btn-primary" aria-label="Zamów stronę">Zamów stronę</a>
    <p class="btn-micro">Odpowiadam w 24h</p>
  </div>
</div>`
  }

  // nav-tel pojawia się tylko na stronie głównej (index.html).
  // proces.html i inne podstrony nie mają nav-tel — zgodnie z referencją.
  const navTelHtml = currentPage === 'index' && phoneRaw
    ? `\n    <a href="tel:${phoneRaw}" class="nav-tel" aria-label="Zadzwoń: ${phoneDisplay}">${phoneDisplay}</a>`
    : ''

  return `<!-- SEKCJA: nawigacja -->
<header class="nav header-animate" role="banner">
  <div class="container nav-inner">
    <a href="${logoHref}" class="nav-logo" aria-label="${logoText} — strona główna">
      ${logoText}
    </a>
    <nav aria-label="Główna nawigacja">
      <ul class="nav-links" role="list">
${navLinksHtml}
      </ul>
    </nav>${navTelHtml}
    <a href="${ctaHref}" class="btn-primary nav-cta btn-shimmer btn-pulse btn-magnetic"
      aria-label="${ctaLabel} — przejdź do formularza kontaktowego">
      ${ctaLabel}
    </a>
    <button class="nav-hamburger" id="nav-toggle"
      aria-label="Otwórz menu nawigacyjne" aria-expanded="false" aria-controls="nav-overlay">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
    </button>
  </div>
</header>

<!-- Mobile nav overlay -->
<div class="nav-overlay" id="nav-overlay" role="dialog"
  aria-modal="true" aria-label="Menu nawigacyjne" hidden>
  <div class="nav-overlay-top">
    <span class="nav-logo">${logoText}</span>
    <button class="nav-overlay-close" id="nav-close" aria-label="Zamknij menu nawigacyjne">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </button>
  </div>
  <ul class="nav-overlay-links" role="list">
${overlayLinksHtml}
  </ul>
  <div class="nav-overlay-bottom">
    <a href="${ctaHref}" class="btn-primary btn-shimmer flex-center">${ctaLabel}</a>
    <p class="btn-micro text-center">Odpowiadam w 24h</p>
  </div>
</div>`
}
