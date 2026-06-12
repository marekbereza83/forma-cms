# Plan — obsługa stron kancelarii (solo / corporate / …) przez CMS

Data: 2026-06-12 · Kontekst: audyt gotowości silnika (rozmowa z 12.06) + `audyt.md` z 10.06

> **DECYZJA (12.06.2026): Opcja B zatwierdzona** — osobny `kancelaria-cms` (fork), z dwiema
> poprawkami z niezależnej recenzji planu (patrz sekcja 4a): mechaniczny transfer poprawek
> infra zamiast ręcznej dyscypliny oraz W3 dołączone do Etapu 0.

---

## 1. Cel biznesowy

Strony klientów (kancelarie: kowalczyk/solo, corporate/editorial, docelowo regional i specialist)
mają być edytowalne przez klientów w panelu CMS — tak jak dziś forma-site, ale z innymi
design systemami, innymi sekcjami i innym modelem treści.

## 2. Stan faktyczny (skrót audytu z 12.06)

FORMA CMS to dziś silnik **jednego design systemu**. Cztery warstwy blokują obce strony:

| # | Warstwa | Problem |
|---|---------|---------|
| 1 | `schema.ts` | `designSystem: z.literal('forma')`, archetype enum 2-wartościowy, wymagane `contactPhone` |
| 2 | `renderer/index.ts` | `SECTION_REGISTRY` zna tylko sekcje Formy; nieznane sekcje **cicho pomijane** |
| 3 | `head.ts` + `export.ts` | fonty, CSS, JSON-LD i assety zabetonowane pod Formę |
| 4 | `legal-static.ts`, `not-found.ts`, walidatory V2-V4 | treść prawna z danymi Marka hardcoded; walidacja wymusza strukturę strony Formy |

Dodatkowy koszt niezależny od architektury: **strony kancelarii nie mają jeszcze rendererów** —
istnieją jako ręcznie wygenerowany HTML (kowalczyk: Tailwind CDN; corporate: fixture-editorial
z 9 sekcjami bez implementacji). Ktoś musi napisać `renderHeroEditorialVideo()` itd. — to jest
**większa połowa pracy** niezależnie od tego, gdzie ten kod zamieszka.

---

## 3. Opcje architektury

### Opcja A — generalizacja FORMA CMS (jeden silnik, wiele design systemów)

Przebudowa obecnego repo: schema generyczna, `SECTION_REGISTRY` kluczowany po `designSystem`,
manifest design systemu (fonty/CSS/JSON-LD/assety), profile walidacji per archetyp,
panel `FieldsForm` z gałęziami dla pól kancelaryjnych.

**Plusy:** jeden deploy, jeden panel, jedna baza, wspólna infrastruktura (auth, izolacja
tenantów, upload, export) bez duplikacji.

**Minusy / ryzyka:**
- **Wspólny promień rażenia** — bug w sekcjach kancelarii może położyć panel/render Formy,
  czyli Twoją własną witrynę sprzedażową. Każdy deploy kliencki = deploy Formy.
- ~~Schema musi zmięknąć (`z.literal('forma')` → string)~~ — **korekta z recenzji:** to
  nieprawda; `z.discriminatedUnion('designSystem', [...])` trzyma każdy system w pełni
  ścisły. Opcja A przegrywa na FieldsForm, blast radius i modelu domeny — nie na schemie.
- `FieldsForm.tsx` już dziś jest forma-specific (hardcoded etykiety, gałęzie per kształt pola)
  — generalizacja panelu to największy ukryty koszt tej opcji.
- Testy DOM-diff przeciwko referencji są sprzężone z Formą; każdy nowy system potrzebuje
  własnej referencji i uprzęży w tym samym repo → rosnąca, trudna do ogarnięcia suita.

### Opcja B — osobny CMS dla stron prawniczych (rekomendowana)

Fork obecnego repo → **`kancelaria-cms`**. Obsługuje wszystkie subarchetypy prawnicze
(solo, corporate, regional, specialist) — bo łączy je **wspólny model domenowy**:
zespół, zakres usług/praktyki, FAQ, aktualności, dane kancelarii (adres, godziny, nr wpisu),
JSON-LD `LegalService`. Różnią się design systemem — i to właśnie wewnątrz `kancelaria-cms`
powstaje rejestr per design system (generalizacja dzieje się tam, gdzie jest potrzebna).

**Plusy:**
- FORMA CMS zostaje **zamrożona i stabilna** — Twoja witryna produkcyjna nie jest zakładnikiem
  iteracji nad produktem klienckim.
- Schema per wertykal zostaje **ścisła**: `designSystem: z.enum(['pacta-editorial', 'pacta-solo', …])`,
  archetype `editorial-led | trust-led-solo | …` — walidacja nadal jest atutem, nie kompromisem.
