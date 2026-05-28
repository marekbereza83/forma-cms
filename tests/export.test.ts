import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { mkdirSync, writeFileSync, rmSync, readFileSync, existsSync } from 'fs'
import { resolve, join } from 'path'
import { JSDOM } from 'jsdom'
import { parseSiteModel } from '../src/lib/cms/schema'
import { renderStaticSite } from '../src/lib/cms/export'
import type { SiteModel } from '../src/lib/cms/types'

const ROOT = resolve(process.cwd())

// --- Fixture-based export (real public/) ---
const FIXTURE_OUT = join(ROOT, 'tmp-export-fixture')

// --- R2-image export test (isolated fake public/) ---
const UPLOAD_TENANT = 'export-test-tenant'
const UPLOAD_FILE   = 'portfolio-card-abc123.webp'
const R2_IMAGE_URL  = `https://pub-test.r2.dev/${UPLOAD_TENANT}/${UPLOAD_FILE}`
const UPLOAD_PUB    = join(ROOT, 'tmp-export-pub')
const UPLOAD_OUT    = join(ROOT, 'tmp-export-upload')

const UPLOAD_MODEL: SiteModel = {
  tenantId: UPLOAD_TENANT,
  archetype: 'trust-led',
  designSystem: 'forma',
  meta: {
    title: 'Test', description: 'Test', ogDescription: 'Test',
    canonical: 'https://test.pl/', ogImage: '', brandName: 'Test', contactEmail: 'test@test.pl',
  },
  pages: [
    {
      slug: 'index',
      sections: [
        {
          id: 'portfolio',
          recipe: 'A1',
          fields: {
            headline: { type: 'text',  value: 'Realizacje',      editable: false },
            lead:     { type: 'text',  value: 'Nasze prace.',     editable: false },
            cards:    { type: 'list',  value: [{
              id: '1',
              label: 'Case study',
              title: 'Kancelaria Test',
              desc:  'Opis.',
              image: R2_IMAGE_URL,   // R2 absolute URL — not rewritten in static export
            }], editable: false },
          },
        },
      ],
    },
    { slug: 'portfolio', sections: [] },  // empty stub — must be skipped
  ],
  collections: { events: [], posts: [] },
}

beforeAll(() => {
  // Clean previous runs
  for (const dir of [FIXTURE_OUT, UPLOAD_PUB, UPLOAD_OUT]) {
    if (existsSync(dir)) rmSync(dir, { recursive: true })
  }

  // Fixture export (uses real public/)
  const fixtureJson = JSON.parse(readFileSync(join(ROOT, 'fixtures/forma-site.json'), 'utf-8'))
  const { model } = parseSiteModel(fixtureJson)
  renderStaticSite(model, FIXTURE_OUT)

  // Build fake public/ for R2-image export test (no uploads/ dir — R2 images are CDN URLs)
  mkdirSync(join(UPLOAD_PUB, 'assets', 'css'),    { recursive: true })
  mkdirSync(join(UPLOAD_PUB, 'assets', 'js'),     { recursive: true })
  mkdirSync(join(UPLOAD_PUB, 'assets', 'images'), { recursive: true })
  writeFileSync(join(UPLOAD_PUB, 'assets', 'css', 'forma-layout.css'),         '/* css */')
  writeFileSync(join(UPLOAD_PUB, 'assets', 'css', 'forma-components.css'),     '/* css */')
  writeFileSync(join(UPLOAD_PUB, 'assets', 'css', 'design-system-agency.css'), '/* css */')
  writeFileSync(join(UPLOAD_PUB, 'assets', 'js',  'main.js'),                  '/* js */')
  writeFileSync(join(UPLOAD_PUB, 'assets', 'images', 'wojtas-hero.png'),       'PNG')

  // Upload export
  renderStaticSite(UPLOAD_MODEL, UPLOAD_OUT, UPLOAD_PUB)
})

afterAll(() => {
  for (const dir of [FIXTURE_OUT, UPLOAD_PUB, UPLOAD_OUT]) {
    if (existsSync(dir)) rmSync(dir, { recursive: true })
  }
})

// ---- fixture-based tests ----

