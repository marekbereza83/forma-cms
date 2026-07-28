'use client'
import { useEffect, useId, useRef, useState } from 'react'

// Ikona pomocy "i" + tooltip. Dwa niezalezne stany zamiast jednego "open":
//  - hovered: kursor nad przyciskiem (tylko desktop, mysz)
//  - pinned:  otwarte klikiem/tapnieciem lub focusem klawiatury
// widoczny = hovered || pinned. Klik/focus USTAWIAJA pinned (nie przelaczaja) —
// dzieki temu klikniecie w trakcie hover nie zamyka dymka pod kursorem (brak migotania).
// Zamkniecie wylacznie przez Esc lub klik poza komponentem (i przez blur/mouseleave).
export default function FieldHelp({ label, text, align = 'left' }: { label: string; text: string; align?: 'left' | 'right' }) {
  const [hovered, setHovered] = useState(false)
  const [pinned, setPinned] = useState(false)
  const wrapperRef = useRef<HTMLSpanElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const bubbleId = useId()
  const visible = hovered || pinned

  // Nasluchy globalne podpiete TYLKO gdy pinned=true (nie dla kazdej z 7 ikon na stale).
  useEffect(() => {
    if (!pinned) return

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setPinned(false)
        buttonRef.current?.focus()
      }
    }
    function handlePointerDown(e: PointerEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setPinned(false)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('pointerdown', handlePointerDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('pointerdown', handlePointerDown)
    }
  }, [pinned])

  return (
    <span
      ref={wrapperRef}
      className="field-help"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        ref={buttonRef}
        type="button"
        className="field-help-button"
        aria-label={`Pomoc: ${label}`}
        aria-describedby={bubbleId}
        onClick={() => setPinned(true)}
        onFocus={() => setPinned(true)}
        onBlur={() => setPinned(false)}
      >
        i
      </button>
      {/* Zawsze w DOM, ukryte tylko wizualnie — aria-describedby nie dziala, gdy element
          jest wyjety z drzewa dostepnosci (display:none / warunkowe renderowanie). */}
      <span
        role="tooltip"
        id={bubbleId}
        className={`field-help-bubble${align === 'right' ? ' is-right' : ''}${visible ? ' is-visible' : ''}`}
      >
        {text}
      </span>
    </span>
  )
}
