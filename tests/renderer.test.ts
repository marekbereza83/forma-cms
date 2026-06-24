import { describe, it, expect, beforeAll } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { JSDOM } from 'jsdom'
import { parseSiteModel } from '../src/lib/cms/schema'
import { renderPage } from '../src/lib/cms/renderer/index'
import { renderEventItem } from '../src/lib/cms/renderer/collections'
import type { EventItem, SiteModel } from '../src/lib/cms/types'

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
    expect(h1?.textContent?.trim()).toBe('Projektuję strony które przynoszą klientów kancelarii')
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

  it('faq has 7 items', () => {
    const items = doc.querySelectorAll('.faq-item')
    expect(items).toHaveLength(7)
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
// strony-dla-kancelarii-prawnych — structural tests
// ---------------------------------------------------------------------------
describe('Renderer — strony-dla-kancelarii-prawnych page', () => {
  let doc: Document

  beforeAll(() => {
    const fixtureJson = JSON.parse(
      readFileSync(resolve(ROOT, 'fixtures/forma-site.json'), 'utf-8')
    )
    const { model } = parseSiteModel(fixtureJson)
    const html = renderPage(model, 'strony-dla-kancelarii-prawnych')
    doc = new JSDOM(html).window.document
  })

  it('has all required section IDs', () => {
    const ids = ['seo-hero', 'seo-problem', 'seo-pacta', 'seo-dlaczego', 'seo-segmenty',
                 'seo-portfolio', 'seo-deliverables', 'seo-proces', 'seo-cennik', 'seo-faq']
    for (const id of ids) {
      expect(doc.getElementById(id), `#${id} missing`).not.toBeNull()
    }
  })

  it('FAQ has 8 items', () => {
    const items = doc.querySelectorAll('#seo-faq .faq-item')
    expect(items).toHaveLength(8)
  })

  it('pricing amounts match fixture indexPricing (4 500 / 6 500)', () => {
    const amounts = Array.from(doc.querySelectorAll('#seo-cennik .pricing-price'))
      .map(el => el.textContent?.trim())
    expect(amounts).toEqual(expect.arrayContaining([expect.stringMatching(/^4.500$/), expect.stringMatching(/^6.500$/)]))
  })

  it('has ProfessionalService + FAQPage JSON-LD', () => {
    const scripts = Array.from(doc.querySelectorAll('script[type="application/ld+json"]'))
    const combined = scripts.map(s => s.textContent ?? '').join('\n')
    expect(combined).toContain('ProfessionalService')
    expect(combined).toContain('FAQPage')
  })

  it('three CSS files linked', () => {
    const hrefs = Array.from(doc.querySelectorAll('link[rel="stylesheet"]'))
      .map(l => l.getAttribute('href') ?? '')
    expect(hrefs).toContain('assets/css/design-system-agency.css')
    expect(hrefs).toContain('assets/css/forma-layout.css')
    expect(hrefs).toContain('assets/css/forma-components.css')
  })

  it('does not appear in nav (no navLabel)', () => {
    const navLinks = Array.from(doc.querySelectorAll('.nav-links a'))
      .map(a => a.getAttribute('href') ?? '')
    expect(navLinks.some(h => h.includes('strony-dla-kancelarii-prawnych'))).toBe(false)
  })

  it('footer SEO link has aria-current="page"', () => {
    const seoLink = Array.from(doc.querySelectorAll('footer a'))
      .find(a => a.textContent?.includes('Strony internetowe dla kancelarii'))
    expect(seoLink).not.toBeNull()
    expect(seoLink!.getAttribute('aria-current')).toBe('page')
  })

  it('hasSeoPage=false: footer omits SEO link for tenants without the page', () => {
    const fixtureJson = JSON.parse(
      readFileSync(resolve(ROOT, 'fixtures/forma-site.json'), 'utf-8')
    )
    const { model } = parseSiteModel(fixtureJson)
    const modelWithoutSeo: typeof model = {
      ...model,
      pages: model.pages.filter(p => p.slug !== 'strony-dla-kancelarii-prawnych'),
    }
    const html = renderPage(modelWithoutSeo, 'index')
    const d = new JSDOM(html).window.document
    const footerLinks = Array.from(d.querySelectorAll('footer a'))
    expect(footerLinks.some(a => a.textContent?.includes('Strony internetowe dla kancelarii'))).toBe(false)
  })
})