- Model treści prawniczej (TeamMember, PracticeArea, OfficeInfo) projektowany raz, używany
  przez wszystkie subarchetypy.
- Sprawdzone wzorce przechodzą 1:1: izolacja tenantów, `parseSiteModel` jako jedyne wejście,
  EditLog, upload przez sharp, DOM-diff per referencja.

**Minusy / koszty:**
- Duplikacja infrastruktury (auth, tenant client, upload, export) — ale to kod **stabilny**,
  który się prawie nie zmienia. Poprawki przenoszone **mechanicznie, nie ręcznie** —
  patrz sekcja 4a (ręczna synchronizacja już dwukrotnie zawiodła w tym repo: S3 i S6
  z `audyt.md`).
- Drugi projekt Vercel + druga baza (lub osobny schemat w tym samym Supabase).
- Marek loguje się do dwóch paneli (forma-admin i kancelaria-admin).

### Opcja C — monorepo ze wspólnym core

`packages/core` (auth, tenant, persistence, upload, export, framework walidacji) +
`apps/forma-cms` + `apps/kancelaria-cms`.

**Ocena:** architektonicznie najczystsza, ale **przedwczesna**. Konwersja na workspaces,
wersjonowanie core'a i CI dla trzech paczek to realny narzut dla solo-operatora przy
dwóch aplikacjach. **Zasada trójki:** drugi przypadek robimy jako fork (Opcja B), core
wyciągamy dopiero gdy pojawi się trzeci wertykal (lekarz? księgowy? — struktura katalogu
`generated_sites/prawnik/…` sugeruje, że plan na kolejne branże istnieje). Fork zrobiony
z dyscypliną (infra nieruszana) konwertuje się wtedy tanio.

---

## 4. Rekomendacja

**Opcja B teraz, z jawnym progiem przejścia na C** (trzeci wertykal → ekstrakcja core).

Uzasadnienie w jednym zdaniu: strony kancelarii to **produkt**, forma-site to **witryna** —
mają różne cykle życia, różne modele treści i różne tempo zmian; sklejanie ich w jeden
silnik teraz kupuje elegancję za stabilność jedynej rzeczy, która już zarabia.

Argumenty rozstrzygające (potwierdzone w kodzie podczas recenzji 12.06):
- **`FieldsForm.tsx` (905 linii)** — typowane sub-edytory sprzężone z kształtami pól Formy
  (`PricingPackage`, `PortfolioCard`, `FaqItem`, `DeliverableItem`); domena kancelaryjna
  (`TeamMember`, `PracticeArea`, `OfficeInfo`) nie współdzieli z tym prawie nic.
- **Promień rażenia** — w Opcji A każdy deploy produktu klienckiego = deploy witryny,
  która zarabia.
- **Model domeny, nie skórka** — kancelarie różnią się modelem treści, nie tylko
  fontami/CSS/sekcjami.
- Bonus: skoro Forma CMS zostaje de facto jedno-tenantowa, hardcode w `legal-static.ts`
  przestaje być pilnym bugiem w repo Formy — staje się regułą projektową nowego repo
  (treści prawne zawsze z modelu).

## 4a. Poprawki do Opcji B (przyjęte z recenzji 12.06)

1. **Mechaniczny transfer poprawek infra zamiast dyscypliny.** Fork jako **prawdziwy git
   fork ze wspólną historią**. Poprawki bezpieczeństwa w plikach infra (auth, tenant
   client, upload, export) robione osobnymi, czystymi commitami i `git cherry-pick`owane
   do drugiego repo — nigdy przepisywane ręcznie. Uzasadnienie: ręczna synchronizacja
   kopii już dwukrotnie zawiodła w tym repo (`audyt.md` S3 — dryf dwóch schematów Prisma,
   S6 — dryf CSS w reference).
2. **W3 (rate-limiting logowania) dołączone do Etapu 0** — naprawa przed forkiem, inaczej
   dziura jest dziedziczona i naprawiana dwa razy.

---

## 5. Co powstanie (Opcja B)

### Etap 0 — quick wins w FORMA CMS (niezależnie od wszystkiego, ~godzina-dwie)
- **Fail-loud:** nieznana sekcja w `SECTION_REGISTRY` → twardy błąd renderu zamiast cichego
  pominięcia (dziś strona renderuje się "pusta" bez ostrzeżenia).
- Naprawa W2 z `audyt.md` (testy izolacji tenantów nie wykonują się lokalnie) — przed forkiem,
  żeby fork odziedziczył działającą suitę.
- **W3 z `audyt.md`** (rate-limiting logowania) — przed forkiem, żeby nie naprawiać dwa razy
  (poprawka 4a.2).

