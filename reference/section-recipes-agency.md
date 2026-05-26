# FORMA — Section Recipes
# Strony: index.html | portfolio.html | proces.html | kontakt.html

Format per recipe: Purpose | Required content | Layout | Visual constraints | MUST NOT

---

## SHARED — Recipe A1: Header / Navigation

**Purpose:** Tożsamość agencji + główna nawigacja + primary CTA w nav — identyczna na wszystkich 4 stronach.

**Required content:**
- Logo / nazwa agencji (lewo)
- 4 linki: "Portfolio", "Jak pracuję", "Kontakt", + CTA button
- Active state: właściwy link podświetlony per podstrona
- Hamburger na mobile (otwiera full-screen overlay)

**Layout:**
- Sticky nav `top: 0`, `z-index: 100`
- `height: 64px`
- `background: rgba(13,17,23,0.85)` + `backdrop-filter: blur(12px)`
- `border-bottom: 1px solid var(--border)`
- Desktop: `display: flex`, `justify-content: space-between`, linki wycentrowane między logo a CTA
- Mobile: logo + hamburger; overlay pełnoekranowy

**Visual constraints:**
- Logo font: `var(--font-display)`, `weight: 700`
- Nav links: `var(--text-sm)`, `var(--weight-medium)`, color `var(--text-secondary)` → hover `var(--text-primary)`
- Active link: color `var(--text-primary)` + underline `2px solid var(--accent)` lub bold
- CTA button: `.btn-primary` z tekstem "Zamów stronę"
- Mobile overlay: pełny viewport `var(--background)`, linki `2rem bold`, zamknięcie `×` w `var(--font-mono)`

**MUST NOT:**
- Brak active state — każda podstrona musi mieć właściwy link podświetlony
- Mega-menu, dropdown, submenu
- Logo jako obrazek bez fallback text
- Nav linki jako ikony bez tekstu na desktop

---

## SHARED — Recipe A9: Footer

**Purpose:** Dane kontaktowe + linki prawne + copyright — identyczny na wszystkich 4 stronach.

**Required content:**
- Nazwa agencji (logo)
- Email klikalny `mailto:`
- Max 6 linków: Portfolio | Jak pracuję | Kontakt | Polityka prywatności
- Copyright z rokiem: "© 2026 [Nazwa]. Wszelkie prawa zastrzeżone."

**Layout:**
- `background: var(--surface)`
- `border-top: 1px solid var(--border)`
- `padding-block: var(--space-10)`
- Desktop: flex row, logo lewa, linki środek, copyright prawa
- Mobile: flex column, logo górna, linki, copyright dolna

**Visual constraints:**
- Logo: `var(--font-display) weight-bold text-base`
- Links: `var(--text-sm)`, color `var(--text-muted)` → hover `var(--text-primary)`
- Copyright: `var(--text-xs)`, `var(--text-muted)`
- Zero dekoracji graficznych
- Zero ikon social media (chyba że masz aktywne profile)

**MUST NOT:**
- Mega-footer z wieloma kolumnami
- Sekcja "O nas" w footerze
- Grafiki, ilustracje, wave dividers
- Duplikowanie pełnej nawigacji w footerze

---

## INDEX.HTML — Recipe A2: Hero

**Purpose:** Pierwsze wrażenie + statement oferty + proof w postaci realizacji. Klient (prawnik) musi w 5 sekund zrozumieć co sprzedaję i zobaczyć przykład.

**Required content:**
- Tag / label nad headline: "Strony dla kancelarii prawnych" (Space Mono, accent)
- Headline: główne value statement (np. "Projektuję strony które przynoszą klientów kancelarii")
- Subheadline: 1–2 zdania konkretów (termin, cena, wyróżnik PACTA)
- Primary CTA: "Zamów stronę" + micro-copy: "Strona gotowa w 14 dni"
- Secondary CTA: "Zobacz portfolio" (ghost button)
- Screenshot / mockup realizacji (Wojtas lub placeholder)

