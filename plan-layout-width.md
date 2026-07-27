# Analiza: szerokość layoutu (--container-max)

Data audytu: 2026-07-27. Audyt wykonany bez zmian w kodzie — czysta analiza, do wdrożenia następnym razem.

## Zgłoszenie

Użytkownik ocenił, że cała strona https://formawizerunku.pl/ wygląda "wąsko" na szerokim ekranie.

## Diagnoza

- Cała strona (nav, hero, portfolio, wszystkie sekcje) używa jednej zmiennej CSS:
  `--container-max: 1100px` (`public/assets/css/design-system-agency.css:89`), aplikowanej przez
  klasę `.container` (`design-system-agency.css:248-253`).
- Przy 1920px szerokości okna przeglądarki zmierzono realny `.container` = 1100px szerokości →
  ok. 820px pustej przestrzeni po bokach (43% szerokości viewportu).
- To **jedna zmienna współdzielona przez cały system designu** (`design-system-agency.css` to plik
  bazowy linkowany na wszystkich stronach, zob. sekcja "Renderer contract" w `CLAUDE.md`) — zmiana
  poszerzy nie tylko stronę główną agencji, ale layout renderowany dla **wszystkich tenantów CMS-a**.
- Tekst akapitowy ma już osobny, niezależny limit `max-width: 68ch` (klasa `.max-prose`,
  `design-system-agency.css:753`, też linia 592) — nieużywa `--container-max`. Poszerzenie
  kontenera **nie zepsuje czytelności długich akapitów** — wpłynie głównie na siatki (portfolio,
  karty cenowe, hero, karty publikacji).

## Rekomendacja

Podnieść `--container-max` z `1100px` do ok. **1240–1280px** (zakres typowy dla premium
agency-site'ów, np. Stripe/Linear ~1200-1280px). Unikać drastycznego poszerzenia (1440px+) —
zacznie rozciągać karty/siatki zbyt szeroko i osłabi kompaktowy, premium charakter designu.

## Kroki wdrożenia (następnym razem)

1. Zmienić `--container-max` w `public/assets/css/design-system-agency.css:89` (rozważyć 1240 vs
   1280 — ewentualnie pokazać oba warianty w przeglądarce przed decyzją).
2. `npx vitest tests/renderer.test.ts` — sam DOM-diff nie powinien się wysypać (to zmiana CSS, nie
   struktury), ale sprawdzić czy nie ma testów asercji na konkretne wartości px.
3. Zregenerować `reference/forma-production/*.html` jeśli test i tak wykryje różnicę w markupie
   (nie powinien, ale routine `npx tsx scripts/regen-reference.ts` jest bezpieczne).
4. Sprawdzić wizualnie kilka stron (`index`, `portfolio`, `proces`, `publikacje`) przy 1920px i
   1440px, że karty/siatki się nie rozjeżdżają (zwłaszcza `pub-split` dwukolumnowy layout
   publikacji — `forma-layout.css:741` i dalej — i `portfolio-grid`).
5. Publikacja na produkcję przez panel (przycisk "Publikuj") — dopiero po deployu na Vercel,
   zgodnie z opisem w `CLAUDE.md` ("How a publish is actually triggered").
