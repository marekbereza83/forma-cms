import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { parseSiteModel, SiteModelSchema } from '../src/lib/cms/schema'
import { validateHard } from '../src/lib/cms/validation/hard'
import { validateSoft } from '../src/lib/cms/validation/soft'
import {
  validateEvents,
  validateEventTitles,
  validatePostBodies,
  validatePostDates,
  validatePostSlugs,
  validatePostSlugUniqueness,
  validatePublishedPostDates,
  validatePublishedPostBodies,
  validatePostMetaLengths,
  sanitizePostBody,
} from '../src/lib/cms/validation/collections'
import { FormaValidationError } from '../src/lib/cms/validation/types'
import type { SiteModel } from '../src/lib/cms/types'

const ROOT = resolve(process.cwd())

function loadFixture(): SiteModel {
  const json = JSON.parse(readFileSync(resolve(ROOT, 'fixtures/forma-site.json'), 'utf-8'))
  // Bypass parseSiteModel's validation layer to get the raw model for mutation tests
  return SiteModelSchema.parse(json) as SiteModel
}

// Deep clone via JSON round-trip
function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v))
}

function setField(model: SiteModel, sectionId: string, fieldName: string, value: unknown): SiteModel {
  const m = clone(model)
  for (const page of m.pages) {
    const section = page.sections.find(s => s.id === sectionId)
    if (section && section.fields[fieldName]) {
      section.fields[fieldName].value = value
    }
  }
  return m
}

// ────────────────────────────────────────────────────────────────────────────
describe('V1 — price amount format', () => {
  it('valid numeric amount → no violation', () => {
    const model = loadFixture()
    const errs = validateHard(model).filter(v => v.rule === 'V1')
    expect(errs).toHaveLength(0)
  })

  it('non-numeric amount → V1 error', () => {
    const model = loadFixture()
    const m = clone(model)
    for (const page of m.pages) {
      const pricing = page.sections.find(s => s.id === 'pricing')
      if (pricing?.fields.standard) {
        (pricing.fields.standard.value as Record<string, unknown>).amount = 'abc'
      }
    }
    const errs = validateHard(m).filter(v => v.rule === 'V1')
    expect(errs.length).toBeGreaterThan(0)
    expect(errs[0].field).toContain('amount')
  })

  it('vague amount "zapytaj" → V1 error', () => {
    const model = loadFixture()
    const m = clone(model)
    for (const page of m.pages) {
      const pricing = page.sections.find(s => s.id === 'pricing')
      if (pricing?.fields.standard) {
        (pricing.fields.standard.value as Record<string, unknown>).amount = 'zapytaj'
      }
    }
    const errs = validateHard(m).filter(v => v.rule === 'V1')
    expect(errs.length).toBeGreaterThan(0)
  })
})

// ────────────────────────────────────────────────────────────────────────────
describe('V2 — hero section required', () => {
  it('fixture has hero → no V2 error', () => {
    const model = loadFixture()
    const errs = validateHard(model).filter(v => v.rule === 'V2')
    expect(errs).toHaveLength(0)
  })

  it('missing hero → V2 error', () => {
    const model = loadFixture()
    const m = clone(model)
    m.pages[0].sections = m.pages[0].sections.filter(s => s.id !== 'hero')
    const errs = validateHard(m).filter(v => v.rule === 'V2')
    expect(errs).toHaveLength(1)
  })
})

// ────────────────────────────────────────────────────────────────────────────
describe('V3 — pricing section required', () => {
  it('fixture has pricing → no V3 error', () => {
    const model = loadFixture()
    const errs = validateHard(model).filter(v => v.rule === 'V3')
    expect(errs).toHaveLength(0)
  })

  it('missing pricing → V3 error', () => {
    const model = loadFixture()
    const m = clone(model)
    m.pages[0].sections = m.pages[0].sections.filter(s => s.id !== 'pricing')
    const errs = validateHard(m).filter(v => v.rule === 'V3')
    expect(errs).toHaveLength(1)
  })
})

// ────────────────────────────────────────────────────────────────────────────
describe('V4 — cta-finale section required', () => {
  it('fixture has cta-finale → no V4 error', () => {
    const model = loadFixture()
    const errs = validateHard(model).filter(v => v.rule === 'V4')
    expect(errs).toHaveLength(0)
  })

  it('missing cta-finale → V4 error', () => {
    const model = loadFixture()
    const m = clone(model)
    m.pages[0].sections = m.pages[0].sections.filter(s => s.id !== 'cta-finale')
    const errs = validateHard(m).filter(v => v.rule === 'V4')
    expect(errs).toHaveLength(1)
  })
})

// ────────────────────────────────────────────────────────────────────────────
describe('V5 — cta-finale.lead delivery promise', () => {
  it('fixture cta-finale.lead is non-empty → no V5 error', () => {
    const model = loadFixture()
    const errs = validateHard(model).filter(v => v.rule === 'V5')
    expect(errs).toHaveLength(0)
  })

  it('empty cta-finale.lead → V5 error', () => {
    const model = loadFixture()
    const m = setField(model, 'cta-finale', 'lead', '')
    const errs = validateHard(m).filter(v => v.rule === 'V5')
    expect(errs).toHaveLength(1)
    expect(errs[0].field).toBe('cta-finale.lead')
  })
})

