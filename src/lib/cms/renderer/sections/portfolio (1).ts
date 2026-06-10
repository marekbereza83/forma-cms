import type { Section, PortfolioCard } from '../../types'
import { pageHref } from '../utils'

const ARROW_ICON_SM = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>`

function resolveImageSrc(src: string | undefined, basePath: string, linkMode: 'static' | 'preview'): string {
  const imgSrc = src || 'assets/images/wojtas-hero.png'
  if (imgSrc.startsWith('/uploads/')) {
    // static export: uploaded files are copied to assets/images/{filename}
    if (linkMode === 'static') return `assets/images/${imgSrc.split('/').pop()!}`
    return imgSrc  // preview: Next.js serves /uploads/
  }
  return imgSrc.startsWith('/') ? imgSrc : `${basePath}${imgSrc}`
}

function renderCard(card: PortfolioCard, basePath: string, ariaLabel: string, linkMode: 'static' | 'preview'): string {
  const imgUrl = resolveImageSrc(card.image, basePath, linkMode)
  const portfolioHref = pageHref('portfolio', linkMode)

  return `<div class="portfolio-card interactive-card">
        <div class="portfolio-thumb">
          <img src="${imgUrl}"
            alt="Screenshot strony ${card.title} — hero section"
            width="800" height="450"
            class="img-fill"
            loading="lazy" decoding="async">
        </div>
        <div class="portfolio-card-body">
          <p class="portfolio-card-label">${card.label}</p>
          <h3 class="portfolio-card-title">${card.title}</h3>
          <p class="portfolio-card-desc">
            ${card.desc}
          </p>
          <a href="${portfolioHref}" class="portfolio-card-link"
            aria-label="${ariaLabel}">
            Szczegóły
            ${ARROW_ICON_SM}
          </a>
        </div>
      </div>`
}

export function renderPortfolio(section: Section, basePath = '', linkMode: 'static' | 'preview' = 'static'): string {
  const headline = section.fields['headline']?.value as string
  const lead = section.fields['lead']?.value as string
  const cards = section.fields['cards']?.value as PortfolioCard[]
  const portfolioHref = pageHref('portfolio', linkMode)

  let grid: string
  if (cards.length === 1) {
    // 1 karta — portfolio-single, identyczny markup z referencją (DOM-diff)
    grid = `<div class="portfolio-single">
      ${renderCard(cards[0], basePath, 'Przejdź do pełnego case study — Kancelaria Wojtas', linkMode)}
    </div>`
  } else if (cards.length === 2) {
    grid = `<div class="portfolio-grid portfolio-grid--2">
      ${cards.map(c => renderCard(c, basePath, `Przejdź do pełnego case study — ${c.title}`, linkMode)).join('\n      ')}
    </div>`
  } else if (cards.length === 3) {
    // 1 pełna u góry + 2 mniejsze pod spodem (CSS: first-child spans 2 cols)
    grid = `<div class="portfolio-grid portfolio-grid--3">
      ${cards.map(c => renderCard(c, basePath, `Przejdź do pełnego case study — ${c.title}`, linkMode)).join('\n      ')}
    </div>`
  } else {
    // 4 karty — siatka 2×2
    grid = `<div class="portfolio-grid portfolio-grid--4">
      ${cards.map(c => renderCard(c, basePath, `Przejdź do pełnego case study — ${c.title}`, linkMode)).join('\n      ')}
    </div>`
  }

  return `<!-- SEKCJA: portfolio -->
<section id="portfolio" class="section bg-base reveal" aria-labelledby="portfolio-heading">
  <div class="container">
    <div class="section-header mb-10">
      <span class="section-label">Realizacje</span>
      <h2 id="portfolio-heading" class="f-headline">${headline}</h2>
      <p class="f-lead mt-4 max-54">
        ${lead}
      </p>
    </div>

    ${grid}

    <div class="mt-8">
      <a href="${portfolioHref}" class="btn-ghost"
        aria-label="Przejdź do strony portfolio z pełnym opisem realizacji">
        Wszystkie realizacje
      </a>
    </div>
  </div>
</section>`
}
