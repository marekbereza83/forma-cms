import type { SiteModel, Section, PricingPackage } from '../types'
import { renderHead } from './head'
import { renderNav } from './sections/nav'
import { renderHero } from './sections/hero'
import { renderProblem } from './sections/problem'
import { renderSolution } from './sections/solution'
import { renderPortfolio } from './sections/portfolio'
import { renderProcess } from './sections/process'
import { renderPricing } from './sections/pricing'
import { renderCtaFinale } from './sections/cta-finale'
import { renderFooter } from './sections/footer'
import { renderKontaktHero } from './sections/kontakt-hero'
import { renderKontaktFormularz } from './sections/kontakt-formularz'
import { renderPortfolioHero } from './sections/portfolio-hero'
import { renderPortfolioGrid } from './sections/portfolio-grid'
import { renderProcesHero } from './sections/proces-hero'
import { renderTimeline } from './sections/timeline'
import { renderDeliverables } from './sections/deliverables'
import { renderTechnologie } from './sections/technologie'
import { renderCennikDetail } from './sections/cennik-detail'
import { renderFaq } from './sections/faq'
import { redesignAnimatorScript } from './hardcoded/redesign-animator'

interface RenderContext {
  basePath: string
  pricingStandardAmount: string | undefined
  currentPage: string
  // tryb static = linki dla publikowanych plików .html, NIE zmieniać bez sprawdzenia eksportu
  linkMode: 'static' | 'preview'
  navPages: Array<{ slug: string; navLabel: string }>
  // Jedyne źródło prawdy dla ceny — czytane zawsze z index.pricing.
  // cennik-detail na /proces używa tych wartości zamiast własnych pól price.
  indexPricing: { standard: PricingPackage; extended: PricingPackage } | undefined
}

const SECTION_REGISTRY: Record<string, (s: Section, ctx: RenderContext) => string> = {
  // ── index ────────────────────────────────────────────────────────────────────
  'nav':               (s, ctx) => renderNav(s, ctx.currentPage, ctx.linkMode, ctx.navPages),
  'hero':              (s, ctx) => renderHero(s, ctx.pricingStandardAmount ?? '4 500', ctx.linkMode),
  // TODO: hardcoded fallback ceny '4 500', do usunięcia przy drugim archetypie
  'problem':           (s, _)   => renderProblem(s),
  'solution':          (s, ctx) => renderSolution(s, ctx.linkMode),
  'portfolio':         (s, ctx) => renderPortfolio(s, ctx.basePath, ctx.linkMode),
  'process':           (s, ctx) => renderProcess(s, ctx.linkMode),
  'pricing':           (s, ctx) => renderPricing(s, ctx.linkMode),
  'cta-finale':        (s, ctx) => renderCtaFinale(s, ctx.linkMode),
  'footer':            (s, ctx) => renderFooter(s, ctx.currentPage, ctx.linkMode),
  // ── portfolio ────────────────────────────────────────────────────────────────
  'portfolio-hero':    (s, _)   => renderPortfolioHero(s),
  'portfolio-grid':    (s, ctx) => renderPortfolioGrid(s, ctx.basePath, ctx.linkMode),
  // ── kontakt ──────────────────────────────────────────────────────────────────
  'kontakt-hero':      (s, _)   => renderKontaktHero(s),
  'formularz':         (s, ctx) => renderKontaktFormularz(s, ctx.linkMode),
  // ── proces ───────────────────────────────────────────────────────────────────
  'proces-hero':       (s, _)   => renderProcesHero(s),
  'timeline':          (s, _)   => renderTimeline(s),
  'deliverables':      (s, _)   => renderDeliverables(s),
  'technologie':       (s, _)   => renderTechnologie(s),
  'cennik-detail':     (s, ctx) => renderCennikDetail(s, ctx.linkMode, ctx.indexPricing),
  'faq':               (s, _)   => renderFaq(s),
}

export function renderPage(model: SiteModel, slug: string, basePath = '', linkMode: 'static' | 'preview' = 'static'): string {
  const page = model.pages.find(p => p.slug === slug)
  if (!page) throw new Error(`Page not found: ${slug}`)

  const navSection    = page.sections.find(s => s.id === 'nav')
  const footerSection = page.sections.find(s => s.id === 'footer')
  const mainSections  = page.sections.filter(s => s.id !== 'nav' && s.id !== 'footer')

  const pricingSection   = mainSections.find(s => s.id === 'pricing')
  const standardPkg      = pricingSection?.fields['standard']?.value as PricingPackage | undefined
  const pricingStandardAmount = standardPkg?.amount

  // Jedyne źródło prawdy dla ceny: zawsze z index.pricing, niezależnie od renderowanej strony.
  // cennik-detail na /proces czyta stąd — brak własnych pól price w tej sekcji.
  const indexPage            = model.pages.find(p => p.slug === 'index')
  const indexPricingSection  = indexPage?.sections.find(s => s.id === 'pricing')
  const indexPricing = indexPricingSection
    ? {
        standard: indexPricingSection.fields['standard']?.value as PricingPackage,
        extended: indexPricingSection.fields['extended']?.value as PricingPackage,
      }
    : undefined

  const navPages = model.pages
    .filter((p): p is typeof p & { navLabel: string } => p.navLabel !== undefined)
    .map(p => ({ slug: p.slug, navLabel: p.navLabel }))

  const ctx: RenderContext = { basePath, pricingStandardAmount, currentPage: slug, linkMode, navPages, indexPricing }

  const head = renderHead(model.meta, page.meta, pricingStandardAmount, basePath)

  const bodyParts: string[] = []

  if (navSection) {
    const renderer = SECTION_REGISTRY[navSection.id]
    if (renderer) bodyParts.push(renderer(navSection, ctx))
  }

  bodyParts.push('<main id="main">')
  for (const section of mainSections) {
    const renderer = SECTION_REGISTRY[section.id]
    if (renderer) bodyParts.push(renderer(section, ctx))
  }
  bodyParts.push('</main>')

  if (footerSection) {
    const renderer = SECTION_REGISTRY[footerSection.id]
    if (renderer) bodyParts.push(renderer(footerSection, ctx))
  }

  if (slug === 'index') bodyParts.push(redesignAnimatorScript)
  bodyParts.push(`<script src="${basePath}assets/js/main.js" defer></script>`)

  const body = bodyParts.join('\n\n')

  // proces.html reference ma dot-grid-bg + role=progressbar (identycznie jak index).
  // kontakt.html nie ma dot-grid-bg i nie ma role=progressbar.
  const preMain = (slug === 'index' || slug === 'proces' || slug === 'portfolio')
    ? `<div class="dot-grid-bg" aria-hidden="true"></div>\n<div id="scroll-progress" role="progressbar" aria-hidden="true"></div>\n<div class="custom-cursor" id="custom-cursor" aria-hidden="true"></div>`
    : `<div id="scroll-progress" aria-hidden="true"></div>\n\n<div class="custom-cursor" id="custom-cursor" aria-hidden="true"></div>`

  return `<!DOCTYPE html>
<html lang="pl">
${head}
<body>

<a href="#main" class="skip-link">Przejdź do treści</a>

${preMain}

${body}
</body>
</html>`
}
