# Plan: ikony pomocy „i" z tooltipem przy polach formularza publikacji

Data: 2026-07-28. Audyt bez zmian w kodzie. Wdrożenie: Sonnet.

Zakres: 10 ikon informacyjnych przy wskazanych etykietach w `PostsEditor.tsx`.
**Bez zmian w układzie formularza i bez zmian w danych publikacji** (żadnych nowych pól
w `PostItem`, żadnych zmian w schemacie/walidacji/rendererze — to czysto warstwa UI panelu).

## Stan obecny (zweryfikowany)

- **W repo nie ma żadnego tooltipa ani popovera** — budujemy od zera, nie ma wzorca do naśladowania.
- Brak katalogu współdzielonych komponentów (`src/components` nie istnieje). Konwencja: komponent
  leży obok trasy, która go używa (`GooglePreview.tsx`, `RichTextEditor.tsx` w `edit/publikacje/`),
  a komponent panelowy wyższego poziomu na `(panel)/` (`PanelTabs.tsx`).
- Wszystkie 10 etykiet istnieje w `PostsEditor.tsx` (numery linii w tabeli niżej).
- **Brak `overflow: hidden`** na `.posts-layout` / `.posts-form` / `.posts-form-row` — dymek
  pozycjonowany absolutnie nie zostanie przycięty.
- **Zero `z-index` w całym `globals.css`** — wystarczy niska wartość (np. `10`), nie ma z czym konkurować.
- `useEffect` jest już używany w panelu (`RichTextEditor.tsx`) — wzorzec hooków istnieje.

## Komponent

**`src/app/(panel)/FieldHelp.tsx`** — poziom panelu, nie trasy. Uzasadnienie: `FieldsForm.tsx`
ma 4 własne `field-label` i jest oczywistym następnym klientem tego komponentu; precedensem dla
tej lokalizacji jest `PanelTabs.tsx`. Komponent kliencki (`'use client'`).

```tsx
FieldHelp({ label, text, align }: { label: string; text: string; align?: 'left' | 'right' })
```

- `label` — nazwa pola, wchodzi do `aria-label` (np. `aria-label="Pomoc: Tytuł"`).
- `text` — treść dymka, dokładnie z tabeli niżej.
- `align` — strona rozwijania, patrz „Pozycjonowanie".

## Kluczowa decyzja: model stanu przy hover + focus + click

To jest najtrudniejsza część i główny powód, dla którego ten plan powstał.

**Konflikt:** WAI-ARIA APG rozdziela dwa wzorce — *tooltip* (hover/focus, `role="tooltip"`,
Esc zamyka, **nie** przełączany klikiem) i *toggletip* (przełączany klikiem). Wymaganie łączy oba.
Naiwne połączenie daje błąd: na desktopie hover pokazuje dymek, klik „przełącza" → zamyka go,
podczas gdy kursor **nadal** jest nad ikoną → dymek migocze albo zostaje zablokowany w złym stanie.

**Rozwiązanie — dwa niezależne stany zamiast jednego `open`:**

```
hovered  — kursor nad przyciskiem (tylko desktop; na dotyku nie zadziała)
pinned   — otwarte klikiem/tapnięciem albo focusem klawiatury
widoczny = hovered || pinned
```

- `click` przełącza **wyłącznie `pinned`** → na desktopie klik „przypina" dymek otwarty
  (a nie zamyka tego, co otworzył hover), na dotyku klik jest jedynym wyzwalaczem i działa
  jak zwykły przełącznik.
- `Esc` czyści `pinned` i zdejmuje focus z przycisku.
- Klik poza komponentem czyści `pinned`.
- `focus` (Tab) ustawia `pinned`, `blur` je czyści — dzięki temu nawigacja klawiaturą działa
  bez klikania.

**Nasłuchy globalne (`keydown` dla Esc, `pointerdown` dla kliku poza) podpinać tylko gdy
`pinned === true`** i sprzątać w `useEffect` cleanup — nie trzymać ich stale na `document`
dla każdej z 10 ikon.

## Dostępność — szczegóły, które łatwo zepsuć

