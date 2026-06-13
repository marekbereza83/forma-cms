# Audyt — FORMA CMS + strona (renderer)

Data: 2026-06-10 · Stan repo: commit `e5fcdda` (main) · Testy: 142 pass / 26 skipped (3 suity nie startują — patrz W2)

---

## Podsumowanie

Architektura jest zdrowa i konsekwentna: jedno wejście do zapisu (`parseSiteModel`), scentralizowana izolacja tenantów (`getTenantScopedClient`), audit trail (`EditLog`) w transakcji, renderer testowany DOM-diffem przeciwko referencyjnemu HTML. Upload obrazów jest zrobiony wzorcowo (magic bytes, re-encode przez sharp, blokada SVG, regex na nazwach plików). Główne ryzyka w tej chwili to: **brak jakiejkolwiek walidacji nowych pól kontaktowych** (wczorajsza zmiana), **niedziałający lokalnie test izolacji tenantów** oraz **brak rate-limitingu logowania**.

---

## Co działa dobrze (utrzymać)

- **Izolacja tenantów** — `src/lib/tenant/client.ts` binduje `tenantId` z sesji JWT, nigdy z requestu. Każde zapytanie filtruje po `tenantId`, w tym `getSiteById`/`getEventById` (findFirst z `id AND tenantId`).
- **Pojedynczy punkt zapisu** — `saveSite()` → `parseSiteModel()` → transakcja upsert + `EditLog` z before/after. Walidacja zawsze przed zapisem.
- **Upload** (`src/app/api/upload/route.ts`) — detekcja typu po magic bytes (nie po `file.type`), przymusowy re-encode do WebP 800×450 przez sharp (neutralizuje ukryte payloady), blokada SVG, limit 5 MB, `cardId`/`filename` walidowane regexem (UUID), klucz R2 prefiksowany `tenantId` — tenant nie skasuje cudzego pliku.
- **XSS** — `sanitizePostBody()` na zapisie + C3 jako siatka bezpieczeństwa; V15 blokuje `javascript:`/`data:` w linkach portfolio.
- **Renderer** — pełny DOM-diff przeciwko `reference/forma-production/`, whitelist znaków fixture + baseline znaków warunkowych. Trudno przypadkiem zepsuć produkcyjny HTML.
- **Export** — ZIP w pamięci (fflate), działa na serverless; sprzątanie tmp w `finally`.
- **Sekrety** — `.env` / `.env.local` poprawnie w `.gitignore`.

---

## Problemy — priorytet WYSOKI

### W1. Pola kontaktowe bez żadnej walidacji (nowe — commit `e8aadc6`)
`meta.contactPhone`, `meta.contactPhoneDisplay`, `meta.contactEmail` są edytowalne w panelu, a w `SiteMetaSchema` (`src/lib/cms/schema.ts:43-45`) to gołe `z.string()`. Żadna reguła V*/W* ich nie sprawdza (`validation/hard.ts`, `soft.ts` — zero odniesień do `contact*`). Klient może zapisać pusty string albo `"zadzwoń do mnie"` — co generuje zepsute `href="tel:..."`/`mailto:` w nav, hero, stopce i CTA na **każdej stronie** eksportu.
**Rekomendacja:** dodać regułę hard (np. V16): `contactPhone` musi pasować do `^\+?[0-9]{9,15}$`, `contactEmail` do formatu e-mail (`z.string().email()` lub regex w V16 z polskim komunikatem), `contactPhoneDisplay` niepusty.

### W2. Test izolacji tenantów nie wykonuje się lokalnie
3 suity (`tenant-isolation`, `persistence-roundtrip`, `panel-fields` — 26 testów) padają na inicjalizacji: klient Prisma jest wygenerowany ze `schema.prisma` (postgres), a `DATABASE_URL` w `.env` wskazuje SQLite. `globalSetup` migruje `test.db` ze `schema.sqlite.prisma`, ale runtime używa klienta postgresowego. Efekt: **test bezpieczeństwa cross-tenant realnie nie chroni** — od jakiegoś czasu wszystkie zmiany wchodzą bez niego.
**Rekomendacja:** w `globalSetup`/skrypcie testowym generować klienta ze `schema.sqlite.prisma` (`prisma generate --schema`) albo ujednolicić na jednym schemacie z `env`-driven providerem. Cel: `npx vitest` = 7/7 suit zielonych.

