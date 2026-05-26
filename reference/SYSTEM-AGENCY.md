# FORMA — Design System

**Wersja:** 1.0
**Archetype:** solo web designer / developer, sprzedaż stron dla kancelarii prawnych, Polska

---

## Nazwa i jej uzasadnienie

**FORMA** — od łac. *forma* ("kształt, postać, wzorzec"). Nazwa wyraża rdzeń pracy designera: nadawanie kształtu — idei, treści, marce. Jest krótka, bezzwłoczna, pozbawiona ozdobników. Konotuje rygor formy, precyzję wykonania, coś co istnieje w skończonej, zaplanowanej postaci.

FORMA jest systemem *rzemieślnika*, nie systemu prawnego. Celowe odróżnienie od PACTA (systemu klienta): PACTA to umowa między prawnikiem a człowiekiem — ciepła, osobista, budująca zaufanie ludzkie. FORMA to kontrakt między designerem a profesjonalistą — precyzyjny, konkretny, rozliczalny z efektu.

---

## Tożsamość systemu

FORMA to system designu dla strony agencji webowej sprzedającej redesign stron kancelariom prawnym w Polsce. Kupujący to prawnik — nie konsument końcowy. Kupuje usługę, nie relację. Ocenia przez pryzmat próbek pracy, konkretnych obietnic i jasnych warunków. Oczekuje tego co sam oferuje swoim klientom: terminowości, przejrzystości i rozliczalności.

Domyślny akcent to **indigo #6366F1**. Domyślne tło to ciemny slate **#0D1117**. Typografia: **Plus Jakarta Sans** dla headline'ów (geometric, bold), **Inter** dla body, **Space Mono** dla numeracji i cyfr. Ton treści: pierwsza osoba liczby pojedynczej, bezpośredni, bez przymiotnikowego marketingu. Każde zdanie zawiera konkret — liczbę, termin lub nawiązanie do realizacji.

FORMA nie jest systemem ciepłego zaufania osobowego — to system zaufania eksperckiego. Klient nie musi polubić projektanta. Musi stwierdzić: *ten człowiek wie co robi i dotrzyma słowa*. Trust komunikowany jest przez próbki pracy, jawną cenę i konkretne timeboxy — nie przez zdjęcie właściciela w kawiarni.

---

## Default choices

Każdy default poniżej to decyzja, którą generator (Stitch, v0, Claude Code) **stosuje automatycznie bez pytania**. Jeśli potrzebujesz inaczej, zmień z jawnym uzasadnieniem.

| Token | Wartość domyślna |
|---|---|
| Default accent color | `#6366F1` (indigo-500) |
| Default accent hover | `#818CF8` (indigo-400) |
| Default background | `#0D1117` (near-black slate) |
| Default surface | `#161B22` (dark card) |
| Default surface-raised | `#1C2430` (elevated element) |
| Default border | `#21262D` (subtle border) |
| Default text primary | `#F0F6FC` (nearly white) |
| Default text secondary | `#8B949E` (muted) |
| Default text muted | `#484F58` (very muted) |
| Default headline font | Plus Jakarta Sans, weight 700–800 |
| Default body font | Inter, weight 400–500 |
| Default mono font | Space Mono, weight 400 — wyłącznie dla numeracji kroków i statystyk |
| Default section padding | 96px desktop / 56px mobile |
| Default hero layout | centered statement + portfolio mockup poniżej lub po prawej |
| Default CTA style | solid rectangle (nie pill), accent fill, 48px height, border-radius 6px |
| Default border treatment | `1px solid --border` na kartach, zero box-shadow |
| Default portfolio treatment | 16:9 screenshot z lekkim scale-on-hover, bez overlay tekstu |
| Default process step decoration | Space Mono numeral `01`–`06`, `--accent` color, nie ikona |
| Default CTA copy style | verb + konkretny wynik: "Zamów stronę", "Sprawdź portfolio", "Porozmawiaj ze mną" |
| Default icon system | Lucide Icons outline 20px stroke 1.5 |
| Default pricing format | "od X zł netto" + 3-punktowa lista co wchodzi — zawsze jawna |

---

## Required sections