1. **`aria-describedby` nie zadziała, jeśli dymek jest `display: none`.** Czytniki ekranu
   ignorują opis wskazujący na element wyjęty z drzewa dostępności. Dlatego:
   - element dymka **zawsze w DOM**, z `role="tooltip"` i stałym `id`,
   - ukrywanie **wyłącznie wizualne** (`opacity` / `visibility`), **nigdy** `display: none`
     ani warunkowe renderowanie `{open && <div>}`,
   - `aria-describedby` na przycisku wskazuje na ten `id` na stałe → użytkownik czytnika
     dostaje opis przy focusie niezależnie od stanu wizualnego.
2. **`aria-label` na przycisku jest obowiązkowy** — ikona „i" nie ma tekstu. Format: `Pomoc: <nazwa pola>`.
3. **Nie używać `aria-expanded`** — to atrybut wzorca disclosure. Przy `role="tooltip"`
   i stałym `aria-describedby` byłby mylący dla czytników.
4. **`type="button"`** — bez tego przycisk w formularzu domyślnie submituje.
5. **Cel dotykowy ≥ 24×24 px** (WCAG 2.2, SC 2.5.8) — ikona może być wizualnie mniejsza,
   ale `padding` musi dobić powierzchnię klikalną do minimum.
6. `:focus-visible` — widoczny obrys, zgodnie z resztą panelu.

## Pozycjonowanie i CSS

- Wrapper `<span>` wokół przycisku: `position: relative; display: inline-flex`.
- Dymek: `position: absolute` (**krytyczne** — poza flow, żeby nie przesunąć układu formularza,
  co jest wprost zabronione w wymaganiu), `max-width: 280px`, `width: max-content`, `z-index: 10`.
- **Ryzyko przepełnienia w prawej kolumnie:** `.posts-form-row` to układ dwukolumnowy
  (`Kategoria | Tagi`, `Status | Data publikacji`). Dymek przy polu z prawej kolumny rozwinięty
  w prawo może wyjść poza panel. Dlatego prop `align`: dla **Tagi** ustawić `align="right"`
  (dymek kotwiczony `right: 0`), dla pozostałych domyślne `left: 0`.
- Klasy CSS w `globals.css`, obok istniejącej sekcji `.field-*`: `.field-help`,
  `.field-help-button`, `.field-help-bubble`, `.field-help-bubble.is-right`.

## Zawężenie zakresu (decyzja 2026-07-28)

Użytkownik po przeglądzie priorytetów: **pomijamy tooltipy dla Okładki, Tagów i Kluczowych
wniosków** — te pola uznaje za wystarczająco jasne (mają już podpowiedź inline w etykiecie).
Priorytet to SEO: Tytuł, Adres (slug), Zajawka, Kategoria, Tytuł SEO, Opis SEO, Podgląd w Google
— **7 z 10** pozycji z tabeli niżej, oznaczone w kolumnie „Wdrożone".

## Lista pól i dokładne treści

Teksty **dosłownie** z przekazanej listy — nie parafrazować.

| # | Wdrożone | Linia w `PostsEditor.tsx` | Etykieta | Tekst w dymku |
|---|---|---|---|---|
| 1 | ✅ | 214 | Tytuł | Główny tytuł widoczny na stronie artykułu. Zostanie użyty jako nagłówek H1. |
| 2 | ✅ | 225 | Adres (slug) | Fragment adresu artykułu. Używaj krótkich słów bez polskich znaków, oddzielonych myślnikami. Po publikacji nie zmieniaj go bez przekierowania. |
| 3 | ✅ | 262 | Zajawka | Krótkie wprowadzenie widoczne na liście publikacji. Gdy nie podasz osobnego opisu SEO, CMS wykorzysta zajawkę jako meta description. |
| 4 | ✅ | 273 | Kategoria | Główny obszar tematyczny artykułu. Wybierz jedną kategorię, która najlepiej opisuje publikację. |
| 5 | ❌ pominięte | 286 | Tagi | Dodatkowe tematy pomagające porządkować publikacje. Stosuj zwykle 2–4 konkretne tagi. |
| 6 | ❌ pominięte | 300 | Okładka | Główna grafika artykułu, używana także przy udostępnianiu linku. Zalecany format: 1200 × 675 px. |
| 7 | ❌ pominięte | 325 | Kluczowe wnioski | Krótkie podsumowanie najważniejszych informacji. Pojawi się wysoko w artykule, aby czytelnik mógł szybko ocenić jego zawartość. |
| 8 | ✅ | 360 | Tytuł SEO | Tytuł używany w kodzie strony, na karcie przeglądarki i zwykle w Google. Gdy pole pozostanie puste, CMS użyje tytułu artykułu i nazwy marki. |
| 9 | ✅ | 372 | Opis SEO | Krótki opis strony przeznaczony dla wyszukiwarki. Nie jest widoczny w treści artykułu. Gdy pozostanie pusty, CMS użyje zajawki. |
| 10 | ✅ | 384 | Podgląd w wynikach Google | Przybliżony wygląd wyniku wyszukiwania. Google może zmienić tytuł lub opis zależnie od zapytania użytkownika. |

