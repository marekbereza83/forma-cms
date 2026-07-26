# FORMA Wizerunku — Design System

Źródło prawdy dla projektowania nowych ekranów. **Tokeny nie są propozycją — są
odczytane z produkcyjnego CSS** (`public/assets/css/design-system-agency.css`,
`forma-layout.css`, `forma-components.css`) i obowiązują na żywej stronie
formawizerunku.pl. Każdy nowy ekran musi dać się złożyć z tych wartości.

---

## 1. Kontekst i odbiorca

**Produkt:** FORMA Wizerunku — jednoosobowa pracownia projektująca strony
internetowe dla polskich kancelarii adwokackich i radcowskich. System projektowy
nazywa się **PACTA**.

**Odbiorca:** adwokat lub radca prawny, 35–60 lat, prowadzący własną kancelarię.
Ocenia wykonawcę tak, jak jego klienci oceniają jego samego — po sygnałach
rzetelności, nie po efektach wizualnych.

**Konsekwencja dla designu:** powaga i precyzja zamiast atrakcyjności. Strona ma
wyglądać jak narzędzie profesjonalisty, nie jak landing startupu.

---

## 2. Atmosfera (vibe)

- **Ciemny, techniczny, redakcyjny.** Near-black tło, wysoki kontrast typografii.
- **Powściągliwy.** Jeden kolor akcentu, używany oszczędnie.
- **Gęsty informacyjnie, ale oddychający.** Duże odstępy między sekcjami,
  zwarte bloki treści.
- **Bez ozdobników.** Zero gradientów dekoracyjnych, glow, ilustracji stockowych,
  emoji, „zabawnych" mikrokopii.

Słowa kluczowe dla generatora: `dark editorial`, `high-contrast typography`,
`restrained`, `precise`, `professional services`, `technical`, `sober`.

Anty-wzorce: `playful`, `vibrant`, `gradient mesh`, `glassmorphism`, `neumorphism`,
`startup landing page`, `illustration-heavy`.

---

## 3. Kolory

Nazwy ról są wiążące — nie zmieniaj przeznaczenia koloru.

| Rola | Token | Hex | Zastosowanie |
|---|---|---|---|
| Tło główne | `--background` | `#0D1117` | Tło strony, sekcje bazowe |
| Powierzchnia | `--surface` | `#161B22` | Karty, nawigacja, stopka, sekcje naprzemienne |
| Powierzchnia uniesiona | `--surface-raised` | `#1C2430` | Hover karty, element wyróżniony |
| Obramowanie | `--border` | `#21262D` | Subtelne linie, krawędzie kart, dividery |
| **Akcent** | `--accent` | `#6366F1` | **Wyłącznie:** CTA, stany aktywne, numeraly procesu, etykiety sekcji |
| Akcent hover | `--accent-hover` | `#818CF8` | Hover na CTA |
| Akcent tło | `--accent-muted` | `rgba(99,102,241,0.10)` | Tło tagu, zaznaczenie |
| Tekst główny | `--text-primary` | `#F0F6FC` | Nagłówki, treść zasadnicza |
| Tekst drugorzędny | `--text-secondary` | `#8B949E` | Meta, opisy, lead |
| Tekst wyciszony | `--text-muted` | `#484F58` | Placeholdery, stany nieaktywne |
| Sukces | `--success` | `#3FB950` | Checkmarki na listach cech |
| Błąd | `--danger` | `#F85149` | Wyłącznie walidacja formularzy |

**Reguła akcentu:** indygo `#6366F1` to najrzadszy kolor na stronie. Jeśli na
jednym ekranie pojawia się więcej niż 3–4 razy, projekt jest zły. Nigdy jako
tło dużej powierzchni, nigdy jako kolor tekstu akapitowego.

---

## 4. Typografia

Trzy kroje, każdy o ściśle określonej roli:

| Krój | Token | Rola — wyłącznie |
|---|---|---|
| **Plus Jakarta Sans** | `--font-display` | Nagłówki (H1–H3), CTA, tytuły kart |
| **Inter** | `--font-body` | Treść, lead, opisy, meta |
| **Space Mono** | `--font-mono` | Etykiety sekcji, numeraly procesu, ceny, daty |

Space Mono jest sygnaturą systemu — nadaje techniczny charakter. Używać
**tylko** wersalikami z trackingiem, w małych rozmiarach, albo jako duży numeral.
Nigdy do zdań.

### Skala (1rem = 16px)

`--text-xs` 12px · `--text-sm` 13px · `--text-base` 16px · `--text-lg` 18px ·
`--text-xl` 20px · `--text-2xl` 24px · `--text-3xl` 30px · `--text-4xl` 36px ·
`--text-5xl` 48px · `--text-6xl` 60px · `--text-7xl` 72px

### Klasy semantyczne