### W3. Brak rate-limitingu logowania
`authorizeUser()` (Credentials) nie ma limitu prób, lockoutu ani opóźnienia. Hasła klientów to dziś `haslo123`-klasa (seed). Brute force online jest trywialny.
**Rekomendacja:** prosty limiter per-IP/per-email (np. licznik w DB lub w pamięci na start), minimalna polityka haseł przy tworzeniu tenantów (`scripts/create-tenant.ts`).

---

## Problemy — priorytet ŚREDNI

### ~~S1. Brak `middleware.ts`~~ — ZAMKNIĘTE (commit `3100e1b`)
`src/middleware.ts` dodany z matcherem na `/dashboard`, `/edit/*`, `/preview`, `/api/upload`, `/api/export/*`. Nowe routes panelowe są automatycznie chronione bez ręcznych `auth()` wywołań.

### S2. `exportSite()` tworzy nowy `PrismaClient` na każdy eksport
`src/lib/cms/export.ts:44` — na serverless/postgres to wyczerpywanie puli połączeń.
**Rekomendacja:** używać współdzielonego `prisma` z `src/lib/db/prisma`.

### S3. Dryf dwóch schematów Prisma
`schema.prisma` (postgres) i `schema.sqlite.prisma` trzeba utrzymywać ręcznie w synchronizacji. Dodatkowo `Site.model`/`EditLog.before/after` to `String` także w wersji postgresowej, mimo komentarza "na Postgres zmień na Json".
**Rekomendacja:** docelowo `Json` na postgresie; do tego czasu checklist przy każdej zmianie modelu: oba pliki + migracja.

### S4. Martwe zależności produkcyjne
`archiver` + `@types/archiver` w `dependencies` — eksport przepisany na `fflate` (commit `5700977`). `@types/bcryptjs` zbędne przy bcryptjs v3 (ma własne typy).
**Rekomendacja:** `npm uninstall archiver @types/archiver @types/bcryptjs`.

### S5. Upload — brak walidacji env na starcie
Klient S3 budowany na top-level z `process.env.R2_*!` — brak zmiennej ujawni się dopiero 500-tką przy pierwszym uploadzie.
**Rekomendacja:** fail-fast (rzut przy imporcie, jasny komunikat) albo healthcheck.

### S6. Dryf CSS w `reference/forma-production/`
Po zmianie hero (gap 24 px, `.hero-tel-row` 14 px/16 px) zaktualizowano `public/assets/css/forma-layout.css`, ale kopia w `reference/forma-production/assets/css/` została stara. DOM-diff porównuje tylko HTML, więc test przechodzi, ale wzorzec wizualny już kłamie.
**Rekomendacja:** skopiować aktualny CSS do reference albo jawnie ustalić, że reference trzyma tylko HTML.

---

## Problemy — priorytet NISKI

- **N1.** Martwy CSS `.hero-cta-group` (`forma-layout.css:140-150`) — markup po refaktorze hero już go nie używa.
- **N2.** `DŁUG-CENNIK-1` — cena jako wolny tekst w `cta-finale.lead` na home i `/proces`; zmiana ceny w panelu nie aktualizuje tego zdania (znany, udokumentowany dług).
- **N3.** Osierocone pliki w R2 przy usuwaniu kart portfolio (best-effort DELETE; znany, zaakceptowany dług).
- **N4.** `next-auth@5.0.0-beta.31` — wersja beta w ścieżce produkcyjnej; śledzić wydanie stabilne.
- **N5.** Błędy TypeScript w `tests/` (typy `Session` vs `NextMiddleware`, `Buffer` vs `BlobPart`) — `tsc --noEmit` czerwony, choć vitest działa; utrudnia wprowadzenie checku CI.

---

## Stan testów (na dziś)

| Suita | Wynik |
|---|---|
| renderer (37) | ✅ pass |
| validation (81) | ✅ pass |
| upload (15) | ✅ pass |
| export (9) | ✅ pass |
| panel-fields (9) | ❌ nie startuje (W2) |
| tenant-isolation (12) | ❌ nie startuje (W2) |
| persistence-roundtrip (5) | ❌ nie startuje (W2) |

---

## Kolejność napraw (propozycja)

1. *W2** — przywrócić 7/7 zielonych suit (odzyskuje test bezpieczeństwa).*
2. **W1** — walidacja V16 dla pól kontaktowych (jedna reguła + testy w `validation.test.ts`).
3. **W3** — limiter logowania.
4. **S2 + S4** — wspólny PrismaClient w export, usunięcie martwych zależności (kwadrans pracy).
5. **S6 + N1** — synchronizacja reference CSS, usunięcie martwego CSS.
6. Reszta wg okazji.
