import { describe, it, expect, beforeAll } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { JSDOM } from 'jsdom'
import { parseSiteModel } from '../src/lib/cms/schema'
import { renderPage } from '../src/lib/cms/renderer/index'
import { renderEventItem } from '../src/lib/cms/renderer/collections'
import { renderPostsListPage, renderPostPage } from '../src/lib/cms/renderer/publikacje'
import { buildStaticSiteFiles } from '../src/lib/cms/export'
import type { EventItem, PostItem, SiteModel } from '../src/lib/cms/types'

const ROOT = resolve(process.cwd())

// Normalizuje TEXT NODE: collapse ASCII whitespace only, preserve U+00A0 (nbsp)
function normalizeText(text: string): string {
  return text.replace(/[ \t\r\n]+/g, ' ').trim()
}

// XPath-style path for error messages
function nodePath(node: Node): string {
  const parts: string[] = []
  let cur: Node | null = node
  while (cur && cur.nodeType !== 9) {
    if (cur.nodeType === 1) {
      const el = cur as Element
      const siblings = Array.from(cur.parentNode?.childNodes ?? [])
        .filter(n => n.nodeType === 1 && (n as Element).tagName === el.tagName)
      const idx = siblings.indexOf(cur as ChildNode)
      parts.unshift(`${el.tagName.toLowerCase()}[${idx}]`)
    }
    cur = cur.parentNode
  }
  return parts.join(' > ')
}

function diffNodes(ref: Node, ren: Node, path: string): string | null {
  if (ref.nodeType !== ren.nodeType)
    return `${path}: nodeType ref=${ref.nodeType} ren=${ren.nodeType}`

  // Text node: normalize and compare, preserve U+00A0
  if (ref.nodeType === 3) {
    const refT = normalizeText(ref.textContent ?? '')
    const renT = normalizeText(ren.textContent ?? '')
    if (refT === '' && renT === '') return null
    if (refT !== renT)
      return `${path} [text]:\n  expected: "${refT}"\n  got:      "${renT}"`
    return null
  }

  // Element node
  if (ref.nodeType === 1) {
    const refEl = ref as Element
    const renEl = ren as Element

    if (refEl.tagName !== renEl.tagName)
      return `${path}: tagName ref=${refEl.tagName} ren=${renEl.tagName}`

    // Compare sorted attributes
    const refAttrs = Array.from(refEl.attributes)
      .map(a => `${a.name}=${a.value}`).sort().join('|')
    const renAttrs = Array.from(renEl.attributes)
      .map(a => `${a.name}=${a.value}`).sort().join('|')
    if (refAttrs !== renAttrs)
      return `${path} <${refEl.tagName.toLowerCase()}>: attrs\n  expected: ${refAttrs}\n  got:      ${renAttrs}`

    // Filter whitespace-only text nodes AND comment nodes from children
    function significantChildren(node: Element): Node[] {
      return Array.from(node.childNodes).filter(n => {
        if (n.nodeType === 8) return false // comment
        if (n.nodeType === 3 && normalizeText(n.textContent ?? '') === '') return false
        return true
      })
    }

    const refChildren = significantChildren(refEl)
    const renChildren = significantChildren(renEl)

    if (refChildren.length !== renChildren.length)
      return `${path} <${refEl.tagName.toLowerCase()}>: childCount ref=${refChildren.length} ren=${renChildren.length}\n  ref children: ${refChildren.map(n => n.nodeType === 1 ? (n as Element).tagName : `"${normalizeText(n.textContent ?? '')}"`).join(', ')}\n  ren children: ${renChildren.map(n => n.nodeType === 1 ? (n as Element).tagName : `"${normalizeText(n.textContent ?? '')}"`).join(', ')}`

    for (let i = 0; i < refChildren.length; i++) {
      const childPath = `${path} > ${nodePath(refChildren[i]) || `child[${i}]`}`
      const diff = diffNodes(refChildren[i], renChildren[i], childPath)
      if (diff) return diff
    }
  }

  return null
}

// Chars present in fixture that are outside strict ASCII+Polish whitelist.
// Allowed by whitelist (so existing content passes), but their per-field counts
// are tracked by the baseline test — any increase signals likely AI injection.
// U+2014 em dash, U+2022 bullet, U+2265 >=, U+00A9 copyright
const CONDITIONAL_CHARS = ['—', '•', '≥', '©'] as const

describe('Fixture integrity', () => {
  it('forma-site.json values contain only whitelisted characters', () => {
    const raw = readFileSync(resolve(ROOT, 'fixtures/forma-site.json'), 'utf-8')
    // NOTE: validates raw file bytes (line-by-line). At KROK 5 (client content)
    // narrow to parsed JSON string values so JSON key names don't interfere.
    const polishChars = new Set('ąćęłńóśźżĄĆĘŁŃÓŚŹŻ')
    // CONDITIONAL_CHARS pass whitelist but are tracked per-field by baseline test below.
    // Banned: U+201C/D/E typographic quotes, U+2019 apostrophe, U+2013 en dash, U+2026 ellipsis.
    const conditionalSet = new Set(CONDITIONAL_CHARS)
    const violations: string[] = []

    raw.split(/\r?\n/).forEach((line, i) => {
      for (const char of line) {
        const cp = char.codePointAt(0)!
        const ok =
          (cp >= 0x0020 && cp <= 0x007E) || // printable ASCII
          polishChars.has(char) ||            // Polish diacritics
          cp === 0x00A0 ||                    // nbsp -- intentional in "4 500 zl"
          conditionalSet.has(char)            // tracked by baseline, not unconditionally OK
        if (!ok)
          violations.push(
            `  line ${i + 1}: '${char}' U+${cp.toString(16).toUpperCase().padStart(4, '0')} -- ${line.trim()}`
          )
      }
    })

    if (violations.length > 0)
      throw new Error(
        `Fixture zawiera niedozwolone znaki -- sprawdz wartosci i uruchom scripts/fix-fixture-quotes.js:\n${violations.join('\n')}`
      )
  })

  it('forma-site.json conditional char counts do not exceed baseline', () => {
    const fixturePath = resolve(ROOT, 'fixtures/forma-site.json')
    const baselinePath = resolve(ROOT, 'fixtures/forma-site.baseline.json')
    const fixture = JSON.parse(readFileSync(fixturePath, 'utf-8'))
    const baseline = JSON.parse(readFileSync(baselinePath, 'utf-8')) as Record<string, Record<string, number>>
    const violations: string[] = []

    for (const page of fixture.pages) {
      for (const section of page.sections) {
        for (const [fieldName, field] of Object.entries(section.fields) as [string, { value: unknown }][]) {
          const key = `${section.id}.${fieldName}`
          const serialized = JSON.stringify(field.value)
          const baselineCounts: Record<string, number> = baseline[key] ?? {}

          for (const char of CONDITIONAL_CHARS) {
            let current = 0
            for (const c of serialized) if (c === char) current++
            const base = baselineCounts[char] ?? 0
            if (current > base) {
              const cp = char.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0')
              violations.push(
                `  ${key}: '${char}' U+${cp}: baseline=${base}, current=${current} -- wzrost o ${current - base}`
              )
            }
          }
        }
      }
    }

    if (violations.length > 0)
      throw new Error(
        `Baseline: licznik znaku warunkowo legalnego wzrosl -- prawdopodobne wstrzykniecie typograficzne:\n${violations.join('\n')}\n\nJesli zmiana jest intencjonalna: node scripts/update-baseline.js`
      )
  })
})

