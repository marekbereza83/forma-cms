// tryb static = linki dla publikowanych plików .html, NIE zmieniać bez sprawdzenia eksportu
export function pageHref(slug: string, linkMode: 'static' | 'preview'): string {
  if (linkMode === 'static') {
    // Strona glowna: link bezposrednio na "/", nie "index.html". Worker i tak
    // przekierowuje /index.html -> / (301, patrz workers/site-router/src/index.ts),
    // wiec relatywny "index.html" kosztowalby zbedny dodatkowy redirect przy KAZDYM
    // kliknieciu logo lub linku do strony glownej, na kazdej stronie serwisu.
    if (slug === 'index') return '/'
    return `${slug}.html`
  }
  return `/preview?page=${slug}`
}

// Jak pageHref, ale dla stron zagnieżdżonych w podkatalogu (np. publikacje/<slug>.html,
// jedyna dotąd strona jeden poziom głębiej niż reszta eksportu) — w trybie static dodaje
// basePath przed adresem root-relative. W trybie preview pageHref już zwraca ścieżkę
// bezwzględną (/preview?page=...), więc basePath jest tu pomijany (dodanie go by ją zepsuło).
// "/" zwrócone przez pageHref dla slug='index' jest już bezwzględne — z tego samego powodu
// basePath też się dla niego pomija (doklejenie "../" przed "/" dałoby błędną ścieżkę).
export function rootHref(slug: string, basePath: string, linkMode: 'static' | 'preview'): string {
  const href = pageHref(slug, linkMode)
  return linkMode === 'static' && href !== '/' ? `${basePath}${href}` : href
}

// Escapowanie tekstu wstawianego do HTML. Reszta renderera wstawia pola modelu surowo
// (tresc pochodzi od zalogowanego wlasciciela tenanta, nie od anonima) — to zastane
// zachowanie, ktorego tu nie zmieniam. Ale pola dodawane od 2026-07-31 (zrodla, spis
// tresci budowany z naglowkow) przechodza przez ta funkcje, zeby nie dokladac kolejnych
// miejsc, w ktorych tekst z panelu staje sie znacznikiem.
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// Slug kotwicy dla naglowka H2 (spis tresci). Polskie znaki -> ASCII, reszta -> "-".
// Bez tego id zawieralby znaki, ktore w href="#..." wymagaja kodowania i psuja
// scrollowanie do sekcji w czesci przegladarek.
const PL_CHARS: Record<string, string> = {
  ą: 'a', ć: 'c', ę: 'e', ł: 'l', ń: 'n', ó: 'o', ś: 's', ź: 'z', ż: 'z',
}

export function headingSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[ąćęłńóśźż]/g, ch => PL_CHARS[ch] ?? ch)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
