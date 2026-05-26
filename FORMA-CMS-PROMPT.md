# FORMA CMS — Master Prompt (Claude Code)

> Wklej całość do Claude Code w pustym folderze repo.
> Wcześniej wrzuć do `./reference/`:
> `forma-production/` (cały katalog), `SYSTEM-AGENCY.md`, `section-recipes-agency.md`.
> Ten plik trzymaj w repo jako `CONTEXT.md` — Claude Code czyta go na starcie każdej sesji.

---

## 1. Kontekst i cel produktu

Buduję SaaS, który generuje i hostuje strony dla klientów (kancelarie prawne,
firmy doradcze, specjalistyczne usługi B2B). Mam gotowy wyrenderowany szablon
w `./reference/forma-production/` oraz design contract w
`./reference/SYSTEM-AGENCY.md` i recipes sekcji w
`./reference/section-recipes-agency.md`.

Buduję **CMS dla KLIENTA KOŃCOWEGO** (np. właściciel kancelarii), żeby sam
wprowadzał **drobne zmiany** na swojej stronie, bez kontaktu ze mną:
nagłówki, treści, cena, dane kontaktowe oraz **kolekcje rosnące** —
**wydarzenia** i **newsletter / aktualności**.

JEDEN silnik obsługuje WIELU klientów (**multi-tenant**). Każdy klient ma
osobne logowanie i widzi tylko swoją stronę. NIE buduję osobnego CMS
doklejanego do każdej strony — wspólny silnik, izolacja danych per tenant,
jeden deploy, koszt krańcowy nowego klienta ~ zero.

### Najważniejsza zasada (to jest moat — nie łam jej)

To **NIE** jest WordPress ani Webflow. **Klient edytuje TREŚĆ (dane), renderer
narzuca FORMĘ (reguły).** Klient nie może dodawać sekcji, zmieniać układu,
fontów, kolorów ani łamać systemu projektowego. System FORMA jest niezmienny i
walidowany przy każdym zapisie. Jeśli zaproponujesz "dajmy klientowi wybór
kolorów / czcionek / układu" — to odejście od modelu produktu w stronę zwykłego
buildera. Tego nie robimy.

---

## 2. Zakres edycji klienta (trzymaj się ściśle)

### Typ 1 — edycja istniejących pól
- nagłówek hero (headline + subheadline)
- teksty sekcji (opis usług, rozwiązanie)
- cena ("od X zł netto")
- dane kontaktowe (email, telefon)
- treść CTA

### Typ 2 — kolekcje (klient dodaje / edytuje / usuwa wpisy)
- **Wydarzenia** — tytuł, data, opis, opcjonalny link; dodawanie, edycja,
  usuwanie, archiwizacja przeszłych.
- **Newsletter / aktualności** — tytuł, data publikacji, treść (richtext),
  status (szkic / opublikowany).

Kolekcje renderują się przez STAŁY szablon wpisu — klient wprowadza treść, nie
projektuje wyglądu.

### Czego klient NIE może (egzekwuj walidacją + renderem)
- dodać / usunąć sekcji strony
- zmienić układu, fontów, kolorów, systemu projektowego
- ukryć ceny ani zapisać "zapytaj o wycenę"
- usunąć wymaganych sekcji (hero, pricing, CTA finale)
- złamać reguł z `SYSTEM-AGENCY.md` ani "MUST NOT" z `section-recipes-agency.md`

Każdy zapis przechodzi walidację. Złamanie reguły twardej → zapis odrzucony z
czytelnym komunikatem po polsku.

---

## 3. Stack (nie zmieniaj bez pytania)

- Next.js 15 App Router + TypeScript
- Postgres + Prisma
- Auth: email + hasło (Auth.js), user ma `tenantId`
- Walidacja: Zod (+ custom validatory reguł FORMA)
- Render strony klienta: server-side do **statycznego HTML** — ten sam markup
  co w `forma-production/index.html`, te same pliki CSS z `assets/css/`
- Edytor: prosty panel **formularzowy** (NIE drag-and-drop, NIE WYSIWYG na całej
  stronie) — pola + zarządzanie kolekcjami

---