// ────────────────────────────────────────────────────────────────────────────
describe('V6 — cta-finale.headline differs from hero.headline', () => {
  it('fixture has different headlines → no V6 error', () => {
    const model = loadFixture()
    const errs = validateHard(model).filter(v => v.rule === 'V6')
    expect(errs).toHaveLength(0)
  })

  it('identical headlines → V6 error', () => {
    const model = loadFixture()
    const m = clone(model)
    // Get hero headline first
    let heroHeadline = ''
    for (const page of m.pages) {
      const hero = page.sections.find(s => s.id === 'hero')
      if (hero?.fields.headline) heroHeadline = hero.fields.headline.value as string
      const cta = page.sections.find(s => s.id === 'cta-finale')
      if (cta?.fields.headline) cta.fields.headline.value = heroHeadline
    }
    const errs = validateHard(m).filter(v => v.rule === 'V6')
    expect(errs).toHaveLength(1)
  })
})

// ────────────────────────────────────────────────────────────────────────────
describe('V7 — max 2 price-type fields per section (standard + extended)', () => {
  // V7 per-sekcja: reguła wyraża semantykę oferty (max 2 pakiety w jednej sekcji),
  // nie globalną liczbę pól price. cennik-detail nie ma własnych pól price.
  it('fixture: index.pricing has 2 price fields, cennik-detail has 0 → no V7 error', () => {
    const model = loadFixture()
    const errs = validateHard(model).filter(v => v.rule === 'V7')
    expect(errs).toHaveLength(0)
  })

  it('3 packages in one section → V7 error', () => {
    const model = loadFixture()
    const m = clone(model)
    // Inject a 3rd price field into index.pricing (standard + extended + extra → 3 → error)
    const pricing = m.pages[0].sections.find(s => s.id === 'pricing')
    if (pricing) {
      pricing.fields['premium'] = {
        type: 'price',
        value: { label: 'Premium', amount: '9 000', deliveryNote: '', ariaLabel: '', features: ['x'], ctaLabel: '', ctaMicrocopy: '' },
        editable: true,
      }
    }
    const errs = validateHard(m).filter(v => v.rule === 'V7')
    expect(errs).toHaveLength(1)
    expect(errs[0].field).toBe('pricing')
  })

  it('two separate sections each with 2 price fields → no V7 error', () => {
    // Model with two separate pricing sections, each 2 packages — both OK per-section.
    // This validates that the rule is per-section, not global count.
    const model = loadFixture()
    const m = clone(model)
    // Add a second pricing section (cennik2) to index with 2 price fields
    m.pages[0].sections.push({
      id: 'cennik2',
      recipe: 'A1',
      fields: {
        std2: { type: 'price', value: { label: 'S', amount: '1 000', deliveryNote: '', ariaLabel: '', features: ['x'], ctaLabel: '', ctaMicrocopy: '' }, editable: true },
        ext2: { type: 'price', value: { label: 'E', amount: '2 000', deliveryNote: '', ariaLabel: '', features: ['x'], ctaLabel: '', ctaMicrocopy: '' }, editable: true },
      },
    })
    const errs = validateHard(m).filter(v => v.rule === 'V7')
    expect(errs).toHaveLength(0)
  })
})

// ────────────────────────────────────────────────────────────────────────────
describe('V8 — each price package has at least one feature', () => {
  it('fixture features non-empty → no V8 error', () => {
    const model = loadFixture()
    const errs = validateHard(model).filter(v => v.rule === 'V8')
    expect(errs).toHaveLength(0)
  })

  it('empty features array → V8 error', () => {
    const model = loadFixture()
    const m = clone(model)
    for (const page of m.pages) {
      const pricing = page.sections.find(s => s.id === 'pricing')
      if (pricing?.fields.standard) {
        (pricing.fields.standard.value as Record<string, unknown>).features = []
      }
    }
    const errs = validateHard(m).filter(v => v.rule === 'V8')
    expect(errs.length).toBeGreaterThan(0)
  })
})

// ────────────────────────────────────────────────────────────────────────────
describe('V9 — no image field in hero', () => {
  it('fixture hero has no image field → no V9 error', () => {
    const model = loadFixture()
    const errs = validateHard(model).filter(v => v.rule === 'V9')
    expect(errs).toHaveLength(0)
  })

  it('image field added to hero → V9 error', () => {
    const model = loadFixture()
    const m = clone(model)
    for (const page of m.pages) {
      const hero = page.sections.find(s => s.id === 'hero')
      if (hero) {
        hero.fields['photo'] = { type: 'image', value: 'photo.jpg', editable: true }
      }
    }
    const errs = validateHard(m).filter(v => v.rule === 'V9')
    expect(errs).toHaveLength(1)
  })
})

