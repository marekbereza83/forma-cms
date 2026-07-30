# Strategia SEO dla stron budowanych w FORMA CMS

Dokument onboardingowy. Powstał 2026-07-28 na podstawie audytu i wdrożenia modułu
publikacji — **każda zasada niżej wynika z konkretnego znaleziska w tym kodzie**, nie
z ogólnych porad. Przy każdej podano plik, którego dotyczy.

---

## 1. Fundament: co generator MUSI zapewnić automatycznie

Klient nie jest specjalistą SEO i nie powinien nim być. Wszystko poniżej ma powstawać
**bez jego udziału**, przy zwykłym zapisaniu treści:

| Element | Gdzie w kodzie |
|---|---|
| Dokładnie jeden `<h1>` (z tytułu) | `renderer/publikacje.ts` |
| `<article>` wokół treści | `renderer/publikacje.ts` |
| `<title>` i `<meta name="description">` | `renderer/head.ts` |
| `<link rel="canonical">` | `renderer/head.ts` |
| JSON-LD `BlogPosting` + `BreadcrumbList` | `renderer/post-jsonld.ts` |
| Wpis w `sitemap.xml` | `export.ts` → `buildSitemapXml()` |
| Widoczność na liście publikacji | `renderer/publikacje.ts` |
| Brak publicznego dostępu do szkiców | `export.ts` (filtr `status === 'published'`) |

**Zasada:** jeśli element SEO wymaga od klienta pamiętania o czymś — jest źle
zaprojektowany. Klient dostarcza treść, generator dokłada strukturę.

---

## 2. Struktura to treść, forma to nie treść

Najważniejsze rozróżnienie w całym produkcie, bo łatwo je pomylić i zrobić szkodę
w obie strony.

- **FORMA** (fonty, kolory, rozmiary, marginesy, `style="font-family:Calibri"` z Worda)
  → klient **nigdy** tego nie kontroluje. To jest moat produktu.
- **STRUKTURA** (to jest nagłówek, to jest lista, to słowo jest wyróżnione, to jest link)
  → klient **musi** móc to wnieść. To jest treść semantyczna, nie wygląd.

Dowód, że architektura to rozróżnia — allowlista sanitizera
(`validation/collections.ts`):

```
allowedTags: ['p','strong','em','ul','ol','li','a','h2','h3','br',
              'table','thead','tbody','tr','th','td','caption']
allowedAttributes: { a: ['href','target','rel'],
                     th/td: ['colspan','rowspan'] }   ← tylko strukturalne
```

Znaczniki semantyczne przechodzą, całe stylowanie wylatuje.

**Tabele (dodane 2026-07-29)** to ten sam przypadek co nagłówki i listy: „te dane są
tabelaryczne" to struktura treści, a nie wygląd. Dopuszczone są wyłącznie `colspan`
i `rowspan` — bez nich scalone komórki rozjeżdżają tabelę. Wszystko prezentacyjne
(`width`, `border`, `cellpadding`, `style`, `class="MsoTableGrid"`) nadal wylatuje,
a o wygląd dba CSS renderera.

Dwa szczegóły warte zapamiętania przy podobnych rozszerzeniach:
- Sanitizer po stronie serwera waliduje **nazwę** atrybutu, nie jego wartość. Dlatego
  normalizator w edytorze dodatkowo sprawdza, że `colspan`/`rowspan` to dodatnia liczba
  całkowita — Word potrafi wstawić tam śmieć.
- Tabela wklejona z arkusza bywa szersza niż kolumna tekstu. CSS używa
  `display:block; overflow-x:auto`, żeby przewijała się **w sobie** zamiast rozpychać
  stronę. Zweryfikowane pomiarem: przy 375px tabela scrolluje, dokument nie.

**Znalezisko:** edytor kasował wklejaną treść do czystego tekstu (`text/plain`),
tłumacząc to zasadą „klient edytuje treść, nie formę". To była **nadmiarowa korekta** —
kasowała także strukturę. Klient po każdym wklejeniu z Worda odtwarzał nagłówki ręcznie.
Naprawione: `normalizePastedHtml()` w `RichTextEditor.tsx` czyta `text/html` i mapuje na
tę samą allowlistę (`b`→`strong`, `i`→`em`, `h1`→`h2`, `h4–h6`→`h3`, reszta odwijana).