### Hard requirements (homepage index.html)

| Sekcja | Cel | Recipe |
|---|---|---|
| Header / Navigation | Tożsamość + primary CTA w nav | Recipe A1 |
| Hero | Statement + przykład pracy powyżej złożenia | Recipe A2 |
| Problem | Pain point klienta: "Twoja obecna strona nie konwertuje" | Recipe A3 |
| Solution + Differentiator | Oferta + PACTA jako wyróżnik | Recipe A4 |
| Pricing | Jawna cena z zakresem — na homepage, nie na podstronie | Recipe A5 |
| Portfolio preview | Jedna–dwie karty realizacji (Wojtas + opcjonalnie) | Recipe A6 |
| Process preview | 3–5 kroków skrótowo + link do proces.html | Recipe A7 |
| CTA finale | Ostatni push przed footerem | Recipe A8 |
| Footer | Dane kontaktowe, linki, copyright | Recipe A9 |

### Soft requirements (warunkowe)

| Sekcja | Kiedy obowiązkowa |
|---|---|
| Trust / liczby | Gdy masz ≥2 konkretne statystyki (realizacje, lata, oceny) |
| Testimonials | Gdy masz ≥2 cytaty od klientów z nazwą kancelarii |
| FAQ preview | Na homepage: max 3 pytania + link do pełnego FAQ na proces.html |

### Cross-cutting requirements (elementy w wielu sekcjach)

| Element | Gdzie obowiązkowy |
|---|---|
| Email klikalny `mailto:` | Nav (opcjonalnie), Kontakt, Footer |
| CTA button indigo | Nav (primary), Hero (primary), CTA finale |
| Cena "od X zł netto" | Pricing section + meta copy pod CTA finale |
| Delivery time "14 dni" | Hero (subtitle lub micro-copy), Proces preview, Pricing |
| Case study link (Wojtas) | Portfolio preview → portfolio.html |
| Active nav state | Prawidłowe per podstrona (homepage, portfolio, proces, kontakt) |

---

## Reguły kompozycji

Reguły *jak* się projektuje w FORMA — nie *co*. Są bezwyjątkowe.

1. **Portfolio is the proof, not the biography.** Na homepage żadne zdjęcie właściciela agencji. Zamiast twarzy — screenshot realizacji. Agencja jest oceniana przez pracę, nie przez osobę. Zdjęcie właściciela może pojawić się tylko na stronie "o mnie" jeśli taka istnieje.

2. **Price is stated plainly on homepage.** Cena nigdy nie jest ukryta za "zapytaj o wycenę". Zawsze widoczne "od X zł netto" z 3 bulletami zakresu. Ukryta cena = brak szacunku dla czasu prawnika.

3. **Process steps use Space Mono numerals, never bullets.** Każdy krok: `01`, `02`, `03` w Space Mono, `--accent` lub `--text-secondary`, 14–16px. Nigdy `•` bullet. Nigdy emoji. To jest signature FORMA.

4. **Accent color is used only for primary CTA, active states, and process numerals.** Nigdy jako fill sekcji. Nigdy jako dekoracja. Na stronie powinna być maksymalnie jedna powierzchnia akcentowa widoczna jednocześnie.

5. **Card surfaces use `--surface` on `--background`, never white on white.** Karty są ciemniejsze od tła lub rozróżniane przez `1px solid --border`. Żadnych box-shadowów. Żadnych gradientów kart.

6. **Section transitions are stark, not gradual.** Sekcje rozdzielone widoczną zmianą tła (`--background` → `--surface` → `--background`) lub `1px solid --border`. Nigdy gradient między sekcjami. Nigdy subtlne przejście które niewidoczne.

7. **Type scale is intentional and fixed.** Display (hero): 56–72px / Section headline: 36–42px / Subheadline: 22–28px / Body: 16px / Meta/label: 12–13px uppercase + `letter-spacing: 0.08em`. Nigdy intermediate sizes bez uzasadnienia.

8. **Statistics and numbers are always in Space Mono.** Każda liczba będąca argumentem sprzedażowym: cena, liczba realizacji, czas dostawy, Lighthouse score — renderowana w `Space Mono`. To odróżnia twarde dane od copy.