// ────────────────────────────────────────────────────────────────────────────
describe('V10 — process step numerals must be numeric', () => {
  it('fixture numerals 01-05 → no V10 error', () => {
    const model = loadFixture()
    const errs = validateHard(model).filter(v => v.rule === 'V10')
    expect(errs).toHaveLength(0)
  })

  it('non-numeric numeral → V10 error', () => {
    const model = loadFixture()
    const m = clone(model)
    for (const page of m.pages) {
      const process = page.sections.find(s => s.id === 'process')
      if (process?.fields.steps && Array.isArray(process.fields.steps.value)) {
        (process.fields.steps.value as Record<string, unknown>[])[0].num = 'I'
      }
    }
    const errs = validateHard(m).filter(v => v.rule === 'V10')
    expect(errs).toHaveLength(1)
  })
})

// ────────────────────────────────────────────────────────────────────────────
describe('V11 — footer links max 6', () => {
  it('fixture has <= 6 footer links → no V11 error', () => {
    const model = loadFixture()
    const errs = validateHard(model).filter(v => v.rule === 'V11')
    expect(errs).toHaveLength(0)
  })

  it('7 footer links → V11 error', () => {
    const model = loadFixture()
    const m = clone(model)
    for (const page of m.pages) {
      const footer = page.sections.find(s => s.id === 'footer')
      if (footer?.fields.links && Array.isArray(footer.fields.links.value)) {
        footer.fields.links.value = Array(7).fill({ label: 'Link', href: '#' })
      }
    }
    const errs = validateHard(m).filter(v => v.rule === 'V11')
    expect(errs).toHaveLength(1)
  })
})

// ────────────────────────────────────────────────────────────────────────────
describe('V12 — no emoji in headline/label/tag fields', () => {
  it('fixture has no emoji → no V12 error', () => {
    const model = loadFixture()
    const errs = validateHard(model).filter(v => v.rule === 'V12')
    expect(errs).toHaveLength(0)
  })

  it('emoji in hero tag → V12 error', () => {
    const model = loadFixture()
    const m = setField(model, 'hero', 'tag', 'Kancelaria 👍 prawna')
    const errs = validateHard(m).filter(v => v.rule === 'V12')
    expect(errs).toHaveLength(1)
    expect(errs[0].field).toBe('hero.tag')
  })
})

// ────────────────────────────────────────────────────────────────────────────
describe('V13 — portfolio cards count 1–4', () => {
  function setPortfolioCards(model: SiteModel, count: number): SiteModel {
    const m = clone(model)
    const baseCard = { label: 'Kancelaria', title: 'Test', desc: 'Opis', image: '' }
    for (const page of m.pages) {
      const portfolio = page.sections.find(s => s.id === 'portfolio')
      if (portfolio?.fields.cards) {
        portfolio.fields.cards.value = Array.from({ length: count }, () => ({ ...baseCard }))
      }
    }
    return m
  }

  it('fixture (1 karta) → brak błędu V13', () => {
    const model = loadFixture()
    const errs = validateHard(model).filter(v => v.rule === 'V13')
    expect(errs).toHaveLength(0)
  })

  it('2 karty → brak błędu V13', () => {
    const model = setPortfolioCards(loadFixture(), 2)
    const errs = validateHard(model).filter(v => v.rule === 'V13')
    expect(errs).toHaveLength(0)
  })

  it('3 karty → brak błędu V13', () => {
    const model = setPortfolioCards(loadFixture(), 3)
    const errs = validateHard(model).filter(v => v.rule === 'V13')
    expect(errs).toHaveLength(0)
  })

  it('4 karty (górna granica) → brak błędu V13', () => {
    const model = setPortfolioCards(loadFixture(), 4)
    const errs = validateHard(model).filter(v => v.rule === 'V13')
    expect(errs).toHaveLength(0)
  })

  it('0 kart → błąd V13', () => {
    const model = setPortfolioCards(loadFixture(), 0)
    const errs = validateHard(model).filter(v => v.rule === 'V13')
    expect(errs).toHaveLength(1)
    expect(errs[0].field).toBe('portfolio.cards')
  })

  it('5 kart (pierwsza zabroniona) → błąd V13', () => {
    const model = setPortfolioCards(loadFixture(), 5)
    const errs = validateHard(model).filter(v => v.rule === 'V13')
    expect(errs).toHaveLength(1)
    expect(errs[0].field).toBe('portfolio.cards')
  })
})

// ────────────────────────────────────────────────────────────────────────────
describe('W5 — portfolio card without title', () => {
  it('fixture (karta z tytułem) → brak W5', () => {
    const model = loadFixture()
    const warns = validateSoft(model).filter(v => v.rule === 'W5')
    expect(warns).toHaveLength(0)
  })

  it('karta z pustym title → W5 z polem portfolio.cards[0]', () => {
    const model = loadFixture()
    const m = clone(model)
    for (const page of m.pages) {
      const portfolio = page.sections.find(s => s.id === 'portfolio')
      if (portfolio?.fields.cards && Array.isArray(portfolio.fields.cards.value)) {
        (portfolio.fields.cards.value as Record<string, unknown>[])[0].title = ''
      }
    }
    const warns = validateSoft(m).filter(v => v.rule === 'W5')
    expect(warns).toHaveLength(1)
    expect(warns[0].field).toBe('portfolio.cards[0]')
  })
})

