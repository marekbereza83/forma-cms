/**
 * Migracja: zmienia nagłówek sekcji portfolio na stronie index.
 * "Case study" → "Jak może wyglądać Twoja strona"
 * Usuwa też sectionLabel "Realizacje" (teraz hardcoded jako pusty — label usunięty z renderera).
 *
 * Idempotentna: jeśli wartość już jest docelowa, pomija.
 * Uruchamiaj: npx tsx prisma/migrate-portfolio-heading.ts
 */
import { PrismaClient } from '@prisma/client'

const OLD_VALUE = 'Case study'
const NEW_VALUE = 'Jak może wyglądać Twoja strona'

const prisma = new PrismaClient()

async function main() {
  const sites = await prisma.site.findMany()
  console.log(`Znaleziono ${sites.length} site(ów).\n`)

  for (const site of sites) {
    const model = JSON.parse(site.model as string) as {
      pages: Array<{ slug: string; sections: Array<{ id: string; fields: Record<string, { value: unknown }> }> }>
    }

    const indexPage = model.pages.find(p => p.slug === 'index')
    if (!indexPage) {
      console.log(`[${site.id}] POMINIĘTO: brak strony index`)
      continue
    }

    const portfolioSection = indexPage.sections.find(s => s.id === 'portfolio')
    if (!portfolioSection) {
      console.log(`[${site.id}] POMINIĘTO: brak sekcji portfolio na index`)
      continue
    }

    const headlineField = portfolioSection.fields['headline']
    if (!headlineField) {
      console.log(`[${site.id}] POMINIĘTO: brak pola headline w portfolio`)
      continue
    }

    if (headlineField.value === NEW_VALUE) {
      console.log(`[${site.id}] POMINIĘTO: headline już ma docelową wartość`)
      continue
    }

    const prev = headlineField.value
    headlineField.value = NEW_VALUE

    await prisma.site.update({ where: { id: site.id }, data: { model: JSON.stringify(model) } })
    console.log(`[${site.id}] ZMIGROWANO: "${prev}" → "${NEW_VALUE}" ✓`)
  }

  console.log('\nMigracja zakończona.')
}

main().catch(console.error).finally(() => prisma.$disconnect())
