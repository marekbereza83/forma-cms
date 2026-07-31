'use client'
import { useEffect, useRef, useState } from 'react'
import { POST_BLOCK_ROLES, POST_BLOCK_CLASSES } from '@/lib/cms/post-blocks'

/**
 * Minimalny edytor WYSIWYG dla tresci publikacji.
 *
 * Zakres formatowania celowo pokrywa sie 1:1 z allowlista sanitizePostBody
 * (p, strong, em, ul, ol, li, a, h2, h3, br, tabele, blockquote z rola) — klient nie
 * moze wprowadzic znacznika, ktory i tak zostalby usuniety przy zapisie.
 *
 * Tabele (2026-07-31) maja juz przycisk w pasku: wstawiamy szkielet o zadanym rozmiarze
 * i pozwalamy dopisywac wiersze. Wczesniej wchodzily wylacznie przez wklejenie z
 * Worda/arkusza. Nadal NIE ma scalania komorek ani usuwania kolumn — to wymagaloby
 * pelnego UI tabelarycznego, nieproporcjonalnego do potrzeby.
 *
 * Bloki wyroznione (2026-07-31): przyciski nadaja zaznaczeniu ROLE z zamknietej listy
 * (post-blocks.ts) przez <blockquote class="...">. Klient wybiera znaczenie, nie wyglad —
 * kolory i etykiety ("Ryzykowny komunikat", "Bezpieczniejsze brzmienie") dokleja CSS
 * renderera, wiec nie da sie ich przekrecic literowka ani zrobic wlasnego koloru.
 *
 * Wklejanie normalizuje HTML (2026-07-28, patrz normalizePastedHtml ponizej) do tej
 * samej allowlisty zamiast kasowac je do czystego tekstu — klient nadal edytuje
 * TRESC/STRUKTURE (nagłowki, pogrubienia, listy, linki), nie FORME (fonty, kolory,
 * marginesy Worda i tak sa tu wycinane), zgodnie z CLAUDE.md. Listy w starym stylu
 * Worda (akapit + atrybut mso-list zamiast <ul><li>) NIE sa rekonstruowane — swiadoma
 * decyzja: rzadkie w praktyce, latwiej nadac punktory recznie przyciskiem "• Lista".
 *
 * Autorytatywna sanityzacja i tak dzieje sie po stronie serwera w saveSite().
 */

// Aliasy: tagi spoza allowlisty, ktore maja bliski semantyczny odpowiednik NA liscie —
// zamiast je wycinac (jak reszta), zamieniamy na odpowiednik, zeby tresc z Worda
// (ktory uzywa <b>/<i>/<h1>) nie traicla calego formatowania bez potrzeby.
const PASTE_TAG_ALIASES: Record<string, string> = {
  B: 'STRONG',
  I: 'EM',
  H1: 'H2',
  H4: 'H3',
  H5: 'H3',
  H6: 'H3',
}

// Musi pokrywac sie 1:1 z allowedTags w sanitizePostBody (collections.ts) — inaczej
// normalizacja po stronie klienta i serwera moglyby sie rozjechac.
const PASTE_ALLOWED_TAGS = new Set([
  'P', 'STRONG', 'EM', 'UL', 'OL', 'LI', 'A', 'H2', 'H3', 'BR',
  'TABLE', 'THEAD', 'TBODY', 'TR', 'TH', 'TD', 'CAPTION',
  'BLOCKQUOTE',
])

// Jedyne atrybuty strukturalne przepuszczane poza href linku — bez nich scalone komorki
// rozjezdzaja tabele. Zgodne z allowedAttributes w sanitizePostBody.
const PASTE_CELL_ATTRS = ['colspan', 'rowspan']

/**
 * Przepisuje drzewo wklejonego HTML na allowlist zgodna z sanitizePostBody: tagi spoza
 * listy sa "odwijane" (dzieci zostaja, znacznik znika — tak samo jak disallowedTagsMode:
 * 'discard' po stronie serwera), aliasy (b/i/h1/h4-6) zamieniane na odpowiednik z listy,
 * a wszystkie atrybuty poza href linku odrzucane (Word niesie mnostwo inline style/class).
 * Uzywa DOMParser (natywne API przegladarki) — bez nowej zaleznosci.
 */
