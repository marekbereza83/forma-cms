/**
 * Migracja: naprawia błędną/niespójną domenę w zapisanym modelu Site.
 *
 * Problem: produkcyjna baza została zaseedowana ze starym adresem `formawiz.pl`
 * (literówka/skrót) oraz miejscami z wariantem `www.formawizerunku.pl`. Fixture
 * został już poprawiony (commit 9180185), ale seed jest "update-skipping", więc
 * istniejące rekordy nigdy nie dostały poprawki. Skutek: sitemap.xml, canonical,
 * og:url i schema.org wskazują na nieistniejącą domenę.
 *
 * Ta migracja podmienia w całym JSON modelu:
 *   www.formawizerunku.pl  → formawizerunku.pl   (ujednolicenie www -> non-www)
 *   formawiz.pl            → formawizerunku.pl    (naprawa skróconej domeny)
 *
 * Bezpieczna i idempotentna: po pierwszym przebiegu kolejne nie znajdują już
 * żadnych wystąpień. `formawiz.pl` NIE jest podłańcuchem `formawizerunku.pl`
 * (po "formawiz" następuje "e..."), więc nie ma podwójnej podmiany.
 *
 * Uruchamiaj jawnie: npm run migrate:fix-domain
 * UWAGA: ustaw DATABASE_URL na produkcyjną bazę przed uruchomieniem.
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const CANONICAL_HOST = 'formawizerunku.pl'

function fixDomains(json: string): { fixed: string; wwwCount: number; shortCount: number } {
  const wwwCount = (json.match(/www\.formawizerunku\.pl/g) ?? []).length
  // formawiz.pl jako samodzielna domena (po "formawiz" kropka, nie "erunku")
  const shortCount = (json.match(/formawiz\.pl/g) ?? []).length
  const fixed = json
    .replace(/www\.formawizerunku\.pl/g, CANONICAL_HOST)
    .replace(/formawiz\.pl/g, CANONICAL_HOST)
  return { fixed, wwwCount, shortCount }
}

async function main() {
  const sites = await prisma.site.findMany()
  console.log(`Znaleziono ${sites.length} site(ów).\n`)

  for (const site of sites) {
    const before = site.model as string
    const { fixed, wwwCount, shortCount } = fixDomains(before)

    if (wwwCount === 0 && shortCount === 0) {
      console.log(`[${site.id}] POMINIĘTO: brak wystąpień do naprawy.`)
      continue
    }

    await prisma.site.update({
      where: { id: site.id },
      data:  { model: fixed },
    })

    // Weryfikacja: po zapisie nie ma już złych domen
    const after = (await prisma.site.findUnique({ where: { id: site.id } }))!.model as string
    const remainingWww   = (after.match(/www\.formawizerunku\.pl/g) ?? []).length
    const remainingShort = (after.match(/formawiz\.pl/g) ?? []).length

    console.log(`[${site.id}] ZMIGROWANO:`)
    console.log(`  www.formawizerunku.pl naprawiono:  ${wwwCount}`)
    console.log(`  formawiz.pl naprawiono:            ${shortCount}`)
    console.log(`  pozostałe złe (powinno 0):         www=${remainingWww} short=${remainingShort}${(remainingWww || remainingShort) ? ' ← BŁĄD' : ''}`)
    console.log()
  }

  console.log('Migracja zakończona.')
}

main().catch(console.error).finally(() => prisma.$disconnect())
