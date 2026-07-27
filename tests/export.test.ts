import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { mkdirSync, writeFileSync, rmSync, readFileSync, existsSync } from 'fs'
import { resolve, join } from 'path'
import { JSDOM } from 'jsdom'
import { parseSiteModel } from '../src/lib/cms/schema'
import { renderStaticSite, buildStaticSiteFiles } from '../src/lib/cms/export'
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
    canonical: 'https://test.pl/', ogImage: '', brandName: 'Test',
    contactEmail: 'test@test.pl', contactPhone: '+48000000000', contactPhoneDisplay: '+48 000 000 000',
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

// --- Publikacje: sitemap + _redirects.json (design-independent backend pieces) ---
const POSTS_OUT = join(ROOT, 'tmp-export-posts')

const POSTS_MODEL: SiteModel = {
  tenantId: 'posts-test-tenant',
  archetype: 'trust-led',
  designSystem: 'forma',
  meta: {
    title: 'Test', description: 'Test', ogDescription: 'Test',
    canonical: 'https://test.pl/', ogImage: '', brandName: 'Test',
    contactEmail: 'test@test.pl', contactPhone: '+48000000000', contactPhoneDisplay: '+48 000 000 000',
  },
  pages: [{
    slug: 'index',
    sections: [
      {
        id: 'nav',
        recipe: 'A1',
        fields: {
          logoText: { type: 'text', value: 'Test', editable: false },
          ctaLabel: { type: 'cta',  value: 'Zamow',  editable: false },
        },
      },
      {
        id: 'footer',
        recipe: 'A9',
        fields: {
          logoText:  { type: 'text', value: 'Test', editable: false },
          links:     { type: 'list', value: [], editable: false },
          copyright: { type: 'text', value: '(c) Test', editable: false },
        },
      },
    ],
  }],
  collections: {
    events: [],
    posts: [
      {
        id: 'p1',
        slug: 'aktualny-slug',
        title: 'Opublikowany artykul',
        publishedAt: '2026-05-10',
        excerpt: 'Zajawka.',
        body: '<p>Tresc</p>',
        status: 'published',
        previousSlugs: ['pierwszy-slug', 'drugi-slug'],
      },
      {
        id: 'p2',
        slug: 'szkic',
        title: 'Szkic',
        body: '<p>Tresc szkicu</p>',
        status: 'draft',
        previousSlugs: ['stary-szkic'],
      },
    ],
  },
}

