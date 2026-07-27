// tryb static = linki dla publikowanych plików .html, NIE zmieniać bez sprawdzenia eksportu
export function pageHref(slug: string, linkMode: 'static' | 'preview'): string {
  if (linkMode === 'static') return `${slug}.html`
  return `/preview?page=${slug}`
}

// Jak pageHref, ale dla stron zagnieżdżonych w podkatalogu (np. publikacje/<slug>.html,
// jedyna dotąd strona jeden poziom głębiej niż reszta eksportu) — w trybie static dodaje
// basePath przed adresem root-relative. W trybie preview pageHref już zwraca ścieżkę
// bezwzględną (/preview?page=...), więc basePath jest tu pomijany (dodanie go by ją zepsuło).
export function rootHref(slug: string, basePath: string, linkMode: 'static' | 'preview'): string {
  const href = pageHref(slug, linkMode)
  return linkMode === 'static' ? `${basePath}${href}` : href
}
