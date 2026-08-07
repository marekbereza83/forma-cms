import type { PricingPackage } from '../types'

export type Lang = 'pl' | 'en'

export interface RenderContext {
  basePath: string
  pricingStandardAmount: string | undefined
  currentPage: string
  linkMode: 'static' | 'preview'
  navPages: Array<{ slug: string; navLabel: string }>
  indexPricing: { standard: PricingPackage; extended: PricingPackage } | undefined
  showCurrentInFooter: boolean
  contactPhone: string
  contactPhoneDisplay: string
  contactEmail: string
  contactEmailHref: string
  lang: Lang
  altLang: { lang: Lang; homeUrl: string } | undefined
  /** Explicit override for the nav language-switch target — set when the current
   *  page has a known, more-specific translated equivalent than the generic
   *  same-slug mapping (e.g. a blog post linking straight to its translated
   *  article via PostItem.altLangSlug, see renderer/publikacje.ts). Absent
   *  everywhere else; the switcher then falls back to SHARED_PAGE_SLUGS. */
  langSwitchHref?: string
}
