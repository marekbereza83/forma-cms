/**
 * Migracja: dodaje stronę "proces" do istniejących rekordów Site.
 *
 * Bezpieczna i idempotentna:
 * - jeśli strona 'proces' już ma sekcje (sections.length > 0) — pomija rekord
 * - jeśli 'proces' istnieje jako pusty stub (po migrate-nav-labels) — wypełnia go w miejscu
 * - jeśli 'proces' nie istnieje w ogóle — dodaje go za 'portfolio', przed 'kontakt'
 * - NIE dotyka istniejącej strony 'index' ani żadnych pól użytkownika
 *
 * DŁUG-CENNIK-1: cena "4 500 zł" i "6 500 zł" pojawia się w 3 miejscach:
 *   1. index.pricing.standard.amount / extended.amount (structured V1-validated)
 *   2. index.cta-finale.lead (free text, V1 nie pilnuje)
 *   3. proces.cta-finale.lead (free text, V1 nie pilnuje) ← ta migracja
 * Synchronizacja tych wartości to zadanie Etapu 2.
 *
 * Uruchamiaj jawnie: npm run migrate:add-proces
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

type PageLike = { slug: string; sections?: unknown[] }
type SiteModelLike = { pages?: PageLike[] }

// U+00A0 non-breaking spaces in "4 500 zł" — intentional, matches reference HTML
const PROCES_SECTIONS = [
  {
    id: 'nav',
    recipe: 'A1',
    fields: {
      logoText:     { type: 'text',    value: 'Forma Wizerunku',  editable: false },
      phoneRaw:     { type: 'contact', value: '+48500100200',     editable: false },
      phoneDisplay: { type: 'contact', value: '+48 500 100 200',  editable: false },
      ctaLabel:     { type: 'cta',     value: 'Zamów stronę',     editable: false },
    },
  },
  {
    id: 'proces-hero',
    recipe: 'P0',
    fields: {
      tag:      { type: 'text',     value: 'Jak pracuję',                                                                               editable: false },
      headline: { type: 'text',     value: 'Od briefu do gotowej strony kancelarii w 14 dni',                                          editable: true  },
      lead:     { type: 'richtext', value: 'Stały termin. Stała cena. Bez niespodzianek. Wiesz z góry co dostajesz, kiedy i za ile — bo prawnicy cenią transparentność umowną.', editable: true },
    },
  },
  {
    id: 'timeline',
    recipe: 'P1',
    fields: {
      headline: { type: 'text', value: 'Jak wygląda współpraca krok po kroku', editable: true },
      steps: {
        type: 'list',
        value: [
          {
            num: '01', day: 'Dzień 1-2', title: 'Brief',
            body: 'Wypełniasz krótki formularz online. Opisujesz kancelarię, specjalizacje i klientów. Dostajesz ode mnie pytania doprecyzowujące. Ustalamy zakres, terminy i warunki płatności. <strong>Twoje działanie:</strong> formularz + materiały (treści, zdjęcia).',
          },
          {
            num: '02', day: 'Dzień 3-5', title: 'Design systemu',
            body: 'Konfiguruję system PACTA dla Twojej kancelarii: kolory, typografia, foto-placeholder. Dostajesz wgląd do pierwszego projektu sekcji hero do akceptacji. <strong>Twoje działanie:</strong> feedback w ciągu 24h.',
          },
          {
            num: '03', day: 'Dzień 5-10', title: 'Kodowanie',
            body: 'Buduję wszystkie podstrony w HTML + CSS. Mobile-first od pierwszej linii kodu. Lighthouse ≥ 90 jako warunek oddania — nie opcja. <strong>Twoje działanie:</strong> dostarczasz finalne zdjęcia i treści.',
          },
          {
            num: '04', day: 'Dzień 8-12 (równolegle)', title: 'Treść i zdjęcia',
            body: 'Dostarczasz zdjęcia i treść (masz checkistę ode mnie od Dnia 1). Mogę napisać copy na podstawie Twojej specjalizacji — opcjonalnie za dopłatą. <strong>Twoje działanie:</strong> dostarcz materiały do Dnia 8 (gwarancja terminu).',
          },
          {
            num: '05', day: 'Dzień 12-13', title: 'Testy QA',
            body: 'Automatyczne testy: screenshoty desktop/tablet/mobile (Playwright), broken links, formularze, CTA, dostępność (WAVE), Lighthouse. Lista błędów — zwykle 0-3 drobne. <strong>Twoje działanie:</strong> odbiór i ewentualny feedback.',
          },
          {
            num: '06', day: 'Dzień 14', title: 'Dostawa',
            body: 'Przekazanie plików + instrukcja wdrożenia hostingowego (Vercel/Netlify/FTP). Nagranie wideo: jak edytować treść samodzielnie. Możemy przejść razem przez wdrożenie — 30 min. <strong>Twoje działanie:</strong> wdrożenie lub zlecenie serwerowe.',
          },
        ],
        editable: true,
      },
    },
  },
  {
    id: 'deliverables',
    recipe: 'P2',
    fields: {
      headline: { type: 'text', value: 'Konkretne pliki i usługi przy każdym projekcie', editable: true },
      items: {
        type: 'list',
        value: [
          { title: 'Gotowe pliki HTML + CSS',            body: 'Czyste, semantyczne pliki bez zależności od CMS ani frameworka.' },
          { title: 'Instrukcja wdrożenia hostingowego',  body: 'Krok po kroku na Vercel, Netlify lub dowolny serwer FTP.' },
          { title: 'Wideo: jak edytować treść',          body: 'Screencast 10-15 min. Edytujesz HTML jak dokument Word.' },
          { title: 'SEO techniczne',                     body: 'Meta tagi, og:image, sitemap.xml, robots.txt, schema.org JSON-LD.' },
          { title: 'Raport Lighthouse',                  body: 'PDF z wynikami Performance, Accessibility, SEO, Best Practices.' },
          { title: 'Google Analytics + Search Console',  body: 'Setup i weryfikacja domeny — w pakiecie Rozszerzony.' },
        ],
        editable: true,
      },
    },
  },
  {
    id: 'technologie',
    recipe: 'P3',
    fields: {
      headline: { type: 'text',     value: 'Buduję statyczne strony — szybkie, bezpieczne, bez CMS',                                                                 editable: true  },
      lead:     { type: 'richtext', value: 'Zero WordPress. Zero zależności od wtyczek. Zero ryzyka ataku przez nieaktualne CMS-y. Strona to pliki — działają zawsze i wszędzie.', editable: true  },
      tags: {
        type: 'list',
        value: [
          'HTML5 semantyczny', 'CSS własny (bez Tailwind CDN)', 'JavaScript (vanilla)',
          'Playwright QA', 'Google Lighthouse', 'Schema.org JSON-LD', 'WCAG 2.1 AA', 'mobile-first',
        ],
        editable: false,
      },
    },
  },
  {
    id: 'cennik-detail',
    recipe: 'P4',
    fields: {
      // Brak pól standard/extended (type: price) — renderer czyta ceny z ctx.indexPricing
      // (index.pricing jako jedyne źródło prawdy). Klient zmienia cenę RAZ na home.
      sectionHeadline: { type: 'text', value: 'Ile kosztuje strona dla kancelarii?',                                        editable: true },
      sectionLead:     { type: 'text', value: 'Cena jawna. Zakres jasny. Warunki płatności: 50% zaliczka, 50% po dostawie.', editable: true },
    },
  },
  {
    id: 'faq',
    recipe: 'P5',
    fields: {
      headline: { type: 'text', value: 'Pytania przed zamówieniem', editable: true },
      items: {
        type: 'list',
        value: [
          {
            id: '1',
            question: 'Czy mogę sam edytować treść strony po dostawie?',
            answer: 'Tak. Dostajesz wideo instrukcję (10-15 min). Strona to pliki HTML — edytujesz tekst dowolnym edytorem (nawet Notatnikiem). Nie zależy od żadnego CMS, panelu ani abonamentu.',
          },
          {
            id: '2',
            question: 'Co z RODO na stronie kancelarii?',
            answer: 'Strona zawiera politykę prywatności, klauzulę informacyjną w formularzu kontaktowym oraz podstawowe zarządzanie cookies. To spełnia minimalne wymogi RODO dla strony informacyjnej kancelarii. Pełna obsługa danych osobowych leży po stronie Twojej kancelarii.',
          },
          {
            id: '3',
            question: 'Czy 14 dni to gwarantowany termin?',
            answer: 'Tak, pod warunkiem dostarczenia treści i zdjęć do Dnia 8. Jeśli materiały spóźnią się, termin przesuwa się proporcjonalnie — proporcja opóźnienia jest jednorazowo dokumentowana mailem. Gwarancja jest wpisana w umowę.',
          },
          {
            id: '4',
            question: 'Czy zajmujesz się hostingiem?',
            answer: 'Nie zajmuję się hostingiem — daję Ci instrukcję wdrożenia na Vercel lub Netlify (obydwa bezpłatne dla statycznych stron) lub dowolny serwer FTP. W pakiecie Rozszerzony: sesja 30 min żeby przejść razem przez wdrożenie.',
          },
          {
            id: '5',
            question: 'Czy strona będzie widoczna w Google?',
            answer: 'Wykonuję SEO techniczne: meta tagi, og:image, sitemap.xml, schema.org JSON-LD, Google Search Console setup (Rozszerzony). Technicznie strona jest gotowa do indeksacji. Pozycjonowanie w wynikach (content SEO) wymaga regularnych działań — mogę to wycenić osobno.',
          },
          {
            id: '6',
            question: 'Pracujesz tylko z kancelariami?',
            answer: 'Tak. Specjalizuję się w stronach dla kancelarii radców prawnych i adwokatów. Dlatego strony wychodzą lepiej — znam wzorce tej branży, typowe obiekcje klientów i specyficzne wymagania RODO dla kancelarii.',
          },
          {
            id: '7',
            question: 'Ile kosztuje zmiana strony po dostawie?',
            answer: 'Mała zmiana (treść, zdjęcie, CTA) — bezpłatna przez 14 dni po dostawie. Duże zmiany (nowa podstrona, nowa sekcja, nowa funkcja) — wycena osobno od 300 zł. Pakiet Rozszerzony: 3 miesiące wsparcia technicznego wliczone w cenę.',
          },
        ],
        editable: false,  // statyczne — edycja FAQ to Etap 3 (osobna kolekcja)
      },
    },
  },
  {
    id: 'cta-finale',
    recipe: 'P6',
    fields: {
      headline:  { type: 'text',     value: 'Gotowy? Porozmawiajmy.',                                                      editable: true  },
      // DŁUG-CENNIK-1: U+00A0 between "4", "500", "zł" — mirrors reference HTML &nbsp;
      lead:      { type: 'richtext', value: 'Strona gotowa w 14 dni od briefu. Od 4 500 zł netto. Opisz krótko kancelarię — odpiszę w 24h.', editable: true  },
      ctaLabel:  { type: 'cta',      value: 'Napisz do mnie',                                                               editable: true  },
      microcopy: { type: 'text',     value: 'Odpowiadam w ciągu 24h. Bez zobowiązań.',                                      editable: true  },
      // NOTE: no phoneRaw / phoneDisplay — cta-finale renderer uses microcopy variant for proces
    },
  },
  {
    id: 'footer',
    recipe: 'A9',
    fields: {
      logoText:     { type: 'text',    value: 'Forma Wizerunku',           editable: false },
      phoneRaw:     { type: 'contact', value: '+48500100200',              editable: true  },
      phoneDisplay: { type: 'contact', value: '+48 500 100 200',           editable: true  },
      email:        { type: 'contact', value: 'kontakt@formawizerunku.pl', editable: true  },
      links: {
        type: 'list',
        value: [
          { label: 'Portfolio',            href: 'portfolio.html'      },
          { label: 'Jak pracuję',          href: 'proces.html'         },
          { label: 'Kontakt',              href: 'kontakt.html'        },
          { label: 'Polityka prywatności', href: 'privacy-policy.html' },
          { label: 'Nota prawna',          href: 'legal-notice.html'   },
        ],
        editable: false,
      },
      copyright: { type: 'text', value: '© 2026 Forma Wizerunku. Wszelkie prawa zastrzeżone.', editable: false },
    },
  },
]

const PROCES_META = {
  title:         'Jak pracuję — proces i cennik | FORMA',
  description:   'Proces projektowania stron dla kancelarii prawnych. 6 kroków, 14 dni. Cennik: Standard 4500 zł, Rozszerzony 6500 zł. FAQ — odpowiedzi na pytania przed zamówieniem.',
  canonical:     'https://formawiz.pl/proces.html',
  ogTitle:       'Jak pracuję — proces i cennik | FORMA',
  ogDescription: '6 kroków, 14 dni, transparentny cennik. Dowiedz się jak wygląda współpraca.',
  ogUrl:         'https://formawiz.pl/proces.html',
}

async function main() {
  const sites = await prisma.site.findMany()
  console.log(`Znaleziono ${sites.length} site(ów).\n`)

  for (const site of sites) {
    const model = JSON.parse(site.model as string) as SiteModelLike
    const pages = model.pages ?? []

    const existing = pages.find(p => p.slug === 'proces')

    // Idempotency: skip if proces already has sections
    if (existing && (existing.sections?.length ?? 0) > 0) {
      console.log(`[${site.id}] POMINIĘTO: strona proces już ma ${existing.sections!.length} sekcji.`)
      continue
    }

    if (existing) {
      // Empty stub from migrate-nav-labels — fill in place
      Object.assign(existing, {
        meta:     PROCES_META,
        sections: PROCES_SECTIONS,
      })
      console.log(`[${site.id}] Wypełniam istniejący stub procesu.`)
    } else {
      // No stub at all — insert after portfolio, before kontakt
      const kontaktIdx = pages.findIndex(p => p.slug === 'kontakt')
      const insertAt = kontaktIdx >= 0 ? kontaktIdx : pages.length
      pages.splice(insertAt, 0, {
        slug:     'proces',
        navLabel: 'Jak pracuję',
        meta:     PROCES_META,
        sections: PROCES_SECTIONS,
      } as unknown as PageLike)
      console.log(`[${site.id}] Dodaję nową stronę proces na pozycji ${insertAt}.`)
    }

    model.pages = pages

    await prisma.site.update({
      where: { id: site.id },
      data:  { model: JSON.stringify(model) },
    })

    // Weryfikacja po zapisie
    const modelAfter = JSON.parse(
      (await prisma.site.findUnique({ where: { id: site.id } }))!.model as string
    ) as SiteModelLike

    const indexAfter  = modelAfter.pages?.find(p => p.slug === 'index')
    const procesAfter = modelAfter.pages?.find(p => p.slug === 'proces') as (PageLike & { sections?: unknown[] }) | undefined

    console.log(`[${site.id}] ZMIGROWANO`)
    console.log(`  index zachowany:        ${indexAfter !== undefined ? 'TAK' : 'NIE ← BŁĄD'}`)
    console.log(`  proces dodany:          ${procesAfter !== undefined ? 'TAK' : 'NIE ← BŁĄD'}`)
    console.log(`  proces.sections.length: ${procesAfter?.sections?.length ?? 0}`)
    console.log(`  liczba stron:           ${modelAfter.pages?.length ?? 0}`)
    console.log()
  }

  console.log('Migracja zakończona.')
}

main().catch(console.error).finally(() => prisma.$disconnect())
