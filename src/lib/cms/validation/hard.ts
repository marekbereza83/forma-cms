import type { SiteModel, Section, PricingPackage, ProcessStep, FooterLink, PortfolioCard } from '../types'
import type { Violation } from './types'

const PRICE_AMOUNT_RE = /^\d[\d\s ]*$/
const PRICE_VAGUE = /wycen|zapytaj|kontakt/i
// Unicode emoji property — requires Node 10+ / V8 with unicode flag
const EMOJI_RE = /\p{Extended_Pictographic}/u
// V15: only http:// and https:// are safe link schemes (blocks javascript:, data:, //, etc.)
const SAFE_URL_RE = /^https?:\/\//i
// V16: contact field formats
const CONTACT_PHONE_RE = /^\+?[0-9]{9,15}$/
const CONTACT_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/



function findSection(model: SiteModel, id: string): Section | undefined {
  for (const page of model.pages) {
    const s = page.sections.find(s => s.id === id)
    if (s) return s
  }
  return undefined
}

function fieldStr(section: Section | undefined, fieldName: string): string {
  if (!section) return ''
  const f = section.fields[fieldName]
  if (!f) return ''
  return typeof f.value === 'string' ? f.value : ''
}

export function validateHard(model: SiteModel): Violation[] {
  const errors: Violation[] = []

  const indexPage = model.pages.find(p => p.slug === 'index')

  // ── V1: price amounts must be numeric (e.g. "4 500"), not vague labels ──────
  for (const page of model.pages) {
    for (const section of page.sections) {
      for (const [fieldName, field] of Object.entries(section.fields)) {
        if (field.type !== 'price') continue
        const pkg = field.value as PricingPackage
        const amount = pkg?.amount ?? ''
        const path = `${section.id}.${fieldName}.amount`
        if (!PRICE_AMOUNT_RE.test(amount)) {
          errors.push({ rule: 'V1', field: path, message: `Kwota "${amount}" nie jest liczbą — wymagany format np. "4 500"` })
        }
        if (PRICE_VAGUE.test(amount)) {
          errors.push({ rule: 'V1', field: path, message: `Kwota "${amount}" zawiera nieokreślone wyrażenie — podaj konkretną liczbę` })
        }
      }
    }
  }

  // ── V2: index page must have hero section ────────────────────────────────────
  if (!indexPage || !indexPage.sections.find(s => s.id === 'hero')) {
    errors.push({ rule: 'V2', field: 'pages.index.hero', message: 'Sekcja hero jest wymagana na stronie głównej' })
  }

  // ── V3: index page must have pricing section ─────────────────────────────────
  if (!indexPage || !indexPage.sections.find(s => s.id === 'pricing')) {
    errors.push({ rule: 'V3', field: 'pages.index.pricing', message: 'Sekcja cennika jest wymagana na stronie głównej' })
  }

  // ── V4: index page must have cta-finale section ──────────────────────────────
  if (!indexPage || !indexPage.sections.find(s => s.id === 'cta-finale')) {
    errors.push({ rule: 'V4', field: 'pages.index.cta-finale', message: 'Sekcja cta-finale jest wymagana na stronie głównej' })
  }

  // ── V5: cta-finale.lead must contain delivery promise ────────────────────────
  const ctaSection = findSection(model, 'cta-finale')
  const ctaLead = fieldStr(ctaSection, 'lead') || fieldStr(ctaSection, 'ctaMicrocopy')
  if (!ctaLead.trim()) {
    errors.push({ rule: 'V5', field: 'cta-finale.lead', message: 'Pole lead w cta-finale nie może być puste — musi zawierać obietnicę dostawy' })
  }

  // ── V6: cta-finale.headline must differ from hero.headline ──────────────────
  const heroSection = findSection(model, 'hero')
  const heroHeadline = fieldStr(heroSection, 'headline')
  const ctaHeadline = fieldStr(ctaSection, 'headline')
  if (heroHeadline && ctaHeadline && heroHeadline === ctaHeadline) {
    errors.push({ rule: 'V6', field: 'cta-finale.headline', message: 'Nagłówek cta-finale nie może być identyczny z nagłówkiem hero' })
  }

  // ── V7: max 2 price-type fields PER SECTION (standard + extended) ────────────
  // Per-sekcja, nie globalnie — semantyka: jedna sekcja cennikowa = max 2 pakiety.
  // index.pricing = 2 pakiety (OK), proces.cennik-detail czyta z index.pricing (0 pól price).
  // Nie podnosimy globalnego limitu pod fakt — reguła wyraża semantykę oferty.
  for (const page of model.pages) {
    for (const section of page.sections) {
      const count = Object.values(section.fields).filter(f => f.type === 'price').length
      if (count > 2) {
        errors.push({
          rule: 'V7',
          field: section.id,
          message: `Sekcja "${section.id}" zawiera ${count} pakiety cenowe — dozwolone maksymalnie 2 (standard + extended)`,
        })
      }
    }
  }

  // ── V8: each pricing package must have at least one feature ─────────────────
  for (const page of model.pages) {
    for (const section of page.sections) {
      for (const [fieldName, field] of Object.entries(section.fields)) {
        if (field.type !== 'price') continue
        const pkg = field.value as PricingPackage
        if (!Array.isArray(pkg?.features) || pkg.features.length === 0) {
          errors.push({ rule: 'V8', field: `${section.id}.${fieldName}.features`, message: 'Pakiet cenowy musi zawierać co najmniej jedną cechę (features)' })
        }
      }
    }
  }

  // ── V9: hero section must not contain image-type field ──────────────────────
  if (heroSection) {
    for (const [fieldName, field] of Object.entries(heroSection.fields)) {
      if (field.type === 'image') {
        errors.push({ rule: 'V9', field: `hero.${fieldName}`, message: 'Sekcja hero nie może zawierać pola typu image' })
      }
    }
  }

  // ── V10: process step numerals must be numeric strings ──────────────────────
  const processSection = findSection(model, 'process')
  if (processSection) {
    const stepsField = processSection.fields['steps']
    if (stepsField && Array.isArray(stepsField.value)) {
      const steps = stepsField.value as ProcessStep[]
      steps.forEach((step, i) => {
        if (!/^\d+$/.test(step.num ?? '')) {
          errors.push({ rule: 'V10', field: `process.steps[${i}].num`, message: `Numer kroku "${step.num}" musi być cyfrą (np. "01")` })
        }
      })
    }
  }

  // ── V11: footer links count must not exceed 6 ────────────────────────────────
  const footerSection = findSection(model, 'footer')
  if (footerSection) {
    const linksField = footerSection.fields['links']
    if (linksField && Array.isArray(linksField.value)) {
      const links = linksField.value as FooterLink[]
      if (links.length > 6) {
        errors.push({ rule: 'V11', field: 'footer.links', message: `Stopka zawiera ${links.length} linki — dozwolone maksymalnie 6` })
      }
    }
  }

  // ── V12: no emoji in headline/label/tag fields ───────────────────────────────
  const HEADLINE_FIELDS = ['headline', 'tag', 'label', 'sectionLabel', 'sectionHeadline', 'ctaLabel']
  for (const page of model.pages) {
    for (const section of page.sections) {
      for (const [fieldName, field] of Object.entries(section.fields)) {
        if (!HEADLINE_FIELDS.includes(fieldName)) continue
        if (typeof field.value !== 'string') continue
        if (EMOJI_RE.test(field.value)) {
          errors.push({ rule: 'V12', field: `${section.id}.${fieldName}`, message: `Pole "${fieldName}" zawiera emoji — niedozwolone w nagłówkach` })
        }
      }
    }
  }

  // ── V13: portfolio.cards must have 1–4 entries ──────────────────────────────
  const portfolioSection = findSection(model, 'portfolio')
  if (portfolioSection) {
    const cardsField = portfolioSection.fields['cards']
    if (cardsField !== undefined) {
      const count = Array.isArray(cardsField.value) ? cardsField.value.length : 0
      if (count < 1 || count > 4) {
        errors.push({
          rule: 'V13',
          field: 'portfolio.cards',
          message: `Portfolio zawiera ${count} kart — wymagane od 1 do 4`,
        })
      }
    }
  }


  // ── V14: portfolio-grid.cards must have 1–12 entries ────────────────────────
  const portfolioGridSection = findSection(model, 'portfolio-grid')
  if (portfolioGridSection) {
    const cardsField = portfolioGridSection.fields['cards']
    if (cardsField !== undefined) {
      const count = Array.isArray(cardsField.value) ? cardsField.value.length : 0
      if (count < 1 || count > 12) {
        errors.push({
          rule: 'V14',
          field: 'portfolio-grid.cards',
          message: `Strona portfolio zawiera ${count} kart — wymagane od 1 do 12`,
        })
      }
    }
  }

  // ── V15: portfolio card links must use http:// or https:// ──────────────────
  // Covers BOTH portfolio (home section) and portfolio-grid (full portfolio page).
  // Blocks: javascript:, data:, //, and any other non-http scheme (XSS vector).
  // Empty string / undefined = no link → skip validation.
  //
  // field is '<sectionId>.cards' (never bracket notation '<sectionId>.cards[i].link')
  // so that FieldsForm.handleSubmit matches it via v.field === prefix.
  // Bracket notation does NOT match that lookup — violations would silently fall
  // into the unmatched bucket and the field context would be lost.
  function validateCardLinks(section: Section | undefined, sectionId: string): void {
    if (!section) return
    const cardsField = section.fields['cards']
    if (!Array.isArray(cardsField?.value)) return
    ;(cardsField.value as PortfolioCard[]).forEach((card, i) => {
      if (card.link && !SAFE_URL_RE.test(card.link)) {
        errors.push({
          rule: 'V15',
          field: `${sectionId}.cards`,
          message: `Link karty ${i + 1} („${card.title || '—'}") musi zaczynać się od https:// lub http:// (niedozwolony schemat: ${card.link.split(':')[0]})`,
        })
      }
    })
  }
  validateCardLinks(portfolioSection, 'portfolio')
  validateCardLinks(portfolioGridSection, 'portfolio-grid')

  // ── V16: contact fields must have valid format ──────────────────────────────
  const { contactPhone = '', contactPhoneDisplay = '', contactEmail = '' } = model.meta
  if (!CONTACT_PHONE_RE.test(contactPhone)) {
    errors.push({ rule: 'V16', field: 'meta.contactPhone',
      message: `Numer telefonu "${contactPhone}" musi zawierać 9-15 cyfr (opcjonalnie + na początku, np. +48668902855)` })
  }
  if (!contactPhoneDisplay.trim()) {
    errors.push({ rule: 'V16', field: 'meta.contactPhoneDisplay',
      message: 'Wyświetlana wersja numeru telefonu nie może być pusta' })
  }
  if (!CONTACT_EMAIL_RE.test(contactEmail)) {
    errors.push({ rule: 'V16', field: 'meta.contactEmail',
      message: `Adres e-mail "${contactEmail}" nie jest prawidłowy` })
  }

  return errors
}
