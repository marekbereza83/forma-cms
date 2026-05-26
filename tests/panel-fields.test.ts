/**
 * Panel fields — server-side tests (node env, no DOM).
 * Tests 1, 5: pure functions, no DB.
 * Tests 2, 3: hit test.db via saveSite (same gateway as production).
 * Test 4: session guard — saveFields throws when auth() returns null.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import bcrypt from 'bcryptjs'

const ROOT = resolve(process.cwd())

// ── Mock auth BEFORE importing server actions ─────────────────────────────────
// auth() must return our test session for tests 2, 3; null for test 4.
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}))

import { auth } from '@/lib/auth'
import { prisma } from '../src/lib/db/prisma'
import { parseSiteModel } from '../src/lib/cms/schema'
import { getEditableFields, setFieldValue } from '../src/lib/cms/fields'
import { saveFields } from '../src/app/(panel)/edit/fields/actions'
import type { SiteModel, ProcessStep, PortfolioCard } from '../src/lib/cms/types'
import type { Session } from 'next-auth'

// ── Shared state ──────────────────────────────────────────────────────────────
let tenantId: string
let userId: string
let fixture: Record<string, unknown>

beforeAll(async () => {
  await prisma.editLog.deleteMany()
  await prisma.post.deleteMany()
  await prisma.event.deleteMany()
  await prisma.site.deleteMany()
  await prisma.user.deleteMany()
  await prisma.tenant.deleteMany()

  const tenant = await prisma.tenant.create({
    data: { name: 'Panel Test Tenant', slug: 'panel-test' },
  })
  tenantId = tenant.id

  const user = await prisma.user.create({
    data: {
      email: 'panel@test.pl',
      password: bcrypt.hashSync('haslo123', 10),
      tenantId,
    },
  })
  userId = user.id

  fixture = JSON.parse(readFileSync(resolve(ROOT, 'fixtures/forma-site.json'), 'utf-8'))

  // Seed site so getSite works in test 3
  const raw = { ...fixture, tenantId }
  await prisma.site.create({
    data: { tenantId, model: JSON.stringify(raw) },
  })

  // Default mock: valid session
  vi.mocked(auth).mockResolvedValue({
    user: { tenantId, userId, id: userId, email: 'panel@test.pl', role: 'admin' },
    expires: new Date(Date.now() + 86400_000).toISOString(),
  } as Session)
})

afterAll(async () => {
  await prisma.$disconnect()
})

// ────────────────────────────────────────────────────────────────────────────
describe('getEditableFields — tylko editable:true', () => {
  it('nav nie ma pól edytowalnych; portfolio ma lead i card (nie sectionLabel/headline); hero.headline i pricing.standard obecne', () => {
    const raw = { ...fixture, tenantId }
    const { model } = parseSiteModel(raw)
    const fields = getEditableFields(model)

    const fieldIds = fields.map(f => `${f.sectionId}.${f.fieldName}`)

    // nav — brak edytowalnych (forma sekcji)
    expect(fields.some(f => f.sectionId === 'nav')).toBe(false)

    // portfolio — treść edytowalna, forma zablokowana
    expect(fieldIds).toContain('portfolio.lead')
    expect(fieldIds).toContain('portfolio.cards')
    expect(fieldIds).not.toContain('portfolio.sectionLabel')
    expect(fieldIds).not.toContain('portfolio.headline')

    // pozostałe sekcje treściowe
    expect(fieldIds).toContain('hero.headline')
    expect(fieldIds).toContain('pricing.standard')
  })
})

// ────────────────────────────────────────────────────────────────────────────
describe('saveFields — V1 naruszenie', () => {
  it('amount = "zapytaj o wycenę" → success:false z rule V1, baza niezmieniona', async () => {
    const raw = JSON.parse(JSON.stringify({ ...fixture, tenantId }))
    raw.tenantId = tenantId

    const idx = raw.pages.find((p: { slug: string }) => p.slug === 'index')
    const pricing = idx.sections.find((s: { id: string }) => s.id === 'pricing')
    pricing.fields.standard.value.amount = 'zapytaj o wycenę'

    const siteBefore = await prisma.site.findUnique({ where: { tenantId } })

    const result = await saveFields(raw)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.errors.some(e => e.rule === 'V1')).toBe(true)
    }

    const siteAfter = await prisma.site.findUnique({ where: { tenantId } })
    expect(siteAfter!.version).toBe(siteBefore!.version)
  })
})

// ────────────────────────────────────────────────────────────────────────────
describe('saveFields — poprawny zapis', () => {
  it('hero.headline zmieniony → sukces, getSite zwraca nową wartość + wpis w EditLog', async () => {
    const raw = JSON.parse(JSON.stringify({ ...fixture, tenantId }))
    raw.tenantId = tenantId

    const idx = raw.pages.find((p: { slug: string }) => p.slug === 'index')
    const hero = idx.sections.find((s: { id: string }) => s.id === 'hero')
    hero.fields.headline.value = 'NOWY NAGŁÓWEK TESTOWY'

    const logCountBefore = await prisma.editLog.count({ where: { tenantId } })

    const result = await saveFields(raw)
    expect(result.success).toBe(true)

    const site = await prisma.site.findUnique({ where: { tenantId } })
    const model = JSON.parse(site!.model) as SiteModel
    const headline = model.pages
      .find(p => p.slug === 'index')!
      .sections.find(s => s.id === 'hero')!
      .fields['headline']!.value

    expect(headline).toBe('NOWY NAGŁÓWEK TESTOWY')

    const logCountAfter = await prisma.editLog.count({ where: { tenantId } })
    expect(logCountAfter).toBeGreaterThan(logCountBefore)
  })
})

// ────────────────────────────────────────────────────────────────────────────
describe('saveFields — session guard', () => {
  it('auth() = null → throws Unauthorized', async () => {
    vi.mocked(auth).mockResolvedValueOnce(null)
    await expect(saveFields({})).rejects.toThrow('Unauthorized')
  })
})

// ────────────────────────────────────────────────────────────────────────────
describe('setFieldValue — round-trip przez formularz', () => {
  it('edycja hero.headline nie gubi reszty modelu (process.num, nav, portfolio, nbsp)', () => {
    const raw = { ...fixture, tenantId }
    const { model: original } = parseSiteModel(raw)

    const edited = setFieldValue(original, 'index', 'hero', 'headline', 'NOWY NAGŁÓWEK')

    // Zmienione tylko headline
    const editedHero = edited.pages.find(p => p.slug === 'index')!
      .sections.find(s => s.id === 'hero')!
    expect(editedHero.fields['headline']!.value).toBe('NOWY NAGŁÓWEK')

    // Oryginał i edytowany różnią się tylko w tym polu
    const origHero = original.pages.find(p => p.slug === 'index')!
      .sections.find(s => s.id === 'hero')!
    expect(origHero.fields['headline']!.value).not.toBe('NOWY NAGŁÓWEK')

    // process.steps[].num (zablokowane) — bez zmian
    const processSection = edited.pages.find(p => p.slug === 'index')!
      .sections.find(s => s.id === 'process')!
    const origProcess = original.pages.find(p => p.slug === 'index')!
      .sections.find(s => s.id === 'process')!
    const steps = processSection.fields['steps']!.value as ProcessStep[]
    const origSteps = origProcess.fields['steps']!.value as ProcessStep[]
    steps.forEach((step, i) => {
      expect(step.num).toBe(origSteps[i].num)
      expect(step.title).toBe(origSteps[i].title)
    })

    // nav i portfolio obecne
    const editedIdx = edited.pages.find(p => p.slug === 'index')!
    expect(editedIdx.sections.find(s => s.id === 'nav')).toBeDefined()
    expect(editedIdx.sections.find(s => s.id === 'portfolio')).toBeDefined()

    // pricing.standard.amount używa ASCII space U+0020
    const pricingSection = editedIdx.sections.find(s => s.id === 'pricing')!
    const amount = (pricingSection.fields['standard']!.value as { amount: string }).amount
    expect([...amount].every(c => c.codePointAt(0) !== 0x00A0)).toBe(true)

    // cta-finale.lead ma 2 × U+00A0 — niezmienione
    const ctaSection = editedIdx.sections.find(s => s.id === 'cta-finale')!
    const lead = ctaSection.fields['lead']!.value as string
    const nbspCount = [...lead].filter(c => c.codePointAt(0) === 0x00A0).length
    expect(nbspCount).toBe(2)

    // Reszta struktury: deep equal (porównaj cały model bez zmienionego pola)
    const withoutHero = (m: SiteModel) => ({
      ...m,
      pages: m.pages.map(p =>
        p.slug !== 'index' ? p : {
          ...p,
          sections: p.sections.map(s =>
            s.id !== 'hero' ? s : {
              ...s,
              fields: Object.fromEntries(
                Object.entries(s.fields).filter(([k]) => k !== 'headline')
              ),
            }
          ),
        }
      ),
    })

    expect(withoutHero(edited)).toEqual(withoutHero(original))
  })
})

// ────────────────────────────────────────────────────────────────────────────
describe('error key format — end-to-end path od formularza do UI', () => {
  it('V1: klucz błędu pasuje do formatu matchErrors(sectionId, fieldName) w FieldsForm', async () => {
    // Symulacja: użytkownik wpisuje "zapytaj o wycenę" w pole Kwota pakietu standard.
    // FieldsForm robi: setFieldValue(model, 'index', 'pricing', 'standard', { ...pkg, amount: 'zapytaj...' })
    const raw = JSON.parse(JSON.stringify({ ...fixture, tenantId }))
    raw.tenantId = tenantId
    const { model: base } = parseSiteModel(raw)

    const pricingSection = base.pages.find(p => p.slug === 'index')!
      .sections.find(s => s.id === 'pricing')!
    const originalPkg = pricingSection.fields['standard']!.value as { amount: string; features: string[]; deliveryNote: string; label: string; ariaLabel: string; ctaLabel: string; ctaMicrocopy: string }

    const editedModel = setFieldValue(base, 'index', 'pricing', 'standard', {
      ...originalPkg,
      amount: 'zapytaj o wycenę',
    })

    // (a) saveFields zwraca success:false z V1
    const result = await saveFields(editedModel)
    expect(result.success).toBe(false)
    if (!result.success) {
      const v1 = result.errors.find(e => e.rule === 'V1')
      expect(v1).toBeDefined()

      // (b) Klucz błędu pasuje do formatu matchErrors('pricing', 'standard'):
      //     field === "pricing.standard" LUB field.startsWith("pricing.standard.")
      //     V1 generuje "pricing.standard.amount" → musi pasować do lookup dla pola 'standard'.
      const sectionId = 'pricing'
      const fieldName = 'standard'
      const prefix = `${sectionId}.${fieldName}`

      const matched = v1!.field === prefix || v1!.field.startsWith(prefix + '.')
      expect(matched).toBe(true)

      // Sprawdź też konkretny sub-klucz: "amount" → trafi do PriceEditor.errors['amount']
      expect(v1!.field).toBe('pricing.standard.amount')
      const subKey = v1!.field.slice(prefix.length + 1) // "amount"
      expect(subKey).toBe('amount')
    }
  })

  it('V12: błąd emoji w hero.headline ma klucz pasujący do matchErrors("hero", "headline")', async () => {
    const raw = JSON.parse(JSON.stringify({ ...fixture, tenantId }))
    raw.tenantId = tenantId
    const { model: base } = parseSiteModel(raw)

    const editedModel = setFieldValue(base, 'index', 'hero', 'headline', 'Kancelaria 🎯')

    const result = await saveFields(editedModel)
    expect(result.success).toBe(false)
    if (!result.success) {
      const v12 = result.errors.find(e => e.rule === 'V12')
      expect(v12).toBeDefined()

      // hero.headline → exact match dla matchErrors('hero', 'headline')
      expect(v12!.field).toBe('hero.headline')
      const prefix = 'hero.headline'
      const matched = v12!.field === prefix || v12!.field.startsWith(prefix + '.')
      expect(matched).toBe(true)
    }
  })
})

// ────────────────────────────────────────────────────────────────────────────
describe('error key format — V15: klucz błędu V15 pasuje do matchErrors("portfolio-grid", "cards")', () => {
  // Regresja: poprzednio V15 używał pola 'portfolio-grid.cards[i].link' (bracket-notation).
  // handleSubmit sprawdzał v.field.startsWith('portfolio-grid.cards.') — kropka, nie nawias.
  // 'portfolio-grid.cards[0].link'.startsWith('portfolio-grid.cards.') === false →
  // błąd szedł do unmatched, nie był widoczny przy polu kart, a zapis był blokowany cicho.
  // Po naprawie: field = 'portfolio-grid.cards' → exact match → pokazuje się jako rowError.
  it('V15: invalid link → success:false, field === "portfolio-grid.cards" (exact match dla matchErrors)', async () => {
    const raw = JSON.parse(JSON.stringify({ ...fixture, tenantId }))
    raw.tenantId = tenantId
    const { model: base } = parseSiteModel(raw)

    // Mutuj: wstaw niepoprawny link (bez https://) w karcie portfolio-grid
    const portfolioPage = base.pages.find(p => p.slug === 'portfolio')
    const gridSection = portfolioPage?.sections.find(s => s.id === 'portfolio-grid')
    if (gridSection?.fields['cards'] && Array.isArray(gridSection.fields['cards'].value)) {
      const cards = gridSection.fields['cards'].value as PortfolioCard[]
      gridSection.fields['cards'].value = [{ ...cards[0], link: 'javascript:alert(1)' }]
    }

    const result = await saveFields(base)
    expect(result.success).toBe(false)

    if (!result.success) {
      const v15 = result.errors.find(e => e.rule === 'V15')
      expect(v15).toBeDefined()

      // Klucz błędu musi pasować do lookup w handleSubmit dla pola ('portfolio-grid', 'cards'):
      //   v.field === prefix  →  'portfolio-grid.cards' === 'portfolio-grid.cards'  ← exact ✓
      //   v.field.startsWith(prefix + '.')  ← alternatywnie dla subpól
      const sectionId = 'portfolio-grid'
      const fieldName = 'cards'
      const prefix = `${sectionId}.${fieldName}`
      const matched = v15!.field === prefix || v15!.field.startsWith(prefix + '.')
      expect(matched).toBe(true)

      // Konkretnie: exact match (nie subfield) — błąd wyświetla się jako rowError pod kartami
      expect(v15!.field).toBe('portfolio-grid.cards')
    }
  })

  it('V15 home portfolio: invalid link → success:false, field === "portfolio.cards" (exact match)', async () => {
    const raw = JSON.parse(JSON.stringify({ ...fixture, tenantId }))
    raw.tenantId = tenantId
    const { model: base } = parseSiteModel(raw)

    // Mutuj: wstaw niepoprawny link w karcie portfolio (home)
    const indexPage = base.pages.find(p => p.slug === 'index')
    const portfolioSection = indexPage?.sections.find(s => s.id === 'portfolio')
    if (portfolioSection?.fields['cards'] && Array.isArray(portfolioSection.fields['cards'].value)) {
      const cards = portfolioSection.fields['cards'].value as PortfolioCard[]
      portfolioSection.fields['cards'].value = [{ ...cards[0], link: 'data:text/html,xss' }]
    }

    const result = await saveFields(base)
    expect(result.success).toBe(false)

    if (!result.success) {
      const v15 = result.errors.find(e => e.rule === 'V15')
      expect(v15).toBeDefined()

      // Klucz musi pasować do lookup ('portfolio', 'cards'):
      const prefix = 'portfolio.cards'
      const matched = v15!.field === prefix || v15!.field.startsWith(prefix + '.')
      expect(matched).toBe(true)
      expect(v15!.field).toBe('portfolio.cards')
    }
  })
})