## 4. Kolejność budowy — rób DOKŁADNIE tak, commit po każdym kroku, zatrzymaj się i czekaj na "dalej"

### KROK 1 — Model danych (`SiteModel`)

Przeanalizuj `./reference/forma-production/*.html`. HTML jest już adresowalny:
markery `<!-- SEKCJA: -->`, `<section id="...">`, semantyczne klasy
`f-headline`/`f-body`/`section-label`/`f-stat`, statystyki z `data-target`.

Zaprojektuj schemat TS + Zod `SiteModel`:

```ts
SiteModel = {
  tenantId: string
  archetype: "trust-led" | "authority-led"   // na razie tylko te dwa
  designSystem: "forma"
  pages: Page[]
  collections: { events: EventItem[]; posts: PostItem[] }
}
Page = { slug: string; sections: Section[] }
Section = {
  id: string            // "hero", "pricing", "process"...
  recipe: string        // "A2", "A5"... z section-recipes
  fields: Record<string, Field>
}
Field = {
  type: "text" | "richtext" | "price" | "stat" | "cta" | "contact" | "list" | "image"
  value: unknown
  editable: boolean     // część pól zablokowana dla klienta
  constraints?: object  // np. price: format "od X zł netto"
}
EventItem = { id; title; date; description; link?; status }
PostItem  = { id; title; publishedAt?; body /*richtext*/; status }
```

Wyodrębnij PEŁNĄ listę edytowalnych pól z `index.html` (patrz Załącznik B).
Zapisz przykładowy `./fixtures/forma-site.json` odwzorowujący aktualną stronę.

### KROK 2 — Renderer (`SiteModel` → HTML)

Renderer produkuje DOKŁADNIE taki sam HTML jak `forma-production/` (ta sama
struktura sekcji, klasy CSS, dołączone te same CSS). Renderuje też kolekcje
(wydarzenia, newsletter) przez stały szablon wpisu.

**Test akceptacyjny:** render `./fixtures/forma-site.json` ≈ oryginalny
`index.html`. Whitespace OK; struktura / klasy / treść muszą się zgadzać.
Napisz ten test (snapshot lub DOM-diff). To jedyne pytanie, które się liczy
przed budową reszty: czy abstrakcja `site.json` wiernie odtwarza realny HTML.

### KROK 3 — Walidator reguł FORMA (NIE pomijaj — to moat)

Zakoduj reguły z Załącznika C jako walidatory uruchamiane PRZED każdym zapisem.
Każda reguła twarda ma test "próba złamania → błąd walidacji z komunikatem PL".

### KROK 4 — Multi-tenant + auth

Prisma wg Załącznika A. Każde zapytanie filtruje po `tenantId` z sesji (nigdy z
requestu klienta). Helper `getTenantScopedClient(session)` używany wszędzie.
Test izolacji: user tenanta A nie odczyta ani nie zapisze danych tenanta B.

### KROK 5 — Panel edycji klienta

Strony Next.js:
- `/dashboard` — lista stron + kolekcji klienta
- `/edit/fields` — formularz edycji pól Typu 1 (tylko `editable: true`)
- `/edit/events` — CRUD wydarzeń
- `/edit/posts` — CRUD newsletter / aktualności
- `/preview` — podgląd wyrenderowanej strony

Każdy zapis → walidacja (KROK 3) → komunikat sukcesu / błędu po polsku.
Pola `editable: false` NIE pojawiają się w panelu.

> NIE buduj publikacji / deployu na produkcję w tej iteracji — to iteracja 2.
> Najpierw udowodnij, że model i render działają na realnym HTML.

---

## ZAŁĄCZNIK A — Schemat Prisma (multi-tenant)

