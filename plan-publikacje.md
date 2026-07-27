# Plan budowy: publiczna strona publikacji (blog)

Data audytu: 2026-07-27. Audyt wykonany bez zmian w kodzie — patrz sekcja "Stan obecny" poniżej.
Design robiony równolegle w Stitch — ten plik to punkt startowy do implementacji po zaakceptowaniu designu.

**Status (2026-07-27):** części niezależne od wyglądu (kroki 3, 6, 7 częściowo) zaimplementowane —
patrz "Zrobione" poniżej. Reszta (szablon strony, head/meta per-post, lista publikacji, sekcja 4)
czeka na design ze Stitch.

## Zrobione

- **`PostItem.previousSlugs?: string[]`** (`types.ts`, `schema.ts`) — historia adresów posta.
- **Auto-tracking w `persistence.ts`** — `saveSite()` porównuje nowy slug ze slugiem zapisanym
  wcześniej w DB; przy zmianie dopisuje stary do `previousSlugs` (dedup, bez utraty historii nawet
  gdy klient nie zmienia posta w danym zapisie — `PostsEditor` wysyła pełne obiekty przez spread).
- **`renderer/post-jsonld.ts`** — `buildBlogPostingJsonLd()` i `buildBreadcrumbListJsonLd()`,
  czyste funkcje budujące JSON-LD przez `JSON.stringify` (bezpieczne escapowanie, w tym `</script>`
  w tytule). Gotowe do podłączenia w kroku 3 (`post-page.ts`), gdy powstanie szablon strony.
- **`buildSitemapXml()` w `export.ts`** — dolicza `publikacje/<slug>.html` dla każdego opublikowanego
  posta (lastmod = `publishedAt`) oraz `publikacje.html` (lista), tylko gdy są opublikowane posty.
  Szkice i historyczne slugi nigdy nie trafiają do sitemapy.
- **`buildPostRedirects()` + `_redirects.json`** w `export.ts` — mapa starych adresów na nowe,
  zapisywana obok `sitemap.xml`/`robots.txt` w `renderStaticSite()` i `buildStaticSiteFiles()`.
  Tylko dla postów aktualnie opublikowanych (przekierowanie do draftu byłoby przekierowaniem na 404).
- **301 w Workerze** (`workers/site-router/src/index.ts`) — `resolveRedirect()` czyta
  `_redirects.json` z R2 jako fallback **dopiero po** nieudanej próbie serwowania pliku (nie na
  każdym requeście), zwraca `Response.redirect(..., 301)`.
- **Testy:** `tests/persistence-roundtrip.test.ts` (4 nowe — zmiana slugu, przetrwanie historii,
  druga zmiana bez duplikatów, nowy post bez historii), `tests/export.test.ts` (6 nowych — sitemap
  z postami/bez, redirecty, brak redirects.json gdy nic do przekierowania, zgodność
  `renderStaticSite` ↔ `buildStaticSiteFiles`), `tests/post-jsonld.test.ts` (4 nowe). Pełny
  `npx vitest run`: 227/227 zielono. `tsc --noEmit` czysto (główny projekt i Worker).

**Ważna uwaga:** dopóki krok 1 (szablon `post-page.ts`) nie powstanie, sitemapa dla tenantów z
opublikowanymi postami będzie wskazywać na `publikacje/<slug>.html` i `publikacje.html`, które
**jeszcze nie istnieją** na żywej stronie (404). To nieszkodliwe dopóki żaden tenant nie ma
opublikowanego posta i nie klika "Publikuj" — ale gdy pierwszy realny post zostanie opublikowany
przed wdrożeniem szablonu, sitemapa i `_redirects.json` będą zawierać martwe linki. Priorytet:
dokończyć krok 1 (i zarejestrować listę publikacji) zanim ktokolwiek opublikuje pierwszy realny
artykuł.

---

## Stan obecny (z audytu)

Model danych, edytor (`PostsEditor.tsx`, `RichTextEditor.tsx`) i walidacja/sanitizacja przy zapisie
(`sanitizePostBody`, C3, C7, C8 w `src/lib/cms/validation/collections.ts`) są gotowe i solidne.