// ────────────────────────────────────────────────────────────────────────────
describe('W1 — meta description length', () => {
  it('fixture description in range → no W1 warning', () => {
    const model = loadFixture()
    const warns = validateSoft(model).filter(v => v.rule === 'W1')
    expect(warns).toHaveLength(0)
  })

  it('too-short description → W1 warning', () => {
    const model = loadFixture()
    const m = clone(model)
    m.meta.description = 'Krótki opis.'
    const warns = validateSoft(m).filter(v => v.rule === 'W1')
    expect(warns).toHaveLength(1)
  })
})

// ────────────────────────────────────────────────────────────────────────────
describe('W2 — meta title length', () => {
  it('title in 50-60 char range → no W2 warning', () => {
    const model = loadFixture()
    const m = clone(model)
    m.meta.title = 'Strony dla kancelarii prawnych i adwokatów | FORMA'  // 50 chars
    const warns = validateSoft(m).filter(v => v.rule === 'W2')
    expect(warns).toHaveLength(0)
  })

  it('too-long title → W2 warning', () => {
    const model = loadFixture()
    const m = clone(model)
    m.meta.title = 'Bardzo długi tytuł strony który przekracza sześćdziesiąt znaków limitu SEO'
    const warns = validateSoft(m).filter(v => v.rule === 'W2')
    expect(warns).toHaveLength(1)
  })
})

// ────────────────────────────────────────────────────────────────────────────
describe('W6 — PostItem.metaTitle length (tylko gdy ustawiony)', () => {
  it('metaTitle nieustawiony → brak ostrzeżenia (fixture)', () => {
    const model = loadFixture()
    expect(validateSoft(model).filter(v => v.rule === 'W6')).toHaveLength(0)
  })

  it('metaTitle w zakresie 50-60 → brak ostrzeżenia', () => {
    const m = clone(loadFixture())
    m.collections.posts[0].metaTitle = 'x'.repeat(55)
    expect(validateSoft(m).filter(v => v.rule === 'W6')).toHaveLength(0)
  })

  it('metaTitle za krótki → W6', () => {
    const m = clone(loadFixture())
    m.collections.posts[0].metaTitle = 'Za krótki tytuł'
    expect(validateSoft(m).filter(v => v.rule === 'W6')).toHaveLength(1)
  })
})

describe('W7 — PostItem.metaDescription length (tylko gdy ustawiony)', () => {
  it('metaDescription nieustawiony → brak ostrzeżenia (fixture)', () => {
    const model = loadFixture()
    expect(validateSoft(model).filter(v => v.rule === 'W7')).toHaveLength(0)
  })

  it('metaDescription w zakresie 120-160 → brak ostrzeżenia', () => {
    const m = clone(loadFixture())
    m.collections.posts[0].metaDescription = 'x'.repeat(140)
    expect(validateSoft(m).filter(v => v.rule === 'W7')).toHaveLength(0)
  })

  it('metaDescription za krótki → W7', () => {
    const m = clone(loadFixture())
    m.collections.posts[0].metaDescription = 'Za krótki opis.'
    expect(validateSoft(m).filter(v => v.rule === 'W7')).toHaveLength(1)
  })
})

// ────────────────────────────────────────────────────────────────────────────
describe('W3 — hero headline max 80 chars', () => {
  it('fixture headline <= 80 chars → no W3 warning', () => {
    const model = loadFixture()
    const warns = validateSoft(model).filter(v => v.rule === 'W3')
    expect(warns).toHaveLength(0)
  })

  it('headline > 80 chars → W3 warning', () => {
    const model = loadFixture()
    const m = setField(model, 'hero', 'headline', 'A'.repeat(81))
    const warns = validateSoft(m).filter(v => v.rule === 'W3')
    expect(warns).toHaveLength(1)
  })
})

// ────────────────────────────────────────────────────────────────────────────
describe('W4 — non-empty collections', () => {
  it('both collections empty → W4 warning', () => {
    const model = loadFixture()
    const m = clone(model)
    m.collections.events = []
    m.collections.posts = []
    const warns = validateSoft(m).filter(v => v.rule === 'W4')
    expect(warns).toHaveLength(1)
  })

  it('fixture has non-empty posts → no W4 warning', () => {
    const model = loadFixture()
    const warns = validateSoft(model).filter(v => v.rule === 'W4')
    expect(warns).toHaveLength(0)
  })

  it('at least one event → no W4 warning', () => {
    const model = loadFixture()
    const m = clone(model)
    m.collections.events = [{ id: '1', title: 'Test', date: '2026-01-01', description: 'x', status: 'published' }]
    const warns = validateSoft(m).filter(v => v.rule === 'W4')
    expect(warns).toHaveLength(0)
  })
})

// ────────────────────────────────────────────────────────────────────────────
describe('C1 — event date format', () => {
  it('valid date → no C1 error', () => {
    const errs = validateEvents([{ id: '1', title: 'T', date: '2026-06-15', description: '', status: 'published' }])
    expect(errs).toHaveLength(0)
  })

  it('invalid date format → C1 error', () => {
    const errs = validateEvents([{ id: '1', title: 'T', date: '15.06.2026', description: '', status: 'published' }])
    expect(errs).toHaveLength(1)
    expect(errs[0].rule).toBe('C1')
  })
})