```prisma
// schema.prisma

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model Tenant {
  id        String   @id @default(cuid())
  name      String                          // np. "Kancelaria Wojtas"
  slug      String   @unique                // subdomena / ścieżka publikacji
  archetype String   @default("trust-led")  // "trust-led" | "authority-led"
  createdAt DateTime @default(now())

  users  User[]
  site   Site?
  events Event[]
  posts  Post[]
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String                          // hash (bcrypt / argon2)
  role      String   @default("client")     // "client" | "admin"
  tenantId  String
  tenant    Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())

  @@index([tenantId])
}

// Cała treść strony jako jeden zwalidowany dokument JSON (SiteModel).
// Pojedyncze źródło prawdy — render czyta stąd, nie z HTML.
model Site {
  id        String   @id @default(cuid())
  tenantId  String   @unique
  tenant    Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  model     Json                            // SiteModel (zwalidowany Zod przed zapisem)
  version   Int      @default(1)
  updatedAt DateTime @updatedAt
}

// Kolekcje rosnące — osobne tabele, nie pola w SiteModel,
// bo klient dodaje / usuwa wpisy w czasie.
model Event {
  id          String   @id @default(cuid())
  tenantId    String
  tenant      Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  title       String
  date        DateTime
  description String
  link        String?
  status      String   @default("published") // "draft" | "published" | "archived"
  createdAt   DateTime @default(now())

  @@index([tenantId, status])
}

model Post {
  id          String    @id @default(cuid())
  tenantId    String
  tenant      Tenant    @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  title       String
  body        String                          // richtext (sanitized HTML / markdown)
  publishedAt DateTime?
  status      String    @default("draft")     // "draft" | "published"
  createdAt   DateTime  @default(now())

  @@index([tenantId, status])
}

// Audit trail — każda zmiana klienta jest zapisana (odtwarzalność = Layer 9).
model EditLog {
  id        String   @id @default(cuid())
  tenantId  String
  userId    String
  action    String                            // "field.set" | "event.create" | ...
  target    String                            // np. "hero.headline"
  before    Json?
  after     Json?
  createdAt DateTime @default(now())

  @@index([tenantId, createdAt])
}
```

**ZASADA IZOLACJI:** każde zapytanie do `Site` / `Event` / `Post` / `EditLog`
MUSI filtrować po `tenantId` pobranym z sesji zalogowanego usera. Nigdy nie ufaj
`tenantId` z requestu klienta. Helper `getTenantScopedClient(session)` używany
wszędzie. Test: user tenanta A nie może odczytać ani zapisać danych tenanta B.

---

## ZAŁĄCZNIK B — Mapa pól edytowalnych (wyjęta 1:1 z realnego HTML)

To są DOKŁADNE węzły z `forma-production/`. Odwzoruj je w `SiteModel`.

**WAŻNE — pojedyncze źródło prawdy:** cena "4 500" występuje w HTML w DWÓCH
miejscach (hero `4 500 zł` oraz pricing card `4 500`). W `SiteModel` cena to
JEDNO pole (`pricing.standard.amount`), a renderer wstawia ją w oba miejsca.
Klient edytuje raz — to dowód, dlaczego model danych bije find-and-replace.

### index.html

| Sekcja (recipe) | Pole | Typ | editable | Źródło w HTML |
|---|---|---|---|---|
| hero (A2) | tag | text | true | `.tag-inline` "Strony dla kancelarii prawnych" |
| hero (A2) | headline | text | true | `h1.f-display` |
| hero (A2) | subheadline | richtext | true | `p.f-lead` (zawiera cenę inline) |
| hero (A2) | ctaPrimaryLabel | cta | true | "Zamów stronę" |
| hero (A2) | ctaMicrocopy | text | true | "Strona gotowa w 14 dni od briefu" |
| hero (A2) | ctaSecondaryLabel | cta | true | "Zobacz portfolio" |
| hero (A2) | phone | contact | true | `tel:+48500100200` |
| hero (A2) | visual / layout | — | **false** | redesign-animator (zablokowane) |
| problem (A3) | headline | text | true | `#problem h2` |
| problem (A3) | staty | stat | true | `.counter-stat` `data-target` / `data-suffix` |
| solution (A4) | headline | text | true | `#solution h2` |
| solution (A4) | body | richtext | true | `#solution p.f-body` |
| pricing (A5) | sectionHeadline | text | true | "Ile kosztuje strona…" |
| pricing (A5) | standard.label | text | true | "Standard" |
| pricing (A5) | standard.amount | price | true | "4 500" (format "od X zł netto") |
| pricing (A5) | standard.deliveryNote | text | true | "14 dni od briefu" |
| pricing (A5) | standard.features | list | true | `ul.pricing-features` (6 pozycji) |
| pricing (A5) | standard.ctaMicrocopy | text | true | "Wycena w 24h od briefu" |
| pricing (A5) | extended.label | text | true | "Rozszerzony" |
| pricing (A5) | extended.amount | price | true | "6 500" |
| pricing (A5) | extended.deliveryNote | text | true | "21 dni od briefu" |
| pricing (A5) | extended.features | list | true | `ul.pricing-features` (6 pozycji) |
| pricing (A5) | extended.ctaMicrocopy | text | true | "Bez zobowiązań" |
| pricing (A5) | liczba pakietów | — | **false** | max 2 — zablokowane |
| process (A7) | kroki (tytuł + opis) | list | true | numeracja Space Mono |
| process (A7) | numeracja (styl) | — | **false** | Space Mono numerals — zablokowane |
| cta-finale (A8) | headline | text | true | `#cta-finale h2` |
| cta-finale (A8) | ctaMicrocopy | text | true | obietnica dostawy (wymagane) |
| footer (A9) | email | contact | true | `mailto:` |
| footer (A9) | linki / układ | — | **false** | max 6 linków — zablokowane |
| nav (A1) | układ / CTA | — | **false** | zablokowane |