function normalizePastedHtml(html: string): string {
  const sourceDoc = new DOMParser().parseFromString(html, 'text/html')

  function walk(source: Node, target: Node): void {
    source.childNodes.forEach(child => {
      if (child.nodeType === Node.TEXT_NODE) {
        target.appendChild(child.cloneNode())
        return
      }
      if (child.nodeType !== Node.ELEMENT_NODE) return // komentarze (mso conditional) itp. — pomijamy

      const el = child as HTMLElement
      const tagName = PASTE_TAG_ALIASES[el.tagName] ?? el.tagName

      if (tagName === 'A') {
        const href = el.getAttribute('href')
        const a = document.createElement('a')
        if (href && /^(https?:|mailto:)/i.test(href)) a.setAttribute('href', href)
        walk(el, a)
        target.appendChild(a)
        return
      }

      if (PASTE_ALLOWED_TAGS.has(tagName)) {
        const clean = document.createElement(tagName.toLowerCase())
        if (tagName === 'TH' || tagName === 'TD') {
          for (const attr of PASTE_CELL_ATTRS) {
            const v = el.getAttribute(attr)
            // Tylko dodatnie liczby calkowite — Word potrafi wstawic smieci, a sanitizer
            // po stronie serwera nie waliduje WARTOSCI atrybutu, tylko jego nazwe.
            if (v && /^[1-9]\d*$/.test(v.trim())) clean.setAttribute(attr, v.trim())
          }
        }
        // Rola bloku przezywa kopiowanie miedzy artykulami; kazda inna klasa (np. cytat
        // z Worda) odpada, bo sanitizer serwera i tak przepuszcza tylko te wartosci.
        if (tagName === 'BLOCKQUOTE') {
          const role = Array.from(el.classList).find(c => POST_BLOCK_CLASSES.includes(c))
          if (role) clean.className = role
        }
        walk(el, clean)
        target.appendChild(clean)
        return
      }

      // Tag spoza allowlisty (span/div/font/o:p ze stylami Worda, style/script...) —
      // odwijamy: tresc zostaje, sam znacznik i jego atrybuty znikaja.
      walk(el, target)
    })
  }

  const wrapper = document.createElement('div')
  walk(sourceDoc.body, wrapper)
  return wrapper.innerHTML
}

/** Najblizszy przodek o jednym ze wskazanych tagow, zatrzymujac sie na korzeniu edytora. */
function ancestorWithTag(node: Node | null, root: HTMLElement, tags: string[]): HTMLElement | null {
  let el: Element | null = node instanceof Element ? node : node?.parentElement ?? null
  while (el && el !== root) {
    if (tags.includes(el.tagName)) return el as HTMLElement
    el = el.parentElement
  }
  return null
}

/** Zdejmuje znacznik, zostawiajac jego dzieci w tym samym miejscu drzewa. */
function unwrapElement(el: HTMLElement): void {
  const parent = el.parentNode
  if (!parent) return
  while (el.firstChild) parent.insertBefore(el.firstChild, el)
  parent.removeChild(el)
}

type Props = {
  value: string
  onChange: (html: string) => void
}

const BLOCK_BUTTONS = [
  { cmd: 'bold',                 label: 'B',  title: 'Pogrubienie',      style: { fontWeight: 700 } },
  { cmd: 'italic',               label: 'I',  title: 'Kursywa',          style: { fontStyle: 'italic' } },
  { cmd: 'formatBlock', arg: 'p',  label: 'Akapit', title: 'Zwykły akapit' },
  { cmd: 'formatBlock', arg: 'h2', label: 'H2',     title: 'Nagłówek sekcji — trafia do spisu treści artykułu' },
  { cmd: 'formatBlock', arg: 'h3', label: 'H3',     title: 'Nagłówek niższego poziomu' },
  { cmd: 'insertUnorderedList',  label: '• Lista',   title: 'Lista punktowana' },
  { cmd: 'insertOrderedList',    label: '1. Lista',  title: 'Lista numerowana' },
] as const