beforeAll(() => {
  // Clean previous runs
  for (const dir of [FIXTURE_OUT, UPLOAD_PUB, UPLOAD_OUT, POSTS_OUT]) {
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

  // Publikacje export (sitemap + _redirects.json)
  renderStaticSite(POSTS_MODEL, POSTS_OUT)
})

afterAll(() => {
  for (const dir of [FIXTURE_OUT, UPLOAD_PUB, UPLOAD_OUT, POSTS_OUT]) {
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
    // Chodzi o LOKALNE ścieżki uploadów (public/uploads/<tenantId>/...), które
    // nie istnieją w eksporcie — obrazy muszą być absolutnymi URL-ami z R2.
    // Sprawdzamy wartości atrybutów, a nie surowy tekst dokumentu: zewnętrzny
    // URL może legalnie zawierać "/uploads/" w swojej ścieżce (np. link do
    // źródła statystyki na cudzym WordPressie) i nie jest to wyciek.
    const html = readFileSync(join(FIXTURE_OUT, 'index.html'), 'utf-8')
    const doc  = new JSDOM(html).window.document
    const refs = Array.from(doc.querySelectorAll('[src], [href]'))
      .flatMap(el => [el.getAttribute('src'), el.getAttribute('href')])
      .filter((v): v is string => typeof v === 'string')

    const isAbsolute = (v: string) => /^(https?:)?\/\//.test(v) || /^(mailto|tel|data):/.test(v)
    const leaked = refs.filter(v => !isAbsolute(v) && v.includes('uploads/'))
    expect(leaked).toEqual([])
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

// ---- publikacje: sitemap.xml + _redirects.json ----

describe('renderStaticSite — sitemap i redirecty dla publikacji', () => {
  it('sitemap.xml zawiera opublikowany post i liste publikacji, z lastmod = publishedAt', () => {
    const xml = readFileSync(join(POSTS_OUT, 'sitemap.xml'), 'utf-8')
    expect(xml).toContain('<loc>https://test.pl/publikacje/aktualny-slug.html</loc>')
    expect(xml).toContain('<lastmod>2026-05-10</lastmod>')
    expect(xml).toContain('<loc>https://test.pl/publikacje.html</loc>')
  })

  it('sitemap.xml nie zawiera szkicu ani jego starego sluga', () => {
    const xml = readFileSync(join(POSTS_OUT, 'sitemap.xml'), 'utf-8')
    expect(xml).not.toContain('/publikacje/szkic.html')
    expect(xml).not.toContain('stary-szkic')
  })

  it('publikacje.html i publikacje/<slug>.html sa faktycznie zapisywane na dysk', () => {
    expect(existsSync(join(POSTS_OUT, 'publikacje.html'))).toBe(true)
    expect(existsSync(join(POSTS_OUT, 'publikacje', 'aktualny-slug.html'))).toBe(true)
  })

  // Regresja: publikacje/<slug>.html lezy jeden poziom glebiej niz reszta eksportu.
  // basePath="" (jak dla plikow root-level) psulby wszystkie wzgledne linki (CSS/JS/nav) —
  // wykryte wizualnie (calkowicie nieostylowana strona), naprawione przekazaniem "../".
  it('strona artykulu linkuje assets/CSS i strony nawigacji z prefiksem "../"', () => {
    const html = readFileSync(join(POSTS_OUT, 'publikacje', 'aktualny-slug.html'), 'utf-8')
    expect(html).toContain('href="../assets/css/design-system-agency.css"')
    expect(html).toContain('src="../assets/js/main.js"')
    expect(html).toContain('href="../index.html"')
    expect(html).not.toContain('href="assets/css/')
  })

  it('lista publikacji (root-level) NIE ma prefiksu "../" w linkach', () => {
    const html = readFileSync(join(POSTS_OUT, 'publikacje.html'), 'utf-8')
    expect(html).toContain('href="assets/css/design-system-agency.css"')
    expect(html).not.toContain('../assets/')
  })

  it('szkic nie generuje pliku publikacje/<slug>.html', () => {
    expect(existsSync(join(POSTS_OUT, 'publikacje', 'szkic.html'))).toBe(false)
  })

  it('brak opublikowanych postow → publikacje.html w ogole nie jest zapisywany', () => {
    const OUT = join(ROOT, 'tmp-export-posts-empty')
    if (existsSync(OUT)) rmSync(OUT, { recursive: true })
    const model: SiteModel = {
      ...POSTS_MODEL,
      collections: { events: [], posts: POSTS_MODEL.collections.posts.filter(p => p.status !== 'published') },
    }
    renderStaticSite(model, OUT)
    expect(existsSync(join(OUT, 'publikacje.html'))).toBe(false)
    rmSync(OUT, { recursive: true })
  })

  it('sitemap.xml nie zawiera wpisu dla listy publikacji, gdy nie ma opublikowanych postow', () => {
    const model: SiteModel = {
      ...POSTS_MODEL,
      collections: { events: [], posts: POSTS_MODEL.collections.posts.filter(p => p.status !== 'published') },
    }
    const out = buildStaticSiteFiles(model)
    const xml = new TextDecoder().decode(out['sitemap.xml'])
    expect(xml).not.toContain('publikacje.html')
  })

  it('_redirects.json mapuje stare slugi opublikowanego posta na aktualny adres', () => {
    const redirects = JSON.parse(readFileSync(join(POSTS_OUT, '_redirects.json'), 'utf-8'))
    expect(redirects).toEqual({
      'publikacje/pierwszy-slug.html': '/publikacje/aktualny-slug.html',
      'publikacje/drugi-slug.html': '/publikacje/aktualny-slug.html',
    })
  })

  it('_redirects.json pomija historie sluga szkicu (brak wygenerowanego pliku docelowego)', () => {
    const redirects = JSON.parse(readFileSync(join(POSTS_OUT, '_redirects.json'), 'utf-8'))
    expect(redirects['publikacje/stary-szkic.html']).toBeUndefined()
  })

  it('_redirects.json nie jest generowany, gdy zaden post nie ma historii slugow', () => {
    const model: SiteModel = { ...POSTS_MODEL, collections: { events: [], posts: [] } }
    const out = buildStaticSiteFiles(model)
    expect(out['_redirects.json']).toBeUndefined()
  })

  it('buildStaticSiteFiles (sciezka publish) produkuje ten sam sitemap i redirecty co renderStaticSite', () => {
    const out = buildStaticSiteFiles(POSTS_MODEL)
    const sitemapFromDisk = readFileSync(join(POSTS_OUT, 'sitemap.xml'), 'utf-8')
    const redirectsFromDisk = readFileSync(join(POSTS_OUT, '_redirects.json'), 'utf-8')

    expect(new TextDecoder().decode(out['sitemap.xml'])).toBe(sitemapFromDisk)
    expect(new TextDecoder().decode(out['_redirects.json'])).toBe(redirectsFromDisk)
  })

  it('buildStaticSiteFiles produkuje te same klucze publikacje.html / publikacje/<slug>.html co renderStaticSite', () => {
    const out = buildStaticSiteFiles(POSTS_MODEL)
    expect(out['publikacje.html']).toBeDefined()
    expect(out['publikacje/aktualny-slug.html']).toBeDefined()
    expect(out['publikacje/szkic.html']).toBeUndefined()

    const htmlFromDisk = readFileSync(join(POSTS_OUT, 'publikacje.html'), 'utf-8')
    expect(new TextDecoder().decode(out['publikacje.html'])).toBe(htmlFromDisk)
  })
})