describe('Renderer', () => {
  it('rendered DOM matches reference index.html', () => {
    const referenceHtml = readFileSync(
      resolve(ROOT, 'reference/forma-production/index.html'),
      'utf-8'
    )
    const fixtureJson = JSON.parse(
      readFileSync(resolve(ROOT, 'fixtures/forma-site.json'), 'utf-8')
    )
    const { model } = parseSiteModel(fixtureJson)
    const rendered = renderPage(model, 'index')

    const refDoc = new JSDOM(referenceHtml).window.document
    const renDoc = new JSDOM(rendered).window.document

    const diff = diffNodes(refDoc.documentElement, renDoc.documentElement, 'html')
    expect(diff).toBeNull()
  })

  it('has required section IDs', () => {
    const fixtureJson = JSON.parse(
      readFileSync(resolve(ROOT, 'fixtures/forma-site.json'), 'utf-8')
    )
    const { model } = parseSiteModel(fixtureJson)
    const rendered = renderPage(model, 'index')
    const doc = new JSDOM(rendered).window.document

    expect(doc.querySelector('#hero')).not.toBeNull()
    expect(doc.querySelector('#problem')).not.toBeNull()
    expect(doc.querySelector('#solution')).not.toBeNull()
    expect(doc.querySelector('#process')).not.toBeNull()
    expect(doc.querySelector('#pricing')).not.toBeNull()
    expect(doc.querySelector('#cta-finale')).not.toBeNull()
  })

  it('pricing card amounts match fixture (4 500 / 6 500)', () => {
    const fixtureJson = JSON.parse(
      readFileSync(resolve(ROOT, 'fixtures/forma-site.json'), 'utf-8')
    )
    const { model } = parseSiteModel(fixtureJson)
    const rendered = renderPage(model, 'index')
    const doc = new JSDOM(rendered).window.document

    const pricePrices = Array.from(doc.querySelectorAll('.pricing-price'))
    expect(pricePrices).toHaveLength(2)
    expect(pricePrices[0].textContent?.trim()).toBe('4 500')
    expect(pricePrices[1].textContent?.trim()).toBe('6 500')
  })

  it('hero headline matches fixture', () => {
    const fixtureJson = JSON.parse(
      readFileSync(resolve(ROOT, 'fixtures/forma-site.json'), 'utf-8')
    )
    const { model } = parseSiteModel(fixtureJson)
    const rendered = renderPage(model, 'index')
    const doc = new JSDOM(rendered).window.document

    const h1 = doc.querySelector('h1.f-display')
    expect(h1?.textContent?.trim()).toBe('Strony internetowe dla kancelarii prawnych')
  })

  it('links all three CSS files', () => {
    const fixtureJson = JSON.parse(
      readFileSync(resolve(ROOT, 'fixtures/forma-site.json'), 'utf-8')
    )
    const { model } = parseSiteModel(fixtureJson)
    const rendered = renderPage(model, 'index')
    const doc = new JSDOM(rendered).window.document

    const hrefs = Array.from(doc.querySelectorAll('link[rel="stylesheet"]'))
      .map(l => l.getAttribute('href') ?? '')
    expect(hrefs).toContain('assets/css/design-system-agency.css')
    expect(hrefs).toContain('assets/css/forma-layout.css')
    expect(hrefs).toContain('assets/css/forma-components.css')
  })

  it('has featured pricing card', () => {
    const fixtureJson = JSON.parse(
      readFileSync(resolve(ROOT, 'fixtures/forma-site.json'), 'utf-8')
    )
    const { model } = parseSiteModel(fixtureJson)
    const rendered = renderPage(model, 'index')
    const doc = new JSDOM(rendered).window.document

    expect(doc.querySelector('.pricing-card.featured')).not.toBeNull()
  })

  it('process numerals are 01 through 05', () => {
    const fixtureJson = JSON.parse(
      readFileSync(resolve(ROOT, 'fixtures/forma-site.json'), 'utf-8')
    )
    const { model } = parseSiteModel(fixtureJson)
    const rendered = renderPage(model, 'index')
    const doc = new JSDOM(rendered).window.document

    const numerals = Array.from(doc.querySelectorAll('.process-step-num'))
      .map(el => el.textContent?.trim())
    expect(numerals).toEqual(['01', '02', '03', '04', '05'])
  })

  it('rendered DOM matches reference kontakt.html', () => {
    const referenceHtml = readFileSync(
      resolve(ROOT, 'reference/forma-production/kontakt.html'),
      'utf-8'
    )
    const fixtureJson = JSON.parse(
      readFileSync(resolve(ROOT, 'fixtures/forma-site.json'), 'utf-8')
    )
    const { model } = parseSiteModel(fixtureJson)
    const rendered = renderPage(model, 'kontakt')

    const refDoc = new JSDOM(referenceHtml).window.document
    const renDoc = new JSDOM(rendered).window.document

    const diff = diffNodes(refDoc.documentElement, renDoc.documentElement, 'html')
    expect(diff).toBeNull()
  })

  it('rendered DOM matches reference legal-notice.html', () => {
    const referenceHtml = readFileSync(
      resolve(ROOT, 'reference/forma-production/legal-notice.html'),
      'utf-8'
    )
    const fixtureJson = JSON.parse(
      readFileSync(resolve(ROOT, 'fixtures/forma-site.json'), 'utf-8')
    )
    const { model } = parseSiteModel(fixtureJson)
    const rendered = renderPage(model, 'legal-notice')

    const refDoc = new JSDOM(referenceHtml).window.document
    const renDoc = new JSDOM(rendered).window.document

    const diff = diffNodes(refDoc.documentElement, renDoc.documentElement, 'html')
    expect(diff).toBeNull()
  })

  it('rendered DOM matches reference privacy-policy.html', () => {
    const referenceHtml = readFileSync(
      resolve(ROOT, 'reference/forma-production/privacy-policy.html'),
      'utf-8'
    )
    const fixtureJson = JSON.parse(
      readFileSync(resolve(ROOT, 'fixtures/forma-site.json'), 'utf-8')
    )
    const { model } = parseSiteModel(fixtureJson)
    const rendered = renderPage(model, 'privacy-policy')

    const refDoc = new JSDOM(referenceHtml).window.document
    const renDoc = new JSDOM(rendered).window.document

    const diff = diffNodes(refDoc.documentElement, renDoc.documentElement, 'html')
    expect(diff).toBeNull()
  })

  it('rendered DOM matches reference 404.html', () => {
    const referenceHtml = readFileSync(
      resolve(ROOT, 'reference/forma-production/404.html'),
      'utf-8'
    )
    const fixtureJson = JSON.parse(
      readFileSync(resolve(ROOT, 'fixtures/forma-site.json'), 'utf-8')
    )
    const { model } = parseSiteModel(fixtureJson)
    const rendered = renderPage(model, '404')

    const refDoc = new JSDOM(referenceHtml).window.document
    const renDoc = new JSDOM(rendered).window.document

    const diff = diffNodes(refDoc.documentElement, renDoc.documentElement, 'html')
    expect(diff).toBeNull()
  })

  it('nav preview links guard: empty without navLabel, present after migration', () => {
    // Pre-migration model — represents DB state as seed.ts produces it:
    // pages exist (index + kontakt) but NO navLabel on any page.
    // Source: hand-constructed (not fixture) — fixture had navLabel during the regression,
    // so a fixture-based test would have been GREEN while preview was BROKEN.
    const NAV_SECTION = {
      id: 'nav', recipe: 'A1',
      fields: {
        logoText: { type: 'text' as const, value: 'Test', editable: false },
        ctaLabel: { type: 'cta'  as const, value: 'CTA',  editable: false },
      },
    }
    const SITE_META = {
      title: 'T', description: 'D', ogDescription: 'O',
      canonical: 'https://x.pl/', ogImage: '', brandName: 'B',
      contactEmail: 'a@b.com', contactPhone: '+48000000000', contactPhoneDisplay: '+48 000 000 000',
    }
    const preMigration: SiteModel = {
      tenantId: 'test', archetype: 'trust-led', designSystem: 'forma',
      meta: SITE_META,
      pages: [
        { slug: 'index',   sections: [NAV_SECTION] },  // no navLabel
        { slug: 'kontakt', sections: [] },               // no navLabel
      ],
      collections: { events: [], posts: [] },
    }

    // Sanity (mutation check): pre-migration state → nav links EMPTY
    // Proves this test WOULD HAVE CAUGHT the regression (was broken = navPages=[])
    const preDoc = new JSDOM(renderPage(preMigration, 'index', '/', 'preview')).window.document
    expect(Array.from(preDoc.querySelectorAll('.nav-links a'))).toHaveLength(0)

    // Post-migration model — same transformation as migrate-nav-labels.ts applies to DB:
    // add navLabel to kontakt, insert portfolio/proces stubs before it
    const postMigration: SiteModel = {
      ...preMigration,
      pages: [
        preMigration.pages[0],                                            // index unchanged
        { slug: 'portfolio', navLabel: 'Portfolio',   sections: [] },
        { slug: 'proces',    navLabel: 'Jak pracuję', sections: [] },
        { ...preMigration.pages[1], navLabel: 'Kontakt' },               // kontakt + navLabel
      ],
    }

    const postDoc = new JSDOM(renderPage(postMigration, 'index', '/', 'preview')).window.document
    const navHrefs = Array.from(postDoc.querySelectorAll('.nav-links a'))
      .map(a => a.getAttribute('href'))
    expect(navHrefs).toContain('/preview?page=portfolio')
    expect(navHrefs).toContain('/preview?page=proces')
    expect(navHrefs).toContain('/preview?page=kontakt')
  })

  it('renderEventItem renders EventItem shape', () => {
    const event: EventItem = {
      id: '1',
      title: 'Konferencja prawnicza',
      date: '2026-06-15',
      description: 'Opis konferencji.',
      status: 'published',
    }
    const html = renderEventItem(event)
    expect(html).toContain('Konferencja prawnicza')
    expect(html).toContain('Opis konferencji.')
    expect(html).toContain('data-status="published"')
  })
})