9. **CTA always carries a delivery promise.** Primary CTA na homepage musi mieć adjacent micro-copy z konkretną obietnicą: "Strona gotowa w 14 dni" lub "Wycena w 24h". Nigdy sam przycisk bez kontekstu.

10. **Portfolio cards show project name + type, never just screenshot.** Każda karta realizacji: nazwa kancelarii (lub zanonimizowana) + typ projektu (np. "solo kancelaria — nowa strona") + ewentualnie 1 wynik. Nigdy sam obrazek.

11. **Mobile navigation: full-screen dark overlay.** Nie dropdown. Nie slide-in. Hamburger otwiera full `100vh` `--background` z dużymi linkami (min 56px touch target) i zamknięciem `×` w Space Mono lub Lucide `X`.

12. **Footer is minimal.** Jeden wiersz linków (max 6), email, copyright z rokiem. Nie mega-footer z kolumnami. Dark surface (`--surface`), żadnych grafik dekoracyjnych.

---

## Voice guide (PL)

### Zakazane — jeśli generator wygeneruje którykolwiek z poniższych, ODRZUĆ i przepisz

- "kompleksowe rozwiązania"
- "indywidualne podejście do każdego klienta"
- "innowacyjne technologie"
- "profesjonalna obsługa"
- "wysoka jakość wykonania"
- "jesteśmy liderem"
- "dynamicznie rozwijająca się agencja"
- "zachęcam do kontaktu" (pasywne)
- "zapraszam do współpracy" (bez konkretów)
- "nowoczesne strony dla wymagających klientów"
- "kompleksowa obsługa od A do Z"
- jakiekolwiek "my/nasz" gdy mówię o sobie jako solo designer
- przymiotniki bez liczby: "szybko", "tanio", "skutecznie" — bez miary te słowa nic nie znaczą

### Polecane wzorce — kotwicz się tymi

- **Konkretny timebox:** "Strona gotowa w 14 dni od podpisania briefu"
- **Jawna cena:** "od 4500 zł netto — 8 podstron, hosting, SEO basics"
- **Nawiązanie do systemu:** "Projektuję według systemu PACTA — skodyfikowanej wiedzy o stronach kancelarii"
- **Wynik, nie proces:** "Kancelaria Wojtas dostała stronę która ładuje się w 1.2s i wyprzedza konkurencję w Google"
- **Bezpośrednie 'ja':** "Projektuję. Koduję. Dostarczam. Bez pośredników."
- **Techniczne jako argument:** "Semantic HTML, Tailwind, Lighthouse 95+, mobile-first"
- **Konkretne pytanie klienta:** "Czy mogę sam edytować treść? Tak — dam Ci instrukcję wideo."
- **Kontrast z rynkiem:** "Inne agencje ukrywają ceny. Ja pokazuję ją na stronie głównej."
- **Przed/po:** "Stara strona kancelarii: copyright 2017, brak HTTPS, 4s load time. Nowa: gotowa w 14 dni."

---

## Iconography

FORMA używa **Lucide Icons (outline, 20px, stroke 1.5)** via CDN (`https://unpkg.com/lucide@latest`).

**NIGDY:**
- Tabler Icons (to jest PACTA territory)
- Material Symbols (Google look)
- Font Awesome solid
- Emoji jako ikony UI
- Heroicons solid

**Dla kroków procesu:** zamiast ikon używaj **Space Mono numerals (`01`, `02`, `03`)** w `--accent` kolorze. To jest signature FORMA.

**Dla kontaktu i footer:** Lucide outline: `Mail`, `Phone`, `MapPin`, `Clock`, `ArrowRight`.

**Dla nawigacji mobile:** Lucide: `Menu`, `X`.

**Dla feature listy:** Lucide: `Check` (nie ptaszek ✓), `ChevronRight`.

---

## Flag patterns

Gdy generator generuje cokolwiek — sprawdź poniższe. Jeśli którekolwiek jest prawdą, **odrzuć output i przepisz**.

