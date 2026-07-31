/**
 * Role semantyczne blokow wyroznionych w tresci publikacji.
 *
 * Klient zaznacza fragment i nadaje mu ROLE ("to jest przyklad ryzykownego komunikatu"),
 * nie wyglad — kolor, ramka i tlo pochodza wylacznie z CSS renderera. To ta sama granica
 * forma/tresc, co w reszcie systemu (patrz CLAUDE.md): zamknieta lista rol jest tresciowa,
 * dowolny atrybut class juz nie, dlatego sanitizer przepuszcza tylko te wartosci.
 *
 * JEDNO zrodlo prawdy dla trzech miejsc, ktore musza sie zgadzac:
 *   1. allowedClasses w sanitizePostBody (validation/collections.ts) — zapis na serwerze
 *   2. przyciski paska narzedzi + normalizacja wklejania (RichTextEditor.tsx) — klient
 *   3. style .f-callout / .f-chat--risk / .f-chat--safe (forma-components.css) — render
 *
 * Ten plik celowo nie ma zadnych importow: RichTextEditor to komponent kliencki, a
 * collections.ts ciagnie sanitize-html (biblioteka node). Wspolna stala musi wiec lezec
 * osobno, zeby sanitize-html nie trafil do bundla przegladarki.
 */

export type PostBlockRole = {
  /** Wartosc atrybutu class na <blockquote>. */
  className: string
  /** Napis na przycisku w pasku narzedzi edytora. */
  label: string
  /** Tooltip przycisku — tlumaczy klientowi, kiedy tego uzyc. */
  title: string
}

export const POST_BLOCK_ROLES: readonly PostBlockRole[] = [
  {
    className: 'f-callout',
    label: 'W praktyce',
    title: 'Wyrozniony blok "W praktyce" — przyklad zastosowania, wskazowka, uwaga na marginesie',
  },
  {
    className: 'f-chat--risk',
    label: 'Ryzykowny',
    title: 'Przyklad ryzykownego komunikatu — sformulowanie, ktorego lepiej unikac',
  },
  {
    className: 'f-chat--safe',
    label: 'Bezpieczniejszy',
    title: 'Przyklad bezpieczniejszego brzmienia — zalecana wersja tego samego komunikatu',
  },
] as const

/** Lista samych klas — allowlista dla sanitizera i dla normalizacji wklejanego HTML. */
export const POST_BLOCK_CLASSES: string[] = POST_BLOCK_ROLES.map(r => r.className)
