import type { SiteModel, Section, PricingPackage } from '../types'
import type { RenderContext } from './context'
import { renderHead, renderLegalHead } from './head'
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
import { renderLegalNotice, renderPrivacyPolicy, renderTermsOfService } from './sections/legal-static'
import { renderSeoKancelarie } from './sections/seo-kancelarie'
import { renderNotFound } from './sections/not-found'
import { redesignAnimatorScript } from './hardcoded/redesign-animator'
import { cookieConsentBanner } from './hardcoded/cookie-consent'
import { pageHref } from './utils'

const SECTION_REGISTRY: Record<string, (s: Section, ctx: RenderContext) => string> = {
  // ── index ────────────────────────────────────────────────────────────────────
  'nav':               (s, ctx) => renderNav(s, ctx),
  'hero':              (s, ctx) => renderHero(s, ctx),
  'problem':           (s, _)   => renderProblem(s),
  'solution':          (s, _)   => renderSolution(s),
  'portfolio':         (s, ctx) => renderPortfolio(s, ctx.basePath, ctx.linkMode),
  'process':           (s, ctx) => renderProcess(s, ctx.linkMode),
  'pricing':           (s, ctx) => renderPricing(s, ctx.linkMode),
  'cta-finale':        (s, ctx) => renderCtaFinale(s, ctx),
  'footer':            (s, ctx) => renderFooter(s, ctx),
  // ── portfolio ────────────────────────────────────────────────────────────────
  'portfolio-hero':    (s, _)   => renderPortfolioHero(s),
  'portfolio-grid':    (s, ctx) => renderPortfolioGrid(s, ctx.basePath, ctx.linkMode),
  // ── kontakt ──────────────────────────────────────────────────────────────────
  'kontakt-hero':      (s, _)   => renderKontaktHero(s),
  'formularz':         (s, ctx) => renderKontaktFormularz(s, ctx),
  // ── proces ───────────────────────────────────────────────────────────────────
  'proces-hero':       (s, _)   => renderProcesHero(s),
  'timeline':          (s, _)   => renderTimeline(s),
  'deliverables':      (s, _)   => renderDeliverables(s),
  'technologie':       (s, _)   => renderTechnologie(s),
  'cennik-detail':     (s, ctx) => renderCennikDetail(s, ctx.linkMode, ctx.indexPricing),
  'faq':               (s, _)   => renderFaq(s),
  // ── strony prawne (hardcoded content, variant: 'legal') ──────────────────────
  'legal-notice':      (s, ctx) => renderLegalNotice(s, ctx),
  'privacy-policy':    (s, ctx) => renderPrivacyPolicy(s, ctx),
  'regulamin':         (s, ctx) => renderTermsOfService(s, ctx),
  // ── strona SEO (hardcoded content) ───────────────────────────────────────────
  'seo-kancelarie':    (s, ctx) => renderSeoKancelarie(s, ctx),
  // ── strona błędu (hardcoded content, variant: '404') ─────────────────────────
  'not-found':         (s, ctx) => renderNotFound(s, ctx.linkMode),
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

  // Jedyne źródło prawdy dla kontaktu — czytane zawsze z model.meta.
  if (!model.meta.contactPhone || !model.meta.contactEmail) {
    throw new Error('meta.contactPhone i meta.contactEmail są wymagane')
  }
  const contactPhone        = model.meta.contactPhone
  const contactPhoneDisplay = model.meta.contactPhoneDisplay
  const contactEmail        = model.meta.contactEmail
  const contactEmailHref    = `mailto:${contactEmail}`

  // Strony z variant: 'legal' dostają uproszczony <head> (bez OG/canonical/schema.org)
  // i nie potrzebują preMain ani nav-wrapper w stopce.
  const isLegal = page.meta?.variant === 'legal'
  // Strona 404 dostaje ten sam uproszczony <head> co legal, ale robots=noindex,nofollow.
  const is404   = page.meta?.variant === '404'

  // Strony utility (kontakt, legal, 404) pokazują stopkę bez <nav> wrappera.
  // isLegal/is404 pochodzą z page.meta.variant; kontakt jest jedynym wyjątkiem bez variant.
  const showCurrentInFooter = isLegal || is404 || slug === 'kontakt' || slug === 'strony-dla-kancelarii-prawnych'

  const ctx: RenderContext = { basePath, pricingStandardAmount, currentPage: slug, linkMode, navPages, indexPricing, showCurrentInFooter, contactPhone, contactPhoneDisplay, contactEmail, contactEmailHref }

  const head = isLegal
    ? renderLegalHead(page.meta?.title ?? 'FORMA Wizerunku', basePath, 'noindex, follow', model.meta.gaId)
    : is404
      ? renderLegalHead(page.meta?.title ?? '404 — Strona nie istnieje | FORMA', basePath, 'noindex, nofollow', model.meta.gaId)
      : renderHead(model.meta, page.meta, pricingStandardAmount, basePath)

  const bodyParts: string[] = []

  if (navSection) {
    const renderer = SECTION_REGISTRY[navSection.id]
    if (!renderer) throw new Error(`Unknown section: "${navSection.id}" on page "${slug}"`)
    bodyParts.push(renderer(navSection, ctx))
  }

  bodyParts.push('<main id="main">')
  for (const section of mainSections) {
    const renderer = SECTION_REGISTRY[section.id]
    if (!renderer) throw new Error(`Unknown section: "${section.id}" on page "${slug}"`)
    bodyParts.push(renderer(section, ctx))
  }
  bodyParts.push('</main>')

  if (footerSection) {
    const renderer = SECTION_REGISTRY[footerSection.id]
    if (!renderer) throw new Error(`Unknown section: "${footerSection.id}" on page "${slug}"`)
    bodyParts.push(renderer(footerSection, ctx))
  }

  if (slug === 'index') bodyParts.push(redesignAnimatorScript)
  // Baner zgody na cookies — tylko gdy GA jest aktywne (gaId ustawione).
  if (model.meta.gaId) bodyParts.push(cookieConsentBanner(pageHref('privacy-policy', linkMode)))
  bodyParts.push(`<script src="${basePath}assets/js/main.js" defer></script>`)

  const body = bodyParts.join('\n\n')

  // proces.html reference ma dot-grid-bg + role=progressbar (identycznie jak index).
  // kontakt.html nie ma dot-grid-bg i nie ma role=progressbar.
  // legal pages i 404: brak preMain w ogóle — sekcja not-found sama ma dot-grid-bg.
  const preMain = (isLegal || is404)
    ? ''
    : (slug === 'index' || slug === 'proces' || slug === 'portfolio')
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