// ────────────────────────────────────────────────────────────────────────────
describe('C2 — event title non-empty', () => {
  it('non-empty title → no C2 error', () => {
    const errs = validateEventTitles([{ id: '1', title: 'Konferencja', date: '2026-01-01', description: '', status: 'published' }])
    expect(errs).toHaveLength(0)
  })

  it('empty title → C2 error', () => {
    const errs = validateEventTitles([{ id: '1', title: '   ', date: '2026-01-01', description: '', status: 'published' }])
    expect(errs).toHaveLength(1)
    expect(errs[0].rule).toBe('C2')
  })
})

// ────────────────────────────────────────────────────────────────────────────
// C3 — validatePostBodies is a safety-net: fires only on truly dangerous markup.
// sanitizePostBody is the first-line cleaner used at save time (KROK 5).
describe('C3 — XSS in post body', () => {
  // ── validatePostBodies: dangerous patterns fire C3 ──────────────────────
  it('clean body → no C3 error', () => {
    const errs = validatePostBodies([{ id: '1', title: 'T', body: '<p>Bezpieczny tekst.</p>', status: 'published' }])
    expect(errs).toHaveLength(0)
  })

  it('script tag in body → C3 error', () => {
    const errs = validatePostBodies([{ id: '1', title: 'T', body: '<p>Tekst</p><script>alert(1)</script>', status: 'published' }])
    expect(errs).toHaveLength(1)
    expect(errs[0].rule).toBe('C3')
  })

  it('inline handler in body → C3 error', () => {
    const errs = validatePostBodies([{ id: '1', title: 'T', body: '<a onclick="evil()">klik</a>', status: 'published' }])
    expect(errs).toHaveLength(1)
    expect(errs[0].rule).toBe('C3')
  })

  it('javascript: scheme in href → C3 error', () => {
    const errs = validatePostBodies([{ id: '1', title: 'T', body: '<a href="javascript:alert(1)">klik</a>', status: 'published' }])
    expect(errs).toHaveLength(1)
    expect(errs[0].rule).toBe('C3')
  })

  it('mixed-case event handler OnErRoR → C3 error', () => {
    const errs = validatePostBodies([{ id: '1', title: 'T', body: '<img src=x OnErRoR=alert(1)>', status: 'published' }])
    expect(errs).toHaveLength(1)
    expect(errs[0].rule).toBe('C3')
  })

  it('svg onload → C3 error', () => {
    const errs = validatePostBodies([{ id: '1', title: 'T', body: '<svg onload=alert(1)>', status: 'published' }])
    expect(errs).toHaveLength(1)
    expect(errs[0].rule).toBe('C3')
  })

  // Word junk must NOT trigger C3 — sanitizePostBody handles it silently at save
  it('Word junk <span style> → no C3 error (sanitizer handles at save, not validator)', () => {
    const body = '<p>Tekst <span style="color:red;font-family:Calibri">wklejony z Worda</span><o:p></o:p></p>'
    const errs = validatePostBodies([{ id: '1', title: 'T', body, status: 'published' }])
    expect(errs).toHaveLength(0)
  })

  // ── sanitizePostBody: first-line cleaner, 5 attack vectors ──────────────
  it('sanitizePostBody — <script> tag stripped, safe content preserved', () => {
    const out = sanitizePostBody('<p>Tekst</p><script>alert(1)</script><p>Koniec</p>')
    expect(out).not.toContain('<script')
    expect(out).toContain('Tekst')
    expect(out).toContain('Koniec')
  })

  it('sanitizePostBody — img onerror: tag stripped (img not in allowlist)', () => {
    const out = sanitizePostBody('<img src=x onerror=alert(1)>')
    expect(out).toBe('')
  })

  it('sanitizePostBody — javascript: href stripped, link text preserved', () => {
    const out = sanitizePostBody('<a href="javascript:alert(1)">klik</a>')
    expect(out).not.toContain('javascript:')
    expect(out).toContain('klik')
  })

  it('sanitizePostBody — mixed-case OnErRoR handler stripped', () => {
    const out = sanitizePostBody('<img src=x OnErRoR=alert(1)>')
    expect(out).not.toMatch(/onerror/i)
  })

  it('sanitizePostBody — svg onload stripped', () => {
    const out = sanitizePostBody('<svg onload=alert(1)><circle r="10"/></svg>')
    expect(out).not.toContain('<svg')
    expect(out).not.toMatch(/onload/i)
  })

  it('sanitizePostBody — Word junk stripped silently, text preserved', () => {
    const body = '<p>Tekst <span style="color:red;font-family:Calibri">wklejony z Worda</span><o:p></o:p></p>'
    const out = sanitizePostBody(body)
    expect(out).not.toContain('<span')
    expect(out).not.toContain('<o:p')
    expect(out).toContain('wklejony z Worda')
  })

  // ── Tabele: struktura przechodzi, prezentacja wylatuje (2026-07-29) ──────
  it('sanitizePostBody — struktura tabeli zachowana', () => {
    const body = '<table><thead><tr><th>Usługa</th><th>Cena</th></tr></thead>'
      + '<tbody><tr><td>Analiza</td><td>1 200 zł</td></tr></tbody></table>'
    const out = sanitizePostBody(body)
    for (const tag of ['<table', '<thead', '<tbody', '<tr', '<th', '<td']) {
      expect(out, `brak ${tag}`).toContain(tag)
    }
    expect(out).toContain('1 200 zł')
  })

  it('sanitizePostBody — colspan/rowspan zachowane, reszta atrybutow tabeli usunieta', () => {
    const body = '<table border="1" cellpadding="4" style="width:600px" class="MsoTableGrid">'
      + '<tr><td colspan="2" rowspan="3" width="120" style="background:red" class="x">A</td></tr></table>'
    const out = sanitizePostBody(body)
    expect(out).toContain('colspan="2"')
    expect(out).toContain('rowspan="3"')
    expect(out).not.toContain('border=')
    expect(out).not.toContain('cellpadding')
    expect(out).not.toContain('style=')
    expect(out).not.toContain('MsoTableGrid')
    expect(out).not.toContain('width=')
  })

  it('sanitizePostBody — skrypt wewnatrz komorki tabeli usuniety', () => {
    const out = sanitizePostBody('<table><tr><td><script>alert(1)</script>Bezpieczne</td></tr></table>')
    expect(out).not.toContain('<script')
    expect(out).toContain('Bezpieczne')
  })
})

