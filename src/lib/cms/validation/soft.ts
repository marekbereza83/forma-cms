import type { SiteModel, Section } from '../types'
import type { Violation } from './types'

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
  const desc = model.meta.description ?? ''
  if (desc.length < 120 || desc.length > 160) {
    warnings.push({
      rule: 'W1',
      field: 'meta.description',
      message: `Meta description ma ${desc.length} znaków — zalecane 120–160 dla SEO`,
    })
  }

  // ── W2: meta title should be 50–60 chars ────────────────────────────────────
  const title = model.meta.title ?? ''
  if (title.length < 50 || title.length > 60) {
    warnings.push({
      rule: 'W2',
      field: 'meta.title',
      message: `Meta title ma ${title.length} znaków — zalecane 50–60 dla SEO`,
    })
  }

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

  return warnings
}
