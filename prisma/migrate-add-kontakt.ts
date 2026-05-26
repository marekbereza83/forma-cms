/**
 * Migracja: dodaje stronę kontakt do istniejących rekordów Site.
 *
 * Bezpieczna i idempotentna:
 * - jeśli strona 'kontakt' już istnieje — pomija rekord
 * - NIE dotyka istniejącej strony 'index' ani żadnych pól użytkownika
 *
 * Uruchamiaj jawnie: npm run migrate:add-kontakt
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

type PageLike = { slug: string }
type SiteModelLike = {
  pages?: PageLike[]
}

const KONTAKT_PAGE = {
  slug: 'kontakt',
  meta: {
    title: 'Kontakt — zamów wycenę | FORMA',
    description: 'Zamów wycenę strony dla kancelarii prawnej. Odpowiadam w ciągu 24h. Strona gotowa w 14 dni od briefu. Od 4 500 zł netto.',
    canonical: 'https://formawiz.pl/kontakt.html',
    ogTitle: 'Kontakt — zamów wycenę | FORMA',
    ogDescription: 'Zamów wycenę strony dla kancelarii prawnej. Odpowiadam w ciągu 24h.',
    ogUrl: 'https://formawiz.pl/kontakt.html',
  },
  sections: [
    {
      id: 'nav',
      recipe: 'A1',
      fields: {
        logoText:    { type: 'text',    value: 'Forma Wizerunku', editable: false },
        phoneRaw:    { type: 'contact', value: '+48500100200',    editable: false },
        phoneDisplay:{ type: 'contact', value: '+48 500 100 200', editable: false },
        ctaLabel:    { type: 'cta',     value: 'Zamów stronę', editable: false },
      },
    },
    {
      id: 'kontakt-hero',
      recipe: 'K0',
      fields: {
        tag:      { type: 'text',     value: 'Kontakt',                                      editable: false },
        headline: { type: 'text',     value: 'Porozmawiajmy o Twojej kancelarii',             editable: true  },
        body:     { type: 'richtext', value: 'Wypełnij formularz i opisz swoje potrzeby. Odpisuję osobiście w ciągu 24 godzin. Bez sprzedażowego nacisku — najpierw porozmawiajmy, czy mogę Ci faktycznie pomóc.', editable: true },
      },
    },
    {
      id: 'formularz',
      recipe: 'K1',
      fields: {
        emailDisplay: { type: 'contact', value: 'kontakt@formawiz.pl',       editable: false },
        emailHref:    { type: 'contact', value: 'mailto:kontakt@formawiz.pl', editable: false },
        phoneRaw:     { type: 'contact', value: '+48500100200',               editable: false },
        phoneDisplay: { type: 'contact', value: '+48 500 100 200',            editable: false },
      },
    },
    {
      id: 'footer',
      recipe: 'A9',
      fields: {
        logoText:    { type: 'text',    value: 'Forma Wizerunku',           editable: false },
        phoneRaw:    { type: 'contact', value: '+48500100200',              editable: true  },
        phoneDisplay:{ type: 'contact', value: '+48 500 100 200',           editable: true  },
        email:       { type: 'contact', value: 'kontakt@formawizerunku.pl', editable: true  },
        links: {
          type: 'list',
          value: [
            { label: 'Portfolio',            href: 'portfolio.html'    },
            { label: 'Jak pracuję',     href: 'proces.html'       },
            { label: 'Kontakt',              href: 'kontakt.html'      },
            { label: 'Polityka prywatności', href: 'privacy-policy.html' },
            { label: 'Nota prawna',          href: 'legal-notice.html' },
          ],
          editable: false,
        },
        copyright: { type: 'text', value: '© 2026 Forma Wizerunku. Wszelkie prawa zastrzeżone.', editable: false },
      },
    },
  ],
}

async function main() {
  const sites = await prisma.site.findMany()
  console.log(`Znaleziono ${sites.length} site(ów).\n`)

  for (const site of sites) {
    const model = JSON.parse(site.model as string) as SiteModelLike
    const pages = model.pages ?? []

    if (pages.some(p => p.slug === 'kontakt')) {
      console.log(`[${site.id}] POMINIĘTO: strona kontakt już istnieje.`)
      continue
    }

    const indexPage = pages.find(p => p.slug === 'index')
    const indexHeadlineBefore = (indexPage as Record<string, unknown> | undefined)

    pages.push(KONTAKT_PAGE as unknown as PageLike)
    model.pages = pages

    await prisma.site.update({
      where: { id: site.id },
      data:  { model: JSON.stringify(model) },
    })

    // Weryfikacja: strona index nienaruszona
    const modelAfter = JSON.parse(
      (await prisma.site.findUnique({ where: { id: site.id } }))!.model as string
    ) as SiteModelLike
    const indexAfter = modelAfter.pages?.find(p => p.slug === 'index')
    const kontaktAdded = modelAfter.pages?.some(p => p.slug === 'kontakt')

    console.log(`[${site.id}] ZMIGROWANO: dodano stronę kontakt`)
    console.log(`  index zachowany:    ${indexAfter !== undefined ? 'TAK' : 'NIE ← BŁĄD'}`)
    console.log(`  kontakt dodany:     ${kontaktAdded ? 'TAK' : 'NIE ← BŁĄD'}`)
    console.log(`  liczba stron:       ${modelAfter.pages?.length ?? 0}`)
    console.log()

    void indexHeadlineBefore
  }

  console.log('Migracja zakończona.')
}

main().catch(console.error).finally(() => prisma.$disconnect())