// ---------------------------------------------------------------------------
// Strona główna — kontrola SEO po scaleniu podstrony ofertowej
// ---------------------------------------------------------------------------
describe('Renderer — SEO strony głównej', () => {
  let doc: Document

  beforeAll(() => {
    const fixtureJson = JSON.parse(
      readFileSync(resolve(ROOT, 'fixtures/forma-site.json'), 'utf-8')
    )
    const { model } = parseSiteModel(fixtureJson)
    doc = new JSDOM(renderPage(model, 'index')).window.document
  })

  it('ma dokładnie jeden H1 (tag "System PACTA" nad hero nie jest nagłówkiem)', () => {
    const h1s = Array.from(doc.querySelectorAll('h1'))
    expect(h1s).toHaveLength(1)
    expect(h1s[0].textContent?.trim()).toBe('Strony internetowe dla kancelarii prawnych')
    // "System PACTA" renderuje się jako <span class="tag">, nie jako nagłówek
    const pacta = Array.from(doc.querySelectorAll('h1, h2, h3'))
      .map(h => h.textContent?.trim())
    expect(pacta).not.toContain('System PACTA')
  })

  it('hierarchia nagłówków: brak przeskoków H1 -> H3', () => {
    const levels = Array.from(doc.querySelectorAll('h1, h2, h3, h4, h5, h6'))
      .map(h => Number(h.tagName.slice(1)))
    for (let i = 1; i < levels.length; i++) {
      expect(levels[i] - levels[i - 1], `przeskok H${levels[i - 1]} -> H${levels[i]}`).toBeLessThanOrEqual(1)
    }
  })

  it('title, description i canonical zgodne ze specyfikacją', () => {
    expect(doc.querySelector('title')?.textContent)
      .toBe('Strony internetowe dla kancelarii prawnych | FORMA Wizerunku')
    expect(doc.querySelector('meta[name="description"]')?.getAttribute('content'))
      .toBe('Strony internetowe dla kancelarii prawnych w systemie PACTA. Jawna cena od 4 500 zł netto, standardowa realizacja w 14 dni i płatność po dostawie.')
    expect(doc.querySelector('link[rel="canonical"]')?.getAttribute('href'))
      .toBe('https://formawizerunku.pl/')
  })

  it('og/twitter title i description zsynchronizowane z meta SEO', () => {
    const title = doc.querySelector('title')?.textContent
    const description = doc.querySelector('meta[name="description"]')?.getAttribute('content')
    expect(doc.querySelector('meta[property="og:title"]')?.getAttribute('content')).toBe(title)
    expect(doc.querySelector('meta[name="twitter:title"]')?.getAttribute('content')).toBe(title)
    expect(doc.querySelector('meta[property="og:description"]')?.getAttribute('content')).toBe(description)
    expect(doc.querySelector('meta[name="twitter:description"]')?.getAttribute('content')).toBe(description)
  })

  it('nie ma noindex', () => {
    const robots = doc.querySelector('meta[name="robots"]')?.getAttribute('content') ?? ''
    expect(robots.toLowerCase()).not.toContain('noindex')
  })

  it('FAQ leży między cennikiem a końcowym CTA', () => {
    const sectionIds = Array.from(doc.querySelectorAll('main > section, main > [id]'))
      .map(el => el.id)
      .filter(Boolean)
    expect(sectionIds.indexOf('faq')).toBeGreaterThan(sectionIds.indexOf('pricing'))
    expect(sectionIds.indexOf('faq')).toBeLessThan(sectionIds.indexOf('cta-finale'))
  })

  it('FAQ ma 4 pytania widoczne w HTML bez interakcji użytkownika', () => {
    const items = doc.querySelectorAll('#faq .faq-item')
    expect(items).toHaveLength(4)
    // odpowiedzi są w statycznym HTML (akordeon tylko je zwija wizualnie)
    for (const item of Array.from(items)) {
      expect(item.querySelector('.faq-answer')?.textContent?.trim().length).toBeGreaterThan(0)
    }
  })

  it('FAQ: aria-controls wskazuje istniejące, unikalne id', () => {
    const ids = Array.from(doc.querySelectorAll('[id]')).map(el => el.id)
    expect(new Set(ids).size, 'duplikaty id w dokumencie').toBe(ids.length)
    for (const btn of Array.from(doc.querySelectorAll('#faq .faq-question'))) {
      const target = btn.getAttribute('aria-controls')!
      expect(doc.getElementById(target), `brak elementu #${target}`).not.toBeNull()
      expect(btn.getAttribute('aria-expanded')).toBe('false')
    }
  })

  it('FAQPage JSON-LD zgadza się z treścią widoczną na stronie', () => {
    const scripts = Array.from(doc.querySelectorAll('script[type="application/ld+json"]'))
      .map(s => JSON.parse(s.textContent ?? '{}'))
    const faqLd = scripts.find(s => s['@type'] === 'FAQPage')
    expect(faqLd).toBeDefined()

    const visible = Array.from(doc.querySelectorAll('#faq .faq-item')).map(item => ({
      question: item.querySelector('.faq-question')?.childNodes[0]?.textContent?.replace(/\s+/g, ' ').trim(),
      answer:   item.querySelector('.faq-answer')?.textContent?.replace(/\s+/g, ' ').trim(),
    }))
    const fromLd = faqLd.mainEntity.map((q: { name: string; acceptedAnswer: { text: string } }) => ({
      question: q.name.replace(/\s+/g, ' ').trim(),
      answer:   q.acceptedAnswer.text.replace(/\s+/g, ' ').trim(),
    }))
    expect(fromLd).toEqual(visible)
  })

  it('statystyka 79% renderuje atrybucję źródła z bezpiecznym rel', () => {
    // Atrybucja renderuje się POZA kartą (w .stats-sources, pod całym stats-row) —
    // stats-row jest dwukolumnowe nawet na mobile, więc źródło wewnątrz .stat-card
    // rozciągało kartę ponad sąsiednią bez źródła.
    const source = doc.querySelector('.stats-sources .stat-source a') as HTMLAnchorElement | null
    expect(source).not.toBeNull()
    expect(source!.getAttribute('href')).toBe(
      'https://www.martindale-avvo.com/wp-content/uploads/2023/12/Understanding-the-Legal-Consumer-2023.pdf'
    )
    expect(source!.getAttribute('rel')).toBe('noopener noreferrer')
    expect(source!.getAttribute('rel')).not.toContain('nofollow')
    expect(source!.getAttribute('target')).toBe('_blank')
    // druga statystyka nie wymaga źródła
    expect(doc.querySelectorAll('.stats-sources .stat-source')).toHaveLength(1)
    // atrybucja nie jest już wewnątrz karty statystyki
    expect(doc.querySelector('.stat-card .stat-source')).toBeNull()
  })

  it('nie zawiera pustych ani placeholderowych linków', () => {
    const hrefs = Array.from(doc.querySelectorAll('a')).map(a => a.getAttribute('href') ?? '')
    for (const href of hrefs) {
      expect(href.trim().length, 'pusty href').toBeGreaterThan(0)
      expect(href).not.toBe('#')
    }
  })

  it('cena w hero pochodzi wyłącznie z index.pricing (brak zaszytej ceny w treści pola)', () => {
    const fixtureJson = JSON.parse(
      readFileSync(resolve(ROOT, 'fixtures/forma-site.json'), 'utf-8')
    )
    const indexPage = fixtureJson.pages.find((p: { slug: string }) => p.slug === 'index')
    const prefix = indexPage.sections.find((s: { id: string }) => s.id === 'hero')
      .fields.subheadlinePrefix.value as string
    expect(prefix).not.toMatch(/\d[\s ]?\d{3}/)
    // a wyrenderowany lead i tak zawiera cenę doklejoną przez renderer
    expect(doc.querySelector('#hero .f-lead')?.textContent).toContain('4')
  })
})