// ────────────────────────────────────────────────────────────────────────────
describe('C4 — post publishedAt format', () => {
  it('valid publishedAt → no C4 error', () => {
    const errs = validatePostDates([{ id: '1', title: 'T', publishedAt: '2026-06-01', body: '', status: 'published' }])
    expect(errs).toHaveLength(0)
  })

  it('absent publishedAt → no C4 error', () => {
    const errs = validatePostDates([{ id: '1', title: 'T', body: '', status: 'draft' }])
    expect(errs).toHaveLength(0)
  })

  it('invalid publishedAt format → C4 error', () => {
    const errs = validatePostDates([{ id: '1', title: 'T', publishedAt: '01/06/2026', body: '', status: 'published' }])
    expect(errs).toHaveLength(1)
    expect(errs[0].rule).toBe('C4')
  })
})

// ────────────────────────────────────────────────────────────────────────────
const post = (over: Partial<import('../src/lib/cms/types').PostItem> = {}) => ({
  id: '1',
  slug: 'etyka-zawodowa',
  title: 'Etyka zawodowa',
  publishedAt: '2026-06-01',
  body: '<p>Treść</p>',
  status: 'published' as const,
  ...over,
})

describe('C5 — post slug format', () => {
  it('poprawny kebab-case → brak błędu', () => {
    expect(validatePostSlugs([post({ slug: 'jak-zaprojektowac-strone-2026' })])).toHaveLength(0)
  })

  it.each([
    ['polskie znaki', 'etyka-zawodowa-kancelarii-ą'],
    ['wielkie litery', 'Etyka-Zawodowa'],
    ['spacje', 'etyka zawodowa'],
    ['podkreślniki', 'etyka_zawodowa'],
    ['ukośnik (próba wyjścia ze ścieżki)', '../../etc/passwd'],
    ['pusty', ''],
    ['myślnik na końcu', 'etyka-'],
  ])('%s → błąd C5', (_label, slug) => {
    const errs = validatePostSlugs([post({ slug })])
    expect(errs).toHaveLength(1)
    expect(errs[0].rule).toBe('C5')
  })
})

describe('C6 — post slug uniqueness', () => {
  it('różne slugi → brak błędu', () => {
    const errs = validatePostSlugUniqueness([post({ id: '1', slug: 'a' }), post({ id: '2', slug: 'b' })])
    expect(errs).toHaveLength(0)
  })

  it('duplikat sluga → błąd C6 wskazujący drugi wpis', () => {
    const errs = validatePostSlugUniqueness([post({ id: '1', slug: 'a' }), post({ id: '2', slug: 'a' })])
    expect(errs).toHaveLength(1)
    expect(errs[0].rule).toBe('C6')
    expect(errs[0].field).toBe('collections.posts[1].slug')
  })
})

describe('C7 — opublikowany post wymaga daty', () => {
  it('published z datą → brak błędu', () => {
    expect(validatePublishedPostDates([post()])).toHaveLength(0)
  })

  it('draft bez daty → brak błędu (szkic nie wymaga daty)', () => {
    expect(validatePublishedPostDates([post({ status: 'draft', publishedAt: undefined })])).toHaveLength(0)
  })

  it('published bez daty → błąd C7', () => {
    const errs = validatePublishedPostDates([post({ publishedAt: undefined })])
    expect(errs).toHaveLength(1)
    expect(errs[0].rule).toBe('C7')
  })
})

