import type { SiteModel, Section } from '../types'
import type { Violation } from './types'

// Wspolny helper dla wszystkich regul "dlugosc poza zalecanym zakresem SEO"
// (W1/W2/W6/W7) — zamiast kopiowac ten sam warunek min/max przy kazdym polu.
function lengthRangeWarning(
  rule: string,
  field: string,
  label: string,
  value: string,
  min: number,
  max: number,
): Violation | undefined {
  if (value.length < min || value.length > max) {
    return {
      rule,
      field,
      message: `${label} ma ${value.length} znaków — zalecane ${min}–${max} dla SEO`,
    }
  }
  return undefined
}

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

export function validateSoft(model: SiteModel): Violation[] {
  const warnings: Violation[] = []

  // ── W1: meta description should be 120–160 chars ────────────────────────────
  const w1 = lengthRangeWarning('W1', 'meta.description', 'Meta description', model.meta.description ?? '', 120, 160)
  if (w1) warnings.push(w1)

  // ── W2: meta title should be 50–60 chars ────────────────────────────────────
  const w2 = lengthRangeWarning('W2', 'meta.title', 'Meta title', model.meta.title ?? '', 50, 60)
  if (w2) warnings.push(w2)

  // ── W3: hero headline should be at most 80 chars ─────────────────────────────
  const heroSection = findSection(model, 'hero')
  const heroHeadline = fieldStr(heroSection, 'headline')
  if (heroHeadline.length > 80) {
    warnings.push({
      rule: 'W3',
      field: 'hero.headline',
      message: `Nagłówek hero ma ${heroHeadline.length} znaków — zalecane maksymalnie 80`,
    })
  }

  // ── W4: collections should not be empty ─────────────────────────────────────
  if (model.collections.events.length === 0 && model.collections.posts.length === 0) {
    warnings.push({
      rule: 'W4',
      field: 'collections',
      message: 'Kolekcje wydarzeń i postów są puste — rozważ dodanie treści',
    })
  }

  // ── W5: portfolio card without title ─────────────────────────────────────────
  const portfolioSection = findSection(model, 'portfolio')
  if (portfolioSection) {
    const cardsField = portfolioSection.fields['cards']
    if (Array.isArray(cardsField?.value)) {
      type CardLike = { title?: string }
      ;(cardsField.value as CardLike[]).forEach((card, i) => {
        if (!card.title?.trim()) {
          warnings.push({
            rule: 'W5',
            field: `portfolio.cards[${i}]`,
            message: `Karta #${i + 1} nie ma tytułu — treść wymagana przed publikacją`,
          })
        }
      })
    }
  }

  // ── W6/W7: PostItem.metaTitle/metaDescription, tylko gdy ustawione (override) ──
  // Brak wartosci nie jest ostrzezeniem — post uzywa wtedy domyslnego tytulu/opisu
  // (title+brandName / excerpt), ktore nie sa czescia tej reguly.
  model.collections.posts.forEach((post, i) => {
    if (post.metaTitle) {
      const w6 = lengthRangeWarning('W6', `collections.posts[${i}].metaTitle`, `Tytuł SEO publikacji "${post.title}"`, post.metaTitle, 50, 60)
      if (w6) warnings.push(w6)
    }
    if (post.metaDescription) {
      const w7 = lengthRangeWarning('W7', `collections.posts[${i}].metaDescription`, `Opis SEO publikacji "${post.title}"`, post.metaDescription, 120, 160)
      if (w7) warnings.push(w7)
    }
  })

  return warnings
}