Pola **bez** tooltipa (nie ma ich na liście): Status (240), Data publikacji (251), Treść (394).

Uwaga do #10: etykieta w kodzie brzmi „Podgląd w wynikach Google", na liście „Podgląd w Google" —
to ta sama pozycja, etykiety **nie zmieniamy** (zakaz zmian w układzie).

## Do decyzji przed wdrożeniem (treść, nie technika)

1. **Kategoria (#4) opisuje pole bez żadnego widocznego efektu.** Zweryfikowane: kategorie
   zostały wyłączone z renderowania 2026-07-28 — `post.category` trafia dziś wyłącznie do
   niewidocznego atrybutu `data-category` (`renderer/publikacje.ts:100`), a test
   `renderer.test.ts:875` pilnuje, żeby pigułki i filtry nie wróciły. Tooltip „Wybierz jedną
   kategorię, która najlepiej opisuje publikację" sugeruje klientowi efekt, którego nie ma.
   Do rozstrzygnięcia: dodać tooltip mimo to, zmienić jego treść, czy najpierw ukryć samo pole
   (to już figuruje jako dług w `plan-seo-publikacje.md`).
2. **Tagi: etykieta mówi „maks. 8", tooltip „zwykle 2–4".** Nie jest to sprzeczność (8 to twardy
   limit `MAX_TAGS`, 2–4 to zalecenie), ale obie liczby będą widoczne obok siebie na jednym ekranie.
3. **Redundancja z etykietami.** Trzy etykiety już niosą podpowiedź inline: „Okładka (1200×675, 16:9)",
   „Kluczowe wnioski (opcjonalnie — callout na stronie artykułu)", „Tagi (…, maks. 8)". Po dodaniu
   tooltipów część tej treści się dubluje. Uproszczenie etykiet **wykracza poza ten zakres**
   (zakaz zmian w układzie) — do osobnej decyzji.

## Testy

W repo **nie ma żadnych testów komponentów React** — `panel-fields.test.ts` testuje funkcje
serwerowe, a `GooglePreview.tsx` powstał bez testów. Dodanie React Testing Library byłoby nową
infrastrukturą testową dla jednego komponentu.

Rekomendacja: **nie dodawać nowej infrastruktury testowej**, zweryfikować ręcznie wg listy niżej.
Cała logika domenowa (walidacja, renderer, JSON-LD) i tak jest pokryta 277 testami, a ten
komponent nie dotyka danych.

Weryfikacja ręczna w panelu:
- [ ] hover na desktopie pokazuje dymek, zjechanie kursorem chowa
- [ ] Tab dochodzi do ikony i pokazuje dymek; Shift+Tab chowa
- [ ] klik przypina dymek otwarty (kursor nadal nad ikoną → **nie migocze**)
- [ ] Esc zamyka przypięty dymek
- [ ] klik poza dymkiem zamyka
- [ ] na telefonie (albo emulacji dotyku w DevTools) tap otwiera i zamyka
- [ ] dymek przy **Tagi** (prawa kolumna) nie wychodzi poza panel
- [ ] układ formularza nie drgnął — dymek nie przesuwa żadnego pola
- [ ] czytnik ekranu odczytuje opis przy focusie na ikonie

## Kolejność wdrożenia

1. `FieldHelp.tsx` — komponent z modelem stanu `hovered`/`pinned` + hooki Esc/klik-poza.
2. Style w `globals.css` (`.field-help*`), w tym wariant `is-right`.
3. Wpięcie 10 instancji w `PostsEditor.tsx` przy wskazanych etykietach, `align="right"` dla Tagi.
4. `npx tsc --noEmit` + `npx vitest run` (musi zostać 277/277 — ten komponent niczego nie zmienia
   w logice; gdyby test padł, znaczy to, że wdrożenie wyszło poza zakres).
5. Weryfikacja ręczna wg listy wyżej.
