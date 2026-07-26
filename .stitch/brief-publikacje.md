# Brief dla Stitch — Publikacje (lista + artykuł)

Do wygenerowania dwa ekrany webowe, desktop-first, ciemny motyw.
System projektowy: **`.stitch/DESIGN.md`** (obowiązuje w całości).

---

## Co CMS naprawdę potrafi — ograniczenia wiążące projekt

To nie są sugestie. Projekt, który wykracza poza tę listę, jest niewdrażalny,
bo edytor treści fizycznie nie wyprodukuje takich danych.

**Pola dostępne dla jednej publikacji** (model `PostItem`):

| Pole | Typ | Uwagi |
|---|---|---|
| `title` | tekst | zawsze obecny |
| `slug` | tekst | buduje adres `/publikacje/<slug>` |
| `publishedAt` | `YYYY-MM-DD` | zawsze obecny dla opublikowanych |
| `excerpt` | tekst, 1–2 zdania | **opcjonalny** — projekt musi działać bez niego |
| `body` | HTML | patrz allowlist niżej |
| `status` | `draft` / `published` | szkice nie trafiają na stronę |

**Treść artykułu może zawierać wyłącznie te znaczniki:**
`<p>` `<strong>` `<em>` `<ul>` `<ol>` `<li>` `<a>` `<h2>` `<h3>` `<br>`

**Z tego wynika — NIE projektuj:**
- okładek, zdjęć wyróżniających, ilustracji, galerii (brak pola na obraz)
- zdjęcia i biogramu autora (brak pola autora — wszystko pisze jedna osoba)
- kategorii, tagów, filtrów, wyszukiwarki (brak pól w modelu)
- czasu czytania, licznika wyświetleń, polubień (nie liczone)
- cytatów blokowych, ramek „warto wiedzieć", tabel, bloków kodu, osadzeń wideo
  (znaczniki spoza allowlisty)
- komentarzy, zapisu do newslettera, przycisków social share ładowanych z CDN
- paginacji numerowanej (na start będzie kilka artykułów)

**Projektuj z założeniem, że artykułów jest 3–6.** Układ ma wyglądać poprawnie
przy trzech pozycjach, nie tylko przy dwudziestu.

---

## EKRAN 1 — Lista publikacji (`/publikacje`)

```
Redakcyjna, ciemna strona z indeksem artykułów eksperckich pisanych przez
projektanta stron dla kancelarii prawnych. Ton rzeczowy i powściągliwy —
to nie blog marketingowy, tylko zbiór opracowań budujących wiarygodność
zawodową. Gęsta, czytelna typografia; wrażenie działu publikacji w poważnym
wydawnictwie branżowym, nie w serwisie contentowym.

**DESIGN SYSTEM (WYMAGANE):**
- Platforma: Web, desktop-first, w pełni responsywny (breakpointy 640 / 768 / 900 / 1024 px)
- Tło: #0D1117 (główne), #161B22 (powierzchnie/karty)
- Akcent: #6366F1 (indygo) — WYŁĄCZNIE etykieta sekcji, aktywne stany, CTA. Maks. 3 wystąpienia na ekranie.
- Tekst: #F0F6FC (główny), #8B949E (drugorzędny), #484F58 (wyciszony)
- Obramowania: 1px solid #21262D, promień 10px na kartach
- Typografia: Plus Jakarta Sans (nagłówki, 700–800), Inter (treść), Space Mono (etykiety i daty — UPPERCASE, tracking 0.08em)
- Kontener: maks. 1100px, rytm sekcji 96px desktop / 56px mobile
- Bez gradientów, bez cieni dekoracyjnych, bez glassmorphism

**STRUKTURA STRONY:**
1. **Nawigacja:** ciemny pasek, logotyp tekstowy „Forma Wizerunku" po lewej, linki (Portfolio, Jak pracuję, Publikacje, Kontakt), po prawej numer telefonu i przycisk CTA „Zamów stronę" w kolorze akcentu. Aktywna pozycja „Publikacje" wyróżniona.
2. **Nagłówek strony:** etykieta sekcji „PUBLIKACJE" (Space Mono, akcent, wersaliki) nad pojedynczym H1 „Publikacje". Pod spodem jeden akapit prowadzący (maks. 2 zdania, szerokość ~65 znaków, kolor drugorzędny) wyjaśniający, czego dotyczą teksty.
3. **Lista artykułów:** pionowa lista pozycji rozdzielonych cienką linią 1px #21262D — NIE siatka kafelków, NIE karty ze zdjęciami. Każda pozycja zawiera, w tej kolejności: datę publikacji (Space Mono, 12–13px, kolor wyciszony, format „26.07.2026"), tytuł artykułu jako H2 (Plus Jakarta Sans, 700, ok. 24–30px, kolor główny, cały wiersz klikalny), zajawkę (Inter, 16px, kolor drugorzędny, maks. 2 wiersze). Hover na pozycji: tytuł zmienia kolor na akcent, subtelne przesunięcie w prawo o 4px, przejście 200ms. Odstęp pionowy między pozycjami min. 32px.
4. **Stan pusty:** jeśli brak artykułów — jedno wyśrodkowane zdanie kolorem wyciszonym, bez ilustracji.
5. **Stopka:** ciemniejsza powierzchnia #161B22, w jednym rzędzie logotyp, linki nawigacyjne, po prawej telefon i e-mail. Pod spodem linia praw autorskich drobnym tekstem.
```