describe('renderStaticSite (fixture)', () => {
  it('generates index.html, kontakt.html, proces.html and portfolio.html', () => {
    expect(existsSync(join(FIXTURE_OUT, 'index.html'))).toBe(true)
    expect(existsSync(join(FIXTURE_OUT, 'kontakt.html'))).toBe(true)
    expect(existsSync(join(FIXTURE_OUT, 'proces.html'))).toBe(true)
    expect(existsSync(join(FIXTURE_OUT, 'portfolio.html'))).toBe(true)
  })

  it('copies CSS and JS assets', () => {
    expect(existsSync(join(FIXTURE_OUT, 'assets', 'css', 'design-system-agency.css'))).toBe(true)
    expect(existsSync(join(FIXTURE_OUT, 'assets', 'css', 'forma-layout.css'))).toBe(true)
    expect(existsSync(join(FIXTURE_OUT, 'assets', 'css', 'forma-components.css'))).toBe(true)
    expect(existsSync(join(FIXTURE_OUT, 'assets', 'js',  'main.js'))).toBe(true)
  })

  it('every <img src> in generated HTML points to an existing file in the export', () => {
    const htmlFiles = ['index.html', 'kontakt.html', 'proces.html', 'portfolio.html']
    const missing: string[] = []

    for (const filename of htmlFiles) {
      const html = readFileSync(join(FIXTURE_OUT, filename), 'utf-8')
      const doc  = new JSDOM(html).window.document
      for (const img of Array.from(doc.querySelectorAll('img[src]'))) {
        const src  = img.getAttribute('src')!
        // Only check relative paths (absolute URLs are external)
        if (src.startsWith('http') || src.startsWith('//')) continue
        const full = join(FIXTURE_OUT, src)
        if (!existsSync(full)) missing.push(`${filename}: <img src="${src}"> → ${full}`)
      }
    }

    if (missing.length > 0)
      throw new Error(`Broken image references in export:\n${missing.join('\n')}`)
  })

  it('nav links in index.html are relative .html paths', () => {
    const html = readFileSync(join(FIXTURE_OUT, 'index.html'), 'utf-8')
    const doc  = new JSDOM(html).window.document
    const hrefs = Array.from(doc.querySelectorAll('.nav-links a')).map(a => a.getAttribute('href'))
    for (const href of hrefs) {
      expect(href).not.toContain('/preview')
      expect(href?.endsWith('.html') || href === 'index.html').toBe(true)
    }
  })

  it('contains no absolute /uploads/ paths', () => {
    const html = readFileSync(join(FIXTURE_OUT, 'index.html'), 'utf-8')
    expect(html).not.toContain('/uploads/')
  })
})

// ---- R2-image export tests ----

describe('renderStaticSite — R2 image URL handling', () => {
  it('R2 img src is preserved as absolute URL in static export (no path rewriting)', () => {
    const html = readFileSync(join(UPLOAD_OUT, 'index.html'), 'utf-8')
    const doc  = new JSDOM(html).window.document
    const img  = doc.querySelector('.portfolio-thumb img')
    expect(img).not.toBeNull()
    expect(img!.getAttribute('src')).toBe(R2_IMAGE_URL)
  })

  it('no local copy of R2 image in exports assets/images/', () => {
    // R2 images link to CDN — they are NOT copied to the export directory
    expect(existsSync(join(UPLOAD_OUT, 'assets', 'images', UPLOAD_FILE))).toBe(false)
  })

  it('HTML has no broken relative image references (R2 URLs are absolute, skipped)', () => {
    const html    = readFileSync(join(UPLOAD_OUT, 'index.html'), 'utf-8')
    const doc     = new JSDOM(html).window.document
    const missing: string[] = []
    for (const img of Array.from(doc.querySelectorAll('img[src]'))) {
      const src = img.getAttribute('src')!
      if (src.startsWith('http') || src.startsWith('//')) continue
      const full = join(UPLOAD_OUT, src)
      if (!existsSync(full)) missing.push(`<img src="${src}"> → ${full}`)
    }
    if (missing.length > 0)
      throw new Error(`Broken image references:\n${missing.join('\n')}`)
  })

  it('empty-section stub page is not exported', () => {
    expect(existsSync(join(UPLOAD_OUT, 'portfolio.html'))).toBe(false)
  })
})