- `[FLAG]` Pricing nie pojawia się na homepage — tylko "zapytaj o wycenę"
- `[FLAG]` Zdjęcie właściciela agencji jest głównym elementem hero
- `[FLAG]` Accent color użyty jako tło sekcji lub elementu większego niż button
- `[FLAG]` Kroki procesu renderowane jako bullet list zamiast numerowanych kroków w Space Mono
- `[FLAG]` Użyto Tabler Icons lub Material Symbols
- `[FLAG]` Tło jest białe lub jasne (`#FFFFFF`, `#FAF7F2` lub podobne) — FORMA jest dark
- `[FLAG]` Użyto Source Serif 4, DM Sans lub jakiegokolwiek ciepłego serif w headline
- `[FLAG]` Copy zawiera zakazane frazy z Voice guide
- `[FLAG]` Karta portfolio nie zawiera nazwy klienta i typu projektu — sam screenshot
- `[FLAG]` CTA nie ma adjacent micro-copy z konkretną obietnicą (termin lub cena)
- `[FLAG]` Strona nie zawiera jawnej ceny z zakresem
- `[FLAG]` Footer jest mega-footerem z wieloma kolumnami i dekoracjami
- `[FLAG]` Nav active state nie jest zaimplementowany poprawnie cross-page
- `[FLAG]` Warm burgundy, złoty/musztard lub czerwony gdziekolwiek w palecie

---

## Lista plików systemu

| Plik | Cel |
|---|---|
| `SYSTEM-AGENCY.md` | Ten plik. Tożsamość systemu, defaults, reguły, voice, flag patterns. |
| `assets/css/design-system-agency.css` | Wszystkie tokeny CSS. Import this and you have FORMA. |
| `section-recipes-agency.md` | Per-sekcja prompty do generowania (4 strony, shared header/footer). |
| `agency-brief.md` | Brief "klienta" (właściciela agencji) — nazwa, oferta, cena, case study. |
| `BENCHMARK-NOTES.md` | Surowe notatki z analizy 11 benchmarków (techniczne + wizualne). |

---

## Decyzje strategiczne i ich uzasadnienie

### 1. Dlaczego dark palette — nie jasna jak 8/11 benchmarków PL
Żaden z 8 polskich benchmarków nie jest dark. US: lawfirmsites.com jest ciemny, ale to duże studio. Dla solo designera w PL dark background jest natychmiastowym sygnałem "nie jestem jak reszta". Ryzyko: konserwatywni prawnicy mogą woleć jasny — mitygacja: portfolio cards są jasne i kolorowe, co tworzy wewnętrzny kontrast i udowadnia, że designer rozumie jasną estetykę klienta. Wzorzec z: **lawfirmsites.com** (dark = premium confidence) + **studio72.net** (dark = editorial boldness).

### 2. Dlaczego jawna cena na homepage — wbrew 9/11 benchmarków
Żaden benchmark custom-design nie pokazuje ceny jawnie na homepage (stronydlaprawnikow.pl pokazuje cenę szablonów — to inna liga). Prawnicy jako kupujący cenią transparentność umowną — ukryta cena to sygnał "coś ukrywamy". Jawna cena "od 4500 zł" filtruje niezdecydowanych, skraca rozmowę sprzedażową i buduje zaufanie przez odwagę. Wzorzec: **thelion.pl** ("cena z góry określona") + luka rynkowa — nikt nie podaje liczby.

### 3. Dlaczego Plus Jakarta Sans + Inter — nie Source Serif 4 + DM Sans
PACTA używa Source Serif 4 (ciepłe, ludzkie, kancelaria = osoba z problemem). FORMA musi wyglądać jak inne medium: digital craft studio. Geometric sans (Plus Jakarta Sans) → precision, modern, confident. Inter → czytelność, systemowy. Gdybym użył tych samych fontów co PACTA, prawnik pomyślałby "ta agencja i jej produkt wyglądają tak samo" — to erozja wyróżnika PACTA. Wzorzec: **dangilroy.com** (czyste sans, premium bez serifa) + **studio72.net** (grotesque, bold).

### 4. Dlaczego Space Mono dla numeracji
Monospace = kod = developer. Każdy krok "01", "02" w mono sygnalizuje "ten designer jest systematyczny i techniczny". To jest signature FORMA tak jak serif numeral 01–04 jest signature PACTA — ale w zupełnie innej estetyce. Wzorzec: logika z **studio72.net** (typograficzny signature element).