// ---------------------------------------------------------------------------
// proces page — structural tests (no DOM-diff: timeline/deliverables use ASCII
// hyphen instead of U+2013 en-dash because en-dash is banned by whitelist)
// ---------------------------------------------------------------------------
describe('Renderer — proces page', () => {
  let doc: Document

  beforeAll(() => {
    const fixtureJson = JSON.parse(
      readFileSync(resolve(ROOT, 'fixtures/forma-site.json'), 'utf-8')
    )
    const { model } = parseSiteModel(fixtureJson)
    const html = renderPage(model, 'proces')
    doc = new JSDOM(html).window.document
  })

  it('has all required section IDs', () => {
    expect(doc.querySelector('#proces-hero')).not.toBeNull()
    expect(doc.querySelector('#timeline')).not.toBeNull()
    expect(doc.querySelector('#deliverables')).not.toBeNull()
    expect(doc.querySelector('#technologie')).not.toBeNull()
    expect(doc.querySelector('#cennik')).not.toBeNull()
    expect(doc.querySelector('#faq')).not.toBeNull()
    expect(doc.querySelector('#cta-finale')).not.toBeNull()
  })

  it('timeline has 6 items', () => {
    const items = doc.querySelectorAll('.process-timeline li')
    expect(items).toHaveLength(6)
  })

  it('faq has 6 items (pytanie o samodzielną edycję przeniesione na stronę główną)', () => {
    const items = doc.querySelectorAll('.faq-item')
    expect(items).toHaveLength(6)
  })

  it('faq nie zawiera już pytań przeniesionych na stronę główną', () => {
    const questions = Array.from(doc.querySelectorAll('.faq-question'))
      .map(q => q.textContent?.replace(/\s+/g, ' ').trim() ?? '')
    expect(questions.some(q => q.startsWith('Czy mogę sam edytować treść strony po dostawie?'))).toBe(false)
  })

  it('cennik-detail pricing amounts are 4 500 and 6 500', () => {
    const prices = Array.from(doc.querySelectorAll('#cennik .pricing-price'))
      .map(el => el.textContent?.trim())
    expect(prices).toEqual(['4 500', '6 500'])
  })

  it('page <title> matches fixture meta', () => {
    // NOTE: contains U+2014 em-dash from fixture (conditional char, in baseline)
    expect(doc.querySelector('title')?.textContent).toBe(
      'Jak pracuję — proces i cennik | FORMA Wizerunku'
    )
  })

  it('has FAQPage JSON-LD (no ProfessionalService — no pricing section on proces)', () => {
    // ProfessionalService is only injected via renderHead when pricingStandardAmount is found.
    // FAQPage JSON-LD is emitted by faq.ts regardless of pricing.
    const scripts = doc.querySelectorAll('script[type="application/ld+json"]')
    expect(scripts).toHaveLength(1)
    const parsed = JSON.parse(scripts[0].textContent ?? '{}')
    expect(parsed['@type']).toBe('FAQPage')
    expect(parsed.mainEntity.length).toBeGreaterThan(0)
  })

  it('preMain: dot-grid-bg present and scroll-progress has role=progressbar', () => {
    expect(doc.querySelector('.dot-grid-bg')).not.toBeNull()
    expect(doc.getElementById('scroll-progress')?.getAttribute('role')).toBe('progressbar')
  })

  it('nav has no nav-tel (phone link only on index)', () => {
    expect(doc.querySelector('.nav-tel')).toBeNull()
  })

  it('cta-finale uses microcopy variant — no tel link', () => {
    // proces cta-finale has no phoneRaw field → microcopy branch rendered
    expect(doc.querySelector('#cta-finale .cta-tel-link')).toBeNull()
  })

  it('cta-finale lead contains price text (DŁUG-CENNIK-1: price in free text)', () => {
    // Price "4 500 zł" is embedded in the lead text, not a structured price field.
    // This is known debt — three price locations can diverge (index.pricing,
    // index.cta-finale.lead, proces.cta-finale.lead). Tracked as DŁUG-CENNIK-1.
    const lead = doc.querySelector('#cta-finale .f-lead')?.textContent ?? ''
    expect(lead).toContain('4')
    expect(lead).toContain('500')
    expect(lead).toContain('zł')
  })

  it('nav marks "Jak pracuję" as current page', () => {
    const currentLinks = Array.from(doc.querySelectorAll('.nav-links a[aria-current="page"]'))
    expect(currentLinks).toHaveLength(1)
    // navLabel = spacja + NBSP (U+00A0) -- podwojny odstep, NBSP nie zwija sie w HTML
    expect(currentLinks[0].textContent?.trim()).toBe('Jak  pracuję')
  })

  it('cennik-detail renders identically to index.pricing packages (single source of truth)', () => {
    // Prove that changing source (section.fields → ctx.indexPricing) doesn't change output.
    // Reads fixture index.pricing DIRECTLY to get expected values — then verifies #cennik matches.
    const fixtureJson = JSON.parse(
      readFileSync(resolve(ROOT, 'fixtures/forma-site.json'), 'utf-8')
    )
    const indexPage    = fixtureJson.pages.find((p: { slug: string }) => p.slug === 'index')
    const indexPricing = indexPage.sections.find((s: { id: string }) => s.id === 'pricing')
    const stdFromIndex = indexPricing.fields.standard.value
    const extFromIndex = indexPricing.fields.extended.value

    // cennik-detail in fixture must have NO price fields (the fix we're verifying)
    const procPage   = fixtureJson.pages.find((p: { slug: string }) => p.slug === 'proces')
    const cennikSec  = procPage.sections.find((s: { id: string }) => s.id === 'cennik-detail')
    expect(cennikSec.fields.standard).toBeUndefined()
    expect(cennikSec.fields.extended).toBeUndefined()

    // Rendered #cennik must show index.pricing values (via ctx.indexPricing)
    const prices = Array.from(doc.querySelectorAll('#cennik .pricing-price'))
      .map(el => el.textContent?.trim())
    expect(prices[0]).toBe(stdFromIndex.amount)          // "4 500"
    expect(prices[1]).toBe(extFromIndex.amount)          // "6 500"

    // aria-labels match index.pricing ariaLabel
    const cards = Array.from(doc.querySelectorAll('#cennik .pricing-card'))
    expect(cards[0].querySelector('.pricing-price')?.getAttribute('aria-label'))
      .toBe(stdFromIndex.ariaLabel)
    expect(cards[1].querySelector('.pricing-price')?.getAttribute('aria-label'))
      .toBe(extFromIndex.ariaLabel)

    // Feature counts match index.pricing features
    expect(cards[0].querySelectorAll('.pricing-features li').length)
      .toBe(stdFromIndex.features.length)
    expect(cards[1].querySelectorAll('.pricing-features li').length)
      .toBe(extFromIndex.features.length)

    // Featured card is extended (second)
    expect(cards[0].classList.contains('featured')).toBe(false)
    expect(cards[1].classList.contains('featured')).toBe(true)
  })

  it('fail-fast: cennik-detail throws when index.pricing is missing', () => {
    // Model with cennik-detail on proces but NO pricing section on index.
    // renderPage must throw explicitly — not silently render empty prices.
    const fixtureJson = JSON.parse(
      readFileSync(resolve(ROOT, 'fixtures/forma-site.json'), 'utf-8')
    )
    const { model } = parseSiteModel(fixtureJson)

    // Mutate AFTER parse (bypasses validation gate) — simulates corrupt/migrated model
    const noIndexPricing: SiteModel = {
      ...model,
      pages: model.pages.map(p =>
        p.slug !== 'index' ? p : {
          ...p,
          sections: p.sections.filter(s => s.id !== 'pricing'),
        }
      ),
    }

    expect(() => renderPage(noIndexPricing, 'proces'))
      .toThrow(/cennik-detail/)
  })
})