describe('C8 — opublikowany post wymaga treści', () => {
  it('published z treścią → brak błędu', () => {
    expect(validatePublishedPostBodies([post()])).toHaveLength(0)
  })

  it('draft z pustą treścią → brak błędu', () => {
    expect(validatePublishedPostBodies([post({ status: 'draft', body: '' })])).toHaveLength(0)
  })

  it.each([
    ['pusty string', ''],
    ['sam pusty akapit z edytora', '<p></p>'],
    ['same białe znaki i nbsp', '<p>&nbsp; </p>'],
  ])('published, %s → błąd C8', (_label, body) => {
    const errs = validatePublishedPostBodies([post({ body })])
    expect(errs).toHaveLength(1)
    expect(errs[0].rule).toBe('C8')
  })
})

describe('C12 — metaTitle/metaDescription: twarde limity długości', () => {
  it('brak obu pól → brak błędu', () => {
    expect(validatePostMetaLengths([post()])).toHaveLength(0)
  })

  it('metaTitle w limicie (70) → brak błędu', () => {
    expect(validatePostMetaLengths([post({ metaTitle: 'x'.repeat(70) })])).toHaveLength(0)
  })

  it('metaTitle powyżej limitu (71) → błąd C12', () => {
    const errs = validatePostMetaLengths([post({ metaTitle: 'x'.repeat(71) })])
    expect(errs).toHaveLength(1)
    expect(errs[0].rule).toBe('C12')
    expect(errs[0].field).toContain('metaTitle')
  })

  it('metaDescription w limicie (200) → brak błędu', () => {
    expect(validatePostMetaLengths([post({ metaDescription: 'x'.repeat(200) })])).toHaveLength(0)
  })

  it('metaDescription powyżej limitu (201) → błąd C12', () => {
    const errs = validatePostMetaLengths([post({ metaDescription: 'x'.repeat(201) })])
    expect(errs).toHaveLength(1)
    expect(errs[0].rule).toBe('C12')
    expect(errs[0].field).toContain('metaDescription')
  })
})

// ────────────────────────────────────────────────────────────────────────────
describe('parseSiteModel integration', () => {
  it('clean fixture → no FormaValidationError, returns model + warnings', () => {
    const json = JSON.parse(readFileSync(resolve(ROOT, 'fixtures/forma-site.json'), 'utf-8'))
    const result = parseSiteModel(json)
    expect(result.model).toBeDefined()
    expect(result.model.tenantId).toBe('forma-demo')
    expect(Array.isArray(result.warnings)).toBe(true)
  })

  it('hard rule violation → throws FormaValidationError', () => {
    const json = JSON.parse(readFileSync(resolve(ROOT, 'fixtures/forma-site.json'), 'utf-8'))
    // Remove hero section to trigger V2
    json.pages[0].sections = json.pages[0].sections.filter((s: { id: string }) => s.id !== 'hero')
    expect(() => parseSiteModel(json)).toThrow(FormaValidationError)
  })

  it('soft rule violation → returns warnings, does not throw', () => {
    const json = JSON.parse(readFileSync(resolve(ROOT, 'fixtures/forma-site.json'), 'utf-8'))
    // Make title very short (W2)
    json.meta.title = 'Krótki'
    const result = parseSiteModel(json)
    const w2 = result.warnings.filter(w => w.rule === 'W2')
    expect(w2.length).toBeGreaterThan(0)
  })
})

// ────────────────────────────────────────────────────────────────────────────
describe('V14 — portfolio-grid cards count 1–12', () => {
  function setGridCards(model: SiteModel, count: number): SiteModel {
    const m = clone(model)
    const baseCard = { id: '00000000-0000-4000-8000-000000000001', label: 'Kancelaria', title: 'Test', desc: 'Opis', image: '', link: '' }
    for (const page of m.pages) {
      const grid = page.sections.find(s => s.id === 'portfolio-grid')
      if (grid?.fields.cards) {
        grid.fields.cards.value = Array.from({ length: count }, (_, i) => ({
          ...baseCard,
          id: `00000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`,
        }))
      }
    }
    return m
  }

  it('fixture (1 karta) → brak błędu V14', () => {
    const model = loadFixture()
    const errs = validateHard(model).filter(v => v.rule === 'V14')
    expect(errs).toHaveLength(0)
  })

  it('12 kart (górna granica) → brak błędu V14', () => {
    const model = setGridCards(loadFixture(), 12)
    const errs = validateHard(model).filter(v => v.rule === 'V14')
    expect(errs).toHaveLength(0)
  })

  it('0 kart → błąd V14', () => {
    const model = setGridCards(loadFixture(), 0)
    const errs = validateHard(model).filter(v => v.rule === 'V14')
    expect(errs).toHaveLength(1)
    expect(errs[0].field).toBe('portfolio-grid.cards')
  })

  it('13 kart (pierwsza zabroniona) → błąd V14', () => {
    const model = setGridCards(loadFixture(), 13)
    const errs = validateHard(model).filter(v => v.rule === 'V14')
    expect(errs).toHaveLength(1)
    expect(errs[0].field).toBe('portfolio-grid.cards')
  })
})

