/**
 * Migracja: scalenie treści z /strony-dla-kancelarii-prawnych.html do strony głównej (SEO).
 *
 * Odpowiednik zmian z `prompt-claude-scalenie-strony-ofertowej-SEO-v2.md`, zastosowany
 * bezpośrednio na PRODUKCYJNYM rekordzie Site — NIE na `fixtures/forma-site.json`
 * (ten plik to osobny, niezależny szablon dev/test — patrz CLAUDE.md).
 *
 * Dotyczy WYŁĄCZNIE tenanta formawizerunku.pl (patrz workers/site-router/wrangler.toml
 * → HOST_MAP), nie wszystkich site'ów jak większość innych migrate-*.ts w tym katalogu.
 *
 * BEZPIECZEŃSTWO:
 * - Każda podmiana tekstu weryfikuje, że AKTUALNA wartość dokładnie zgadza się z wartością
 *   oczekiwaną (potwierdzoną 2026-07-26 bezpośrednio na żywej stronie przez przeglądarkę)
 *   — jeśli się nie zgadza, pole jest POMIJANE i zgłaszane jako ostrzeżenie, nigdy nie
 *   nadpisywane na siłę.
 * - Finalny model jest walidowany przez `parseSiteModel()` (hard validators V1–V15) PRZED
 *   zapisem — jeśli walidacja się nie powiedzie, nic nie jest zapisywane.
 * - Skrypt jest idempotentny: uruchomiony drugi raz nie zrobi nic (wszystkie wartości będą
 *   już nowe, więc guardy "old value" po prostu nie znajdą dopasowania i zostaną pominięte
 *   z odpowiednim komunikatem "already applied").
 *
 * PRZED URUCHOMIENIEM NA PRODUKCJI:
 * 1. Upewnij się, że `DATABASE_URL` w środowisku wskazuje na PRODUKCYJNĄ bazę Postgres
 *    (nie na lokalny dev.db) — sprawdź to jawnie, to nieodwracalna zmiana na żywej stronie.
 * 2. Zrób snapshot/backup produkcyjnej bazy (np. `pg_dump`) przed uruchomieniem.
 * 3. Zmiany renderera/schematu z osobnego zadania (worktree agenta, sekcja FAQ na
 *    stronie głównej, pola sourceLabel/sourceUrl na statystyce) muszą być już wdrożone
 *    na produkcję, żeby te dane faktycznie się wyrenderowały — sam zapis do bazy jest
 *    bezpieczny w każdej kolejności (dodatkowe pola JSON są ignorowane przez stary kod),
 *    ale wizualny efekt (nowa sekcja FAQ, cytowanie źródła) pojawi się dopiero po deployu.
 * 4. Ten skrypt NIE publikuje (`publishSite()`/R2) — to osobny, świadomie pominięty krok.
 *
 * Uruchom: npx tsx prisma/migrate-seo-homepage-merge.ts
 * Podgląd bez zapisu: npx tsx prisma/migrate-seo-homepage-merge.ts --dry-run
 */
import { PrismaClient } from '@prisma/client'
import { parseSiteModel } from '../src/lib/cms/schema'

const prisma = new PrismaClient()

const TENANT_ID = 'cmpmb0k6o0000wkuq6cgar9f2' // formawizerunku.pl — patrz workers/site-router/wrangler.toml HOST_MAP
const DRY_RUN = process.argv.includes('--dry-run')

type AnyRec = Record<string, any>

const warnings: string[] = []
const applied: string[] = []

function warn(msg: string) {
  warnings.push(msg)
  console.warn(`  ⚠ ${msg}`)
}

function ok(msg: string) {
  applied.push(msg)
  console.log(`  ✓ ${msg}`)
}

function findPage(model: AnyRec, slug: string): AnyRec | undefined {
  return (model.pages ?? []).find((p: AnyRec) => p.slug === slug)
}

