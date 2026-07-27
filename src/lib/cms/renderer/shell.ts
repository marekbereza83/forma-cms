import type { SiteModel, PricingPackage } from '../types'
import type { RenderContext } from './context'
import { cookieConsentBanner } from './hardcoded/cookie-consent'
import { pageHref } from './utils'

/**
 * Czesc RenderContext wspolna dla kazdej strony (navPages, ceny, kontakt) — wydzielona
 * z renderPage(), zeby renderer/publikacje.ts (strony bez wlasnego Page.sections) moglo
 * zbudowac ten sam RenderContext bez duplikowania logiki. pricingStandardAmount NIE jest
 * tu liczone — to jedyne pole zalezne od SEKCJI renderowanej strony (tylko "index" ma
 * sekcje "pricing" wsrod swoich mainSections), wiec kazdy wywolujacy podaje je sam
 * (albo pomija — wtedy schemat ProfessionalService w <head> jest gaszony, patrz head.ts).
 */
export function buildBaseRenderContext(
  model: SiteModel,
  opts: {
    basePath: string
    linkMode: 'static' | 'preview'
    currentPage: string
    showCurrentInFooter: boolean
    pricingStandardAmount?: string
  }
): RenderContext {
  // Jedyne źródło prawdy dla ceny: zawsze z index.pricing, niezależnie od renderowanej strony.
  const indexPage           = model.pages.find(p => p.slug === 'index')
  const indexPricingSection = indexPage?.sections.find(s => s.id === 'pricing')
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

  return {
    basePath: opts.basePath,
    pricingStandardAmount: opts.pricingStandardAmount,
    currentPage: opts.currentPage,
    linkMode: opts.linkMode,
    navPages,
    indexPricing,
    showCurrentInFooter: opts.showCurrentInFooter,
    contactPhone,
    contactPhoneDisplay,
    contactEmail,
    contactEmailHref,
  }
}

export type PreMainVariant = 'rich' | 'plain' | 'none'

export interface ShellOptions {
  head: string
  navHtml: string
  mainInner: string
  footerHtml: string
  preMainVariant: PreMainVariant
  basePath: string
  linkMode: 'static' | 'preview'
  gaId?: string
  /** Skrypty page-specific (np. redesignAnimatorScript, formaGenesisScript, tag
   *  publications.js) — w tej samej kolejnosci co dawniej w renderPage(), wstawiane
   *  PRZED banerem cookie i PRZED main.js. */
  extraScripts?: string[]
}

/**
 * Wspolny szkielet dokumentu — wydzielony z renderPage(). Skip-link, preMain,
 * kolejnosc skryptow i finalny <!DOCTYPE> wrapper sa identyczne dla kazdej strony,
 * niezaleznie od tego czy jej tresc pochodzi z Page.sections (renderPage) czy z
 * PostItem (renderer/publikacje.ts).
 */
export function renderShell(opts: ShellOptions): string {
  const bodyParts: string[] = []

  if (opts.navHtml) bodyParts.push(opts.navHtml)
  bodyParts.push(`<main id="main">\n\n${opts.mainInner}\n\n</main>`)
  if (opts.footerHtml) bodyParts.push(opts.footerHtml)

  for (const script of opts.extraScripts ?? []) bodyParts.push(script)
  // Baner zgody na cookies — tylko gdy GA jest aktywne (gaId ustawione).
  if (opts.gaId) bodyParts.push(cookieConsentBanner(pageHref('privacy-policy', opts.linkMode)))
  bodyParts.push(`<script src="${opts.basePath}assets/js/main.js" defer></script>`)

  const body = bodyParts.join('\n\n')

  const preMain = opts.preMainVariant === 'none'
    ? ''
    : opts.preMainVariant === 'rich'
      ? `<div class="dot-grid-bg" aria-hidden="true"></div>\n<div id="scroll-progress" role="progressbar" aria-hidden="true"></div>\n<div class="custom-cursor" id="custom-cursor" aria-hidden="true"></div>`
      : `<div id="scroll-progress" aria-hidden="true"></div>\n\n<div class="custom-cursor" id="custom-cursor" aria-hidden="true"></div>`

  return `<!DOCTYPE html>
<html lang="pl">
${opts.head}
<body>

<a href="#main" class="skip-link">Przejdź do treści</a>

${preMain}

${body}
</body>
</html>`
}
