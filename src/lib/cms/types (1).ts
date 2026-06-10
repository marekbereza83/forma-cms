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
  link?: string   // optional URL to live site (portfolio-grid only; portfolio section ignores it)
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
  title: string
  publishedAt?: string
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