function findSection(page: AnyRec | undefined, id: string): AnyRec | undefined {
  return page?.sections?.find((s: AnyRec) => s.id === id)
}

/** Zamienia section.fields[fieldKey].value tylko jeśli aktualna wartość dokładnie zgadza się z `from`. */
function replaceFieldValue(
  section: AnyRec | undefined,
  fieldKey: string,
  from: string,
  to: string,
  label: string
) {
  const field = section?.fields?.[fieldKey]
  if (!field) {
    warn(`${label}: pole "${fieldKey}" nie istnieje — pominięto.`)
    return
  }
  if (field.value === to) {
    ok(`${label}: już ustawione na docelową wartość (pomijam, idempotentnie).`)
    return
  }
  const current = typeof field.value === 'string' ? field.value : field.value
  if (current !== from) {
    // Tolerujemy WYŁĄCZNIE różnicę w białych znakach na brzegach (typowy artefakt edycji
    // w panelu) — treść dalej musi być identyczna po trim(). Każda inna rozbieżność zostaje
    // odrzucona bez zgadywania, tak jak wcześniej.
    if (typeof current === 'string' && current.trim() !== from.trim()) {
      warn(
        `${label}: aktualna wartość NIE zgadza się z oczekiwaną "przed" — pominięto, wymaga ręcznej weryfikacji.\n` +
          `      oczekiwano: ${JSON.stringify(from)}\n` +
          `      znaleziono: ${JSON.stringify(field.value)}`
      )
      return
    }
    warn(`${label}: aktualna wartość różniła się tylko białymi znakami na brzegach (${JSON.stringify(current)}) — traktuję jako zgodną i nadpisuję czystą wartością docelową.`)
  }
  field.value = to
  ok(`${label}: zaktualizowano.`)
}

