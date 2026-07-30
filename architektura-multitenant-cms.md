# Jak budować multi-tenant CMS dla kancelarii — architektura forma-cms

Dokument onboardingowy dla **kolejnych projektów tego typu** (np. `kancelaria-cms`),
nie tylko dla tego repo. Każda zasada niżej wynika z konkretnego rozwiązania
w `forma-cms`, z odwołaniem do pliku — to destylacja z działającego kodu, nie
teoria. Siostrzany dokument [`strategia-seo.md`](./strategia-seo.md) pokrywa
warstwę SEO/treści; ten dokument pokrywa architekturę systemu.

---

## 1. Fundamentalna decyzja produktowa: treść vs forma

To jest **moat** tego typu produktu i każda kolejna decyzja architektoniczna z niego
wynika: klient (właściciel kancelarii) edytuje **treść** (tekst, zdjęcia, dane), nigdy
**formę** (fonty, kolory, layout, strukturę sekcji). Jeden silnik renderujący (`forma-cms`)
obsługuje wielu tenantów — każdy dostaje tę samą jakość designu, żaden nie może jej
zepsuć przypadkowym wyborem złego koloru czy fontu.

Konsekwencje techniczne tej jednej decyzji:
- Edytor WYSIWYG ogranicza formatowanie do **struktury semantycznej**
  (`p, strong, em, ul, ol, li, a, h2, h3, br, table…` — `validation/collections.ts`),
  nigdy do inline-style. Klient może powiedzieć „to jest nagłówek", nie „to ma być
  czerwone".
- Pola w fixture mają `editable: true/false` per pole, nie per sekcja — jeden nagłówek
  sekcji może być edytowalny, a jej struktura (`recipe`) już nie.
- Nieznany typ sekcji **rzuca błąd natychmiast** (`SECTION_REGISTRY`, `renderer/index.ts`),
  zamiast po cichu renderować pustkę — cichy błąd w renderowaniu strony klienta jest
  najgorszym możliwym trybem awarii (nikt go nie zauważa, aż klient zadzwoni).

**Przy budowie kolejnego produktu tego typu:** ustal tę granicę pierwszego dnia i
zapisz ją w pliku instrukcji (`CLAUDE.md` czy odpowiedniku) jako niepodważalną —
naciski typu „tylko ten jeden klient chce zmienić font" pojawią się na pewno.

---

## 2. Izolacja tenantów — jedna funkcja, przez którą przechodzi WSZYSTKO

`getTenantScopedClient(session)` (`src/lib/tenant/client.ts`) wiąże `tenantId`
**z sesji**, nigdy z requestu. Każde zapytanie Prisma wewnątrz filtruje po
`tenantId` — `getSiteById(id)` przyjmuje `id`, ale **nadal filtruje po `tenantId`
z sesji**, więc klient nie może podać cudzego ID i dostać cudzych danych.

**Zasada:** żaden kod poza tą jedną funkcją nie dotyka Prisma bezpośrednio z danymi
tenanta. Jeśli ktoś kiedyś napisze `prisma.site.findUnique({ where: { id: req.body.id } })`
z pominięciem tej funkcji, to jest dziura bezpieczeństwa między tenantami — najgorszy
możliwy błąd w produkcie multi-tenant, bo ujawnia dane jednego klienta drugiemu.
Wart osobnego testu (`tenant-isolation.test.ts` w tym repo) niezależnie od reszty
pokrycia.

**Sesja niesie `tenantId` + `userId` + `role`** (`next-auth.d.ts`), middleware
(`src/middleware.ts`) chroni ścieżki panelu przez matcher, ale to **wtórna** warstwa —
autorytatywna jest `getTenantScopedClient`. Nie polegaj na middleware jako jedynej
obronie dla nowej trasy.

---

## 3. Render pipeline: rejestr sekcji, nie if/else

`renderPage(model, slug, basePath, linkMode)` (`renderer/index.ts`) składa całą stronę
z `SECTION_REGISTRY: Record<string, (section, ctx) => string>` — mapa `id sekcji →
funkcja renderująca`. Dodanie nowej sekcji to: nowy plik w `renderer/sections/`,
wpis w rejestrze, pole w fixture. Żadnego rozgałęzienia w rdzeniu renderera.