---

## 3. Nagłówek musi być nagłówkiem

**Znalezisko:** callout „Kluczowe wnioski" renderował etykietę jako `<p class="…-label">`
ze stylem imitującym nagłówek. Wyglądał jak nagłówek, ale **nie był** — nie wchodził do
konspektu dokumentu, czytniki ekranu i wyszukiwarki nie widziały tam sekcji.

Naprawione na `<aside aria-labelledby>` + `<h2 id>`. Wygląd nie zmienił się o piksel,
bo wszystkie właściwości były już jawnie ustawione — zmieniła się wyłącznie semantyka.

**Zasada:** jeśli coś wygląda jak nagłówek, ma być nagłówkiem. Stylowanie `<p>` na
nagłówek to strata za darmo. Sprawdzaj hierarchię: `h1` → `h2` → `h3`, bez przeskoków.

**H1 jest zarezerwowany na tytuł strony.** Dlatego przy imporcie z Worda `h1` mapujemy
na `h2` — inaczej artykuł miałby dwa `<h1>`.

---

## 4. Walidacja: twarda blokuje, miękka doradza

Rozdzielenie, które trzeba utrzymać przy każdym nowym polu SEO.

- **Twarda (C\*, blokuje zapis)** — tylko sanity-check przed absurdem.
  Przykład C12: `metaTitle` ≤ 70 znaków, `metaDescription` ≤ 200. Chroni przed wklejeniem
  całego akapitu w pole na jedno zdanie.
- **Miękka (W\*, tylko ostrzega)** — zalecenia SEO.
  Przykład W6/W7: `metaTitle` 50–60, `metaDescription` 120–160.

**Zasada:** nigdy nie blokuj zapisu za coś, co jest wyłącznie **zaleceniem**. Klient ma
prawo świadomie napisać krótszy tytuł. Ostrzeżenie mówi mu, że wychodzi poza optimum —
blokada tylko go sfrustruje.

Przy dodawaniu kolejnej reguły długości: w `validation/soft.ts` jest helper
`lengthRangeWarning()` — użyj go, nie kopiuj warunku po raz kolejny.

---

## 5. Nadpisania meta muszą trafić w DWA miejsca

**Pułapka, która kosztuje ciche rozjazdy.** `metaDescription` konsumują:

1. `renderHead()` → `<meta name="description">` i `og:description`
2. `buildBlogPostingJsonLd()` → `BlogPosting.description`

Zaktualizowanie tylko jednego daje stan, w którym `<meta>` i JSON-LD mówią co innego —
i nikt tego nie zauważy, bo strona wygląda poprawnie.

**Zasada:** po dodaniu pola meta przejrzyj **wszystkich** konsumentów, nie tylko `<head>`.

---

## 6. Nie rób SEO tam, gdzie nie ma powierzchni SEO

**Znalezisko:** pojawiła się rekomendacja „ograniczyć tagi do 2–4, żeby nie tworzyć
ubogich stron archiwum tagów". Sprawdzenie wykazało, że **nie generujemy żadnych stron
tagów** — tagi istnieją wyłącznie jako element wizualny karty. Ich liczba nie ma
absolutnie żadnego wpływu na SEO.

**Dwie zasady stąd:**
1. Zanim zoptymalizujesz element pod SEO — sprawdź, czy on w ogóle trafia do indeksu.
2. **Nie generuj stron archiwum** (tag, kategoria, autor, data) dopóki nie zbiorą kilku
   wartościowych publikacji. Strona archiwum z jednym artykułem to ubogi wynik, który
   szkodzi bardziej niż pomaga. Gdy powstaną — do czasu zapełnienia dawaj im `noindex`.

---

## 7. Adresy: jedno źródło prawdy i konsekwentny canonical

**Konwencja w tym projekcie:** `/publikacje/<slug>.html`. Definicja w **jednym miejscu**:
`src/lib/cms/urls.ts` (`postPath`, `postUrl`, `postsListPath`, `postsListUrl`).