### 5. Dlaczego 4 strony a nie 1-strona (landing)
stronydlaprawnikow.pl = 1 strona = szablon = tanie. Wszystkie profesjonalne benchmarki mają min. 5–7 podstron. 4 strony = minimum produktu (homepage + case study + proces + kontakt). Każda strona testuje inny aspekt systemu FORMA i daje SEO footing. Wzorzec: **dangilroy.com** (7 podstron), **thelion.pl** (wielostrona z procesem).

### 6. Dlaczego indigo `#6366F1` — nie niebieski
Każde US studio używa niebieskiego (dangilroy, lawfirmsites, paperstreet). Niebieski = safe, corporate, niewyróżnialny. Indigo jest pokrewne ale bardziej designerskie — kojarzy się z Tailwind, Linear, shadcn, narzędziami dla profesjonalistów. NIE jest ciepłe → odróżnia od `#8B3A3A` PACTA. Wystarczająco "profesjonalne" żeby nie przestraszyć prawnika. Wzorzec: decyzja negatywna (żaden benchmark nie używa indigo) → luka.

### 7. Dlaczego "14 dni" jako obietnica
studio72.net: "REALNA ZMIANA W 30 DNI" — jedyny benchmark z timeboksem, i to silny. Żaden inny benchmark nie ma konkretnego terminu dostawy. "14 dni" jest bardziej agresywne niż studio72 i odróżnia od "zadzwoń po wycenę". 14 dni = wiarygodne dla 4-8 podstron statycznej strony kodowanej Tailwindem. Tworzy presją i wiarygodność jednocześnie.

### 8. Czym się różni od PACTA — żeby nie zlać

| Wymiar | PACTA (kancelaria klienta) | FORMA (agencja) |
|---|---|---|
| Odbiorca | Klient kancelarii (człowiek z problemem prawnym) | Prawnik kupujący usługę webową |
| Typ zaufania | Osobowe (twarz, warmth, lokalna kotwica) | Eksperckie (portfolio, cena, termin) |
| Energia | Ciepła, uspokajająca | Precyzyjna, pewna siebie |
| Tło | `#FAF7F2` (cream) | `#0D1117` (near-black) |
| Accent | `#8B3A3A` (burgundy) | `#6366F1` (indigo) |
| Headline font | Source Serif 4 (serif) | Plus Jakarta Sans (geometric sans) |
| Signature element | Serif numeral 01–04 na kartach | Space Mono numeral `01`–`06` na krokach |
| Pricing | Brak (kancelaria nie pokazuje stawek) | Jawna na homepage |
| Hero element | Zdjęcie prawnika | Screenshot realizacji |

### 9. Co benchmarki robią — a my świadomie NIE robimy

| Co robią benchmarki | Dlaczego nie |
|---|---|
| Ukrywają cenę | Brak szacunku dla czasu klienta; FORMA buduje zaufanie przez transparentność |
| "Bezpłatna wycena" jako primary CTA | Deprecjonuje wartość usługi; FORMA zaczyna od ceny, nie od prezentu |
| Portfolio grid 20+ miniatur | Ilość nad jakością; FORMA: 1–2 starannie opisane case study |
| "Oferta dla każdego prawnika" | Generalizm = brak specjalizacji; FORMA: "kancelarie solo i regionalne" |
| Blog o SEO / marketingu | Nie buduję content marketing; buduje portfolio + system jako differentiator |

---

## Stosowanie systemu

1. Załaduj `SYSTEM-AGENCY.md` jako pierwszy dokument kontekstu
2. Załaduj odpowiedni recipe z `section-recipes-agency.md`
3. Podaj kontekst: właściciel = solo web designer PL, case study = Kancelaria Wojtas
4. Wygeneruj — generator aplikuje defaults bez pytania
5. Sprawdź każdy `[FLAG]` pattern zanim zaakceptujesz output
6. Jeśli generator wyjaśnia decyzje powołując się na "FORMA" — system działa prawidłowo
