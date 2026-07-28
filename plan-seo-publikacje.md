# Plan: zaawansowane ustawienia SEO dla publikacji

Data: 2026-07-28. Punkty 2 i 3 z audytu SEO — audyt bez zmian w kodzie, patrz "Stan obecny".
Punkt 1 (`<article>` + `<aside>`/`<h2>` dla kluczowych wniosków) jest **już zrobiony**.

## Stan obecny (zweryfikowany w wygenerowanym HTML)

Działa i **nie wymaga zmian**: jeden `<h1>`, `<article>`, canonical, `BlogPosting`,
`BreadcrumbList`, wpis w sitemapie, widoczność na liście, brak publicznego dostępu do
szkiców (plik niegenerowany, brak w sitemapie i na liście).

Czego **nie ma** w modelu: `metaTitle`, `metaDescription`, `noindex`. Nie da się dziś
nadpisać domyślnych wartości, które powstają tak:

- `<title>` = `${post.title} | ${meta.brandName}` (`renderer/publikacje.ts`, wywołanie `renderHead`)
- `<meta name="description">` = `post.excerpt ?? meta.description` (tamże)
- `BlogPosting.description` = `post.excerpt ?? ''` (`renderer/post-jsonld.ts:24`)

## Punkt 2 — pola metaTitle / metaDescription

### Zakres zmian

| Plik | Zmiana |
|---|---|
| `src/lib/cms/types.ts` | `PostItem`: `metaTitle?: string`, `metaDescription?: string` |
| `src/lib/cms/schema.ts` | `PostItemSchema`: te same pola jako `z.string().optional()` |
| `src/lib/cms/validation/collections.ts` | nowa reguła **C12** (twarda) — długości, patrz niżej |
| `src/lib/cms/validation/soft.ts` | nowe **W6/W7** (miękkie) — zalecane zakresy długości |
| `src/lib/cms/renderer/publikacje.ts` | `renderHead(...)`: `title: post.metaTitle ?? domyślny`, `description: post.metaDescription ?? post.excerpt ?? meta.description` |
| `src/lib/cms/renderer/post-jsonld.ts` | `description: post.metaDescription ?? post.excerpt ?? ''` |
| `src/app/(panel)/edit/publikacje/PostsEditor.tsx` | zwijana sekcja `<details>` "Zaawansowane ustawienia SEO" |
| `tests/renderer.test.ts` | override tytułu/opisu wchodzi do `<head>` i do JSON-LD; brak override = zachowanie bez zmian |
| `tests/validation.test.ts` | C12 blokuje, W6/W7 tylko ostrzegają |

### Walidacja — podział twarde/miękkie

Ważne rozróżnienie, żeby nie zablokować klientowi zapisu za coś, co jest tylko
niezalecane (wzorem istniejącego podziału V\* / W\*):

- **C12 (twarda, blokuje zapis):** `metaTitle` ≤ 70 znaków, `metaDescription` ≤ 200 znaków.
  To górne granice sanity-check, nie zalecenia SEO — chronią przed wklejeniem całego
  akapitu. Puste/nieustawione zawsze OK (pola opcjonalne).
- **W6/W7 (miękkie, tylko ostrzeżenie):** `metaTitle` 50–60 znaków, `metaDescription`
  120–160 znaków. **Dokładnie ta sama logika co istniejące W1/W2** dla `meta.title` /
  `meta.description` (`validation/soft.ts:22-39`) — przy implementacji wydzielić wspólny
  helper zamiast kopiować warunek trzeci raz.

Uwaga: `validateSoft()` przyjmuje dziś `SiteModel` i nie dostaje kolekcji jako osobnego
argumentu — posty są dostępne przez `model.collections.posts`, więc W6/W7 da się dodać
bez zmiany sygnatury.

### UI panelu

Wzorzec istniejący w `PostsEditor.tsx`: `field-row` / `posts-form-row` + `errorFor(field)`
do błędów. Nowa sekcja na końcu formularza, przed "Treść":

```
<details className="posts-advanced">
  <summary>Zaawansowane ustawienia SEO</summary>
  — Tytuł SEO (puste = "Tytuł | Forma Wizerunku")
  — Opis SEO (puste = Zajawka)
  — podgląd Google (punkt 3)
</details>
```

Pola muszą pokazywać **licznik znaków** z progami z W6/W7 — bez tego klient nie ma
sygnału, że przekroczył zalecenie, bo ostrzeżenia miękkie nie blokują zapisu.

### Czego świadomie NIE robimy

- **`noindex` per post** — odrzucone jako footgun: klient może przypadkiem wyindeksować
  dobry artykuł, a przy blogu tej wielkości potrzeba jest marginalna. Jeśli kiedyś
  wróci, to jako osobna decyzja, nie przy okazji tego punktu.
- **Archiwa tagów + `noindex` na nich** — nie generujemy dziś żadnych stron tagów
  (zweryfikowane), więc problem ubogich podstron nie istnieje. Nie ma czego oznaczać.

## Punkt 3 — podgląd wyniku Google

Zależy od punktu 2 — bez pól override podgląd nie ma czego pokazywać poza wartościami,
których i tak nie da się zmienić. **Robić dopiero po punkcie 2.**

Wartość tego podglądu to **nie wygląd, tylko pokazanie ucięcia** przy limitach: tytuł
~60 znaków, opis ~155. To jedyny powód, dla którego warto go budować.

### Zakres

- Komponent kliencki w `src/app/(panel)/edit/publikacje/` (np. `GooglePreview.tsx`),
  czysto prezentacyjny, bez fetchowania.
- Wejście: `title` (efektywny — override albo domyślny), `description` (j.w.), `url`.
- URL składać przez **`postUrl(siteRoot, slug)`** z `src/lib/cms/urls.ts` — nie budować
  ścieżki ręcznie w komponencie, bo konwencja `publikacje/<slug>.html` jest tam
  scentralizowana właśnie po to.
- Ucięcie: `title` > 60 → `…`, `description` > 155 → `…`. Progi jako nazwane stałe
  obok W6/W7, nie magic numbers rozsiane po komponencie.
- Podgląd pokazuje **wartości efektywne** (po zastosowaniu domyślek), nie surowe pola —
  inaczej przy pustym override wyglądałby na pusty, co jest mylące.

## Kolejność i szacunek

1. Punkt 2 bez UI: `types.ts` → `schema.ts` → renderer + jsonld → C12/W6/W7 → testy.
   To da się zweryfikować testami bez dotykania panelu.
2. Punkt 2, UI: `<details>` w `PostsEditor.tsx` + liczniki znaków.
3. Punkt 3: `GooglePreview.tsx` wpięty w `<details>`.

## Dług do posprzątania przy okazji

- **Panel nadal pokazuje select "Kategoria"** (`PostsEditor.tsx`, ~linia 259) mimo że
  kategorie zostały wyłączone z renderowania (2026-07-28). Klient może dziś ustawić
  kategorię, która nie pojawia się nigdzie na stronie. Albo ukryć select, albo
  przywrócić kategorie w UI — obecny stan jest niespójny.
- **Etykieta "Tagi (oddzielone przecinkiem, maks. 8)"** — jeśli limit zejdzie do 2–4
  (decyzja redakcyjna, nie SEO — tagi nie mają dziś żadnej powierzchni SEO), trzeba
  zmienić etykietę razem z `MAX_TAGS` w `validation/collections.ts:6`.