**Brakuje całej warstwy renderującej.** `renderPostItem` / `renderPostsSection`
(`src/lib/cms/renderer/collections.ts`) istnieją, ale nie są zarejestrowane w `SECTION_REGISTRY`
(`src/lib/cms/renderer/index.ts`) ani wywoływane skądkolwiek. Publikacja posta obecnie nie ma
żadnego efektu na żywej stronie: brak trasy `/publikacje/[slug]`, brak strony-listy, brak wpisu
w sitemapie.

| # | Wymaganie | Status | Notatka |
|---|---|---|---|
| 1 | Tytuł jako dokładnie jeden `<h1>` | nie działa | Obecnie `<h3 class="post-title">`, w dodatku martwy kod |
| 2 | H2/H3/akapit/lista/link → semantyczny HTML | działa | Edytor + sanitizer whitelist zgodne: `p,h2,h3,ul,ol,li,a,strong,em,br` |
| 3 | „Zajawka" → `<meta name="description">` | nie działa | `excerpt` nigdzie nie trafia do `renderHead()` |
| 4 | `<title>` z tytułu publikacji | nie działa | Brak strony artykułu |
| 5 | `canonical` na własny URL posta | nie działa | `renderHead()` bierze canonical tylko z `PageMeta`/`SiteMeta` |
| 6 | Publikacja wewnątrz `<article>` | wymaga poprawy | Jest w martwym kodzie, ale to fragment listy nie pełna strona |
| 7 | Data jako `<time datetime="">` | nie działa | Obecnie zwykły `<p class="post-date">` z tekstem PL |
| 8 | JSON-LD `BlogPosting` | nie działa | Zero wystąpień w repo |
| 9 | JSON-LD `BreadcrumbList` | nie działa | Zero wystąpień w repo |
| 10 | Auto-wpis w sitemap.xml i na liście publikacji | nie działa | `buildSitemapXml()` iteruje tylko po `model.pages`, nie po `collections.posts` |
| 11 | Szkice: noindex / niedostępne publicznie | wymaga poprawy | Filtr `status==='published'` już istnieje w renderer collections.ts, ale nic nie jest publicznie serwowane w ogóle |
| 12 | 301 przy zmianie sluga po publikacji | nie działa | Brak pola `previousSlugs`/`redirects`, brak mechanizmu w Workerze/middleware |

Dodatkowe ryzyko: równoległy, niespójny model danych — tabela Prisma `Post`
(`prisma/schema.prisma:61-72`, bez `slug`/`excerpt`, obsługiwana przez `getTenantScopedClient`)
jest martwą ścieżką. Realny zapis idzie przez `actions.ts` → `saveSite()` do
`Site.model.collections.posts` (JSON). Do wyjaśnienia: czy tabelę `Post` usunąć, czy zostawić
na przyszłość (np. jako indeks do szybszych zapytań).

---

## Cel

Po publikacji posta w panelu:
- artykuł jest dostępny pod publicznym URL (`/publikacje/<slug>` lub odpowiednik na R2/Workerze,
  zgodnie z resztą architektury eksportu statycznego),
- ma poprawne, kompletne SEO (title, meta description, canonical, JSON-LD),
- pojawia się automatycznie na liście publikacji i w sitemap.xml,
- szkice pozostają niewidoczne publicznie,
- zmiana sluga po publikacji nie psuje starych linków (301).

Uwaga architektoniczna: strona jest statycznie eksportowana i serwowana z R2 przez Cloudflare
Worker (`workers/site-router/`), a nie renderowana on-demand przez Next.js — trasa `/publikacje/[slug]`
w Next.js istnieje tylko dla panelu/preview, tak jak `/preview?page=...` dla zwykłych stron.
Ostateczna implementacja musi trzymać się tego samego wzorca co strony (`renderStaticSite`/
`buildStaticSiteFiles` → upload do R2 pod `sites/<tenantId>/`), nie wprowadzać osobnej ścieżki SSR.

---

## Kroki implementacji

### 1. Szablon pojedynczego artykułu
- Nowy plik `src/lib/cms/renderer/post-page.ts` (analogicznie do renderowania stron) —
  `renderPostPage(post, ctx)` zwracający pełny dokument HTML:
  - `<h1>` z `post.title` (jedyny h1 na stronie),
  - treść `post.body` (już sanitizowana) wewnątrz `<article>`,
  - `<time datetime="{ISO}">{sformatowana data PL}</time>` zamiast obecnego `<p class="post-date">`,
  - trzy pliki CSS zgodnie z resztą renderera (design-system-agency, forma-layout, forma-components).