export default function RichTextEditor({ value, onChange }: Props) {
  const editorRef = useRef<HTMLDivElement>(null)
  const savedRange = useRef<Range | null>(null)
  const [showLinkInput, setShowLinkInput] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [showTableInput, setShowTableInput] = useState(false)
  const [tableCols, setTableCols] = useState(3)
  const [tableRows, setTableRows] = useState(2)

  // Bez tego przegladarka wstawia <div> na Enter — a <div> nie jest na allowlist,
  // wiec sanitizer usunalby znacznik i skleil akapity w jeden blok tekstu.
  useEffect(() => {
    try {
      document.execCommand('defaultParagraphSeparator', false, 'p')
    } catch {
      /* starsze przegladarki — i tak normalizujemy przy zapisie */
    }
  }, [])

  // innerHTML ustawiamy tylko gdy tresc rozjechala sie ze stanem (np. przelaczenie
  // artykulu). Bezwarunkowy zapis przy kazdym renderze resetowalby karetke do poczatku.
  useEffect(() => {
    const el = editorRef.current
    if (el && el.innerHTML !== value) el.innerHTML = value
  }, [value])

  function emitChange() {
    if (editorRef.current) onChange(editorRef.current.innerHTML)
  }

  function exec(cmd: string, arg?: string) {
    document.execCommand(cmd, false, arg)
    editorRef.current?.focus()
    emitChange()
  }

  function placeCaretIn(el: HTMLElement) {
    const range = document.createRange()
    range.setStart(el, 0)
    range.collapse(true)
    const selection = window.getSelection()
    selection?.removeAllRanges()
    selection?.addRange(range)
  }

  /**
   * Nadaje zaznaczonym blokom role z zamknietej listy (callout / przyklad komunikatu).
   *
   * Celowo BEZ execCommand('formatBlock', 'blockquote'): przegladarki roznie interpretuja
   * te komende dla cytatu (jedna zawija blok, druga go podmienia), a klasy i tak nie da sie
   * nia ustawic. Range API daje ten sam wynik wszedzie.
   */
  function applyBlockRole(className: string) {
    const root = editorRef.current
    const selection = window.getSelection()
    if (!root || !selection || selection.rangeCount === 0) return

    const existing = ancestorWithTag(selection.anchorNode, root, ['BLOCKQUOTE'])
    if (existing) {
      // Ponowne klikniecie tej samej roli zdejmuje wyroznienie; inna rola je podmienia.
      if (existing.classList.contains(className)) unwrapElement(existing)
      else existing.className = className
      root.focus()
      emitChange()
      return
    }

    // Zawijamy CALE bloki najwyzszego poziomu objete zaznaczeniem, nie sam zaznaczony
    // fragment — callout obejmujacy pol akapitu nie mialby sensu.
    const blocks = Array.from(root.children).filter(child =>
      selection.getRangeAt(0).intersectsNode(child),
    ) as HTMLElement[]

    const quote = document.createElement('blockquote')
    quote.className = className

    if (blocks.length === 0) {
      // Pusty edytor — nie ma czego zawijac, wiec zakladamy pusty blok i wchodzimy do srodka.
      const paragraph = document.createElement('p')
      paragraph.appendChild(document.createElement('br'))
      quote.appendChild(paragraph)
      root.appendChild(quote)
      root.focus()
      placeCaretIn(paragraph)
    } else {
      blocks[0].before(quote)
      blocks.forEach(block => quote.appendChild(block))
      root.focus()
    }
    emitChange()
  }

  // 'removeFormat' czysci TYLKO inline formatowanie (bold/italic/link) — udokumentowane
  // zachowanie tej komendy w kazdej przegladarce, nie usuwa formatBlock (h2/h3). Bez
  // dolozenia formatBlock('p') przycisk "Wyczysc" nie potrafil sprowadzic naglowka
  // z powrotem do zwyklego akapitu, mimo ze do tego mial sluzyc. Zdjecie wyroznienia
  // doszlo razem z blokami — inaczej tresc raz wlozona do calloutu nie mialaby wyjscia
  // poza ponownym trafieniem w ten sam przycisk roli.
  function clearFormatting() {
    const root = editorRef.current
    const selection = window.getSelection()
    const quote = root && selection ? ancestorWithTag(selection.anchorNode, root, ['BLOCKQUOTE']) : null

    document.execCommand('removeFormat')
    document.execCommand('formatBlock', false, 'p')
    if (quote) unwrapElement(quote)

    root?.focus()
    emitChange()
  }

  function openLinkInput() {
    const selection = window.getSelection()
    if (selection && selection.rangeCount > 0) {
      // Zapisujemy zaznaczenie, bo klikniecie w pole URL zabiera focus edytorowi.
      savedRange.current = selection.getRangeAt(0).cloneRange()
    }
    setLinkUrl('')
    setShowLinkInput(true)
  }

  function applyLink() {
    const url = linkUrl.trim()
    if (!url) return setShowLinkInput(false)

    // Tylko http(s) i mailto — reszta (np. javascript:) i tak wylecialaby przy
    // zapisie, ale lepiej powiedziec o tym od razu niz po cichu zgubic link.
    if (!/^(https?:\/\/|mailto:)/i.test(url)) {
      alert('Adres musi zaczynać się od https:// albo mailto:')
      return
    }

    const selection = window.getSelection()
    if (selection && savedRange.current) {
      selection.removeAllRanges()
      selection.addRange(savedRange.current)
    }
    document.execCommand('createLink', false, url)
    setShowLinkInput(false)
    editorRef.current?.focus()
    emitChange()
  }

  function openTableInput() {
    const selection = window.getSelection()
    if (selection && selection.rangeCount > 0) {
      savedRange.current = selection.getRangeAt(0).cloneRange()
    }
    setShowTableInput(true)
  }

  function insertTable() {
    const cols = Math.min(6, Math.max(1, tableCols))
    const rows = Math.min(20, Math.max(1, tableRows))

    const headRow = `<tr>${Array.from({ length: cols }, (_, i) => `<th>Kolumna ${i + 1}</th>`).join('')}</tr>`
    const bodyRow = `<tr>${Array.from({ length: cols }, () => '<td>&nbsp;</td>').join('')}</tr>`
    // Pusty akapit ZA tabela jest konieczny: gdy tabela konczy tresc, nie ma gdzie
    // ustawic karetki, zeby pisac dalej — w contentEditable nie da sie wyjsc "za" ostatni
    // element blokowy, ktory nie przyjmuje tekstu bezposrednio.
    const html = `<table><thead>${headRow}</thead><tbody>${Array.from({ length: rows }, () => bodyRow).join('')}</tbody></table><p><br></p>`

    const selection = window.getSelection()
    if (selection && savedRange.current) {
      selection.removeAllRanges()
      selection.addRange(savedRange.current)
    }
    editorRef.current?.focus()
    document.execCommand('insertHTML', false, html)
    setShowTableInput(false)
    emitChange()
  }

  function addTableRow() {
    const root = editorRef.current
    const selection = window.getSelection()
    if (!root || !selection || selection.rangeCount === 0) return

    const table = ancestorWithTag(selection.anchorNode, root, ['TABLE'])
    if (!table) {
      alert('Ustaw kursor w tabeli, żeby dodać wiersz.')
      return
    }

    const body = table.querySelector('tbody') ?? table
    const template = body.querySelector('tr')
    const colCount = template?.children.length || table.querySelectorAll('thead th').length || 2

    const row = document.createElement('tr')
    for (let i = 0; i < colCount; i++) {
      const cell = document.createElement('td')
      cell.innerHTML = '&nbsp;'
      row.appendChild(cell)
    }
    body.appendChild(row)

    root.focus()
    placeCaretIn(row.firstElementChild as HTMLElement)
    emitChange()
  }

  return (
    <div className="rte">
      <div className="rte-toolbar">
        {BLOCK_BUTTONS.map(btn => (
          <button
            key={btn.label}
            type="button"
            title={btn.title}
            className="rte-btn"
            style={'style' in btn ? btn.style : undefined}
            // preventDefault utrzymuje zaznaczenie w edytorze — bez tego klikniecie
            // przycisku zabiera focus i execCommand nie ma na czym dzialac.
            onMouseDown={e => e.preventDefault()}
            onClick={() => exec(btn.cmd, 'arg' in btn ? btn.arg : undefined)}
          >
            {btn.label}
          </button>
        ))}
        <button
          type="button"
          title="Wstaw link"
          className="rte-btn"
          onMouseDown={e => e.preventDefault()}
          onClick={openLinkInput}
        >
          Link
        </button>
        <button
          type="button"
          title="Wstaw tabelę"
          className="rte-btn"
          onMouseDown={e => e.preventDefault()}
          onClick={openTableInput}
        >
          Tabela
        </button>
        <button
          type="button"
          title="Dodaj wiersz do tabeli, w której stoi kursor"
          className="rte-btn"
          onMouseDown={e => e.preventDefault()}
          onClick={addTableRow}
        >
          + Wiersz
        </button>

        <span className="rte-toolbar-sep" aria-hidden="true" />

        {POST_BLOCK_ROLES.map(role => (
          <button
            key={role.className}
            type="button"
            title={role.title}
            className="rte-btn"
            onMouseDown={e => e.preventDefault()}
            onClick={() => applyBlockRole(role.className)}
          >
            {role.label}
          </button>
        ))}

        <button
          type="button"
          title="Usuń formatowanie z zaznaczenia — nagłówek wraca do zwykłego akapitu, wyróżniony blok traci wyróżnienie"
          className="rte-btn"
          onMouseDown={e => e.preventDefault()}
          onClick={clearFormatting}
        >
          Wyczyść
        </button>
      </div>

      {showLinkInput && (
        <div className="rte-link-row">
          <input
            type="text"
            autoFocus
            placeholder="https://..."
            value={linkUrl}
            onChange={e => setLinkUrl(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') { e.preventDefault(); applyLink() }
              if (e.key === 'Escape') setShowLinkInput(false)
            }}
          />
          <button type="button" className="btn btn-ghost" onClick={applyLink}>Wstaw</button>
          <button type="button" className="btn btn-ghost" onClick={() => setShowLinkInput(false)}>Anuluj</button>
        </div>
      )}

      {showTableInput && (
        <div className="rte-link-row">
          <label className="rte-table-field">
            Kolumny
            <input
              type="number"
              min={1}
              max={6}
              autoFocus
              value={tableCols}
              onChange={e => setTableCols(Number(e.target.value))}
            />
          </label>
          <label className="rte-table-field">
            Wiersze
            <input
              type="number"
              min={1}
              max={20}
              value={tableRows}
              onChange={e => setTableRows(Number(e.target.value))}
            />
          </label>
          <button type="button" className="btn btn-ghost" onClick={insertTable}>Wstaw</button>
          <button type="button" className="btn btn-ghost" onClick={() => setShowTableInput(false)}>Anuluj</button>
        </div>
      )}

      <div
        ref={editorRef}
        className="rte-surface"
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label="Treść publikacji"
        onInput={emitChange}
        onBlur={emitChange}
        onPaste={e => {
          e.preventDefault()
          const html = e.clipboardData.getData('text/html')
          const cleanHtml = html.trim() ? normalizePastedHtml(html) : ''
          if (cleanHtml.trim()) {
            document.execCommand('insertHTML', false, cleanHtml)
          } else {
            // Brak HTML w schowku (albo normalizacja zostawila pustke) — czysty tekst,
            // jak wczesniej.
            const text = e.clipboardData.getData('text/plain')
            document.execCommand('insertText', false, text)
          }
          emitChange()
        }}
      />
    </div>
  )
}