**Dlaczego to się broni w praktyce:** strony, które NIE przechodzą przez zwykły
model sekcji (np. lista publikacji, generowana z osobnej kolekcji, nie z
`model.pages`) potrzebują **stubu** w `model.pages` (`sections: []`) tylko po to,
żeby dostać wpis w nawigacji — a renderowanie realnej treści idzie osobną ścieżką
(`renderPostsListPage`/`renderPostPage`). To rozwiązanie działa, ale ma pułapkę:
**każde miejsce, które woła `renderPage()` po slugu tej strony, musi wiedzieć o
wyjątku** — `/preview` w tym repo tego nie wiedział przez jeden dzień (patrz
`strategia-seo.md` §10) i dawał pustą stronę zamiast błędu.

**Przy budowie kolejnego produktu:** jeśli przewidujesz więcej niż jeden typ treści
poza standardowym modelem stron (blog, case studies, wydarzenia...), zaprojektuj od
razu miejsce, przez które WSZYSTKIE konsumenty rendererów muszą przejść (podgląd,
eksport statyczny, publikacja do R2), zamiast dodawać wyjątki przy każdym nowym
typie z osobna.

---

## 4. Walidacja: dwa poziomy, nigdy zmieszane

- **Twarda** (`validation/hard.ts`, reguły V1–V15 w tym repo) — blokuje zapis.
  Tylko dla stanów, które faktycznie łamią produkt (pusta cena, brakująca sekcja
  wymagana, XSS w treści).
- **Miękka** (`validation/soft.ts`, W1–W7) — tylko ostrzega. Dla zaleceń (długość
  meta description, brak zdjęcia w karcie).
- **Kolekcje** (`validation/collections.ts`, C1–C12, C9 usunięta — patrz niżej) — osobna kategoria
  dla danych kolekcyjnych (posty, wydarzenia), bo mają inny cykl życia niż pola
  sekcji (draft/published, historia slugów).

**Zasada, złamana i naprawiona w tym repo:** nigdy nie blokuj zapisu za coś, co jest
tylko zaleceniem. Odwrotny błąd też się zdarzył: kategoria posta miała twardą regułę
sprawdzającą przynależność do zamkniętej listy (`C9`), która przestała mieć sens,
gdy pole zmieniło się na wolny tekst — reguła została usunięta razem z enumem, nie
zostawiona jako martwy kod.

**Przy budowie kolejnego produktu:** zaprojektuj `Violation { rule, field, message }`
jako wspólny kształt dla obu poziomów od początku (tak jak tutaj) — jedna funkcja
zwraca błędy, druga ostrzeżenia, UI renderuje je różnym kolorem, ale to ten sam typ.

---

## 5. Dual schema: Postgres (prod) + SQLite (dev/test), generowane, nie ręczne

`prisma/schema.prisma` (Postgres) jest jedynym źródłem prawdy. `schema.sqlite.prisma`
jest **generowany** (`npm run schema:sqlite`, `scripts/gen-sqlite-schema.mjs`) — plik
ma nagłówek `DO NOT EDIT`. Test `schema-sync.test.ts` i CI failują, jeśli oba się
rozjadą.

**Dlaczego to jest warte powtórzenia w kolejnym projekcie:** w tym repo narzędzie do
synchronizacji w chmurze **po cichu cofnęło** `schema.prisma` przy zachowanym
`schema.sqlite.prisma` z nowymi polami — testy lokalne były zielone (bo biły w SQLite),
build na Vercelu (Postgres) się wysypał. Generator + test + CI usuwają całą tę klasę
błędu. Ręczna synchronizacja dwóch schematów "w miarę potrzeby" gwarantuje, że się
kiedyś rozjadą.