### proces.html (sekcje: proces-hero, timeline, deliverables, technologie, cennik-detail, faq, cta)
| Sekcja | Pole | Typ | editable |
|---|---|---|---|
| proces-hero | headline + lead | text/richtext | true |
| timeline | kroki (tytuł + opis) | list | true |
| timeline | numeracja (styl) | — | **false** |
| deliverables | pozycje | list | true |
| cennik-detail | ceny (te same pola co index pricing) | price | true |
| faq | pytania + odpowiedzi (7 pozycji) | list | true |
| cta | headline + microcopy | text | true |

### kontakt.html
| Pole | Typ | editable | Uwaga |
|---|---|---|---|
| email kontaktowy | contact | true | `mailto:` |
| telefon | contact | true | `tel:` |
| pola formularza (imie-nazwisko, email, telefon, url-strony, opis, budzet, rodo) | — | **false** | struktura formularza zablokowana |

Pola `editable: false` NIE pojawiają się w panelu klienta.

---

## ZAŁĄCZNIK C — Reguły walidacji (z SYSTEM-AGENCY.md + recipes "MUST NOT")

Zakoduj KAŻDĄ jako funkcję walidującą uruchamianą PRZED zapisem `SiteModel`.
Każda twarda ma test "próba złamania → błąd z komunikatem PL".

### Walidacje twarde (blokują zapis)

| # | Reguła | Implementacja | Komunikat błędu (PL) |
|---|---|---|---|
| V1 | Cena jawna | `pricing.*.amount` pasuje do `/^\d[\d\s]*$/`; renderuje się jako "od X zł netto". Odrzuć string z "wycen", "zapytaj", "kontakt". | "Cena musi być konkretną kwotą. 'Zapytaj o wycenę' jest niedozwolone." |
| V2 | Pricing istnieje | Sekcja `pricing` nieusuwalna z homepage. | "Sekcja cennika jest wymagana i nie może zostać usunięta." |
| V3 | Hero istnieje | Sekcja `hero` wymagana. | "Sekcja hero jest wymagana." |
| V4 | CTA finale istnieje | Sekcja `cta-finale` wymagana. | "Sekcja CTA jest wymagana." |
| V5 | CTA finale ma micro-copy | `cta-finale.ctaMicrocopy` niepuste. | "CTA musi mieć tekst z obietnicą dostawy (np. 'Wycena w 24h')." |
| V6 | CTA finale ≠ hero | `cta-finale.headline !== hero.headline`. | "CTA finale musi być inaczej sformułowane niż hero." |
| V7 | Max 2 pakiety | `pricing` ma dokładnie 2 pakiety. | "Dozwolone są maksymalnie 2 pakiety cenowe." |
| V8 | Cena ma listę zakresu | `pricing.*.features.length >= 1`. | "Każdy pakiet musi mieć listę co wchodzi w zakres." |
| V9 | Hero bez zdjęcia właściciela | `hero` nie ma pola `image` z rolą "owner-photo". | "Zdjęcie właściciela jest niedozwolone w hero (to FORMA, nie biografia)." |
| V10 | Proces: numeracja, nie bullety | Kroki mają `index` (numeral); styl zablokowany. | "Kroki procesu używają numeracji Space Mono — bullety są niedozwolone." |
| V11 | Footer max 6 linków | `footer.links.length <= 6`. | "Footer może mieć maksymalnie 6 linków." |
| V12 | Brak emoji w nagłówkach | Pola headline / label bez emoji (regex Unicode). | "Emoji są niedozwolone w nagłówkach (zgodnie z systemem FORMA)." |

