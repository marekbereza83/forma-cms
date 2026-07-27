import type { PostItem, SiteMeta } from '../types'

// JSON.stringify escapes quotes/backslashes for us; we only need to neutralise "</script>"
// so a title/excerpt containing that sequence cannot break out of the script tag.
function toJsonLdScript(data: unknown): string {
  return `<script type="application/ld+json">
${JSON.stringify(data, null, 2).replace(/</g, '\\u003c')}
</script>`
}

// BlogPosting — one per published article. canonicalUrl must match the <link rel="canonical">
// emitted for the same page (single source of truth for the post's own URL).
export function buildBlogPostingJsonLd(post: PostItem, siteMeta: SiteMeta, canonicalUrl: string): string {
  // Person gdy tenant skonfigurowal autora site-level (jednoosobowa pracownia) —
  // lepsze SEO niz Organization dla bloga eksperckiego podpisanego imieniem i nazwiskiem.
  const author = siteMeta.authorName
    ? { '@type': 'Person', name: siteMeta.authorName, ...(siteMeta.authorRole ? { jobTitle: siteMeta.authorRole } : {}) }
    : { '@type': 'Organization', name: siteMeta.brandName }

  return toJsonLdScript({
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt ?? '',
    datePublished: post.publishedAt ?? '',
    url: canonicalUrl,
    mainEntityOfPage: { '@type': 'WebPage', '@id': canonicalUrl },
    author,
    publisher: { '@type': 'Organization', name: siteMeta.brandName },
  })
}

// BreadcrumbList — Strona główna -> Publikacje -> tytuł artykułu.
export function buildBreadcrumbListJsonLd(
  post: PostItem,
  siteMeta: SiteMeta,
  postsListUrl: string,
  canonicalUrl: string
): string {
  return toJsonLdScript({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Strona główna', item: siteMeta.canonical },
      { '@type': 'ListItem', position: 2, name: 'Publikacje', item: postsListUrl },
      { '@type': 'ListItem', position: 3, name: post.title, item: canonicalUrl },
    ],
  })
}