**Znalezisko:** panel sklejał ścieżkę ręcznie i pokazywał klientowi
`/publikacje/<slug>` — adres, pod którym nic nie istniało. Dwa miejsca w tym samym
formularzu podawały różne adresy tego samego artykułu.

**Zasada:** nigdy nie sklejaj adresu ręcznie. Zawsze przez `urls.ts`.

**O `.html` w adresach — zweryfikowane pomiarem na produkcji:**
zarówno `/portfolio` jak i `/portfolio.html` zwracają 200, ale **canonical na obu
wskazuje na wersję `.html`**. To jest poprawne: Google indeksuje jeden adres, duplikatu
nie ma. Sam `.html` nie jest wadą SEO.

Wadą byłoby dopiero: obie wersje 200 **i** różne (albo błędne) canonicale.

**Migracja na adresy bez `.html` jest kosmetyczna** — wymaga zmiany canonicali, sitemapy,
linków wewnętrznych, 301 ze wszystkich starych adresów i okresu przeindeksowania.
Nie rób jej dla samej estetyki na stronie, która jest już zaindeksowana.

---

## 8. Zmiana slugu opublikowanego artykułu wymaga przekierowania

Mechanizm istnieje i trzeba go rozumieć:

`PostItem.previousSlugs` (dopisywane automatycznie w `saveSite()` przy zmianie slugu)
→ `buildPostRedirects()` w `export.ts` → `_redirects.json` w R2
→ `resolveRedirect()` w `workers/site-router/src/index.ts` zwraca **301**.

Przekierowania powstają **tylko dla postów aktualnie opublikowanych** — 301 na szkic
prowadziłoby na 404.

**Zasada dla klienta (jest w tooltipie przy polu slug):** po publikacji nie zmieniaj
adresu bez potrzeby. Mechanizm zadziała, ale każde przekierowanie to utracona część
sygnału i dodatkowy skok.

---

## 9. Dostępność jest częścią jakości, nie dodatkiem

**Znalezisko:** zmienna `--text-muted` (kontrast **2.09:1** wobec tła karty) była użyta
do czasu czytania widocznego na **każdej** karcie — mimo że komentarz na górze
`forma-layout.css` sam ją opisuje jako „tylko decorative/disabled". Próg WCAG AA dla
drobnego tekstu to 4.5:1. Naprawione na `--text-secondary` (5.62:1).

**Zasada:** jeśli projekt dokumentuje własne reguły kontrastu — egzekwuj je. Mierz, nie
oceniaj na oko. Tekst, który użytkownik ma przeczytać, nigdy nie jest „dekoracyjny".

---

## 10. Podgląd musi używać tego samego renderera co produkcja

**Znalezisko:** `/preview` wywoływał wyłącznie `renderPage()`, a strony publikacji mają
własne renderery. Efekt: podgląd pokazywał pustą stronę zamiast artykułu — czyli coś
**innego niż to, co zobaczy użytkownik**.

**Zasada:** podgląd bez wierności produkcji jest gorszy niż brak podglądu, bo daje fałszywą
pewność. Każdy nowy typ strony trzeba wpiąć w `/preview` razem z jej rendererem.

Podgląd pokazuje też **szkice** — to celowe, ma służyć ocenie treści przed publikacją.

---

## 11. Łańcuch wdrożenia — kolejność ma znaczenie

**Cztery** niezależne tory, mylone najczęściej:

```
KOD:     git push → Vercel → panel i podgląd
TREŚĆ:   przycisk "Publikuj" → R2 (sites/<tenantId>/) → żywa strona
ZDJĘCIA: upload w panelu → R2 (<tenantId>/) → NATYCHMIAST, bez publikacji
WORKER:  npm run deploy (w workers/site-router) → Cloudflare → serwowanie R2
```

### Worker to jedyny tor bez automatycznego wdrożenia

`workers/site-router` (nagłówki bezpieczeństwa, routing po hostname, przekierowania
301, fallback 404) **nie jest częścią** `git push` → Vercel. To osobny deployment
Cloudflare Workers, uruchamiany ręcznie: `cd workers/site-router && npm run deploy`.
Zmiana w tym pliku, zacommitowana i wypchnięta na `main`, **nic nie robi** na
produkcji, dopóki ktoś nie odpali `npm run deploy` z tego katalogu.