**Layout:**
- Centered lub 60/40 split (tekst lewo, mockup prawa)
- Mockup: `aspect-ratio: 16/9` lub device frame, `border-radius: var(--radius-lg)`
- Sekcja: `background: var(--background)`, `padding-block: var(--space-20) var(--space-16)`
- CTA row: flex, gap `var(--space-3)`, row na desktop, kolumna na mobile

**Visual constraints:**
- Tag/label: `.tag` component — Space Mono, indigo tint
- Headline: `.f-display` — clamp(2.5rem → 4.5rem), `var(--weight-extrabold)`, `var(--tracking-tight)`
- Subheadline: `var(--text-lg)`, `var(--text-secondary)`, `max-width: 54ch`
- Micro-copy pod CTA: `.btn-micro` — `var(--text-xs)`, `var(--text-muted)`
- Mockup: lekki border `1px solid var(--border)`, hover scale `1.01`

**MUST NOT:**
- Zdjęcie właściciela agencji w hero (to jest FORMA, nie PACTA)
- Animowany slider / carousel
- Video autoplay w tle
- Hero bez widocznego przykładu pracy
- Brak micro-copy pod CTA

---

## INDEX.HTML — Recipe A3: Problem

**Purpose:** Nazwać ból klienta (prawnika) zanim zaproponuję rozwiązanie. Walidacja że rozumiem jego sytuację.

**Required content:**
- Section label: "Problem" (opcjonalnie)
- Headline: "Twoja obecna strona kancelarii nie pracuje dla Ciebie"
- 3 konkretne symptomy (jako karty lub lista):
  1. "Zaprojektowana przed laty — wygląd 2016 roku odstrasza klientów"
  2. "Wolna, nie mobile-friendly, karana przez Google"
  3. "Brak CTAs — klient przychodzi i wychodzi bez kontaktu"
- Opcjonalnie: mała statystyka lub cytat ilustrujący problem

**Layout:**
- `background: var(--surface)` (zmiana od hero)
- `padding-block: var(--section-py-desktop)`
- Headline + subheadline w centrum, max-width 60ch
- Symptomy: `.grid-3` — 3 karty (`.card`) lub 3 ikony + tekst

**Visual constraints:**
- Headline: `.f-headline`, centered
- Karty symptomów: `.card` — `var(--surface)` na `var(--surface)` background → użyj `var(--surface-raised)` dla kart gdy sekcja jest `var(--surface)`
- Ikon symptomów: Lucide outline 20px, `var(--text-muted)`
- ŻADNYCH czerwonych akcentów mimo że to "problem" — `var(--text-secondary)` wystarczy

**MUST NOT:**
- "Twój problem" w headline — zamiast tego symptomy jako fakty rynkowe
- Dramatyczne ikony ❌ / żal — to jest analiza, nie atak
- Brak przejścia do rozwiązania (section naturalnie prowadzi do A4)

---

## INDEX.HTML — Recipe A4: Solution + Differentiator

**Purpose:** Przedstawić ofertę + wyróżnik (system PACTA) jako powód dla którego warto wybrać właśnie mnie.

**Required content:**
- Headline: "Projektuję strony dla kancelarii. Według skodyfikowanego systemu."
- 2–3 akapity lub bullets wyjaśniające:
  - Co dostajesz (gotowa strona w 14 dni)
  - Jak to robię (system PACTA — specjalizacja, nie szablon)
  - Dlaczego to działa (case study link)
- Link do portfolio: "Zobacz efekt → Kancelaria Wojtas"

**Layout:**
- `background: var(--background)` (powrót)
- 60/40 split: tekst lewa (60%), info-box prawa (40%) lub centered single column
- Info-box: `.card.featured` — `border-color: var(--accent)` — 3 bullet punkty systemu

**Visual constraints:**
- Headline: `.f-headline`
- Info-box label: `.tag` — "System PACTA"
- Bullet lista systemu: ikony Lucide `Check`, `var(--success)`, font-size `var(--text-sm)`
- Link do portfolio: kolor `var(--accent)`, arrow `→`, underline on hover

