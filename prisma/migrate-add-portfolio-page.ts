/**
 * Migracja: dodaje sekcje do strony "portfolio" w istniejących rekordach Site.
 *
 * Bezpieczna i idempotentna:
 * - sprawdza ZAWARTOŚĆ: czy sekcja 'portfolio-grid' już istnieje (nie liczbę sekcji)
 * - jeśli tak — pomija rekord bez zmian
 * - jeśli nie — wypełnia stronę portfolio pełnymi sekcjami
 * - NIE dotyka istniejących stron (index, proces, kontakt)
 *
 * Backup dev.db tworzony PRZED pierwszą zmianą (tylko raz, jeśli cokolwiek wymaga update).
 *
 * Uruchamiaj jawnie: npx ts-node prisma/migrate-add-portfolio-page.ts
 */
import { PrismaClient } from '@prisma/client'
import { copyFileSync, existsSync } from 'fs'
import { resolve } from 'path'

const prisma = new PrismaClient()

type SectionLike  = { id: string }
type PageLike     = { slug: string; navLabel?: string; meta?: unknown; sections?: SectionLike[] }
type SiteModelLike = { pages?: PageLike[] }

// U+00A0 between digits in prices — intentional, matches reference HTML &nbsp;
const PORTFOLIO_SECTIONS: SectionLike[] = [
  {
    id: 'nav',
    recipe: 'A1',
    fields: {
      logoText:     { type: 'text',    value: 'Forma Wizerunku',  editable: false },
      phoneRaw:     { type: 'contact', value: '+48500100200',     editable: false },
      phoneDisplay: { type: 'contact', value: '+48 500 100 200',  editable: false },
      ctaLabel:     { type: 'cta',     value: 'Zamów stronę',     editable: false },
    },
  } as unknown as SectionLike,
  {
    id: 'portfolio-hero',
    recipe: 'PF0',
    fields: {
      tag:      { type: 'text',     value: 'Wszystkie realizacje',                                                          editable: false },
      headline: { type: 'text',     value: 'Strony dla kancelarii prawnych',                                               editable: true  },
      lead:     { type: 'richtext', value: 'Case studies z liczbami: czasy realizacji, wyniki Lighthouse, zakresy projektów.', editable: true },
    },
  } as unknown as SectionLike,
  {
    id: 'portfolio-grid',
    recipe: 'PF1',
    fields: {
      cards: {
        type: 'list',
        value: [
          {
            id:    '11111111-1111-4111-b111-111111111111',
            label: 'Kancelaria solo • Toruń • 2026',
            title: 'Kancelaria Radcy Prawnego Anna Wojtas',
            desc:  '8-stronicowa strona HTML, system PACTA. Lighthouse 95+. Dostawa w 12 dni.',
            image: 'assets/images/wojtas-hero.png',
            link:  '',
          },
        ],
        editable: true,
      },
    },
  } as unknown as SectionLike,
  {
    id: 'cta-finale',
    recipe: 'PF2',
    fields: {
      headline:  { type: 'text',     value: 'Chcesz podobną stronę?',                                                              editable: true },
      lead:      { type: 'richtext', value: 'Strona gotowa w 14 dni od briefu. Opisz krótko kancelarię, odpiszę w ciągu 24h.', editable: true },
      ctaLabel:  { type: 'cta',      value: 'Zamów stronę',                                                                        editable: true },
      microcopy: { type: 'text',     value: 'Odpowiadam w ciągu 24h. Bez zobowiązań.',                                        editable: true },
    },
  } as unknown as SectionLike,
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
          { label: 'Jak pracuję',     href: 'proces.html'         },
          { label: 'Kontakt',              href: 'kontakt.html'        },
          { label: 'Polityka prywatności', href: 'privacy-policy.html' },
          { label: 'Nota prawna',          href: 'legal-notice.html'   },
        ],
        editable: false,
      },
      copyright: { type: 'text', value: '© 2026 Forma Wizerunku. Wszelkie prawa zastrzeżone.', editable: false },
    },
  } as unknown as SectionLike,
]

const PORTFOLIO_META = {
  title:         'Portfolio — realizacje | FORMA',
  description:   'Realizacje FORMA: strony internetowe dla kancelarii prawnych i firm B2B. Case studies z liczbami.',
  canonical:     'https://formawizerunku.pl/portfolio.html',
  ogTitle:       'Portfolio — realizacje | FORMA',
  ogDescription: 'Strony dla kancelarii prawnych i firm B2B. Case studies z liczbami.',
  ogUrl:         'https://formawizerunku.pl/portfolio.html',
}

async function main() {
  const sites = await prisma.site.findMany()
  console.log(`Znaleziono ${sites.length} site(ów).\n`)

  let backupDone = false

  for (const site of sites) {
    const model = JSON.parse(site.model as string) as SiteModelLike
    const pages = model.pages ?? []

    const portfolioPage = pages.find(p => p.slug === 'portfolio') as PageLike | undefined

    // Idempotency check: has portfolio-grid section already?
    const hasPortfolioGrid = portfolioPage?.sections?.some(s => s.id === 'portfolio-grid') ?? false

    if (hasPortfolioGrid) {
      console.log(`[${site.id}] POMINIĘTO: sekcja portfolio-grid już istnieje.`)
      continue
    }

    // Backup dev.db once, before first write
    if (!backupDone) {
      const dbPath = resolve(process.cwd(), 'prisma', 'dev.db')
      if (existsSync(dbPath)) {
        const backupPath = `${dbPath}.backup-${Date.now()}`
        copyFileSync(dbPath, backupPath)
        console.log(`Backup: ${backupPath}`)
      }
      backupDone = true
    }

    if (portfolioPage) {
      // Stub exists (empty sections) — fill in place
      portfolioPage.meta     = PORTFOLIO_META
      portfolioPage.sections = PORTFOLIO_SECTIONS
      console.log(`[${site.id}] Wypełniam istniejący stub portfolio.`)
    } else {
      // No stub at all — insert after index, before proces
      const procesIdx = pages.findIndex(p => p.slug === 'proces')
      const insertAt  = procesIdx >= 0 ? procesIdx : pages.length
      pages.splice(insertAt, 0, {
        slug:     'portfolio',
        navLabel: 'Portfolio',
        meta:     PORTFOLIO_META,
        sections: PORTFOLIO_SECTIONS,
      } as unknown as PageLike)
      console.log(`[${site.id}] Dodaję nową stronę portfolio na pozycji ${insertAt}.`)
    }

    model.pages = pages

    await prisma.site.update({
      where: { id: site.id },
      data:  { model: JSON.stringify(model) },
    })

    // Weryfikacja po zapisie
    const modelAfter    = JSON.parse((await prisma.site.findUnique({ where: { id: site.id } }))!.model as string) as SiteModelLike
    const portfolioAfter = modelAfter.pages?.find(p => p.slug === 'portfolio') as (PageLike & { sections?: SectionLike[] }) | undefined

    console.log(`[${site.id}] ZMIGROWANO`)
    console.log(`  portfolio dodany:          ${portfolioAfter !== undefined ? 'TAK' : 'NIE <- BLAD'}`)
    console.log(`  portfolio-grid istnieje:   ${portfolioAfter?.sections?.some(s => s.id === 'portfolio-grid') ? 'TAK' : 'NIE <- BLAD'}`)
    console.log(`  portfolio.sections.length: ${portfolioAfter?.sections?.length ?? 0}`)
    console.log(`  liczba stron:              ${modelAfter.pages?.length ?? 0}`)
    console.log()
  }

  console.log('Migracja zakończona.')
}

main().catch(console.error).finally(() => prisma.$disconnect())
