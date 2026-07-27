// Startowy słownik kategorii dla bloga publikacji FORMA. Nie jest per-tenant —
// blog jest dziś funkcją własnej pracowni (kontekst: .stitch/DESIGN.md §1), nie
// generyczną kategoryzacją dla każdej kancelarii. Do rozszerzenia/zmiany treścią,
// nie architekturą.
export const POST_CATEGORIES = [
  'DESIGN',
  'TECHNOLOGIA',
  'STRATEGIA',
  'UX/UI',
  'CASE STUDY',
] as const

export type PostCategory = typeof POST_CATEGORIES[number]