**MUST NOT:**
- "Kompleksowe rozwiązania" lub "indywidualne podejście" — opisz konkretnie
- PACTA opisane jako "szablon" — to system, nie motyw WordPress
- Brak linku do case study (strona portfolio.html)

---

## INDEX.HTML — Recipe A5: Pricing

**Purpose:** Jawna cena — kluczowy wyróżnik vs rynku. Prawnik wie co kupuje zanim zadzwoni.

**Required content:**
- Section headline: "Ile kosztuje strona dla kancelarii?"
- 1–2 pakiety (nie więcej) z:
  - Nazwa pakietu
  - Cena "od X zł netto" (w `var(--font-mono)`)
  - Lista 4–6 elementów zakresu (`.pricing-features`)
  - CTA button
- Pod kartami: zdanie o wycenie indywidualnej dla większych projektów

**Layout:**
- `background: var(--surface)`
- Karty: `.grid-2` (desktop), stack na mobile
- Karta podstawowa: `.pricing-card` neutral
- Karta polecana: `.pricing-card.featured` — `border-color: var(--accent)`

**Przykładowe pakiety:**
```
Pakiet Standard — od 4 500 zł netto
✓ Do 8 podstron HTML
✓ Responsywny mobile-first design
✓ System PACTA (zdefiniowany look kancelarii)
✓ Podstawowe SEO (meta, og, sitemap)
✓ Hosting setup (instrukcja)
✓ Dostawa: 14 dni od briefu

Pakiet Rozszerzony — od 6 500 zł netto
✓ Do 12 podstron + blog
✓ Wszystko z Standard
✓ Szkolenie wideo z edycji treści
✓ Google Analytics + Search Console setup
✓ 1 miesiąc wsparcia technicznego
✓ Dostawa: 21 dni od briefu
```

**Visual constraints:**
- Cena: `.pricing-price` — `var(--font-mono)`, `2.25rem bold`
- "netto": `var(--text-muted)`, `var(--text-xs)`
- Checkmarki: kolor `var(--success)`, nie emoji ✓ ale CSS `content: '✓'`
- CTA button na każdej karcie: `.btn-primary`

**MUST NOT:**
- "Zapytaj o wycenę" zamiast konkretnej liczby
- Więcej niż 2 pakiety (confusion overwhelm)
- Ukryte koszty ("hosting setup za dopłatą")
- Cena bez listy co wchodzi w zakres

---

## INDEX.HTML — Recipe A6: Portfolio Preview

**Purpose:** 1–2 case study cards jako wstępny dowód jakości. Pełne portfolio → portfolio.html.

**Required content:**
- Section label: "Realizacje"
- Headline: opcjonalne lub bezpośrednio karty
- 1–2 karty portfolio (`.portfolio-card`):
  - Screenshot / mockup (16:9)
  - Typ + nazwa: "Solo kancelaria — Kancelaria Wojtas, Toruń"
  - 1-zdaniowy opis: "Pełna strona 8 podstron, system PACTA, dostawa 12 dni"
  - Link: "Szczegóły →"
- CTA pod kartami: "Wszystkie realizacje →" (ghost button → portfolio.html)

**Layout:**
- `background: var(--background)`
- 1–2 karty: `.grid-2` lub pojedyncza szeroka karta
- CTA centrowany pod kartami

**Visual constraints:**
- Karty: `.portfolio-card`
- Label nad tytułem: `.portfolio-card-label` — Space Mono, accent
- Title: `.portfolio-card-title`
- Link "Szczegóły →": `var(--text-secondary)` → hover `var(--accent)`

**MUST NOT:**
- Grid 6+ miniatur — to jest preview, nie galeria
- Screenshoty bez opisu (sam obrazek bez kontekstu)
- Placeholder "Coming soon" bez chociaż jednej karty

---

## INDEX.HTML — Recipe A7: Process Preview

**Purpose:** Pokazać że mam metodę — 3–5 kroków skrótowo + link do pełnego opisu.

