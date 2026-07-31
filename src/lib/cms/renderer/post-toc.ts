import { escapeHtml, headingSlug } from './utils'

/**
 * Spis tresci artykulu budowany z naglowkow H2 w tresci.
 *
 * Zrodlem jest wylacznie post.body — klient nie utrzymuje osobnej listy sekcji, wiec spis
 * nie moze sie rozjechac z trescia. Kotwice (id) sa dopisywane do naglowkow przy KAZDYM
 * renderze, nie zapisywane w modelu; dzieki temu zmiana tytulu sekcji od razu przestawia
 * i link, i etykiete.
 *
 * Podmiana regexem, nie parserem DOM, jest tu bezpieczna: sanitizePostBody nie ma h2 w
 * allowedAttributes, wiec kazdy zapisany naglowek wychodzi z sanitizera jako gole <h2>
 * (sprawdzone na sanitize-html 2.17). Wzorzec i tak akceptuje ewentualne atrybuty i
 * zastepuje CALY znacznik otwierajacy, wiec starsza tresc z atrybutami tez zadziala.
 */

export type PostHeading = { id: string; text: string }

const H2_RE = /<h2\b[^>]*>([\s\S]*?)<\/h2>/gi

// Tekst naglowka do etykiety w spisie: usuwamy zagniezdzone znaczniki (<strong>, <a>),
// ale NIE dekodujemy encji — inner sanitizowanego body to juz zaescapowany tekst, wiec
// po zdjeciu tagow nadaje sie do wstawienia w HTML bez ponownego escapowania.
function stripTags(inner: string): string {
  return inner.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim()
}

// Wersja odkodowana — tylko do zbudowania sluga, ktory i tak zostawia same [a-z0-9-].
function decodeEntities(text: string): string {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
}

/**
 * Dopisuje id do kazdego <h2> w tresci i zwraca liste naglowkow w kolejnosci wystapienia.
 * Powtorzone tytuly dostaja sufiks -2, -3... — dwie sekcje o tej samej nazwie nie moga
 * dzielic id, bo link w spisie prowadzilby zawsze do pierwszej z nich.
 */
export function injectHeadingIds(body: string): { html: string; headings: PostHeading[] } {
  const headings: PostHeading[] = []
  const used = new Map<string, number>()

  const html = body.replace(H2_RE, (_match, inner: string) => {
    const text = stripTags(inner)
    const base = headingSlug(decodeEntities(text)) || `sekcja-${headings.length + 1}`

    const seen = used.get(base) ?? 0
    used.set(base, seen + 1)
    const id = seen === 0 ? base : `${base}-${seen + 1}`

    headings.push({ id, text })
    return `<h2 id="${escapeHtml(id)}">${inner}</h2>`
  })

  return { html, headings }
}

/**
 * Spis tresci. <details open> zamiast wlasnego przelacznika: bez JS dziala i tak (na
 * desktopie zostaje rozwiniety, czyli w stanie docelowym), a publications.js zwija go
 * tylko na waskich ekranach, gdzie zajmowalby pol ekranu nad trescia.
 *
 * Ponizej dwoch naglowkow spis nie ma sensu — zwraca pusty string i renderer go pomija.
 */
export function renderPostToc(headings: PostHeading[]): string {
  if (headings.length < 2) return ''

  const items = headings
    .map(h => `<li><a href="#${escapeHtml(h.id)}" data-pub-toc-link>${h.text}</a></li>`)
    .join('\n        ')

  return `<details class="pub-toc" data-pub-toc open>
      <summary class="pub-toc-label">Na tej stronie</summary>
      <ol class="pub-toc-list">
        ${items}
      </ol>
    </details>`
}
