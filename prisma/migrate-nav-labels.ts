/**
 * Migracja: dodaje navLabel do stron i wstawia stuby portfolio/proces.
 *
 * Bezpieczna i idempotentna:
 * - jeśli jakakolwiek strona ma już navLabel — pomija rekord
 * - NIE dotyka istniejącej treści stron (index, kontakt)
 *
 * Uruchamiaj jawnie: npm run migrate:nav-labels
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

type PageLike = { slug: string; navLabel?: string; [key: string]: unknown }
type SiteModelLike = { pages?: PageLike[] }

const PORTFOLIO_STUB: PageLike = { slug: 'portfolio', navLabel: 'Portfolio',   sections: [] }
const PROCES_STUB:    PageLike = { slug: 'proces',    navLabel: 'Jak pracuję', sections: [] }

async function main() {
  const sites = await prisma.site.findMany()
  console.log(`Znaleziono ${sites.length} site(ów).\n`)

  for (const site of sites) {
    const model = JSON.parse(site.model as string) as SiteModelLike
    const pages = model.pages ?? []

    if (pages.some(p => p.navLabel !== undefined)) {
      console.log(`[${site.id}] POMINIĘTO: navLabel już ustawiony.`)
      continue
    }

    const kontaktIdx = pages.findIndex(p => p.slug === 'kontakt')
    if (kontaktIdx === -1) {
      console.log(`[${site.id}] POMINIĘTO: brak strony kontakt — uruchom najpierw migrate:add-kontakt.`)
      continue
    }

    pages[kontaktIdx] = { ...pages[kontaktIdx], navLabel: 'Kontakt' }
    pages.splice(kontaktIdx, 0, { ...PORTFOLIO_STUB }, { ...PROCES_STUB })

    model.pages = pages
    await prisma.site.update({
      where: { id: site.id },
      data:  { model: JSON.stringify(model) },
    })

    const after = JSON.parse(
      (await prisma.site.findUnique({ where: { id: site.id } }))!.model as string
    ) as SiteModelLike

    const indexOK    = after.pages?.some(p => p.slug === 'index')
    const portfolioOK = after.pages?.some(p => p.slug === 'portfolio' && p.navLabel === 'Portfolio')
    const procesOK    = after.pages?.some(p => p.slug === 'proces'    && p.navLabel === 'Jak pracuję')
    const kontaktOK   = after.pages?.some(p => p.slug === 'kontakt'   && p.navLabel === 'Kontakt')

    console.log(`[${site.id}] ZMIGROWANO`)
    console.log(`  index zachowany:    ${indexOK    ? 'TAK' : 'NIE ← BŁĄD'}`)
    console.log(`  portfolio navLabel: ${portfolioOK ? 'TAK' : 'NIE ← BŁĄD'}`)
    console.log(`  proces navLabel:    ${procesOK    ? 'TAK' : 'NIE ← BŁĄD'}`)
    console.log(`  kontakt navLabel:   ${kontaktOK   ? 'TAK' : 'NIE ← BŁĄD'}`)
    console.log(`  liczba stron:       ${after.pages?.length ?? 0}`)
    console.log()
  }

  console.log('Migracja zakończona.')
}

main().catch(console.error).finally(() => prisma.$disconnect())
