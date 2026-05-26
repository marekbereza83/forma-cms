// tryb static = linki dla publikowanych plików .html, NIE zmieniać bez sprawdzenia eksportu
export function pageHref(slug: string, linkMode: 'static' | 'preview'): string {
  if (linkMode === 'static') return `${slug}.html`
  return `/preview?page=${slug}`
}