// ---------------------------------------------------------------------------
// portfolio page — structural tests (option A: no DOM-diff, new grid concept)
// ---------------------------------------------------------------------------
describe('Renderer — portfolio page', () => {
  let doc: Document

  beforeAll(() => {
    const fixtureJson = JSON.parse(
      readFileSync(resolve(ROOT, 'fixtures/forma-site.json'), 'utf-8')
    )
    const { model } = parseSiteModel(fixtureJson)
    const html = renderPage(model, 'portfolio')
    doc = new JSDOM(html).window.document
  })

  it('has required section IDs', () => {
    expect(doc.querySelector('#portfolio-hero')).not.toBeNull()
    expect(doc.querySelector('#portfolio-grid')).not.toBeNull()
    expect(doc.querySelector('#cta-finale')).not.toBeNull()
  })

  it('has dot-grid-bg (like index and proces)', () => {
    expect(doc.querySelector('.dot-grid-bg')).not.toBeNull()
    expect(doc.getElementById('scroll-progress')?.getAttribute('role')).toBe('progressbar')
  })

  it('portfolio-hero has h1 with fixture headline', () => {
    const h1 = doc.querySelector('#portfolio-hero h1')
    expect(h1).not.toBeNull()
    expect(h1!.textContent).toContain('Strony dla kancelarii prawnych')
  })

  it('portfolio-grid renders fixture card (1 card from fixture)', () => {
    const cards = doc.querySelectorAll('#portfolio-grid .portfolio-card')
    expect(cards).toHaveLength(1)
  })

  it('card without link has no "Zobacz na żywo" button', () => {
    // Fixture card has link: "" → button must be absent
    expect(doc.querySelector('#portfolio-grid .portfolio-live-link')).toBeNull()
  })

  it('card with link renders "Zobacz na żywo" button', () => {
    const fixtureJson = JSON.parse(
      readFileSync(resolve(ROOT, 'fixtures/forma-site.json'), 'utf-8')
    )
    const { model } = parseSiteModel(fixtureJson)

    // Mutate AFTER parse — add link to first portfolio-grid card
    const portfolioPage = model.pages.find(p => p.slug === 'portfolio')!
    const gridSection   = portfolioPage.sections.find(s => s.id === 'portfolio-grid')!
    const cards = gridSection.fields['cards'].value as Record<string, unknown>[]
    cards[0].link = 'https://kancelaria-wojtas.pl'

    const html = renderPage(model, 'portfolio', '/', 'preview')
    const d = new JSDOM(html).window.document

    const btn = d.querySelector('#portfolio-grid .portfolio-live-link') as HTMLAnchorElement | null
    expect(btn).not.toBeNull()
    expect(btn!.getAttribute('href')).toBe('https://kancelaria-wojtas.pl')
    expect(btn!.getAttribute('target')).toBe('_blank')
    expect(btn!.getAttribute('rel')).toBe('noopener noreferrer')
    expect(btn!.textContent).toContain('Zobacz na żywo')
  })

  it('nav marks "Portfolio" as current page', () => {
    const currentLinks = Array.from(doc.querySelectorAll('.nav-links a[aria-current="page"]'))
    expect(currentLinks).toHaveLength(1)
    expect(currentLinks[0].textContent?.trim()).toBe('Portfolio')
  })

  it('cta-finale lead contains no price (no DŁUG-CENNIK-1)', () => {
    const lead = doc.querySelector('#cta-finale .f-lead')?.textContent ?? ''
    // Must not contain numeric price patterns from the debt locations
    expect(lead).not.toMatch(/4[\s ]500/)
    expect(lead).not.toMatch(/6[\s ]500/)
  })

  it('three CSS files linked', () => {
    const hrefs = Array.from(doc.querySelectorAll('link[rel="stylesheet"]'))
      .map(l => l.getAttribute('href') ?? '')
    expect(hrefs).toContain('assets/css/design-system-agency.css')
    expect(hrefs).toContain('assets/css/forma-layout.css')
    expect(hrefs).toContain('assets/css/forma-components.css')
  })
})