---

## EKRAN 2 — Widok artykułu (`/publikacje/<slug>`)

```
Ciemna strona długiego tekstu eksperckiego, zoptymalizowana pod komfortowe
czytanie kilkuminutowego opracowania. Skupienie na kolumnie tekstu — żadnych
elementów rozpraszających po bokach. Wrażenie druku: mocna hierarchia
nagłówków, spokojny rytm akapitów, wysoki kontrast.

**DESIGN SYSTEM (WYMAGANE):**
- Identyczny jak Ekran 1 (te same tokeny, ta sama nawigacja i stopka)

**STRUKTURA STRONY:**
1. **Nawigacja:** dokładnie jak na Ekranie 1.
2. **Nagłówek artykułu:** wyrównany do lewej, w kolumnie tekstu (NIE wyśrodkowany, NIE na pełną szerokość). Kolejność: link powrotny „← Publikacje" (drobny, kolor drugorzędny), data publikacji (Space Mono, wersaliki, kolor wyciszony), pojedynczy H1 z tytułem (Plus Jakarta Sans 800, clamp 2rem–3rem, line-height 1.15, tracking −0.02em), pod nim zajawka jako akapit prowadzący (Inter 18–20px, kolor drugorzędny). Pod całością cienka linia 1px #21262D jako separator.
3. **Treść artykułu:** JEDNA kolumna tekstu, szerokość maks. 68–70 znaków, wyrównana do lewej krawędzi kontenera (nie wyśrodkowana na stronie). Style dla dokładnie tych elementów: akapit (Inter 17–18px, line-height 1.7, kolor #F0F6FC, odstęp dolny 24px); H2 (Plus Jakarta Sans 700, ok. 28px, duży odstęp górny 48px, dolny 16px); H3 (Plus Jakarta Sans 600, ok. 21px, odstęp górny 32px); listy punktowane i numerowane (wcięcie 24px, odstęp między pozycjami 8px, znacznik listy w kolorze akcentu); linki w treści (kolor akcentu, podkreślenie, hover jaśniejszy odcień); pogrubienie i kursywa bez zmiany koloru.
4. **Stopka artykułu:** cienka linia separatora, pod nią zwarty blok CTA — jedno zdanie zachęty do kontaktu i przycisk „Opisz swoją kancelarię" w kolorze akcentu. Ton rzeczowy, bez nacisku i bez obietnic wyniku.
5. **Nawigacja między artykułami:** dwa linki w jednym rzędzie — poprzedni po lewej, następny po prawej, każdy z drobną etykietą kierunku (Space Mono, wyciszony) i tytułem artykułu pod nią. Ukryte, gdy sąsiedni artykuł nie istnieje.
6. **Stopka:** dokładnie jak na Ekranie 1.
```

---

## Kryteria akceptacji

Projekt jest gotowy do wdrożenia, gdy:

- [ ] Używa wyłącznie kolorów i kroju z `DESIGN.md` — bez nowych wartości
- [ ] Akcent indygo występuje maks. 3–4 razy na ekranie
- [ ] Każda strona ma dokładnie jeden `<h1>`
- [ ] Kolumna tekstu artykułu nie przekracza ~70 znaków
- [ ] Nie zawiera elementów spoza allowlisty znaczników
- [ ] Nie zawiera zdjęć, ikon z CDN ani zasobów zewnętrznych
- [ ] Wygląda poprawnie przy 3 artykułach na liście
- [ ] Nawigacja i stopka są identyczne z resztą serwisu
- [ ] Działa na 375px szerokości bez przewijania poziomego
