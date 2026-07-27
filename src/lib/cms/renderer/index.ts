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
import { renderNotFound } from './sections/not-found'
import { redesignAnimatorScript } from './hardcoded/redesign-animator'
import { formaGenesisScript } from './hardcoded/forma-genesis'
import { buildBaseRenderContext, renderShell } from './shell'

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
  // ── strona błędu (hardcoded content, variant: '404') ─────────────────────────
  'not-found':         (s, ctx) => renderNotFound(s, ctx.linkMode),
}

export function renderPage(model: SiteModel, slug: string, basePath = '', linkMode: 'static' | 'preview' = 'static'): string {
  const page = model.pages.find(p => p.slug === slug)
  if (!page) throw new Error(`Page not found: ${slug}`)

  const navSection    = page.sections.find(s => s.id === 'nav')
  const footerSection = page.sections.find(s => s.id === 'footer')
  const mainSections  = page.sections.filter(s => s.id !== 'nav' && s.id !== 'footer')

  // pricingStandardAmount jest jedynym polem RenderContext zaleznym od SEKCJI tej
  // konkretnej strony (tylko "index" ma wsrod mainSections sekcje "pricing") — patrz
  // komentarz w shell.ts przy buildBaseRenderContext.
  const pricingSection   = mainSections.find(s => s.id === 'pricing')
  const standardPkg      = pricingSection?.fields['standard']?.value as PricingPackage | undefined
  const pricingStandardAmount = standardPkg?.amount

  // Strony z variant: 'legal' dostają uproszczony <head> (bez OG/canonical/schema.org)
  // i nie potrzebują preMain ani nav-wrapper w stopce.
  const isLegal = page.meta?.variant === 'legal'
  // Strona 404 dostaje ten sam uproszczony <head> co legal, ale robots=noindex,nofollow.
  const is404   = page.meta?.variant === '404'

  // Strony utility (kontakt, legal, 404) pokazują stopkę bez <nav> wrappera.
  // isLegal/is404 pochodzą z page.meta.variant; kontakt jest jedynym wyjątkiem bez variant.
  const showCurrentInFooter = isLegal || is404 || slug === 'kontakt'

  const ctx = buildBaseRenderContext(model, {
    basePath, linkMode, currentPage: slug, showCurrentInFooter, pricingStandardAmount,
  })

  const head = isLegal
    ? renderLegalHead(page.meta?.title ?? 'FORMA Wizerunku', basePath, 'noindex, follow', model.meta.gaId)
    : is404
      ? renderLegalHead(page.meta?.title ?? '404 — Strona nie istnieje | FORMA', basePath, 'noindex, nofollow', model.meta.gaId)
      : renderHead(model.meta, page.meta, pricingStandardAmount, basePath)

  let navHtml = ''
  if (navSection) {
    const renderer = SECTION_REGISTRY[navSection.id]
    if (!renderer) throw new Error(`Unknown section: "${navSection.id}" on page "${slug}"`)
    navHtml = renderer(navSection, ctx)
  }

  const mainInner = mainSections
    .map(section => {
      const renderer = SECTION_REGISTRY[section.id]
      if (!renderer) throw new Error(`Unknown section: "${section.id}" on page "${slug}"`)
      return renderer(section, ctx)
    })
    .join('\n\n')

  let footerHtml = ''
  if (footerSection) {
    const renderer = SECTION_REGISTRY[footerSection.id]
    if (!renderer) throw new Error(`Unknown section: "${footerSection.id}" on page "${slug}"`)
    footerHtml = renderer(footerSection, ctx)
  }

  const extraScripts: string[] = []
  if (slug === 'index') extraScripts.push(redesignAnimatorScript)
  if (slug === 'kontakt' || slug === '404') extraScripts.push(formaGenesisScript)

  // proces.html reference ma dot-grid-bg + role=progressbar (identycznie jak index).
  // kontakt.html nie ma dot-grid-bg i nie ma role=progressbar.
  // legal pages i 404: brak preMain w ogóle — sekcja not-found sama ma dot-grid-bg.
  const preMainVariant = (isLegal || is404)
    ? 'none' as const
    : (slug === 'index' || slug === 'proces' || slug === 'portfolio')
      ? 'rich' as const
      : 'plain' as const

  return renderShell({
    head, navHtml, mainInner, footerHtml, preMainVariant, basePath, linkMode,
    gaId: model.meta.gaId, extraScripts,
  })
}