Migracje danych to **ręczne skrypty TypeScript** (`prisma/migrate-*.ts`), nie
`prisma migrate` — bo model danych to jedna kolumna `Json`/`String` (`Site.model`),
a migracja często oznacza "dopisz pole do zagnieżdżonej struktury JSON we
wszystkich rekordach", czego `prisma migrate` nie wyrazi deklaratywnie.

---

## 6. Testy: DOM-diff przeciw referencyjnemu HTML, nie snapshoty

`renderer.test.ts` renderuje fixture i porównuje **strukturę DOM** (przez `jsdom`)
z ręcznie zatwierdzonym plikiem referencyjnym (`reference/forma-production/*.html`).
To różni się od zwykłych snapshot-testów: zmiana w strukturze HTML **musi** być
świadomą decyzją (aktualizacja pliku referencyjnego), nie przypadkowym efektem
ubocznym zaakceptowanym jednym kliknięciem `--update-snapshots`.

Fixture (`fixtures/forma-site.json`) ma dodatkowo **whitelistę znaków** (ASCII +
polskie diakrytyki + 4 znaki warunkowe: `—•≥©`) i **baseline** liczący te znaki per
pole (`fixtures/forma-site.baseline.json`) — licznik nie może rosnąć bez świadomej
aktualizacji (`scripts/update-baseline.js`). To łapie typograficzne cudzysłowy i
inne śmieci wklejone przypadkiem z Worda, zanim trafią do produkcji.

**Przy budowie kolejnego produktu:** jeśli renderer generuje HTML deterministycznie
z danych (nie ma losowości, timestampów w treści), DOM-diff przeciw referencji jest
tańszy w utrzymaniu niż testowanie każdej sekcji osobnym `expect(html).toContain(...)`
— jedna zmiana w layout łamie jeden test w oczywisty sposób, zamiast dziesiątek
rozproszonych asercji.

---

## 7. Cztery tory wdrożenia — rozdzielone, bo mają różne opóźnienia

```
KOD:     git push → Vercel (auto)              → panel, podgląd, /preview
TREŚĆ:   przycisk "Publikuj" (ręczny, w panelu) → R2 sites/<tenantId>/ → żywa strona
ZDJĘCIA: upload w panelu (natychmiastowy)       → R2 <tenantId>/       → widoczne od razu
EDGE:    npm run deploy (ręczny, osobny pakiet) → Cloudflare Worker    → routing, nagłówki
```

Pełne rozwinięcie z przykładami realnych awarii w `strategia-seo.md` §11–12. Sedno
dla architektury: **żywa strona to nie ten sam proces co panel**. Panel (Next.js na
Vercelu) czyta/pisze do Postgresa i renderuje podgląd na żądanie. Żywa strona to
**statyczny HTML wygenerowany raz i wgrany do R2** — serwowany przez osobny,
niezależnie wdrażany Cloudflare Worker. Zmiana w panelu nie dotyka R2, dopóki
ktoś nie kliknie "Publikuj". Zmiana w Workerze nie dotyka niczego, dopóki ktoś nie
odpali jego własny `deploy`.

**Konsekwencja architektoniczna, nie tylko proceduralna:** renderer, który generuje
żywą stronę, musi być **deterministyczny i bezstanowy** — to ta sama funkcja, wołana
przy `/preview` (na żądanie, z bazy) i przy `publishSite()` (raz, do zamrożenia w
R2). Gdyby renderer czytał cokolwiek poza argumentami (zegar systemowy, losowość,
zewnętrzne API), podgląd i opublikowana wersja mogłyby się różnić bez żadnej zmiany
w danych — a to jest dokładnie ten rodzaj błędu, który ujawnia się tygodnie później
i jest bardzo trudny do odtworzenia.

**Przy budowie kolejnego produktu:** rozstrzygnij od razu, czy żywa strona jest
"serwowana na żywo" (jak panel) czy "zamrożona przy publikacji" (jak tutaj). Ten
drugi model jest szybszy i tańszy w utrzymaniu (R2 + Worker to grosze, statyczny
HTML to milisekundy odpowiedzi), ale wymaga jawnego kroku publikacji i pociąga za
sobą wszystkie pułapki z §11 `strategia-seo.md` (upload zdjęcia widoczny od razu,
treść dopiero po publikacji — dwa zegary, które trzeba trzymać w głowie osobno).

