import { describe, it, expect } from 'vitest'
import { buildBlogPostingJsonLd, buildBreadcrumbListJsonLd } from '../src/lib/cms/renderer/post-jsonld'
import type { PostItem, SiteMeta } from '../src/lib/cms/types'

const SITE_META: SiteMeta = {
  title: 'Kancelaria Test',
  description: 'Test',
  ogDescription: 'Test',
  canonical: 'https://test.pl/',
  ogImage: 'https://test.pl/og.jpg',
  brandName: 'Kancelaria Test',
  contactEmail: 'kontakt@test.pl',
  contactPhone: '+48000000000',
  contactPhoneDisplay: '+48 000 000 000',
}

const POST: PostItem = {
  id: 'p1',
  slug: 'etyka-zawodowa',
  title: 'Etyka zawodowa a strona kancelarii',
  publishedAt: '2026-07-01',
  excerpt: 'Krotkie streszczenie artykulu.',
  body: '<p>Tresc</p>',
  status: 'published',
}

function extractJsonLd(scriptHtml: string): unknown {
  const inner = scriptHtml.replace(/^<script type="application\/ld\+json">\n?/, '').replace(/\n?<\/script>$/, '')
  return JSON.parse(inner)
}

describe('buildBlogPostingJsonLd', () => {
  it('generuje poprawny JSON-LD typu BlogPosting z danymi posta', () => {
    const html = buildBlogPostingJsonLd(POST, SITE_META, 'https://test.pl/publikacje/etyka-zawodowa.html')
    expect(html.startsWith('<script type="application/ld+json">')).toBe(true)
    expect(html.endsWith('</script>')).toBe(true)

    const data = extractJsonLd(html) as Record<string, unknown>
    expect(data['@context']).toBe('https://schema.org')
    expect(data['@type']).toBe('BlogPosting')
    expect(data.headline).toBe(POST.title)
    expect(data.description).toBe(POST.excerpt)
    expect(data.datePublished).toBe(POST.publishedAt)
    expect(data.url).toBe('https://test.pl/publikacje/etyka-zawodowa.html')
    expect((data.mainEntityOfPage as Record<string, unknown>)['@id']).toBe('https://test.pl/publikacje/etyka-zawodowa.html')
    expect((data.author as Record<string, unknown>).name).toBe(SITE_META.brandName)
  })

  it('brakujaca zajawka/data nie psuje JSON (puste stringi zamiast undefined)', () => {
    const postBezZajawki: PostItem = { ...POST, excerpt: undefined, publishedAt: undefined }
    const html = buildBlogPostingJsonLd(postBezZajawki, SITE_META, 'https://test.pl/publikacje/etyka-zawodowa.html')
    const data = extractJsonLd(html) as Record<string, unknown>
    expect(data.description).toBe('')
    expect(data.datePublished).toBe('')
  })

  it('escapuje "</script>" w tytule, zeby nie wyrwac sie z tagu', () => {
    const post: PostItem = { ...POST, title: 'Uwaga na </script><script>alert(1)</script>' }
    const html = buildBlogPostingJsonLd(post, SITE_META, 'https://test.pl/publikacje/etyka-zawodowa.html')
    expect(html).not.toContain('</script><script>alert')
    const data = extractJsonLd(html) as Record<string, unknown>
    expect(data.headline).toBe(post.title)
  })
})

describe('buildBreadcrumbListJsonLd', () => {
  it('generuje BreadcrumbList z trzema poziomami: strona glowna -> publikacje -> artykul', () => {
    const html = buildBreadcrumbListJsonLd(
      POST,
      SITE_META,
      'https://test.pl/publikacje.html',
      'https://test.pl/publikacje/etyka-zawodowa.html',
    )
    const raw = extractJsonLd(html) as Record<string, unknown>
    expect(raw['@type']).toBe('BreadcrumbList')

    const data = raw as { itemListElement: Array<Record<string, unknown>> }
    expect(data.itemListElement).toHaveLength(3)
    expect(data.itemListElement[0]).toMatchObject({ position: 1, item: SITE_META.canonical })
    expect(data.itemListElement[1]).toMatchObject({ position: 2, item: 'https://test.pl/publikacje.html' })
    expect(data.itemListElement[2]).toMatchObject({
      position: 3,
      name: POST.title,
      item: 'https://test.pl/publikacje/etyka-zawodowa.html',
    })
  })
})
