// Podglad wyniku wyszukiwania Google — wartosc tego komponentu to pokazanie UCIECIA
// przy limitach dlugosci, nie sam wyglad. Renderuje wartosci EFEKTYWNE (po zastosowaniu
// domyslek tytul/opis), nie surowe pola override — inaczej przy pustym metaTitle/
// metaDescription wygladalby na pusty, co byloby mylace.
const TITLE_TRUNCATE_AT = 60
const DESCRIPTION_TRUNCATE_AT = 155

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max - 1).trimEnd() + '…' : text
}

export default function GooglePreview({ title, description, url }: { title: string; description: string; url: string }) {
  return (
    <div className="google-preview" aria-label="Podgląd wyniku wyszukiwania Google">
      <div className="google-preview-url">{url}</div>
      <div className="google-preview-title">{truncate(title, TITLE_TRUNCATE_AT)}</div>
      <div className="google-preview-description">{truncate(description, DESCRIPTION_TRUNCATE_AT)}</div>
    </div>
  )
}
