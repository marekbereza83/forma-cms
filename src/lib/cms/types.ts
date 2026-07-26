export type FieldType =
  | 'text'
  | 'richtext'
  | 'price'
  | 'stat'
  | 'cta'
  | 'contact'
  | 'list'
  | 'image'

export interface Field<T = unknown> {
  type: FieldType
  value: T
  editable: boolean
  constraints?: Record<string, unknown>
}

export interface StatCard {
  target: number
  suffix: string
  ariaLabel: string
  description: string
  /** Opcjonalna atrybucja źródła statystyki (mikrokopia pod opisem).
   *  Wymagana tylko dla statystyk opartych na cytowanym badaniu — nie dla wszystkich. */
  sourceLabel?: string
  /** Opcjonalny URL do źródła. Renderowany tylko razem z sourceLabel.
   *  Link zewnętrzny: target="_blank" + rel="noopener noreferrer", bez nofollow. */
  sourceUrl?: string
}

export interface SymptomCard {
  iconType: 'info' | 'mobile' | 'phone'
  title: string
  body: string
}

export interface ChecklistItem {
  text: string
}

export interface ProcessStep {
  num: string
  title: string
  body: string
}

export interface TimelineItem {
  num: string
  day: string    // ASCII hyphen, e.g. "Dzień 1-2" (U+2013 en-dash banned by whitelist)
  title: string
  body: string   // may contain <strong>Twoje działanie:</strong>
}

export interface DeliverableItem {
  title: string
  body: string
}

export interface FaqItem {
  id: string     // "1" through "7" — used in aria-controls="faq-{id}"
  question: string
  answer: string
}

export interface PricingPackage {
  label: string
  amount: string
  deliveryNote: string
  ariaLabel: string
  features: string[]
  ctaLabel: string
  ctaMicrocopy: string
}

export interface PortfolioCard {
  id?: string
  label: string
  title: string
  desc: string
  image?: string
  link?: string   // optional URL to live site; rendered as "Zobacz na żywo" in both portfolio (home) and portfolio-grid (full page)
}

export interface FooterLink {
  label: string
  href: string
}

export interface Section {
  id: string
  recipe: string
  fields: Record<string, Field>
}

export interface PageMeta {
  title: string
  description: string
  canonical: string
  ogTitle: string
  ogDescription: string
  ogUrl: string
  /** Rendering variant — drives head, preMain, and footer style.
   *  'legal': simplified head (no OG/canonical), noindex robot tag, no preMain, utility footer.
   *  '404':   reserved for future error page.
   */
  variant?: 'legal' | '404'
}

export interface Page {
  slug: string
  navLabel?: string  // if set, page appears in nav links (order from pages[])
  meta?: PageMeta
  sections: Section[]
}

export interface EventItem {
  id: string
  title: string
  date: string
  description: string
  link?: string
  status: 'draft' | 'published' | 'archived'
}

export interface PostItem {
  id: string
  /** Segment URL, kebab-case. Buduje adres publikacje/<slug>.html — musi byc unikalny (C6). */
  slug: string
  title: string
  /** YYYY-MM-DD. Wymagane gdy status = 'published' (C7). */
  publishedAt?: string
  /** Zajawka na liscie publikacji + meta description artykulu. */
  excerpt?: string
  /** HTML przepuszczony przez sanitizePostBody() PRZED zapisem — patrz invariant #5. */
  body: string
  status: 'draft' | 'published'
}

export interface SiteMeta {
  title: string
  description: string
  ogDescription: string
  canonical: string
  ogImage: string
  brandName: string
  contactEmail: string
  contactPhone: string
  contactPhoneDisplay: string
  gaId?: string
}

export interface SiteModel {
  tenantId: string
  archetype: 'trust-led' | 'authority-led'
  designSystem: 'forma'
  meta: SiteMeta
  pages: Page[]
  collections: {
    events: EventItem[]
    posts: PostItem[]
  }
}
