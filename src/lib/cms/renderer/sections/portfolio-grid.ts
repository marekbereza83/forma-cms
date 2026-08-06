import type { Section, PortfolioCard } from '../../types'
import type { Lang } from '../context'
import { resolveImageSrc } from '../image'
import { t } from '../i18n'

const ARROW_ICON_SM = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>`

function renderGridCard(card: PortfolioCard, basePath: string, linkMode: 'static' | 'preview', lang: Lang): string {
  const s = t(lang)
  const imgUrl = resolveImageSrc(card.image, basePath, linkMode)

  // Render live-link button only when link is present and non-empty.
  // V15 guarantees link starts with http:// or https:// if it reached the renderer.
  const hasLiveLink = Boolean(card.link && card.link.trim())

  const liveLink = hasLiveLink
    ? `<a href="${card.link}" class="portfolio-live-link" target="_blank" rel="noopener noreferrer"
            aria-label="${s.portfolio.viewLiveAria(card.title)}">
            ${s.portfolio.viewLive}
            ${ARROW_ICON_SM}
          </a>`
    : ''

  const cardClickAttrs = hasLiveLink
    ? `class="portfolio-card interactive-card portfolio-card-clickable" onclick="if(!event.target.closest('a'))this.querySelector('.portfolio-live-link').click()"`
    : `class="portfolio-card interactive-card"`

  return `<div ${cardClickAttrs}>
        <div class="portfolio-thumb">
          <img src="${imgUrl}"
            alt="${s.portfolio.gridThumbAlt(card.title)}"
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
          ${liveLink}
        </div>
      </div>`
}

export function renderPortfolioGrid(section: Section, basePath = '', linkMode: 'static' | 'preview' = 'static', lang: Lang = 'pl'): string {
  const cards = section.fields['cards']?.value as PortfolioCard[]

  // Responsive grid: reuse the same CSS classes as the home portfolio section.
  // 1 karta  → portfolio-single (max-width 720px, no grid)
  // 2+ kart  → portfolio-grid portfolio-grid--2 (2 col desktop, 1 col mobile ≤640px)
  const rendered = cards.map(c => renderGridCard(c, basePath, linkMode, lang)).join('\n      ')
  const grid = cards.length === 1
    ? `<div class="portfolio-single">
      ${rendered}
    </div>`
    : `<div class="portfolio-grid portfolio-grid--2">
      ${rendered}
    </div>`

  return `<!-- SEKCJA: portfolio-grid -->
<section id="portfolio-grid" class="section bg-base reveal" aria-labelledby="portfolio-grid-heading">
  <div class="container">
    ${grid}
  </div>
</section>`
}