To ma znaczenie akurat tutaj, bo Worker jest miejscem, gdzie żyją nagłówki
bezpieczeństwa (§12) — zmiana w kodzie bez wdrożenia to fałszywe poczucie
bezpieczeństwa: repo wygląda na naprawione, produkcja nadal nie.

**Konsekwencje, które realnie wystąpiły:**

1. Zmiana w rendererze **musi** być wdrożona na Vercela **zanim** klikniesz „Publikuj" —
   publikacja używa **wdrożonego** renderera, nie tego z Twojego dysku.
2. Publikacja przy zerowej liczbie opublikowanych postów **nie utworzy** strony listy —
   renderer generuje ją tylko gdy `publishedPosts.length > 0`.
3. Dodanie pozycji do nawigacji (migracja) **przed** opublikowaniem treści daje żywy link
   prowadzący na 404. Kolejność: najpierw treść, potem nawigacja, potem publikacja.

### Zdjęcia to trzeci tor — i najbardziej podstępny

Zdjęcia lądują w R2 **od razu przy uploadzie**, ale opublikowany HTML wskazuje na
**stary URL aż do następnego „Publikuj"**. Te dwa zegary nie są zsynchronizowane i to
jest źródło całej klasy błędów.

**Zasada: nigdy nie kasuj pliku, na który może jeszcze wskazywać żywa strona.**

Naruszenie tej zasady kosztowało regresję (2026-07-29): próba naprawy cache'u nadała
każdemu uploadowi losowy klucz R2, przez co stary plik przestał być nadpisywany i trzeba
było go kasować zaraz po podmianie. Efekt: **404 na obrazku działającej strony** przez
całe okno między podmianą a publikacją. W przypadku okładek publikacji zamknięcie karty
bez zapisu zostawiało w bazie URL do nieistniejącego pliku, bez możliwości odzyskania.

Obowiązujące rozwiązanie:
- **Klucz R2 jest deterministyczny** (`<tenantId>/<kind>-<id>.webp`) — podmiana nadpisuje
  obiekt w miejscu. Nie ma osieroconych plików i nie ma czego kasować.
- **Cache rozwiązany w URL, nie w kluczu**: zwracany adres to `<klucz>?v=<losowy>`.
  Przeglądarka i CDN widzą nowy zasób, R2 widzi ten sam obiekt.
- `DELETE` wolno wołać **wyłącznie przy trwałym usuwaniu encji** (kasowanie karty
  portfolio, wyczyszczenie okładki) — **nigdy** po podmianie zdjęcia, bo nic nie
  zostało osierocone.

Efekt uboczny, tym razem pożądany: `coverImage` trafia do `og:image`, więc zmiana `?v=`
wymusza na platformach społecznościowych ponowne pobranie miniatury zamiast serwowania
starej z ich własnego cache'u.

**Dług do świadomości:** przyczyną źródłową był brak jakiegokolwiek `Cache-Control` przy
`PutObject` do R2. `?v=` to obejście, nie rozwiązanie — kto będzie to kiedyś porządkował,
niech ustawi nagłówki na obiekcie, a nie usuwa `?v=` w przekonaniu, że to zbędny bałagan.

---

## 12. Nagłówki bezpieczeństwa żyją w Workerze, nie w Next.js

Zewnętrzny audyt (2026-07-30) wykazał brak sześciu nagłówków bezpieczeństwa na
produkcji — potwierdzone pomiarem (`curl -D -`), nie na słowo audytora. Żywa strona
jest statycznym HTML-em serwowanym przez `workers/site-router`, nie przez Next.js —
więc nagłówki dodaje się **tam**, nie w `next.config.js` czy middleware Vercela,
bo ten kod w ogóle nie bierze udziału w obsłudze ruchu produkcyjnego.

Wdrożone pięć (`SECURITY_HEADERS` w `workers/site-router/src/index.ts`):
`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`,
`Strict-Transport-Security`.

