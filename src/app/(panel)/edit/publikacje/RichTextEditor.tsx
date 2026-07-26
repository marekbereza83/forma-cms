'use client'
import { useEffect, useRef, useState } from 'react'

/**
 * Minimalny edytor WYSIWYG dla tresci publikacji.
 *
 * Zakres formatowania celowo pokrywa sie 1:1 z allowlista sanitizePostBody
 * (p, strong, em, ul, ol, li, a, h2, h3, br) — klient nie moze wprowadzic
 * znacznika, ktory i tak zostalby usuniety przy zapisie.
 *
 * Wklejanie jest zawsze konwertowane na czysty tekst: tresc kopiowana z Worda
 * czy stron WWW niesie wlasne style i klasy, ktore lamalyby spojnosc typografii
 * (klient edytuje TRESC, nie FORME — patrz CLAUDE.md).
 *
 * Autorytatywna sanityzacja i tak dzieje sie po stronie serwera w saveSite().
 */

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
          const text = e.clipboardData.getData('text/plain')
          document.execCommand('insertText', false, text)
          emitChange()
        }}
      />
    </div>
  )
}
