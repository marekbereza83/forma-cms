/**
 * Round-trip integrity: SiteModel -> saveSite (DB) -> getSite -> SiteModel.
 *
 * SERIALIZACJA NA DEV vs PROD:
 * - Dev (SQLite, String): saveSite robi JSON.stringify(model), getSite robi JSON.parse(row.model).
 *   Cala serializacja przechodzi przez nasz kod -- zachowanie deterministic.
 * - Prod (Postgres, Json): po zmianie pola model na Json Prisma auto-serializuje do JSONB i
 *   auto-deserializuje na JS object. Wtedy w saveSite NIE dawaj JSON.stringify (Prisma chce obiekt),
 *   a w getSite NIE dawaj JSON.parse (row.model jest juz obiektem). Usun te dwie linie i przetestuj.
 * - Bezpieczniejsza opcja na Postgres: zostaw pole model jako String (tak jak na SQLite) --
 *   tracisz JSONB indexing, ale serializacja jest identyczna jak na dev, bez zadnych niespodzianek.
 *   Dla tego CMS (nigdy nie robimy zapytan wewnatrz JSON kolumny) to poprawna decyzja.
 *
 * Ten test musi przejsc na kazdym srodowisku przed migracja schemat -> Json.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import bcrypt from 'bcryptjs'
import { JSDOM } from 'jsdom'
import { prisma } from '../src/lib/db/prisma'
import { getTenantScopedClient, type TenantSession } from '../src/lib/tenant/client'
import { saveSite } from '../src/lib/cms/persistence'
import { parseSiteModel } from '../src/lib/cms/schema'
import { renderPage } from '../src/lib/cms/renderer/index'
import type { PostItem } from '../src/lib/cms/types'

const ROOT = resolve(process.cwd())

// ── Shared state ─────────────────────────────────────────────────────────────
let session: TenantSession

beforeAll(async () => {
  await prisma.editLog.deleteMany()
  await prisma.post.deleteMany()
  await prisma.event.deleteMany()
  await prisma.site.deleteMany()
  await prisma.user.deleteMany()
  await prisma.tenant.deleteMany()

  const tenant = await prisma.tenant.create({
    data: { name: 'Roundtrip Test Tenant', slug: 'roundtrip-test' },
  })
  const user = await prisma.user.create({
    data: {
      email: 'rt@test.pl',
      password: bcrypt.hashSync('haslo123', 10),
      tenantId: tenant.id,
    },
  })
  session = { tenantId: tenant.id, userId: user.id }
})

afterAll(async () => {
  await prisma.$disconnect()
})

// ── DOM-diff helpers (same logic as renderer.test.ts -- no shared import) ────

function normalizeText(text: string): string {
  return text.replace(/[ \t\r\n]+/g, ' ').trim()
}

function diffNodes(ref: Node, ren: Node, path: string): string | null {
  if (ref.nodeType !== ren.nodeType)
    return `${path}: nodeType ref=${ref.nodeType} ren=${ren.nodeType}`

  if (ref.nodeType === 3) {
    const refT = normalizeText(ref.textContent ?? '')
    const renT = normalizeText(ren.textContent ?? '')
    if (refT === '' && renT === '') return null
    if (refT !== renT)
      return `${path} [text]:\n  expected: "${refT}"\n  got:      "${renT}"`
    return null
  }

  if (ref.nodeType === 1) {
    const refEl = ref as Element
    const renEl = ren as Element

    if (refEl.tagName !== renEl.tagName)
      return `${path}: tagName ref=${refEl.tagName} ren=${renEl.tagName}`

    const refAttrs = Array.from(refEl.attributes).map(a => `${a.name}=${a.value}`).sort().join('|')
    const renAttrs = Array.from(renEl.attributes).map(a => `${a.name}=${a.value}`).sort().join('|')
    if (refAttrs !== renAttrs)
      return `${path} <${refEl.tagName.toLowerCase()}>: attrs\n  expected: ${refAttrs}\n  got:      ${renAttrs}`

    function significant(node: Element): Node[] {
      return Array.from(node.childNodes).filter(n => {
        if (n.nodeType === 8) return false
        if (n.nodeType === 3 && normalizeText(n.textContent ?? '') === '') return false
        return true
      })
    }

    const refCh = significant(refEl)
    const renCh = significant(renEl)
    if (refCh.length !== renCh.length)
      return `${path} <${refEl.tagName.toLowerCase()}>: childCount ref=${refCh.length} ren=${renCh.length}`

    for (let i = 0; i < refCh.length; i++) {
      const d = diffNodes(refCh[i], renCh[i], `${path} > child[${i}]`)
      if (d) return d
    }
  }
  return null
}

function domDiff(htmlA: string, htmlB: string): string | null {
  const bodyA = new JSDOM(htmlA).window.document.body
  const bodyB = new JSDOM(htmlB).window.document.body
  return diffNodes(bodyA, bodyB, 'body')
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('DB round-trip integrity', () => {
  it('deep equal: model zapisany i odczytany jest identyczny z oryginalem', async () => {
    const raw = JSON.parse(
      readFileSync(resolve(ROOT, 'fixtures/forma-site.json'), 'utf-8'),
    )
    raw.tenantId = session.tenantId

    const { model: originalModel } = parseSiteModel(raw)

    await saveSite(session, raw)

    const db = getTenantScopedClient(session)
    const row = await db.getSite()
    expect(row).not.toBeNull()

    const roundTripped = row!.model
    expect(roundTripped).toEqual(originalModel)
  })

  it('U+00A0 (nbsp) w cta-finale.lead przetrwal round-trip', async () => {
    // U+00A0 jest w "Od 4 500 zl netto" w cta-finale.lead (nie w pricing.amount).
    // pricing.amount uzywa zwyklej spacji ASCII U+0020.
    // Porownujemy z wartoscia czytana BEZPOSREDNIO z fixture -- unikamy hardcodowania
    // stringa z U+00A0 w kodzie testu (gdzie edytor moze go zastapic ASCII space).
    const fixtureRaw = JSON.parse(readFileSync(resolve(ROOT, 'fixtures/forma-site.json'), 'utf-8'))
    const expectedLead = fixtureRaw.pages
      .find((p: { slug: string }) => p.slug === 'index')
      .sections.find((s: { id: string }) => s.id === 'cta-finale')
      .fields.lead.value as string

    const db = getTenantScopedClient(session)
    const row = await db.getSite()
    const idxPage = row!.model.pages.find(p => p.slug === 'index')!
    const ctaSection = idxPage.sections.find(s => s.id === 'cta-finale')!
    const lead = ctaSection.fields['lead']?.value as string

    const nbspCount = [...lead].filter(c => c.codePointAt(0) === 0x00A0).length
    expect(nbspCount).toBe(2) // dwa U+00A0 przezyly round-trip
    expect(lead).toBe(expectedLead) // bajt-w-bajt rowny z fixture (w tym U+00A0)
  })

  it('pauza U+2014 w tekscie przetrwala round-trip', async () => {
    const db = getTenantScopedClient(session)
    const row = await db.getSite()

    const serialized = JSON.stringify(row!.model)
    expect(serialized).toContain('—') // em dash musi przezye stringify->parse
  })

  it('zagniezdzenie (steps, features) zachowane bez utraty elementow', async () => {
    const raw = JSON.parse(readFileSync(resolve(ROOT, 'fixtures/forma-site.json'), 'utf-8'))
    raw.tenantId = session.tenantId
    const { model: originalModel } = parseSiteModel(raw)

    const db = getTenantScopedClient(session)
    const row = await db.getSite()

    const idxPage = row!.model.pages.find(p => p.slug === 'index')!
    const processSection = idxPage.sections.find(s => s.id === 'process')
    const origProcess = originalModel.pages.find(p => p.slug === 'index')!
      .sections.find(s => s.id === 'process')

    if (processSection && origProcess) {
      const steps = processSection.fields['steps']?.value
      const origSteps = origProcess.fields['steps']?.value
      expect(Array.isArray(steps)).toBe(true)
      expect((steps as unknown[]).length).toBe((origSteps as unknown[]).length)
      expect(steps).toEqual(origSteps)
    }

    const pricingSection = idxPage.sections.find(s => s.id === 'pricing')!
    const origPricing = originalModel.pages.find(p => p.slug === 'index')!
      .sections.find(s => s.id === 'pricing')!

    const stdFeatures = (pricingSection.fields['standard']?.value as { features: unknown[] }).features
    const origFeatures = (origPricing.fields['standard']?.value as { features: unknown[] }).features
    expect(stdFeatures.length).toBe(origFeatures.length)
    expect(stdFeatures).toEqual(origFeatures)
  })

  it('renderer: HTML z modelu po round-tripie jest DOM-identyczny z HTML z oryginalnego modelu', async () => {
    const raw = JSON.parse(readFileSync(resolve(ROOT, 'fixtures/forma-site.json'), 'utf-8'))
    raw.tenantId = session.tenantId

    const { model: originalModel } = parseSiteModel(raw)
    const htmlOriginal = renderPage(originalModel, 'index')

    const db = getTenantScopedClient(session)
    const row = await db.getSite()
    const htmlRoundTripped = renderPage(row!.model, 'index')

    const diff = domDiff(htmlOriginal, htmlRoundTripped)
    expect(diff).toBeNull()
  })

  // INVARIANT #5 — sanitizePostBody musi zadzialac w saveSite, a nie dopiero w kodzie panelu.
  // Ten test celowo omija warstwe panelu i wola saveSite bezposrednio: gdyby ktos przeniosl
  // sanitizacje do akcji serwerowej, ten test zlapie regresje.
  it('saveSite czyści treść publikacji z niebezpiecznego HTML przed zapisem do DB', async () => {
    const raw = JSON.parse(readFileSync(resolve(ROOT, 'fixtures/forma-site.json'), 'utf-8'))
    raw.tenantId = session.tenantId
    raw.collections.posts = [{
      id: 'xss-1',
      slug: 'test-sanityzacji',
      title: 'Test sanityzacji',
      publishedAt: '2026-07-26',
      body: '<p>Bezpieczny akapit</p><script>alert(1)</script><img src=x onerror=alert(2)><a href="javascript:alert(3)">klik</a>',
      status: 'published',
    }]

    await saveSite(session, raw)

    const db = getTenantScopedClient(session)
    const row = await db.getSite()
    const saved = row!.model.collections.posts[0]

    // Tresc merytoryczna zachowana
    expect(saved.body).toContain('Bezpieczny akapit')
    expect(saved.body).toContain('klik')
    // Wektory ataku usuniete JUZ NA POZIOMIE ZAPISU
    expect(saved.body).not.toContain('<script')
    expect(saved.body).not.toContain('onerror')
    expect(saved.body).not.toContain('javascript:')
  })

  // Plan publikacje, krok 7: previousSlugs zasila _redirects.json / 301 w Workerze.
  it('saveSite dopisuje stary slug do previousSlugs gdy klient zmienia adres posta', async () => {
    const raw = JSON.parse(readFileSync(resolve(ROOT, 'fixtures/forma-site.json'), 'utf-8'))
    raw.tenantId = session.tenantId
    raw.collections.posts = [{
      id: 'redirect-1',
      slug: 'stary-adres',
      title: 'Test przekierowania',
      publishedAt: '2026-07-01',
      body: '<p>Tresc</p>',
      status: 'published',
    }]
    await saveSite(session, raw)

    raw.collections.posts = [{
      id: 'redirect-1',
      slug: 'nowy-adres',
      title: 'Test przekierowania',
      publishedAt: '2026-07-01',
      body: '<p>Tresc</p>',
      status: 'published',
    }]
    const { model } = await saveSite(session, raw)
    const post = model.collections.posts.find(p => p.id === 'redirect-1')!
    expect(post.slug).toBe('nowy-adres')
    expect(post.previousSlugs).toEqual(['stary-adres'])
  })

  it('kolejny zapis bez zmiany sluga nie gubi previousSlugs (klient wysyla pelny obiekt posta)', async () => {
    const db = getTenantScopedClient(session)
    const site = await db.getSite()
    const raw = JSON.parse(JSON.stringify(site!.model))

    await saveSite(session, raw)

    const site2 = await db.getSite()
    const post2 = site2!.model.collections.posts.find(p => p.id === 'redirect-1')!
    expect(post2.previousSlugs).toEqual(['stary-adres'])
  })

  it('druga zmiana sluga dopisuje kolejny wpis do previousSlugs, bez duplikatow', async () => {
    const db = getTenantScopedClient(session)
    const site = await db.getSite()
    const raw = JSON.parse(JSON.stringify(site!.model))
    raw.collections.posts = raw.collections.posts.map((p: PostItem) =>
      p.id === 'redirect-1' ? { ...p, slug: 'najnowszy-adres' } : p
    )

    const { model } = await saveSite(session, raw)
    const post = model.collections.posts.find(p => p.id === 'redirect-1')!
    expect(post.slug).toBe('najnowszy-adres')
    expect(post.previousSlugs).toEqual(['stary-adres', 'nowy-adres'])
  })

  it('nowy post (bez odpowiednika w DB) nie dostaje previousSlugs', async () => {
    const db = getTenantScopedClient(session)
    const site = await db.getSite()
    const raw = JSON.parse(JSON.stringify(site!.model))
    raw.collections.posts.push({
      id: 'brand-new-post',
      slug: 'nowy-post',
      title: 'Nowy post',
      publishedAt: '2026-07-27',
      body: '<p>Tresc</p>',
      status: 'draft',
    })

    const { model } = await saveSite(session, raw)
    const post = model.collections.posts.find(p => p.id === 'brand-new-post')!
    expect(post.previousSlugs).toBeUndefined()
  })
})
