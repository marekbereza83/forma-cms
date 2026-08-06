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
  /** Historia poprzednich slugów tego posta — dopisywana automatycznie w saveSite()
   *  gdy slug sie zmienia. Zrodlo mapy przekierowan 301 w Workerze (_redirects.json). */
  previousSlugs?: string[]
  /** Wolny tekst, nie enum (do 2026-07-29 byl to zamkniety zestaw z post-categories.ts —
   *  odziedziczony z demo agencji webowej, nie pasowal do tematyki klientow-kancelarii). */
  category?: string
  /** Maks. 8 (C10). */
  tags?: string[]
  /** Punkty w callout "Kluczowe wnioski" na stronie artykulu. */
  keyTakeaways?: string[]
  /** URL do R2, ustawiany wylacznie przez odpowiedz /api/upload — nie waliduj jako wolny tekst. */
  coverImage?: string
  /** Nadpisuje <title> (domyslnie: title + " | " + brandName). Twardy limit 70 znakow (C12),
   *  zalecane 50-60 (W6). */
  metaTitle?: string
  /** Nadpisuje meta description + BlogPosting.description (domyslnie: excerpt). Twardy limit
   *  200 znakow (C12), zalecane 120-160 (W7). */
  metaDescription?: string
  /** Pozycje sekcji "Źródła" na koncu artykulu — sygnatura wyroku, tytul ustawy, adres
   *  publikacji. Wolny tekst; numeracje, mniejszy krok pisma i separacje od tresci nadaje
   *  renderer. Osobne pole, a nie naglowek w body, zeby sekcja wygladala tak samo w kazdym
   *  artykule i nie zalezala od tego, jak klient nazwal naglowek (decyzja 2026-07-31). */
  sources?: string[]
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
  /** UI language for hardcoded renderer strings (nav labels, aria-labels, form
   *  copy, ...). Editable content (headline, body, etc.) is unaffected — that
   *  already varies per tenant via the fixture. Defaults to 'pl' when absent
   *  so every pre-existing tenant model keeps rendering in Polish untouched. */
  lang?: 'pl' | 'en'
  /** Belka autora na stronie artykulu — tylko gdy oba pola ustawione. Site-level, nie
   *  per-post: CMS jest multi-tenant, wiec autor to ten sam czlowiek/kancelaria dla
   *  wszystkich postow danego tenanta, nie osobne pole na kazdym PostItem. */
  authorName?: string
  authorRole?: string
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
