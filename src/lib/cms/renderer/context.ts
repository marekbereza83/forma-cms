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
}