### Etap 1 — szkielet kancelaria-cms (1-2 sesje)
- Fork repo → `kancelaria-cms`; wycięcie sekcji/fixture/referencji Formy.
- Nowa schema domenowa: `designSystem` enum subarchetypów, typy pól `team`, `practice`,
  `office` (adres, godziny, nr wpisu OIRP/ORA), JSON-LD `LegalService` z danych modelu.
- **Manifest design systemu**: `{ fonts, cssFiles, jsFiles, assetsDir, jsonLdTemplate }` —
  head i export czytają z manifestu, nie z hardcode.
- Rejestr sekcji kluczowany `designSystem` + twardy błąd na nieznaną sekcję.
- Treści prawne (nota, polityka, regulamin) renderowane **z pól modelu** per tenant —
  nigdy hardcode (lekcja z legal-static.ts: dane Marka wyciekłyby na strony klientów).
- Osobna baza: nowy projekt Supabase albo osobny schemat Postgres w istniejącym.

### Etap 2 — pierwszy design system: editorial/corporate (3-5 sesji)
- 9 rendererów sekcji z `fixture-editorial.json` (nav-editorial, hero-editorial-video,
  about-manifesto, practices-editorial-cards, team-editorial-white, recognition-wall,
  press-cards-3d, contact-editorial-gradient, footer-editorial) — HTML zgodny z istniejącą
  referencją corporate.
- Referencyjny HTML + testy DOM-diff (wzorzec z Formy).
- Panel: gałęzie edycji dla pól kancelaryjnych w FieldsForm.
- Pozostałe strony corporate (o-kancelarii, praktyki, kontakt, aktualnosci, zespol, legal).

### Etap 3 — drugi design system: solo/kowalczyk (2-4 sesje)
- **Decyzja techniczna do podjęcia:** kowalczyk stoi na Tailwind CDN w runtime — to łamie
  obietnicę z deliverables ("CSS własny, bez Tailwind CDN"). Przy onboardingu kompilujemy
  Tailwind do statycznego CSS (build-time) — i to jest moment, żeby to zrobić.
- Renderery sekcji solo + referencja + testy.

### Etap 4 — operacje (1 sesja)
- `create-tenant` per subarchetyp (tenant wskazuje designSystem + fixture startowy).
- Deploy Vercel, migracja kowalczyk/corporate jako pierwsi tenanci.

---

## 6. Konsekwencje i ryzyka

| Konsekwencja | Ocena |
|---|---|
| Dwa repo / dwa deploye | Koszt stały, niski; akceptowalny do trzeciego wertykalu |
| Poprawki infra trzeba portować | Mechanicznie przez `git cherry-pick` ze wspólnej historii forka (sekcja 4a.1) — nie ręcznie |
| Forma CMS przestaje ewoluować strukturalnie | To zaleta — zmiany tylko treściowe + bugfixy |
| Schema kancelarii projektowana od zera | Ryzyko złego modelu domeny → mitygacja: zacząć od corporate (najbogatszy), solo będzie podzbiorem |
| Migracje editable (lekcja z 12.06) | Reguła z pamięci obowiązuje w obu repo: zmiana fixture = skrypt migracji DB |
| Tailwind CDN w solo | Trzeba skompilować przy onboardingu — dodatkowy, ale jednorazowy koszt etapu 3 |

## 7. Czego świadomie NIE robimy teraz

- Nie generalizujemy schemy Formy (zostaje `z.literal('forma')`).
- Nie budujemy monorepo/core — próg: trzeci wertykal.
- Nie projektujemy "uniwersalnego silnika sekcji" (plugin system) — rejestr per design
  system w jednym wertykalu wystarcza i jest testowalny.

## 8. Pytania otwarte (do decyzji przed Etapem 1)

1. **Baza:** ~~nowy projekt Supabase czy osobny schemat?~~ **Rekomendacja z recenzji:**
   osobny schemat w istniejącym Postgresie — pełna izolacja billingowa to koszt bez
   korzyści przy zerze klientów; próg przejścia na osobny projekt: pierwszy płacący tenant.
2. **Domeny klientów:** każda kancelaria na własnej domenie — Vercel multi-domain na jednym
   projekcie czy deploy-per-klient? (wpływa na export vs hosting dynamiczny) — **otwarte**,
   rozstrzyga się w Etapie 4, nie blokuje Etapów 0–2.
3. **Zakres MVP:** ~~corporate czy kowalczyk/solo?~~ **Rozstrzygnięte: corporate** — oba
   niezależne plany doszły do tego samego (jedyny z fixture, najbogatszy model domeny,
   solo będzie podzbiorem; kowalczyk dodatkowo wymaga ekstrakcji fixture z HTML
   i kompilacji Tailwinda).