// ---------------------------------------------------------------------------
// Scalenie podstrony /strony-dla-kancelarii-prawnych ze stroną główną.
// Podstrona została wycofana (301 → / obsługuje workers/site-router).
// Te testy pilnują, że nic nie odtworzy jej adresu ani nie zgubi treści,
// które zostały na stronę główną przeniesione.
// ---------------------------------------------------------------------------
describe('Renderer — wycofana podstrona /strony-dla-kancelarii-prawnych', () => {
  const SEO_SLUG = 'strony-dla-kancelarii-prawnych'

  let model: SiteModel

  beforeAll(() => {
    const fixtureJson = JSON.parse(
      readFileSync(resolve(ROOT, 'fixtures/forma-site.json'), 'utf-8')
    )
    model = parseSiteModel(fixtureJson).model
  })

  it('fixture nie zawiera już strony ani sekcji seo-kancelarie', () => {
    expect(model.pages.some(p => p.slug === SEO_SLUG)).toBe(false)
    const sectionIds = model.pages.flatMap(p => p.sections.map(s => s.id))
    expect(sectionIds).not.toContain('seo-kancelarie')
  })

  it('żadna renderowana strona nie linkuje do starego adresu', () => {
    for (const page of model.pages) {
      const doc = new JSDOM(renderPage(model, page.slug)).window.document
      const hrefs = Array.from(doc.querySelectorAll('a[href]'))
        .map(a => a.getAttribute('href') ?? '')
      expect(hrefs.some(h => h.includes(SEO_SLUG)), `${page.slug}.html linkuje do ${SEO_SLUG}`).toBe(false)
    }
  })

  it('sitemap nie zawiera starego adresu, ale zawiera stronę główną', () => {
    const sitemap = new TextDecoder().decode(buildStaticSiteFiles(model)['sitemap.xml'])
    expect(sitemap).not.toContain(SEO_SLUG)
    expect(sitemap).toContain('<loc>https://formawizerunku.pl/</loc>')
  })

  it('kotwica "Strony internetowe dla kancelarii prawnych" w stopce prowadzi do /', () => {
    for (const slug of ['index', 'proces', 'kontakt']) {
      const doc = new JSDOM(renderPage(model, slug)).window.document
      const link = Array.from(doc.querySelectorAll('footer a'))
        .find(a => a.textContent?.trim() === 'Strony internetowe dla kancelarii prawnych')
      expect(link, `brak kotwicy w stopce na ${slug}`).toBeDefined()
      expect(link!.getAttribute('href')).toBe('/')
    }
  })
})

