/**
 * Migracja: dodaje stronę strony-dla-kancelarii-prawnych do istniejących rekordów Site.
 *
 * Bezpieczna i idempotentna:
 * - jeśli strona już istnieje — pomija cały rekord
 *
 * Uwaga: link do tej strony w stopce jest hardcoded w rendererze (footer.ts),
 * nie ma potrzeby modyfikowania pola footer.links w tej migracji.
 *
 * Uruchamiaj jawnie: npm run migrate:add-seo-kancelarie
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

type Field = { type: string; value: unknown; editable: boolean }
type Section = { id: string; recipe: string; fields: Record<string, Field> }
type PageMeta = { title?: string; description?: string; canonical?: string; ogTitle?: string; ogDescription?: string; ogUrl?: string; variant?: string }
type PageLike = { slug: string; meta?: PageMeta; navLabel?: string; sections?: Section[] }
type SiteModelLike = { pages?: PageLike[] }

const SEO_PAGE: PageLike = {
  slug: 'strony-dla-kancelarii-prawnych',
  meta: {
    title: 'Strony internetowe dla kancelarii prawnych | FORMA',
    description: 'Projektuję strony internetowe dla kancelarii prawnych. Stały termin 14 dni, jawna cena od 4 500 zł netto, płatność po dostarczeniu. Bez agencji, bez szablonów.',
    canonical: 'https://formawizerunku.pl/strony-dla-kancelarii-prawnych',
    ogTitle: 'Strony internetowe dla kancelarii prawnych | FORMA',
    ogDescription: 'Projektuję strony dla kancelarii prawnych. System PACTA. 14 dni. Od 4 500 zł netto.',
    ogUrl: 'https://formawizerunku.pl/strony-dla-kancelarii-prawnych',
  },
  sections: [
    {
      id: 'nav',
      recipe: 'A1',
      fields: {
        logoText: { type: 'text', value: 'Forma Wizerunku', editable: false },
        ctaLabel:  { type: 'cta',  value: 'Zamów stronę',   editable: false },
      },
    },
    { id: 'seo-kancelarie', recipe: 'S1', fields: {} as Record<string, Field> },
  ],
}

async function main() {
  const sites = await prisma.site.findMany()
  console.log(`Znaleziono ${sites.length} site(ów).\n`)

  for (const site of sites) {
    const model = JSON.parse(site.model as string) as SiteModelLike
    const pages = model.pages ?? []

    // Strona SEO jest marką FORMA — dodajemy tylko do forma-production, nie do klientów.
    const siteMeta = model.meta as Record<string, string> | undefined
    if (!siteMeta?.canonical?.includes('formawizerunku.pl')) {
      console.log(`[${site.id}] POMINIĘTO: nie jest tenant forma-production (canonical: ${siteMeta?.canonical ?? 'brak'})`)
      continue
    }

    if (pages.some(p => p.slug === 'strony-dla-kancelarii-prawnych')) {
      console.log(`[${site.id}] POMINIĘTO: strona strony-dla-kancelarii-prawnych już istnieje.`)
      continue
    }

    // Sklonuj stopkę z ostatniej strony mającej footer
    const pagesWithFooter = pages.filter(p => p.sections?.some(s => s.id === 'footer'))
    const footerTemplate   = pagesWithFooter.at(-1)?.sections?.find(s => s.id === 'footer')

    const seoPage = structuredClone(SEO_PAGE) as PageLike
    if (footerTemplate) {
      seoPage.sections = [...(seoPage.sections ?? []), structuredClone(footerTemplate)]
    }

    // Wstaw przed stroną 404
    const idx404 = pages.findIndex(p => p.slug === '404')
    const insertAt = idx404 >= 0 ? idx404 : pages.length
    pages.splice(insertAt, 0, seoPage)
    model.pages = pages

    await prisma.site.update({
      where: { id: site.id },
      data:  { model: JSON.stringify(model) },
    })

    const after = JSON.parse(
      (await prisma.site.findUnique({ where: { id: site.id } }))!.model as string
    ) as SiteModelLike

    console.log(`[${site.id}] ZMIGROWANO`)
    console.log(`  seo-kancelarie dodana:  ${after.pages?.some(p => p.slug === 'strony-dla-kancelarii-prawnych') ? 'TAK' : 'NIE ← BŁĄD'}`)
    console.log(`  liczba stron:           ${after.pages?.length ?? 0}`)
    console.log()
  }

  console.log('Migracja zakończona.')
}

main().catch(console.error).finally(() => prisma.$disconnect())
