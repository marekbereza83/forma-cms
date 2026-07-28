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
allowedTags: ['p','strong','em','ul','ol','li','a','h2','h3','br']
allowedAttributes: { a: ['href','target','rel'] }   ← zero atrybutów poza linkiem
```

Znaczniki semantyczne przechodzą, całe stylowanie wylatuje.

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

Dwa niezależne tory, mylone najczęściej:

```
KOD:    git push → Vercel → panel i podgląd
TREŚĆ:  przycisk "Publikuj" → R2 → żywa strona
```

**Konsekwencje, które realnie wystąpiły dziś:**

1. Zmiana w rendererze **musi** być wdrożona na Vercela **zanim** klikniesz „Publikuj" —
   publikacja używa **wdrożonego** renderera, nie tego z Twojego dysku.
2. Publikacja przy zerowej liczbie opublikowanych postów **nie utworzy** strony listy —
   renderer generuje ją tylko gdy `publishedPosts.length > 0`.
3. Dodanie pozycji do nawigacji (migracja) **przed** opublikowaniem treści daje żywy link
   prowadzący na 404. Kolejność: najpierw treść, potem nawigacja, potem publikacja.

---

## 12. Checklista dla nowego typu strony

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

---

## 13. Czego świadomie NIE robimy

- **`noindex` per artykuł** — odrzucone. Przy blogu tej wielkości potrzeba marginalna,
  a ryzyko realne: klient może przypadkiem wyindeksować dobry tekst. Gdyby wracało — tylko
  jako ustawienie zaawansowane, nigdy w głównym formularzu.
- **Strony archiwum tagów/kategorii** — patrz §6.
- **Oddawanie klientowi kontroli nad formą** — patrz §2. Żadna optymalizacja SEO nie jest
  warta złamania tej zasady.