// ---------------------------------------------------------------------------
// publikacje — lista + artykuł (structural, no reference fixture — brak
// reference/forma-production/publikacje*.html, wzorem proces/portfolio powyżej)
// ---------------------------------------------------------------------------
describe('Renderer — publikacje lista', () => {
  let model: SiteModel
  let doc: Document

  beforeAll(() => {
    const fixtureJson = JSON.parse(readFileSync(resolve(ROOT, 'fixtures/forma-site.json'), 'utf-8'))
    model = parseSiteModel(fixtureJson).model
    doc = new JSDOM(renderPostsListPage(model)).window.document
  })

  it('jedna karta per opublikowany post, szkic nieobecny', () => {
    const cards = doc.querySelectorAll('[data-pub-card]')
    expect(cards).toHaveLength(6)
    const titles = Array.from(cards).map(c => c.querySelector('.pub-card-title')?.textContent?.trim())
    expect(titles.some(t => t?.includes('Szkic w przygotowaniu'))).toBe(false)
  })

  it('dokładnie jeden <h1>', () => {
    expect(doc.querySelectorAll('h1')).toHaveLength(1)
    expect(doc.querySelector('h1')?.textContent?.trim()).toBe('Publikacje')
  })

  it('kontrolki filtru roku, wyszukiwarki i paginacji obecne', () => {
    expect(doc.querySelector('[data-pub-search]')).not.toBeNull()
    expect(doc.querySelectorAll('[data-pub-year]').length).toBeGreaterThan(0)
    expect(doc.querySelector('[data-pub-pagination]')).not.toBeNull()
  })

  // Kategorie wylaczone w UI (2026-07-28) — brak ustalonej taksonomii tematow.
  // Dane (PostItem.category, data-category) zostaja, wiec wlaczenie z powrotem nie
  // wymaga migracji. Ten test pilnuje, zeby pigulki nie wrocily przypadkiem.
  it('kategorie nie sa renderowane: brak przyciskow filtra i pigulek na kartach', () => {
    expect(doc.querySelectorAll('[data-pub-category]')).toHaveLength(0)
    expect(doc.querySelectorAll('.pub-cat-pill')).toHaveLength(0)
  })

  it('podział na kolumny: GŁÓWNE PUBLIKACJE (featured) + POZOSTAŁE PUBLIKACJE (sidebar)', () => {
    const featuredCol = doc.querySelector('[data-pub-featured-col]')
    const sidebarCol = doc.querySelector('[data-pub-sidebar-col]')
    expect(featuredCol).not.toBeNull()
    expect(sidebarCol).not.toBeNull()
    // 6 opublikowanych postow, PUB_FEATURED_COUNT=3 -> 3 featured + 3 w sidebarze.
    expect(featuredCol!.querySelectorAll('.pub-card--featured')).toHaveLength(3)
    expect(sidebarCol!.querySelectorAll('.pub-card--compact')).toHaveLength(3)
  })

  it('karta featured bez okładki nie ma overlay-klasy pub-card--has-thumb (unika nakładania się kategorii)', () => {
    const cardWithoutCover = Array.from(doc.querySelectorAll('[data-pub-card]'))
      .find(c => c.querySelector('.pub-card-title')?.textContent?.includes('minimalizm'))
    expect(cardWithoutCover?.classList.contains('pub-card--has-thumb')).toBe(false)

    const cardWithCover = Array.from(doc.querySelectorAll('[data-pub-card]'))
      .find(c => c.querySelector('.pub-card-title')?.textContent?.includes('Typografia'))
    expect(cardWithCover?.classList.contains('pub-card--has-thumb')).toBe(true)
  })

  it('nav podświetla "Publikacje" jako bieżącą stronę', () => {
    const current = Array.from(doc.querySelectorAll('.nav-links a[aria-current="page"]'))
    expect(current).toHaveLength(1)
    expect(current[0].textContent?.trim()).toBe('Publikacje')
  })

  it('brak śladów polubień i komentarzy', () => {
    const html = doc.documentElement.innerHTML
    expect(html).not.toMatch(/polubien|komentarz|likesCount/i)
  })

  it('okładka ma loading=lazy gdy ustawiona', () => {
    const img = doc.querySelector('.pub-card-thumb img')
    expect(img?.getAttribute('loading')).toBe('lazy')
  })

  it('canonical wskazuje na publikacje.html', () => {
    expect(doc.querySelector('link[rel="canonical"]')?.getAttribute('href'))
      .toBe('https://formawizerunku.pl/publikacje.html')
  })

  it('publications.js linkowany, main.js tez obecny', () => {
    const scripts = Array.from(doc.querySelectorAll('script[src]')).map(s => s.getAttribute('src'))
    expect(scripts).toContain('assets/js/publications.js')
    expect(scripts).toContain('assets/js/main.js')
  })

  it('publications.js NIE jest linkowany na innych stronach (np. index)', () => {
    const indexDoc = new JSDOM(renderPage(model, 'index')).window.document
    const scripts = Array.from(indexDoc.querySelectorAll('script[src]')).map(s => s.getAttribute('src'))
    expect(scripts).not.toContain('assets/js/publications.js')
  })

  it('brak opublikowanych postów → komunikat pustej listy, bez rzucania wyjątku', () => {
    const empty: SiteModel = { ...model, collections: { ...model.collections, posts: [] } }
    const html = renderPostsListPage(empty)
    const d = new JSDOM(html).window.document
    expect(d.querySelector('.pub-empty')).not.toBeNull()
  })
})