async function main() {
  console.log(`Tryb: ${DRY_RUN ? 'DRY RUN (bez zapisu)' : 'ZAPIS DO BAZY'}`)
  console.log(`Tenant: ${TENANT_ID}\n`)

  const site = await prisma.site.findFirst({ where: { tenantId: TENANT_ID } })
  if (!site) {
    console.error(`Nie znaleziono Site dla tenanta ${TENANT_ID}. Sprawdź DATABASE_URL i tenantId.`)
    process.exit(1)
  }

  const model: AnyRec = JSON.parse(site.model as string)

  // ── 1. Meta title / description / ogDescription strony głównej ────────────────────
  console.log('1. Meta title / description (top-level model.meta):')
  if (model.meta.title !== 'Strony internetowe dla kancelarii prawnych | FORMA Wizerunku') {
    if (model.meta.title !== 'Strony dla kancelarii prawnych | FORMA Wizerunku') {
      warn(`meta.title: nieoczekiwana aktualna wartość ${JSON.stringify(model.meta.title)} — nadpisuję mimo to, bo cel jest jednoznaczny (Ustaw:, nie Z:/Na:).`)
    }
    model.meta.title = 'Strony internetowe dla kancelarii prawnych | FORMA Wizerunku'
    ok('meta.title: ustawiono nowy tytuł.')
  } else {
    ok('meta.title: już ustawione (pomijam, idempotentnie).')
  }

  const NEW_DESC =
    'Strony internetowe dla kancelarii prawnych w systemie PACTA. Jawna cena od 4 500 zł netto, standardowa realizacja w 14 dni i płatność po dostawie.'
  if (model.meta.description !== NEW_DESC) {
    model.meta.description = NEW_DESC
    ok('meta.description: ustawiono nowy opis.')
  } else {
    ok('meta.description: już ustawione (pomijam, idempotentnie).')
  }
  if (model.meta.ogDescription !== NEW_DESC) {
    model.meta.ogDescription = NEW_DESC
    ok('meta.ogDescription: zsynchronizowano z nowym opisem (ogTitle/twitter dziedziczą automatycznie z title/description w head.ts — nie wymagają osobnej zmiany).')
  } else {
    ok('meta.ogDescription: już zsynchronizowane (pomijam, idempotentnie).')
  }

  // ── 2. Hero (index) ─────────────────────────────────────────────────────────────
  console.log('\n2. Hero (index):')
  const indexPage = findPage(model, 'index')
  if (!indexPage) {
    console.error('Nie znaleziono strony "index" w modelu tenanta — przerywam, nic nie zapisano.')
    process.exit(1)
  }
  const hero = findSection(indexPage, 'hero')
  replaceFieldValue(hero, 'tag', 'Strony internetowe dla kancelarii prawnych', 'System PACTA', 'hero.tag')
  replaceFieldValue(
    hero,
    'headline',
    'Klient ocenia kancelarię, zanim zadzwoni',
    'Strony internetowe dla kancelarii prawnych',
    'hero.headline'
  )
  // UWAGA: hero.ts dopisuje własny ogon " Od {pricing.standard.amount} netto." po tej wartości
  // (single source of truth dla ceny — patrz CLAUDE.md). Dlatego celowo NIE kończymy tego pola
  // tekstem promptu "...— od 4 500 zł netto." — to zdublowałoby cenę w renderze
  // ("...— od 4 500 zł netto. Od 4 500 zł netto.") i zaszyło cenę na sztywno w polu treści.
  // Kończymy zdanie kropką; wyrenderowany lead brzmi "...bezpośrednia współpraca."
  replaceFieldValue(
    hero,
    'subheadlinePrefix',
    'Projektuję strony, które jasno prezentują specjalizacje kancelarii, budują zaufanie i ułatwiają kontakt. Standardowa realizacja trwa 14 dni.',
    'Projektuję strony dla kancelarii adwokackich i radcowskich, które jasno prezentują specjalizacje, budują wiarygodność i ułatwiają kontakt. Stały termin, jawna cena i bezpośrednia współpraca.',
    'hero.subheadlinePrefix'
  )

  // ── 3. Problem (index) — lead, statystyka 79%, symptom cards ──────────────────────
  console.log('\n3. Problem (index):')
  const problem = findSection(indexPage, 'problem')
  replaceFieldValue(
    problem,
    'lead',
    'Klient chce szybko zrozumieć, czym zajmuje się kancelaria, dlaczego warto jej zaufać i jak się skontaktować. Nieczytelna struktura, przestarzały wygląd lub słabe działanie na telefonie utrudniają mu ocenę oferty.',
    'Zanim klient zadzwoni do kancelarii, sprawdza jej stronę. Chce szybko ustalić, czy specjalizacja pasuje do jego sprawy, czy kancelaria wygląda wiarygodnie i jak może się skontaktować. Jeśli strona nie odpowiada jasno na te pytania, klient sprawdza kolejną kancelarię. To nie tylko kwestia estetyki — strona powinna pomagać klientowi zrozumieć ofertę i podjąć decyzję o kontakcie.',
    'problem.lead'
  )

  const stats: AnyRec[] | undefined = problem?.fields?.stats?.value
  const stat79 = stats?.find(s => s.suffix === '%' && s.target === 79)
  if (!stat79) {
    warn('problem.stats: nie znaleziono statystyki 79% (suffix "%", target 79) — pominięto sekcję źródła statystyki.')
  } else {
    const OLD_STAT_DESC = 'klientów kontaktuje więcej niż jedną kancelarię przed podjęciem decyzji'
    const NEW_STAT_DESC =
      'badanych, którzy ostatecznie zatrudnili prawnika, skontaktowało się z więcej niż jednym prawnikiem przed podjęciem decyzji'
    if (stat79.description === NEW_STAT_DESC) {
      ok('problem.stats[79%].description: już ustawione (pomijam, idempotentnie).')
    } else if (stat79.description !== OLD_STAT_DESC) {
      warn(
        `problem.stats[79%].description: aktualna wartość nie zgadza się z oczekiwaną — pominięto.\n` +
          `      oczekiwano: ${JSON.stringify(OLD_STAT_DESC)}\n      znaleziono: ${JSON.stringify(stat79.description)}`
      )
    } else {
      stat79.description = NEW_STAT_DESC
      ok('problem.stats[79%].description: zaktualizowano.')
    }

    // sourceLabel/sourceUrl — pola dodatkowe na obiekcie StatCard. FieldSchema.value w
    // schema.ts to z.unknown(), więc parseSiteModel() nie odrzuci tych dodatkowych kluczy;
    // renderer musi zostać rozszerzony osobno (worktree agenta), żeby je wyświetlić.
    const SOURCE_LABEL =
      'Źródło: Martindale-Avvo, „Understanding the Legal Consumer 2023", badanie konsumentów w USA.'
    const SOURCE_URL =
      'https://www.martindale-avvo.com/wp-content/uploads/2023/12/Understanding-the-Legal-Consumer-2023.pdf'
    if (stat79.sourceLabel === SOURCE_LABEL && stat79.sourceUrl === SOURCE_URL) {
      ok('problem.stats[79%].sourceLabel/sourceUrl: już ustawione (pomijam, idempotentnie).')
    } else if (stat79.sourceLabel && stat79.sourceLabel !== SOURCE_LABEL) {
      warn(`problem.stats[79%].sourceLabel: już ma inną wartość (${JSON.stringify(stat79.sourceLabel)}) — pominięto, nie nadpisuję.`)
    } else {
      stat79.sourceLabel = SOURCE_LABEL
      stat79.sourceUrl = SOURCE_URL
      ok('problem.stats[79%]: dodano sourceLabel/sourceUrl.')
    }
  }
  // Druga statystyka ("14dni") — spec jawnie mówi, że nie wymaga źródła. Nie dotykamy jej.

  const symptomCards: AnyRec[] | undefined = problem?.fields?.symptomCards?.value
  function replaceCardBody(title: string, from: string, to: string) {
    const card = symptomCards?.find(c => c.title === title)
    if (!card) {
      warn(`problem.symptomCards["${title}"]: karta nie znaleziona — pominięto.`)
      return
    }
    if (card.body === to) {
      ok(`problem.symptomCards["${title}"]: już ustawione (pomijam, idempotentnie).`)
      return
    }
    if (card.body !== from) {
      warn(
        `problem.symptomCards["${title}"]: aktualna treść nie zgadza się z oczekiwaną — pominięto.\n` +
          `      oczekiwano: ${JSON.stringify(from)}\n      znaleziono: ${JSON.stringify(card.body)}`
      )
      return
    }
    card.body = to
    ok(`problem.symptomCards["${title}"]: zaktualizowano.`)
  }
  replaceCardBody(
    'Wygląd z 2016 roku',
    'Nowi klienci oceniają Cię zanim zadzwonią. Stara strona mówi: "ta kancelaria nie dba o szczegóły".',
    'Przestarzały wygląd może osłabiać pierwsze wrażenie i utrudniać odbiorcy ocenę aktualności kancelarii.'
  )
  replaceCardBody(
    'Nieczytelna na telefonie',
    '60% odwiedzających używa mobile. Wolna, nieresponsywna strona jest karana przez Google i odpycha klientów.',
    'Nieczytelny układ, małe elementy i wolne ładowanie utrudniają korzystanie ze strony na telefonie i mogą ograniczać jej skuteczność.'
  )
  replaceCardBody(
    'Brak wyraźnych CTA',
    'Klient przychodzi i wychodzi bez kontaktu. Strona nie prowadzi do działania — liczba zapytań nie rośnie.',
    'Użytkownik powinien od razu wiedzieć, jak skontaktować się z kancelarią. Brak czytelnej drogi do kontaktu zwiększa ryzyko, że opuści stronę.'
  )

  // ── 4. Solution / System PACTA (index) ─────────────────────────────────────────────
  console.log('\n4. Solution / System PACTA (index):')
  const solution = findSection(indexPage, 'solution')
  replaceFieldValue(
    solution,
    'headline',
    'Co zyskuje kancelaria dzięki dobrze zaprojektowanej stronie?',
    'Strona zaprojektowana pod to, jak klienci wybierają kancelarię',
    'solution.headline'
  )
  replaceFieldValue(
    solution,
    'body1',
    'Strona porządkuje sposób prezentacji kancelarii. Klient szybciej rozumie jej specjalizacje, poznaje zespół i znajduje informacje potrzebne do podjęcia kontaktu.',
    'Potencjalny klient nie może w kilka sekund rzetelnie ocenić kompetencji prawnika. Może jednak ocenić, czy specjalizacja jest jasno przedstawiona, czy kancelaria budzi zaufanie i czy łatwo znaleźć sposób kontaktu.',
    'solution.body1'
  )
  replaceFieldValue(
    solution,
    'body2',
    'Projektuję ją według systemu PACTA — zestawu zasad opracowanych dla kancelarii prawnych. Dzięki temu struktura, treści i elementy kontaktowe nie są przypadkowe, lecz wynikają z określonego procesu.',
    'PACTA to system projektowania stron opracowany dla kancelarii prawnych. Porządkuje strukturę, treści i elementy kontaktowe tak, aby każdy z nich miał określoną funkcję.',
    'solution.body2'
  )

  const NEW_CHECKLIST = [
    'Jasna prezentacja specjalizacji i zespołu',
    'Komunikacja uwzględniająca specyfikę zawodów prawniczych i zasady etyki',
    'Czytelna droga od poznania oferty do kontaktu',
    'Szybka, responsywna strona przygotowana do indeksacji w Google',
  ]
  const checklistField = solution?.fields?.checklistItems
  if (!checklistField) {
    warn('solution.checklistItems: pole nie istnieje — pominięto.')
  } else if (JSON.stringify(checklistField.value) === JSON.stringify(NEW_CHECKLIST)) {
    ok('solution.checklistItems: już ustawione (pomijam, idempotentnie).')
  } else {
    console.log(`      poprzednia lista: ${JSON.stringify(checklistField.value)}`)
    checklistField.value = NEW_CHECKLIST
    ok('solution.checklistItems: zastąpiono całą listę (4 pozycje, zgodnie ze spec — bez weryfikacji "starej" wartości, spec każe zastąpić całość).')
  }

  replaceFieldValue(
    solution,
    'microcopy',
    'Termin, zakres i cena ustalone przed rozpoczęciem projektu',
    'Pracujesz bezpośrednio ze mną — od pierwszej rozmowy do publikacji. Termin, zakres i cena są ustalone przed rozpoczęciem projektu.',
    'solution.microcopy'
  )

  // ── 5. FAQ na stronie głównej (index) — nowa sekcja między pricing a cta-finale ────
  console.log('\n5. FAQ (index) — nowa sekcja:')
  const NEW_INDEX_FAQ_ITEMS = [
    {
      id: '1',
      question: 'Czym różni się system PACTA od zwykłego projektu strony?',
      answer:
        'PACTA nie jest gotowym szablonem. To system projektowania stron dla kancelarii prawnych, który porządkuje strukturę treści, prezentację specjalizacji i drogę prowadzącą użytkownika do kontaktu. Projekt rozpoczyna się od rozwiązań dopasowanych do sposobu, w jaki klienci wybierają kancelarię.',
    },
    {
      id: '2',
      question: 'Czy strona uwzględnia zasady etyki zawodowej?',
      answer:
        'Projektuję strukturę i komunikację strony z uwzględnieniem specyfiki zawodów prawniczych. Unikam obietnic wyniku, porównań z konkurencją, natarczywych komunikatów i nieuzasadnionych określeń wartościujących. Nie jest to opinia prawna — ostateczną treść strony zatwierdza kancelaria.',
    },
    {
      id: '3',
      question: 'Czy mogę samodzielnie edytować treść strony po dostawie?',
      answer:
        'Tak. Otrzymujesz dostęp do panelu CMS, który pozwala samodzielnie edytować treści i zdjęcia bez pomocy programisty. Po wdrożeniu przekazuję instrukcję obsługi.',
    },
    {
      id: '4',
      question: 'Czy projektujesz nową stronę, czy również modernizujesz istniejącą?',
      answer:
        'Projektuję zarówno nowe strony, jak i przebudowuję istniejące witryny kancelarii. Analizuję obecną stronę, zachowuję wartościowe treści i materiały oraz porządkuję elementy, które utrudniają prezentację specjalizacji lub kontakt.',
    },
  ]
  const existingIndexFaq = findSection(indexPage, 'faq')
  if (existingIndexFaq) {
    ok('index: sekcja "faq" już istnieje (pomijam dodawanie, idempotentnie) — nie nadpisuję jej treści automatycznie, sprawdź ręcznie czy zgadza się z docelową.')
  } else {
    const sections: AnyRec[] = indexPage.sections
    const pricingIdx = sections.findIndex(s => s.id === 'pricing')
    const ctaIdx = sections.findIndex(s => s.id === 'cta-finale')
    if (pricingIdx === -1 || ctaIdx === -1 || ctaIdx !== pricingIdx + 1) {
      warn(
        `index: nie znaleziono oczekiwanego układu sekcji "pricing" bezpośrednio przed "cta-finale" (pricingIdx=${pricingIdx}, ctaIdx=${ctaIdx}) — pominięto dodanie FAQ, wymaga ręcznej weryfikacji kolejności sekcji.`
      )
    } else {
      sections.splice(pricingIdx + 1, 0, {
        id: 'faq',
        recipe: 'P5',
        fields: {
          headline: {
            type: 'text',
            value: 'Najczęstsze pytania przed rozpoczęciem projektu',
            editable: true,
          },
          items: {
            type: 'list',
            value: NEW_INDEX_FAQ_ITEMS,
            editable: true,
          },
        },
      })
      ok('index: dodano sekcję "faq" (recipe P5) między "pricing" i "cta-finale", z 4 pytaniami.')
    }
  }

  // ── 6. FAQ na /proces — usunięcie pytania przeniesionego na stronę główną ─────────
  console.log('\n6. FAQ (proces) — porządkowanie:')
  const procesFaq = findSection(findPage(model, 'proces'), 'faq')
  const procesItems: AnyRec[] | undefined = procesFaq?.fields?.items?.value
  if (!procesItems) {
    warn('proces.faq.items: nie znaleziono — pominięto.')
  } else {
    const QUESTIONS_TO_REMOVE = [
      'Czy mogę sam edytować treść strony po dostawie?',
      'Czym różni się system PACTA od zwykłej strony internetowej?',
      'Mam już stronę kancelarii. Czy możesz ją przebudować?',
    ]
    for (const q of QUESTIONS_TO_REMOVE) {
      const idx = procesItems.findIndex(i => i.question === q)
      if (idx === -1) {
        ok(`proces.faq: pytanie "${q}" już nieobecne (pomijam, idempotentnie lub wcześniej usunięte).`)
      } else {
        procesItems.splice(idx, 1)
        ok(`proces.faq: usunięto pytanie "${q}".`)
      }
    }
  }

  // ── 7. Link do artykułu o etyce ────────────────────────────────────────────────────
  console.log('\n7. Link do artykułu o etyce zawodowej:')
  warn(
    'Nie znaleziono w repozytorium opublikowanego artykułu "Jak zaprojektować stronę kancelarii zgodnie z zasadami etyki zawodowej?" z finalnym adresem kanonicznym. Zgodnie ze spec — pominięto, nie wymyślono adresu.'
  )

  // ── 8. Stary adres — usunięcie strony źródłowej + naprawa linków wewnętrznych ─────
  console.log('\n8. Stary adres / linki wewnętrzne / sitemap:')
  const oldPageIdx = (model.pages ?? []).findIndex((p: AnyRec) => p.slug === 'strony-dla-kancelarii-prawnych')
  if (oldPageIdx === -1) {
    ok('strony-dla-kancelarii-prawnych: strona już usunięta z modelu (pomijam, idempotentnie).')
  } else {
    model.pages.splice(oldPageIdx, 1)
    ok('strony-dla-kancelarii-prawnych: usunięto stronę z modelu (automatycznie wypadnie z sitemap.xml — buildSitemapXml() pomija strony spoza pages[]). Przekierowanie 301 w Workerze pozostaje nietknięte.')
  }

  // Ten link NIE jest przechowywany w footer.links (fixture ma dokładnie 6 pozycji, limit V11).
  // Jest doklejany osobno w footer.ts, warunkowo przez ctx.hasSeoPage — więc to pole tekstowe
  // nigdy go nie znajdzie i pętla poniżej to sprawdza tylko na wypadek nietypowych danych.
  // Właściwa naprawa (href → "/", bez warunku hasSeoPage) leży w kodzie renderera i wchodzi
  // wraz z deployem tamtej zmiany — nie wymaga osobnego zapisu do bazy.
  let footerLinksFixed = 0
  for (const page of model.pages ?? []) {
    for (const section of page.sections ?? []) {
      if (section.id !== 'footer') continue
      const links: AnyRec[] | undefined = section.fields?.links?.value
      if (!links) continue
      for (const link of links) {
        if (link.href === 'strony-dla-kancelarii-prawnych.html' || link.href === 'strony-dla-kancelarii-prawnych') {
          link.href = '/'
          footerLinksFixed++
          ok(`footer (${page.slug}): naprawiono href linku "${link.label}" → "/" (nietypowe — ten link zwykle nie jest w footer.links, patrz komentarz wyżej).`)
        }
      }
    }
  }
  if (footerLinksFixed === 0) {
    ok('footer: brak linków do starego adresu w footer.links (oczekiwane — link jest generowany przez kod renderera, nie przez dane; naprawa wchodzi z deployem, nie z tą migracją).')
  }

  // ── Walidacja + zapis ───────────────────────────────────────────────────────────
  console.log('\n── Walidacja finalnego modelu przez parseSiteModel() ──')
  try {
    const { warnings: softWarnings } = parseSiteModel(model)
    console.log(`  ✓ Model przechodzi walidację (hard V1–V15).`)
    if (softWarnings.length > 0) {
      console.log(`  Ostrzeżenia miękkie (nieblokujące):`)
      for (const w of softWarnings) console.log(`    - ${JSON.stringify(w)}`)
    }
  } catch (e) {
    console.error('\n✗ WALIDACJA NIE POWIODŁA SIĘ — NIC nie zostało zapisane do bazy.')
    console.error(e)
    process.exit(1)
  }

  console.log(`\n── Podsumowanie ──`)
  console.log(`Zastosowane zmiany: ${applied.length}`)
  console.log(`Ostrzeżenia / pominięte: ${warnings.length}`)
  if (warnings.length > 0) {
    console.log('\nWymagają ręcznej weryfikacji:')
    warnings.forEach(w => console.log(`  - ${w}`))
  }

  if (DRY_RUN) {
    console.log('\nDRY RUN — nie zapisano do bazy. Uruchom bez --dry-run, żeby zapisać.')
    return
  }

  await prisma.site.update({
    where: { id: site.id },
    data: { model: JSON.stringify(model) },
  })
  console.log(`\n✓ Zapisano zmiany dla tenanta ${TENANT_ID}.`)
  console.log('Pamiętaj: to NIE publikuje strony (brak wywołania publishSite()/R2) — to świadomie osobny krok.')
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