**Required content:**
- Section label: "Jak pracuję"
- Headline: "Od briefu do gotowej strony w 14 dni"
- 3–5 kroków (`.process-step`):
  01 Brief — 1-zdaniowy opis
  02 Design — 1-zdaniowy opis
  03 Kod — 1-zdaniowy opis
  04 Testy — 1-zdaniowy opis
  05 Dostawa — 1-zdaniowy opis
- Link: "Pełny opis procesu →" → proces.html

**Layout:**
- `background: var(--surface)`
- Kroki: flex column, gap `var(--space-6)`, max-width `680px`
- Link pod krokami: align-left

**Visual constraints:**
- Numerki: `.process-step-num` — Space Mono, `var(--accent)`
- Tytuł kroku: `.process-step-title`
- Opis kroku: `.process-step-body` — `var(--text-secondary)`, `var(--text-sm)`

**MUST NOT:**
- Bullet lista zamiast numerowanych kroków
- Emoji lub Lucide ikony zamiast Space Mono numerals
- Więcej niż 5 kroków w preview (pełny opis → proces.html)

---

## INDEX.HTML — Recipe A8: CTA Finale

**Purpose:** Ostatni push przed footerem — dla tych którzy scrollowali całość bez kliknięcia.

**Required content:**
- Headline: krótkie, bezpośrednie (np. "Gotowy? Porozmawiajmy.")
- Subheadline: 1 zdanie z powtórzeniem obietnicy (termin + cena)
- Primary CTA: "Zamów stronę" lub "Napisz do mnie"
- Micro-copy: "Odpowiadam w ciągu 24h. Bez zobowiązań."

**Layout:**
- `background: var(--surface)`
- `text-align: center`
- `padding-block: var(--space-20)`
- Headline + subheadline + CTA + micro-copy — stack centrowany
- Max-width headline: `48ch`

**Visual constraints:**
- Headline: `.f-headline`, centered
- Subheadline: `var(--text-lg)`, `var(--text-secondary)`, `margin-bottom: var(--space-8)`
- CTA: `.btn-primary`, oversized (height `56px`, `font-size: 1rem`)
- Micro-copy: `.btn-micro` — pod przyciskiem

**MUST NOT:**
- Powtórzenie tego samego CTA z hero słowo w słowo — nowe sformułowanie
- Brak micro-copy pod przyciskiem
- Sekcja bez headline (sam przycisk)

---

## PORTFOLIO.HTML — Recipe B1: Case Study Hero

**Purpose:** Natychmiastowa identyfikacja realizacji + kontekst biznesowy klienta.

**Required content:**
- Breadcrumb: "Portfolio / Kancelaria Wojtas"
- Tag: typ projektu ("Solo kancelaria • Toruń • 2026")
- Headline: "Kancelaria Radcy Prawnego Anna Wojtas"
- Subheadline: 1–2 zdania podsumowania (stara → nowa strona, czas realizacji)
- Hero screenshot pełnoszerokościowy lub duży mockup (laptop + mobile)

**Layout:**
- `background: var(--background)`
- `padding-top: var(--space-16)`
- Tekst centrowany, screenshotmaxy-width: `1000px`, `margin-inline: auto`
- Screenshot: `aspect-ratio: 16/9`, `border: 1px solid var(--border)`, `border-radius: var(--radius-xl)`

**Visual constraints:**
- Tag: `.tag` — Space Mono
- Headline: `.f-display` (mniejszy niż index — `clamp(2rem, 4vw, 3rem)`)
- Screenshot: lekkie `box-shadow: 0 24px 64px rgba(0,0,0,0.4)` — jedyny wyjątek od reguły no-shadow (jako element "obrazu", nie karty UI)

**MUST NOT:**
- Brak breadcrumb (user musi wiedzieć gdzie jest)
- Screenshoty placeholderów bez instrukcji jakie zdjęcia wstawić

---

## PORTFOLIO.HTML — Recipe B2–B4: Case Study Body

**Purpose:** Pełny opis realizacji — wyzwanie → decyzje → efekt.

**Required content:**

