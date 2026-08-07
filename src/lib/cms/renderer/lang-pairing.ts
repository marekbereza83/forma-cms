/**
 * Single source of truth for which page slugs have a genuine same-slug
 * equivalent on a language-sibling tenant (see SiteMeta.altLang). Shared by
 * the nav language switcher (sections/nav.ts) and the SEO hreflang tags
 * (head.ts callers) so the two can never disagree about what counts as a
 * "real" translated equivalent.
 *
 * "publikacje" is the blog LIST page — individual posts don't share a slug
 * across languages (titles are translated), so they're paired explicitly via
 * PostItem.altLangSlug instead, not through this set.
 */
export const SHARED_PAGE_SLUGS = new Set(['index', 'kontakt', 'proces', 'portfolio', 'publikacje', '404'])

/** slug -> path segment on the sibling domain ('' for index, "<slug>.html" otherwise). */
export function sharedSlugPath(slug: string): string {
  return slug === 'index' ? '' : `${slug}.html`
}