**Musi być na każdej odpowiedzi, nie tylko na sukcesie.** Worker ma siedem ścieżek
zwrotu (405, przekierowanie kanoniczne, „Unknown host", plik z R2, 301 ze slugu,
strona 404, goły „Not found"). Dodanie nagłówków tylko w funkcji, która serwuje plik
z R2, pokryłoby jedną z siedmiu. Rozwiązanie: jedna funkcja opakowująca `fetch()`
w całości, budująca nową odpowiedź z tymi samymi `body`/`status` — konieczne, bo
`Response.redirect()` zwraca odpowiedź **niemutowalną**, `headers.set()` na niej
rzuca wyjątkiem.

**Weryfikacja przez realne uruchomienie (`wrangler dev`), nie przez lekturę kodu.**
`curl` na Windowsie nie radzi sobie z samopodpisanym certyfikatem lokalnego
Miniflare — zadziałał Playwright (`ignoreHTTPSErrors: true`). Sprawdzone wprost:
wszystkie siedem ścieżek zwraca komplet nagłówków, a serwowanie pliku z R2 zachowuje
`etag`/`content-type` i strumieniuje `body` bez buforowania w pamięci Workera.

**Content-Security-Policy świadomie pominięte.** Strona ma 3 skrypty inline (m.in.
snippet GA z Consent Mode) i blok `<style>` — `script-src 'self'` by je zablokował,
`'unsafe-inline'` zniweczyłby większość ochrony, jaką CSP miało dać. Wymaga
najpierw wyniesienia tych skryptów do plików w `/assets/js/`. Nie robić CSP przez
`'unsafe-inline'` tylko po to, żeby odhaczyć punkt audytu — to fasada bezpieczeństwa,
nie bezpieczeństwo.

**HSTS bez `preload` i bez `includeSubDomains`, obie decyzje odwracalne w różnym
stopniu.** `preload` to wpis na listę wbudowaną w przeglądarki — cofnięcie trwa
miesiące, sam `max-age` nie. `includeSubDomains` pominięte, bo kanoniczne
przekierowanie Workera obejmuje tylko hosty z `HOST_MAP` — subdomena serwowana
po HTTP (staging, jakieś narzędzie) zostałaby zerwana na czas `max-age`. Dopisać
dopiero po potwierdzeniu, że wszystkie subdomeny danego tenanta chodzą po HTTPS.

---

## 13. Checklista dla nowego typu strony

Przy dodawaniu kolejnego typu treści (np. „Case studies", „Wydarzenia") przejdź to
w kolejności:

- [ ] Dokładnie jeden `<h1>` z tytułu
- [ ] `<article>` (lub inny właściwy landmark) wokół treści
- [ ] `<title>` i `meta description` z domyślkami + możliwość nadpisania
- [ ] Nadpisanie meta wpięte we **wszystkich** konsumentów (`head` + JSON-LD)
- [ ] Canonical przez `urls.ts`, nigdy ręcznie
- [ ] JSON-LD właściwy dla typu + `BreadcrumbList`
- [ ] Wpis w `sitemap.xml` tylko dla treści opublikowanej
- [ ] Szkice: brak pliku, brak w sitemapie, brak na liście
- [ ] Zmiana slugu → 301 przez `previousSlugs`
- [ ] Wpięcie w `/preview` z tym samym rendererem co produkcja
- [ ] Walidacja: twarda tylko na absurdy, miękka na zalecenia
- [ ] Kontrast tekstu ≥ 4.5:1 — zmierzony, nie oceniony
- [ ] Hierarchia nagłówków bez przeskoków (test w `renderer.test.ts` to sprawdza)
- [ ] Brak stron archiwum dopóki nie ma czego archiwizować
- [ ] Jeśli typ ma zdjęcia: klucz R2 deterministyczny, `DELETE` tylko przy trwałym
      usuwaniu encji — nigdy po podmianie pliku (§11)

---

## 14. Czego świadomie NIE robimy

- **`noindex` per artykuł** — odrzucone. Przy blogu tej wielkości potrzeba marginalna,
  a ryzyko realne: klient może przypadkiem wyindeksować dobry tekst. Gdyby wracało — tylko
  jako ustawienie zaawansowane, nigdy w głównym formularzu.
- **Strony archiwum tagów/kategorii** — patrz §6.
- **Oddawanie klientowi kontroli nad formą** — patrz §2. Żadna optymalizacja SEO nie jest
  warta złamania tej zasady.