---

## 8. Cache-busting dla assetów użytkownika: klucz stabilny, wersja w URL

Lekcja z realnej regresji (`strategia-seo.md` §11, pełny opis). Skrót decyzji:
**nigdy nie zmieniaj klucza obiektu w storage (R2/S3) tylko po to, żeby obejść
cache przeglądarki/CDN.** Klucz zostaje deterministyczny (`<tenantId>/<kind>-<id>.webp`,
nadpisywany w miejscu), cache rozwiązuje się przez query string (`?v=<losowe>`) w
zwracanym URL-u. Zmienny klucz wymaga kasowania starego pliku — a jeśli żywa strona
(zamrożony HTML) wciąż wskazuje na stary URL, kasowanie go **psuje działającą
stronę** w oknie między zmianą a publikacją.

**Przy budowie kolejnego produktu z uploadem obrazów:** zanim napiszesz logikę
uploadu, zdecyduj, czy URL wygenerowanego assetu może się kiedykolwiek zmienić
niezależnie od treści strony, która go referencjuje. Jeśli tak (jak tutaj — upload
jest natychmiastowy, publikacja nie) — klucz musi być stabilny, kasowanie tylko
przy trwałym usuwaniu encji, nigdy przy podmianie.

---

## 9. Warstwa bezpieczeństwa HTTP żyje tam, gdzie żyje ruch produkcyjny

Jeśli żywa strona jest serwowana przez edge Worker (§7), to tam — nie w konfiguracji
frameworka panelu (Next.js/Vercel) — dodaje się nagłówki bezpieczeństwa
(`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`,
`Strict-Transport-Security`, docelowo CSP). Next.js w tym repo obsługuje wyłącznie
panel administracyjny — zero ruchu produkcyjnego klientów kancelarii. Pełny opis
wdrożenia i weryfikacji w `strategia-seo.md` §12.

**Przy budowie kolejnego produktu:** ustal na starcie, który proces faktycznie
odpowiada na żądania z domeny klienta, i tam pilnuj nagłówków — łatwo założyć, że
"skoro to Next.js app, to `next.config.js` wystarczy", podczas gdy produkcyjny ruch
w ogóle nie dotyka tego procesu.

---

## 10. Onboarding kolejnej domeny tenanta na Cloudflare — powtórz to za KAŻDYM razem

Odkryte 2026-07-30 przy pracy nad cache brzegowym: `kowalczyk.formawizerunku.pl` i
`mazur.formawizerunku.pl` to subdomeny **przygotowane pod przyszłych klientów**
(jeszcze nie realne, plan właściciela — hostować kolejnych klientów na Cloudflare).
Sprawdzone wprost (`curl -D -`): **nie wysyłają żadnego `Cache-Control`** — więc
ustawienie strefy „Browser Cache TTL" (patrz `strategia-seo.md` §12) nie ma tam
czego respektować. Zero ryzyka, ale i zero korzyści, dopóki origin (Worker/serwer za
tą subdomeną) nie zacznie same nagłówki wysyłać.

**Dwie różne sytuacje, dwa różne działania — nie pomyl ich:**