- Podłączyć pod `linkMode: 'static' | 'preview'` tak jak reszta renderera (href do listy publikacji,
  breadcrumb do strony głównej).

### 2. Head / metadane per-post
- Rozszerzyć lub zreużyć `renderHead()` (`src/lib/cms/renderer/head.ts`) o wariant przyjmujący
  `PostItem` zamiast `PageMeta`:
  - `<title>` = `post.title` (+ ewentualny suffix nazwy kancelarii, zgodnie z konwencją stron),
  - `<meta name="description">` = `post.excerpt`,
  - `<link rel="canonical" href="{baseUrl}/publikacje/{post.slug}">`.

### 3. JSON-LD BlogPosting + BreadcrumbList
- Dodać generator JSON-LD w `post-page.ts` (wzorem `ProfessionalService`/FAQ w `head.ts`):
  - `BlogPosting`: headline, datePublished (ISO), description (excerpt), author/publisher (dane
    kancelarii z `SiteMeta`), mainEntityOfPage = canonical URL.
  - `BreadcrumbList`: Strona główna → Publikacje → `post.title`.

### 4. Lista publikacji
- Zarejestrować `'posts'` w `SECTION_REGISTRY` (`renderer/index.ts`) **albo** zbudować osobną
  statyczną stronę listy (`/publikacje/index.html`) analogicznie do `post-page.ts` — do ustalenia
  po designie ze Stitch (czy lista to sekcja na istniejącej stronie, czy osobna podstrona).
- Upewnić się, że filtr `status === 'published'` (już obecny w `collections.ts`) jest zachowany.

### 5. Generowanie plików przy eksporcie/publikacji
- Rozszerzyć `renderStaticSite()` i `buildStaticSiteFiles()` (`src/lib/cms/export.ts`) o iterację
  po `model.collections.posts.filter(p => p.status === 'published')`:
  - jeden plik HTML per post pod `publikacje/<slug>.html` (wzorem plików stron),
  - jeden plik listy `publikacje.html` albo `publikacje/index.html`.
- Szkice (`status === 'draft'`) **nie generują pliku w ogóle** — to jest silniejsza gwarancja niż
  noindex i spójna z tym, jak reszta systemu chroni niepublikowaną treść.

### 6. Sitemap
- Rozszerzyć `buildSitemapXml()` (`export.ts:6-18`) o URL-e opublikowanych postów
  (te same dane co w kroku 5, ten sam filtr `status === 'published'`).

### 7. Przekierowania 301 przy zmianie sluga
- Dodać pole `PostItem.previousSlugs?: string[]` w `types.ts` + `schema.ts` (Zod) — dopisywane
  automatycznie przy zmianie sluga w `actions.ts`/`persistence.ts` (stary slug trafia na listę,
  nigdy nie jest z niej usuwany).
- Zdecydować mechanizm serwowania 301: Worker (`workers/site-router/src/index.ts`) już robi
  proste przepisywanie ścieżek — najprościej dodać tam odczyt mapy `oldSlug → newSlug` per tenant
  (np. plik `sites/<tenantId>/_redirects.json` generowany razem z resztą eksportu) i zwracać
  `301` przed próbą serwowania pliku z R2. To wymaga zmiany w Workerze, nie tylko w Next.js —
  osobny, mniejszy PR.

### 8. Testy
- Rozszerzyć `tests/renderer.test.ts` o nowy plik referencyjny dla przykładowego artykułu
  (DOM-diff, jak dla reszty stron).
- Nowy test na `buildSitemapXml()` sprawdzający obecność/brak wpisów dla published/draft.
- Nowy test sprawdzający że draft nie generuje żadnego pliku w `buildStaticSiteFiles()`.
- Test na generowanie `previousSlugs` i (jeśli redirect logic trafi do repo Workera) na 301.

### 9. Do decyzji przed startem (nie blokuje designu w Stitch)
- Los tabeli Prisma `Post` (usunąć czy zostawić) — osobna sprawa, nie wpływa na front.
- Struktura URL: `/publikacje/<slug>` vs inny prefiks — potwierdzić w designie.
- Czy lista publikacji to sekcja na stronie głównej, czy osobna podstrona z własnym URL.