describe('Renderer — publikacje artykuł', () => {
  let model: SiteModel
  let doc: Document
  let post: PostItem

  beforeAll(() => {
    const fixtureJson = JSON.parse(readFileSync(resolve(ROOT, 'fixtures/forma-site.json'), 'utf-8'))
    model = parseSiteModel(fixtureJson).model
    post = model.collections.posts.find(p => p.slug === 'minimalizm-w-projektowaniu-stron-kancelarii')!
    doc = new JSDOM(renderPostPage(model, post)).window.document
  })

  it('dokładnie jeden <h1> z tytułem posta', () => {
    expect(doc.querySelectorAll('h1')).toHaveLength(1)
    expect(doc.querySelector('h1')?.textContent?.trim()).toBe(post.title)
  })

  it('canonical == publikacje/<slug>.html', () => {
    expect(doc.querySelector('link[rel="canonical"]')?.getAttribute('href'))
      .toBe(`https://formawizerunku.pl/publikacje/${post.slug}.html`)
  })

  it('JSON-LD BlogPosting i BreadcrumbList obecne', () => {
    const scripts = Array.from(doc.querySelectorAll('script[type="application/ld+json"]'))
      .map(s => JSON.parse(s.textContent ?? '{}'))
    expect(scripts.some(s => s['@type'] === 'BlogPosting')).toBe(true)
    expect(scripts.some(s => s['@type'] === 'BreadcrumbList')).toBe(true)
  })

  it('data publikacji jako <time datetime="">', () => {
    const time = doc.querySelector('.pub-article-meta time')
    expect(time?.getAttribute('datetime')).toBe(post.publishedAt)
  })

  it('czas czytania policzony i > 0', () => {
    const text = doc.querySelector('.pub-read-time')?.textContent ?? ''
    expect(text).toMatch(/\d+ MIN/)
  })

  it('kluczowe wnioski wyrenderowane', () => {
    const items = doc.querySelectorAll('.pub-takeaways li')
    expect(items.length).toBe(post.keyTakeaways?.length ?? 0)
  })

  it('belka autora nieobecna gdy meta.authorName nie jest ustawiony', () => {
    expect(model.meta.authorName).toBeUndefined()
    expect(doc.querySelector('.pub-author-badge')).toBeNull()
  })

  it('belka autora obecna gdy meta.authorName ustawiony', () => {
    const withAuthor: SiteModel = { ...model, meta: { ...model.meta, authorName: 'Marek Bereza', authorRole: 'Head of Design' } }
    const d = new JSDOM(renderPostPage(withAuthor, post)).window.document
    const badge = d.querySelector('.pub-author-badge')
    expect(badge).not.toBeNull()
    expect(badge?.textContent).toContain('Marek Bereza')
  })

  it('z basePath="../" (rzeczywisty basePath przy eksporcie) linki CSS/nav maja prefiks', () => {
    const d = new JSDOM(renderPostPage(model, post, '../', 'static')).window.document
    const cssHref = d.querySelector('link[href*="design-system-agency.css"]')?.getAttribute('href')
    expect(cssHref?.startsWith('../assets/css/')).toBe(true)
    const scriptSrc = Array.from(d.querySelectorAll('script[src]')).map(s => s.getAttribute('src'))
    expect(scriptSrc.some(s => s?.startsWith('../assets/js/'))).toBe(true)
    const backLink = d.querySelector('.pub-back-link')?.getAttribute('href')
    expect(backLink).toBe('../publikacje.html')
  })

  it('link stopki z bezwzględnym URL (np. wersja PL na podstronie EN) nie dostaje basePath', () => {
    // Regresja: transformFooterHref sklejał basePath + href bez sprawdzenia, czy href
    // jest już bezwzględny. Na stronach /publikacje/<slug>.html (basePath="../") dawało to
    // href="../https://formawizerunku.pl/..." — przeglądarka/Google rozwiązywały to jako
    // https://<host>/https://formawizerunku.pl/... (zgłoszone przez Search Console).
    const withAbsoluteFooterLink: SiteModel = {
      ...model,
      pages: model.pages.map(p => p.slug !== 'index' ? p : {
        ...p,
        sections: p.sections.map(s => s.id !== 'footer' ? s : {
          ...s,
          fields: {
            ...s.fields,
            links: {
              ...s.fields.links,
              value: [
                ...(s.fields.links.value as { label: string; href: string }[]),
                { label: 'Legal Notice (PL)', href: 'https://formawizerunku.pl/legal-notice.html' },
              ],
            },
          },
        }),
      }),
    }
    const d = new JSDOM(renderPostPage(withAbsoluteFooterLink, post, '../', 'static')).window.document
    const links = Array.from(d.querySelectorAll('.footer-links a')).map(a => a.getAttribute('href'))
    expect(links).toContain('https://formawizerunku.pl/legal-notice.html')
    expect(links.some(h => h?.includes('../https://'))).toBe(false)
  })

  it('treść posta obecna, bez polubień/komentarzy', () => {
    expect(doc.querySelector('.pub-article-body')?.innerHTML).toContain('ozdobników')
    const html = doc.documentElement.innerHTML
    expect(html).not.toMatch(/likesCount|komentarz/i)
  })

  it('#scroll-progress obecny (pasek postępu czytania)', () => {
    expect(doc.getElementById('scroll-progress')).not.toBeNull()
  })

  it('bez metaTitle/metaDescription: <title> i meta description z domyślnych wartości (title+brandName / excerpt)', () => {
    expect(post.metaTitle).toBeUndefined()
    expect(post.metaDescription).toBeUndefined()
    expect(doc.querySelector('title')?.textContent).toBe(`${post.title} | ${model.meta.brandName}`)
    expect(doc.querySelector('meta[name="description"]')?.getAttribute('content')).toBe(post.excerpt)
  })

  it('z metaTitle/metaDescription: nadpisują <title>, meta description, og:title/og:description i BlogPosting.description', () => {
    const overridden: PostItem = {
      ...post,
      metaTitle: 'Tytuł SEO nadpisany ręcznie',
      metaDescription: 'Opis SEO nadpisany ręcznie, inny niż zajawka artykułu.',
    }
    const d = new JSDOM(renderPostPage(model, overridden)).window.document

    expect(d.querySelector('title')?.textContent).toBe('Tytuł SEO nadpisany ręcznie')
    expect(d.querySelector('meta[name="description"]')?.getAttribute('content'))
      .toBe('Opis SEO nadpisany ręcznie, inny niż zajawka artykułu.')
    expect(d.querySelector('meta[property="og:title"]')?.getAttribute('content')).toBe('Tytuł SEO nadpisany ręcznie')
    expect(d.querySelector('meta[property="og:description"]')?.getAttribute('content'))
      .toBe('Opis SEO nadpisany ręcznie, inny niż zajawka artykułu.')

    const blogPosting = Array.from(d.querySelectorAll('script[type="application/ld+json"]'))
      .map(s => JSON.parse(s.textContent ?? '{}'))
      .find(s => s['@type'] === 'BlogPosting')
    expect(blogPosting.description).toBe('Opis SEO nadpisany ręcznie, inny niż zajawka artykułu.')
    // H1 (widoczny tytul artykulu) nie zmienia sie przez metaTitle — to nadpisuje tylko <title>/og, nie naglowek.
    expect(d.querySelector('h1')?.textContent?.trim()).toBe(post.title)
  })
})