| Klasa | Rozmiar | Waga | Line-height | Tracking |
|---|---|---|---|---|
| `.f-display` (hero H1) | `clamp(3rem, 8vw, 5rem)` | 800 | 1.1 | −0.02em |
| `#hero-heading` (H1 strony głównej) | `clamp(2.5rem, 7vw, 4.5rem)` | 800 | 1.1 | −0.02em |
| `.f-headline` (H2 sekcji) | `clamp(2rem, 5vw, 3rem)` | 700 | 1.25 | −0.01em |
| `.f-subheadline` | `clamp(1.25rem, 3vw, 1.75rem)` | 600 | 1.25 | 0 |
| `.f-lead` | 18px | 400 | 1.65 | 0 | 
| `.f-body` | 16px | 400 | 1.65 | 0 |
| `.section-label` | 12px | 700 | — | 0.08em, UPPERCASE, mono, **kolor akcentu** |

**Długość wiersza w tekście ciągłym: maks. ~70 znaków** (`.max-prose`).

---

## 5. Układ i rytm

- **Kontener:** `--container-max: 1100px`, gutter `--container-px: 1.5rem`
  (desktop `--space-8` = 32px).
- **Rytm sekcji:** `--section-py-desktop: 96px`, `--section-py-mobile: 56px`.
- **Siatka:** 8pt grid (`--space-1` … `--space-32`).
- **Tła naprzemienne:** `.bg-base` (#0D1117) i `.bg-surface` (#161B22) — sekcje
  przeplatają się, co daje rytm bez linii.
- **Dividery:** zawsze `1px solid var(--border)`. **Nigdy gradient.**
- **Grid pomocniczy:** `.grid-2` (1→2 kol. od 640px), `.grid-3` (1→2 od 640px →
  3 od 900px).

Breakpointy: **640px**, **768px**, **900px**, **1024px**.

---

## 6. Komponenty

### Karta (`.card`)
```
background: var(--surface)
border: 1px solid var(--border)
border-radius: var(--radius-lg)   /* 10px */
padding: var(--space-6)           /* 24px */
```
Hover (`.interactive-card`): `translateY(-4px)`, `border-color: var(--accent)`,
`background: var(--surface-raised)`, przejście 200ms.

### Etykieta sekcji (`.section-label`)
Space Mono, 12px, 700, UPPERCASE, tracking 0.08em, **kolor akcentu**. Stoi
bezpośrednio nad nagłówkiem H2. To główny sygnał hierarchii w tym systemie.

### CTA (`.btn-primary`)
Wysokość `--cta-height: 48px`, padding poziomy 24px, `border-radius: 6px`,
Plus Jakarta Sans 15px / 600. Tło `--accent`, hover `--accent-hover`.

### Promienie
`--radius-sm` 4px · `--radius` 6px · `--radius-lg` 10px · `--radius-xl` 16px.
Karty 10px, przyciski 6px. Nic nie jest w pełni zaokrąglone poza pigułkami tagów.

---

## 7. Ruch

- Easing: `cubic-bezier(0.4, 0, 0.2, 1)`.
- Czasy: `--duration-fast` 120ms · `--duration` 200ms · `--duration-slow` 350ms.
- Wzorce: `reveal` przy scrollu (fade + translateY), `stagger-reveal` dla grup
  kart, uniesienie karty przy hover.
- Ruch jest **funkcjonalny**: potwierdza interakcję lub porządkuje wejście treści.
  Zero animacji dekoracyjnych, zero parallaxu, zero autoplay.

---

## 8. Twarde ograniczenia (nienegocjowalne)

Wynikają z architektury produktu, nie z gustu. Projekt, który je łamie, jest
niewdrażalny.

1. **Klient edytuje treść, nigdy formę.** Żaden ekran nie może zakładać, że
   użytkownik wybiera układ, kolor, font czy kolejność sekcji. To fundament
   produktu — renderer wymusza formę, CMS oddaje tylko dane.
2. **Jedno źródło ceny.** Kwota istnieje w dokładnie jednym miejscu w modelu
   danych. Projekt nie może powielać ceny w sposób wymagający ręcznej synchronizacji.
3. **Zgodność z etyką zawodów prawniczych.** Bez obietnic wyniku, reklamy
   porównawczej, natarczywych CTA, sztucznej pilności („zostały 2 miejsca"),
   liczników czasu i określeń wartościujących bez pokrycia.
4. **Dostępność:** kontrast tekstu min. WCAG AA, jeden `<h1>` na stronę, pełna
   obsługa klawiatury, widoczny focus, `prefers-reduced-motion` respektowane.
5. **Bez zewnętrznych zasobów w treści.** Brak ikon z CDN, brak zdjęć stockowych.
   Ikony to inline SVG, `stroke-width: 1.5`, 20×20.

---

## 9. Wzorce do naśladowania z istniejących stron

- **Sekcja = etykieta (mono, akcent) + H2 + lead + zawartość.** Ten trójkąt
  powtarza się na całej stronie i musi być zachowany na nowych ekranach.
- **Statystyka:** duża liczba (Space Mono, akcent) + krótki opis + opcjonalna
  atrybucja źródła drobnym tekstem **pod całym rzędem**, nie w karcie.
- **FAQ:** akordeon, pytanie jako `<button aria-expanded>`, odpowiedź obecna
  w HTML od razu (zwinięta CSS-em, nie usunięta) — wymóg SEO.
- **Stopka:** ciemniejsza powierzchnia, linki w jednym rzędzie, kontakt po prawej.