**B2 — Wyzwanie:**
- Headline: "Wyzwanie"
- Opis starej strony kancelarii: wiek, problemy techniczne, brak konwersji

**B3 — Rozwiązanie:**
- Headline: "Rozwiązanie"
- Co zrobiłem i dlaczego: decyzje designowe (system PACTA), technologia
- 3–4 konkretne decyzje z uzasadnieniem (jak w WOJTAS-VS-KALISZUK.md)

**B4 — Rezultat:**
- Headline: "Efekt"
- Screenshoty sekcji (hero, specjalizacje, kontakt)
- Ewentualne metryki jeśli dostępne (Lighthouse, load time)

**Layout:**
- Naprzemienne tła: `var(--background)` → `var(--surface)` → `var(--background)`
- Każda sekcja `padding-block: var(--section-py-desktop)`
- Screenshoty: `border-radius: var(--radius-lg)`, max-width `800px`

**MUST NOT:**
- "Klient był zachwycony" bez konkretów
- Screenshoty bez opisu co pokazuje dana sekcja

---

## PORTFOLIO.HTML — Recipe B5: Portfolio CTA

**Purpose:** Konwersja — "chcesz podobną stronę?"

**Required content:**
- Headline: "Chcesz podobną stronę dla swojej kancelarii?"
- Subheadline z konkretami (termin + cena)
- CTA: "Zamów stronę" → kontakt.html

**Layout + Visual:** identyczny z Recipe A8 (CTA Finale z index.html).

---

## PROCES.HTML — Recipe C1: Process Hero

**Purpose:** Ustawienie oczekiwań — co się stanie gdy zamówisz.

**Required content:**
- Tag: "Jak pracuję"
- Headline: "Od briefu do gotowej strony kancelarii w 14 dni"
- Subheadline: 1–2 zdania o transparentności procesu i stałej cenie

**Layout + Visual:** jak Recipe A2 hero, ale bez mockupu — centered text, `padding-block: var(--space-16)`.

---

## PROCES.HTML — Recipe C2: Timeline / Steps (pełny)

**Purpose:** Pełny 5–6 krokowy opis procesu z detalami każdego etapu.

**Required content:**
- 5–6 kroków w `.process-step`:

```
01 Brief (Dzień 1–2)
Wypełniasz krótki formularz online. Opisujesz kancelarię, specjalizacje, klientów.
Dostajesz ode mnie pytania doprecyzowujące. Ustalamy zakres i terminy.

02 Design systemu (Dzień 3–5)
Konfiguruję system PACTA dla Twojej kancelarii: kolory, typografia, foto-placeholder.
Dostajesz wgląd do pierwszego projektu hero sekcji do akceptacji.

03 Kodowanie (Dzień 5–10)
Buduję wszystkie podstrony w HTML + Tailwind. Mobile-first.
Lighthouse ≥ 90 jako warunek oddania.

04 Treść i zdjęcia (Dzień 8–12, równolegle)
Dostarczasz zdjęcia i treść (masz checklistę ode mnie).
Mogę napisać copy na podstawie Twojej specjalizacji — opcjonalnie za dopłatą.

05 Testy QA (Dzień 12–13)
Automatyczne testy: screenshoty desktop/tablet/mobile, broken links, formularze, CTA.
Lista błędów do poprawy (zwykle 0–3 drobne).

06 Dostawa (Dzień 14)
Przekazanie plików i instrukcja wdrożenia hostingowego.
Nagranie wideo: jak edytować treść samodzielnie.
```

**Layout:**
- `background: var(--background)` / `var(--surface)` alternating dla czytelności
- Każdy krok: `.process-step` z numerem w Space Mono
- Opcjonalnie: pionowa linia łącząca kroki (1px `var(--border)`)

**Visual constraints:**
- Numerki z dniem: "01" + "(Dzień 1–2)" jako `var(--text-muted)` poniżej
- Tytuł: `.process-step-title`
- Body: `.process-step-body`

**MUST NOT:**
- Bullet lista zamiast kroków
- Opis kroków bez konkretnych dni lub efektów
- Krok bez informacji co dostarcza klient a co ja