// ────────────────────────────────────────────────────────────────────────────
describe('V15 — portfolio-grid card link URL safety', () => {
  function setGridCardLink(model: SiteModel, link: string): SiteModel {
    const m = clone(model)
    for (const page of m.pages) {
      const grid = page.sections.find(s => s.id === 'portfolio-grid')
      if (grid?.fields.cards && Array.isArray(grid.fields.cards.value)) {
        (grid.fields.cards.value as Record<string, unknown>[])[0].link = link
      }
    }
    return m
  }

  it('fixture (link pusty) → brak błędu V15', () => {
    const model = loadFixture()
    const errs = validateHard(model).filter(v => v.rule === 'V15')
    expect(errs).toHaveLength(0)
  })

  it('https:// link → brak błędu V15', () => {
    const model = setGridCardLink(loadFixture(), 'https://kancelaria-przyklad.pl')
    const errs = validateHard(model).filter(v => v.rule === 'V15')
    expect(errs).toHaveLength(0)
  })

  it('http:// link → brak błędu V15', () => {
    const model = setGridCardLink(loadFixture(), 'http://kancelaria-przyklad.pl')
    const errs = validateHard(model).filter(v => v.rule === 'V15')
    expect(errs).toHaveLength(0)
  })

  // ── mutation-style security tests ────────────────────────────────────────
  // field musi być 'portfolio-grid.cards' (nie bracket-notation [i].link),
  // żeby FieldsForm.handleSubmit mógł go dopasować przez === prefix lub startsWith(prefix+'.').
  it('javascript: link → V15 error (XSS), field = portfolio-grid.cards', () => {
    const model = setGridCardLink(loadFixture(), 'javascript:alert(1)')
    const errs = validateHard(model).filter(v => v.rule === 'V15')
    expect(errs).toHaveLength(1)
    expect(errs[0].rule).toBe('V15')
    expect(errs[0].field).toBe('portfolio-grid.cards')
  })

  it('data: link → V15 error (XSS), field = portfolio-grid.cards', () => {
    const model = setGridCardLink(loadFixture(), 'data:text/html,<h1>xss</h1>')
    const errs = validateHard(model).filter(v => v.rule === 'V15')
    expect(errs).toHaveLength(1)
    expect(errs[0].field).toBe('portfolio-grid.cards')
  })

  it('protocol-relative // link → V15 error, field = portfolio-grid.cards', () => {
    const model = setGridCardLink(loadFixture(), '//evil.com')
    const errs = validateHard(model).filter(v => v.rule === 'V15')
    expect(errs).toHaveLength(1)
    expect(errs[0].field).toBe('portfolio-grid.cards')
  })

  it('vbscript: link → V15 error, field = portfolio-grid.cards', () => {
    const model = setGridCardLink(loadFixture(), 'vbscript:msgbox(1)')
    const errs = validateHard(model).filter(v => v.rule === 'V15')
    expect(errs).toHaveLength(1)
    expect(errs[0].field).toBe('portfolio-grid.cards')
  })
})

// ────────────────────────────────────────────────────────────────────────────
describe('V15 — portfolio (home) card link URL safety', () => {
  // V15 teraz obejmuje OBE sekcje: portfolio (home) i portfolio-grid (strona portfolio).
  // Test weryfikuje, że niepoprawny link w home portfolio też jest blokowany z właściwym
  // field = 'portfolio.cards' (exact match dla matchErrors('portfolio', 'cards')).
  function setHomeCardLink(model: SiteModel, link: string): SiteModel {
    const m = clone(model)
    for (const page of m.pages) {
      const portfolio = page.sections.find(s => s.id === 'portfolio')
      if (portfolio?.fields.cards && Array.isArray(portfolio.fields.cards.value)) {
        (portfolio.fields.cards.value as Record<string, unknown>[])[0].link = link
      }
    }
    return m
  }

  it('brak pola link w home portfolio → brak błędu V15', () => {
    // Fixture: karty portfolio na home nie mają pola link → undefined → falsy → skip
    const model = loadFixture()
    const errs = validateHard(model).filter(v => v.rule === 'V15')
    expect(errs).toHaveLength(0)
  })

  it('https:// link na home portfolio → brak błędu V15', () => {
    const model = setHomeCardLink(loadFixture(), 'https://kancelaria-wojtas.pl')
    const errs = validateHard(model).filter(v => v.rule === 'V15')
    expect(errs).toHaveLength(0)
  })

  it('javascript: link na home portfolio → V15, field = portfolio.cards', () => {
    const model = setHomeCardLink(loadFixture(), 'javascript:alert(1)')
    const errs = validateHard(model).filter(v => v.rule === 'V15')
    expect(errs).toHaveLength(1)
    expect(errs[0].rule).toBe('V15')
    expect(errs[0].field).toBe('portfolio.cards')
  })

  it('data: link na home portfolio → V15, field = portfolio.cards', () => {
    const model = setHomeCardLink(loadFixture(), 'data:text/html,<h1>xss</h1>')
    const errs = validateHard(model).filter(v => v.rule === 'V15')
    expect(errs).toHaveLength(1)
    expect(errs[0].field).toBe('portfolio.cards')
  })

  it('// link na home portfolio → V15, field = portfolio.cards', () => {
    const model = setHomeCardLink(loadFixture(), '//evil.com')
    const errs = validateHard(model).filter(v => v.rule === 'V15')
    expect(errs).toHaveLength(1)
    expect(errs[0].field).toBe('portfolio.cards')
  })
})