### Walidacje miękkie (ostrzeżenie, nie blokują)

| # | Reguła | Komunikat (PL) |
|---|---|---|
| W1 | Pusty headline | "Nagłówek jest pusty — strona straci na skuteczności." |
| W2 | Subheadline > 280 znaków | "Podtytuł jest długi — rozważ skrócenie dla czytelności." |
| W3 | Generyczne frazy ("kompleksowe rozwiązania", "indywidualne podejście") | "Ta fraza jest generyczna — opisz konkretnie co oferujesz." |
| W4 | Wydarzenie z przeszłą datą + status published | "To wydarzenie już minęło — rozważ archiwizację." |

### Walidacje kolekcji

| # | Reguła |
|---|---|
| C1 | `Event.date` wymagane i poprawne; `Event.title` niepuste. |
| C2 | `Post.status` "published" wymaga `publishedAt`. |
| C3 | `Post.body` sanityzowany (usuń `<script>`, inline event handlers) — ochrona XSS. |
| C4 | `Event.link` jeśli podany — poprawny URL (http / https). |

---

## ZAŁĄCZNIK D — Reguły kompozycji (egzekwowane przez RENDERER, nie przez klienta)

Te reguły z `SYSTEM-AGENCY.md` narzuca renderer — klient nie ma do nich dostępu,
więc nie może ich złamać. Renderer ZAWSZE produkuje markup z nimi zgodny:

1. Accent color tylko dla: primary CTA, active states, process numerals. Nigdy
   fill sekcji, nigdy dekoracja. Max jedna powierzchnia akcentowa naraz.
2. Statystyki i liczby (cena, liczba realizacji, czas dostawy, Lighthouse) —
   zawsze w Space Mono.
3. Karty na `--surface` na `--background`, `1px solid --border`, zero box-shadow,
   zero gradientów.
4. Section transitions stark (zmiana tła lub `1px solid --border`), nigdy
   gradient między sekcjami.
5. Type scale stały: Display 56–72 / Headline 36–42 / Subheadline 22–28 /
   Body 16 / Meta 12–13 uppercase + `letter-spacing: 0.08em`.
6. Mobile nav = full-screen dark overlay (nie dropdown, nie slide-in).
7. Footer minimalny: 1 wiersz linków (max 6), email, copyright. Bez mega-footera.
8. Portfolio: nazwa + typ projektu, nigdy sam screenshot. Bez zdjęcia właściciela
   na homepage.
9. CTA zawsze z obietnicą dostawy w micro-copy.

**Wniosek architektoniczny (powtórz sobie przy każdej decyzji):** klient edytuje
TREŚĆ (dane), renderer narzuca FORMĘ (reguły). To rozdzielenie jest moatem —
klient nie może zepsuć projektu. Każda propozycja dania klientowi kontroli nad
formą (kolory, fonty, układ, dodawanie sekcji) jest sprzeczna z modelem produktu.

---

## 5. Zasady pracy dla Claude Code

- Po każdym KROKU: zatrzymaj się, pokaż co zrobiłeś, poczekaj na "dalej".
- Zacznij od KROKU 1 i 2, potem STOP — najpierw udowodnij, że render odtwarza
  realny HTML, zanim zbudujesz resztę.
- Nie buduj publikacji / deployu w tej iteracji.
- Jeśli coś w referencyjnym HTML jest niejasne — zapytaj, zanim założysz.
- Nie proponuj funkcji buildera (wybór kolorów / fontów / układu / dodawanie
  sekcji) — to sprzeczne z modelem produktu (Załącznik D).
- Commituj po każdym kroku z opisowym message.
