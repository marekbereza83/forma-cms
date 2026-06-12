/**
 * Migracja: navLabel strony proces "Jak pracuje" -> "Jak <spacja><NBSP>pracuje"
 * (spacja + NBSP = podwojny, niezwijany odstep w nawigacji).
 *
 * Bezpieczna i idempotentna - dopasowuje obie historyczne formy
 * (pojedyncza spacja, pojedynczy NBSP), pomija juz zmigrowane.
 *
 * Literaly budowane z fromCharCode, zeby w zrodle nie bylo niewidzialnych
 * znakow (NBSP vs spacja sa nieodroznialne w edytorze).
 *
 * Uruchamiaj jawnie: npm run migrate:nav-label-spacing
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const NBSP = String.fromCharCode(0x00a0)
const E_OGONEK = String.fromCharCode(0x0119) // ę

const TARGET = 'Jak ' + NBSP + 'pracuj' + E_OGONEK
const OLD_FORMS = [
  'Jak pracuj' + E_OGONEK,        // pojedyncza zwykla spacja (stan w DB)
  'Jak' + NBSP + 'pracuj' + E_OGONEK, // pojedynczy NBSP (przejsciowy stan fixture z 12.06)
]

async function main() {
  const sites = await prisma.site.findMany()
  console.log(`Znaleziono ${sites.length} site(ow).\n`)

  for (const site of sites) {
    const model = JSON.parse(site.model as string) as { pages?: { slug: string; navLabel?: string }[] }
    let changed = false

    for (const page of model.pages ?? []) {
      if (page.navLabel !== undefined && OLD_FORMS.includes(page.navLabel)) {
        page.navLabel = TARGET
        changed = true
        console.log(`  [${site.id.slice(-6)}] ${page.slug}.navLabel -> "Jak <spacja><NBSP>pracuj${E_OGONEK}"`)
      }
    }

    if (changed) {
      await prisma.site.update({
        where: { id: site.id },
        data:  { model: JSON.stringify(model) },
      })
    } else {
      console.log(`  [${site.id.slice(-6)}] brak zmian`)
    }
  }

  console.log('\nMigracja zakonczona.')
}

main().catch(console.error).finally(() => prisma.$disconnect())