---

## PROCES.HTML — Recipe C3: Deliverables

**Purpose:** Lista konkretnych deliverables — co fizycznie dostajesz.

**Required content:**
- Headline: "Co dostajesz"
- Lista 6–8 elementów jako `.grid-2` karty lub check-lista:
  - Gotowe pliki HTML/CSS
  - Instrukcja wdrożenia hostingowego
  - Wideo: jak edytować treść
  - Podstawowe SEO (meta tagi, og:image, sitemap.xml)
  - Google Analytics + Search Console setup (opcja)
  - Lighthouse raport

**Layout:** `background: var(--surface)`, `.grid-2` kart lub check-lista z Lucide `Check`.

---

## PROCES.HTML — Recipe C4: Technologie

**Purpose:** Sygnał kompetencji technicznych — dla technicznie świadomych prawników i ich IT.

**Required content:**
- Section label: "Stack"
- Krótki opis: "Buduję statyczne strony — szybkie, bezpieczne, bez zależności od CMS."
- Technologie jako tagi lub prosta lista:
  - HTML5 semantyczny
  - Tailwind CSS
  - JavaScript (vanilla — bez frameworka dla prostych stron)
  - Playwright QA (automatyczne testy)
  - Lighthouse (audyt wydajności)
  - Brak WordPress / Wix / Squarespace

**Layout:** `background: var(--background)`, tech jako `.tag` elementy lub prosta grid kart.

**MUST NOT:**
- Długa lista technologii bez wyjaśnienia po co
- "WordPress" jako opcja (chyba że świadoma decyzja)

---

## PROCES.HTML — Recipe C5: Pricing Detail

**Purpose:** Pełen cennik z opisem co dokładnie wchodzi w każdy zakres.

**Required content:** Rozszerzona wersja Recipe A5 — te same pakiety ale z pełniejszym opisem każdego punktu zakresu.

**Layout + Visual:** Identyczny z Recipe A5.

---

## PROCES.HTML — Recipe C6: FAQ

**Purpose:** 5–8 pytań które prawnik ma przed zamówieniem — odpowiedzieć zanim zadzwoni.

**Required content — obowiązkowe pytania:**
```
Czy mogę sam edytować treść strony po dostawie?
→ Tak. Dostajesz wideo instrukcję. Strona to pliki HTML — wystarczy edytor tekstu.
   Nie zależy od żadnego CMS ani panelu administracyjnego.

Co z RODO na stronie kancelarii?
→ Strona zawiera politykę prywatności, klauzulę informacyjną w formularzu
   oraz link do pliku cookies.js zarządzającego zgodami. To spełnia wymogi.

Czy 14 dni to gwarantowany termin?
→ Tak, pod warunkiem dostarczenia treści i zdjęć do Dnia 8.
   Jeśli materiały spóźnią się, termin przesuwa się proporcjonalnie.

Czy robisz hosting?
→ Nie zajmuję się hostingiem — daję Ci instrukcję wdrożenia na Vercel/Netlify (bezpłatne)
   lub dowolny serwer FTP. Możemy przejść przez to razem przez 30 minut.

Czy strona będzie widoczna w Google?
→ Wykonuję SEO techniczne: meta tagi, og:image, sitemap.xml, Google Search Console setup.
   Pozycjonowanie (content SEO) wymaga regularnych działań — mogę to wycenić osobno.

Pracujesz tylko z kancelariami?
→ Tak. Specjalizuję się w stronach dla kancelarii radców prawnych i adwokatów.
   Dlatego strony wychodzą lepiej — znam wzorce tej branży.

Ile kosztuje zmiana strony po dostawie?
→ Mała zmiana (treść, zdjęcie, CTA) — bezpłatna przez 14 dni po dostawie.
   Duże zmiany (nowa strona, nowa funkcja) — wycena osobno.
```

**Layout:**
- `background: var(--surface)`
- Każde pytanie jako `.faq-item` z accordion toggle
- Toggle: `+` / `×` w `var(--font-mono)`, `var(--text-muted)`

