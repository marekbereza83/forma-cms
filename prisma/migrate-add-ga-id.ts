/**
 * Migracja: dodaje gaId do model.meta dla tenanta formawizerunku.pl.
 *
 * gaId jest opcjonalny w SiteMeta — inne tenanty bez GA pozostają niezmienione.
 * Idempotentna: jeśli gaId już istnieje, pomija.
 *
 * Uruchamiaj: npm run migrate:add-ga-id
 */
import { PrismaClient } from '@prisma/client'

const GA_ID = 'G-09K5CT4T7H'
const CANONICAL_HOST = 'formawizerunku.pl'

const prisma = new PrismaClient()

async function main() {
  const sites = await prisma.site.findMany()
  console.log(`Znaleziono ${sites.length} site(ów).\n`)

  for (const site of sites) {
    const model = JSON.parse(site.model as string) as { meta: Record<string, unknown> }

    const canonical = String(model.meta?.canonical ?? '')
    if (!canonical.includes(CANONICAL_HOST)) {
      console.log(`[${site.id}] POMINIĘTO: nie jest tenantem formawizerunku.pl (canonical: ${canonical})`)
      continue
    }

    if (model.meta.gaId) {
      console.log(`[${site.id}] POMINIĘTO: gaId już istnieje (${model.meta.gaId})`)
      continue
    }

    model.meta.gaId = GA_ID
    await prisma.site.update({ where: { id: site.id }, data: { model: JSON.stringify(model) } })

    const after = JSON.parse((await prisma.site.findUnique({ where: { id: site.id } }))!.model as string)
    console.log(`[${site.id}] ZMIGROWANO: gaId = ${after.meta.gaId}${after.meta.gaId === GA_ID ? ' ✓' : ' ← BŁĄD'}`)
  }

  console.log('\nMigracja zakończona.')
}

main().catch(console.error).finally(() => prisma.$disconnect())