1. **Nowy klient jako subdomena TEJ SAMEJ strefy** (np. `nastepny.formawizerunku.pl`)
   → ustawienia strefy (`Browser Cache TTL`, i inne z panelu Cloudflare) **already
   apply automatically** — nic nie trzeba klikać ponownie. Do zrobienia jest tylko
   kod: ten Worker (albo jego odpowiednik) musi faktycznie wysyłać `Cache-Control`,
   inaczej „Respect Existing Headers" nie ma na czym pracować (dokładnie stan
   `kowalczyk.`/`mazur.` dzisiaj).

   **Twarde ograniczenie na przyszłość, nie tylko dzisiaj:** `formawizerunku.pl`
   wysyła HSTS z `includeSubDomains` (`strategia-seo.md` §12) — to reguła
   zapamiętywana **w przeglądarce odwiedzającego** po wizycie na głównej domenie,
   każąca jej łączyć się z **każdą** subdomeną wyłącznie po HTTPS, bez wyjątków,
   przez rok. Efekt na nowej subdomenie bez jeszcze-nie-gotowego certyfikatu: nie
   "wolniej" czy "gorzej" — **przeglądarka w ogóle nie wyświetli strony**, twardy
   błąd połączenia bez opcji ominięcia, dla każdego kto wcześniej odwiedził stronę
   główną. Nie da się tego wyłączyć punktowo dla jednej subdomeny — reguła dotyczy
   całej strefy. Kolejność ma znaczenie: proxy Cloudflare (i certyfikat) musi
   działać na nowej subdomenie **zanim** ktokolwiek dostanie do niej link, nie
   "wdrożę, a HTTPS dogonię później".
2. **Nowy klient na WŁASNEJ, osobnej domenie** (np. `kancelaria-xyz.pl`, nie
   subdomena `formawizerunku.pl`) → to jest **osobna strefa Cloudflare**. Nic z tego,
   co ustawiono dla `formawizerunku.pl` (`Browser Cache TTL`, nagłówki bezpieczeństwa
   jeśli konfigurowane per-strefa) **nie przenosi się automatycznie**. Cała lista
   niżej do przejścia od nowa, dla KAŻDEJ nowej strefy osobno.

**Checklista per nowa domena/strefa:**
- [ ] `HOST_MAP` w `wrangler.toml` ma wpis dla nowego hosta → nowy `tenantId`
- [ ] Custom Domain podpięty w Cloudflare Dashboard (Worker → Settings → Domains
      & Routes) — bez tego DNS wskazuje na Worker, ale routing go nie widzi
- [ ] Origin (Worker obsługujący tę domenę) faktycznie wysyła `Cache-Control` —
      zweryfikować `curl -D -`, nie zakładać
- [ ] `Browser Cache TTL` w nowej strefie ustawione na `Respect Existing Headers`
      (albo świadomy odpowiednik) — domyślna wartość strefy (często kilka godzin)
      nadpisze cokolwiek origin wysyła, dokładnie jak `formawizerunku.pl` przed
      2026-07-30
- [ ] Nagłówki bezpieczeństwa (§9) obecne na TEJ strefie — nie zakładać, że
      "skoro już to zrobiliśmy gdzie indziej, to działa wszędzie"

---

## 11. Checklista architektoniczna dla nowego projektu tego typu

- [ ] Spisana i wyegzekwowana granica treść/forma (§1) — w pliku instrukcji, nie
      tylko w głowie
- [ ] Jedna funkcja `getTenantScopedClient`-podobna, przez którą przechodzi CAŁY
      dostęp do danych tenanta (§2) — z testem izolacji
- [ ] Rejestr sekcji/typów, nie if/else w rdzeniu renderera (§3); nieznany typ
      rzuca błąd, nie renderuje pustki
- [ ] Wspólny kształt błędu/ostrzeżenia (`{ rule, field, message }`) od pierwszego
      dnia (§4)
- [ ] Jeśli dwa schematy bazy (dev/prod) — jeden generowany z drugiego + test
      synchronizacji w CI (§5), nigdy ręczna synchronizacja "w miarę potrzeby"
- [ ] DOM-diff przeciw referencji zamiast snapshotów, jeśli renderer jest
      deterministyczny (§6)
- [ ] Rozstrzygnięte na starcie: "serwowane na żywo" czy "zamrożone przy
      publikacji" (§7) — to determinuje wszystkie tory wdrożenia
- [ ] Klucz assetu w storage stabilny, cache przez wersję w URL, nie przez klucz (§8)
- [ ] Nagłówki bezpieczeństwa tam, gdzie faktycznie płynie ruch produkcyjny (§9)
- [ ] Przy każdej nowej domenie tenanta na Cloudflare: pełna checklista per-strefa
      (§10) — ustawienia strefy NIE przenoszą się między osobnymi domenami