**MUST NOT:**
- Generyczne FAQ o "dlaczego strona jest ważna" — odpowiadaj na realne pytania zakupowe
- Odpowiedzi bez konkretów
- Więcej niż 8 pytań (fatigue)

---

## KONTAKT.HTML — Recipe D1: Contact Hero

**Purpose:** Zaproszenie do kontaktu — ciepłe ale bez nadmiernych obietnic.

**Required content:**
- Tag: "Kontakt"
- Headline: "Porozmawiajmy o Twojej kancelarii"
- Subheadline: "Opisz mi krótko sytuację — odpiszę w ciągu 24h."
- Dwie opcje poniżej: formularz (preferowany) + email/telefon bezpośredni

**Layout:** centered, `padding-block: var(--space-12) var(--space-8)`, `background: var(--background)`.

---

## KONTAKT.HTML — Recipe D2: Formularz kontaktowy

**Purpose:** Główna metoda kontaktu. Formularz zbiera dane potrzebne do szybkiej odpowiedzi.

**Required content (pola formularza):**
- Imię i nazwisko (required)
- Email (required)
- Telefon (opcjonalne)
- URL obecnej strony (opcjonalne — pomocne do wstępnej oceny)
- Opis potrzeb: "Opisz krótko kancelarię i co chcesz osiągnąć stroną" (textarea)
- Szacowany budżet (select dropdown):
  - "Do 4 500 zł netto"
  - "4 500 – 6 500 zł netto"
  - "Powyżej 6 500 zł netto"
  - "Nie wiem jeszcze"
- Checkbox RODO: "Wyrażam zgodę na przetwarzanie danych osobowych w celu odpowiedzi na wiadomość."
- Submit: "Wyślij wiadomość" (`.btn-primary`, full-width na mobile)

**Layout:**
- `background: var(--surface)` lub `var(--background)`
- Formularz max-width: `600px`, `margin-inline: auto`
- Pola w `.form-group`, gap `var(--space-5)`
- RODO jako checkbox z małym tekstem `var(--text-xs) var(--text-muted)`

**Visual constraints:**
- Wszystkie inputy: `.form-input` / `.form-textarea` / `.form-select`
- Min-height inputs: 48px (touch target)
- Focus: `border-color: var(--accent)` + subtle glow `var(--accent-muted)`
- Error states: `border-color: var(--danger)`

**MUST NOT:**
- Captcha widoczna (lepiej honeypot lub ukryty token)
- Wymaganie telefonu (opcjonalne!)
- Brak pola RODO
- Formularz bez potwierdzenia wysłania (sukces komunikat lub przekierowanie)

---

## KONTAKT.HTML — Recipe D3: Dane bezpośrednie + Reassurance

**Purpose:** Alternatywna metoda kontaktu + redukcja strachu przed kontaktem.

**Required content:**
- Email klikalny `mailto:`
- Telefon klikalny `tel:` (jeśli dostępny)
- Godziny dostępności: "Pon–Pt, 9:00–17:00"
- 3 reassurance bullets:
  - "Odpowiadam w ciągu 24h w dni robocze"
  - "Pierwsza rozmowa bezpłatna — bez zobowiązań"
  - "Twoje dane służą tylko do odpowiedzi na wiadomość"

**Layout:**
- Obok formularza (desktop: 60/40 split) lub pod formularzem (mobile)
- `background: var(--background)` lub `var(--surface-raised)` card

**Visual constraints:**
- Reassurance bullets: Lucide `Check` `var(--success)`, tekst `var(--text-secondary) text-sm`
- Email/telefon: `var(--text-primary) weight-medium`

**MUST NOT:**
- Mapa Google Embed (nie dotyczy agencji działającej zdalnie)
- "Zapraszamy do kontaktu" — zamiast tego bezpośrednie "Napisz do mnie"

---

*Recipes wygenerowane dla systemu FORMA v1.0 / 2026-05-19*
*Format naśladuje PACTA section-recipes.md — inne wartości, inna energia*
