'use client'
import { useEffect, useRef, useState } from 'react'

/**
 * Minimalny edytor WYSIWYG dla tresci publikacji.
 *
 * Zakres formatowania celowo pokrywa sie 1:1 z allowlista sanitizePostBody
 * (p, strong, em, ul, ol, li, a, h2, h3, br + tabele) — klient nie moze wprowadzic
 * znacznika, ktory i tak zostalby usuniety przy zapisie.
 *
 * Tabel nie da sie wstawic z paska narzedzi (brak przycisku) — wchodza wylacznie
 * przez wklejenie z Worda/arkusza. Tworzenie tabeli od zera w contentEditable
 * wymagaloby wlasnego UI (dodaj wiersz/kolumne, scalanie), co jest nieproporcjonalne
 * do potrzeby; kto ma tabele, ma ja juz w zrodle.
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

type Props = {
  value: string
  onChange: (html: string) => void
}

const BLOCK_BUTTONS = [
  { cmd: 'bold',                 label: 'B',  title: 'Pogrubienie',      style: { fontWeight: 700 } },
  { cmd: 'italic',               label: 'I',  title: 'Kursywa',          style: { fontStyle: 'italic' } },
  { cmd: 'formatBlock', arg: 'p',  label: 'Akapit', title: 'Zwykły akapit' },
  { cmd: 'formatBlock', arg: 'h2', label: 'H2',     title: 'Nagłówek sekcji' },
  { cmd: 'formatBlock', arg: 'h3', label: 'H3',     title: 'Nagłówek niższego poziomu' },
  { cmd: 'insertUnorderedList',  label: '• Lista',   title: 'Lista punktowana' },
  { cmd: 'insertOrderedList',    label: '1. Lista',  title: 'Lista numerowana' },
] as const

export default function RichTextEditor({ value, onChange }: Props) {
  const editorRef = useRef<HTMLDivElement>(null)
  const savedRange = useRef<Range | null>(null)
  const [showLinkInput, setShowLinkInput] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')

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
          title="Usuń formatowanie z zaznaczenia"
          className="rte-btn"
          onMouseDown={e => e.preventDefault()}
          onClick={() => exec('removeFormat')}
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
