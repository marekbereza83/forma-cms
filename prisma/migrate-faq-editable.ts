/**
 * Migracja: ustawia editable: true dla pola faq.items w sekcji FAQ
 * na stronie "proces" (jak pracuję).
 *
 * IDEMPOTENTNOŚĆ: jeśli pole już ma editable: true → POMINIĘTO.
 * Można uruchomić wielokrotnie bezpiecznie.
 *
 * Uruchamiaj: npm run migrate:faq-editable
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

type FieldMap = Record<string, { type: string; value: unknown; editable: boolean }>
type Section  = { id: string; fields: FieldMap }
type PageLike = { slug: string; sections?: Section[] }
type ModelLike = { pages?: PageLike[] }

async function main() {
  const sites = await prisma.site.findMany()
  console.log(`=== migrate-faq-editable ===`)
  console.log(`Znaleziono ${sites.length} site(ów).\n`)

  for (const site of sites) {
    const model = JSON.parse(site.model as string) as ModelLike

    const procesPage = model.pages?.find(p => p.slug === 'proces')
    const faqSection = procesPage?.sections?.find(s => s.id === 'faq')

    if (!faqSection) {
      console.log(`[${site.id}] POMINIĘTO: brak sekcji faq na stronie "proces".`)
      continue
    }

    const itemsField = faqSection.fields['items']
    if (!itemsField) {
      console.log(`[${site.id}] POMINIĘTO: brak pola "items" w sekcji faq.`)
      continue
    }

    if (itemsField.editable === true) {
      console.log(`[${site.id}] POMINIĘTO: faq.items już ma editable: true.`)
      continue
    }

    itemsField.editable = true

    await prisma.site.update({
      where: { id: site.id },
      data:  { model: JSON.stringify(model) },
    })

    console.log(`[${site.id}] ZMIGROWANO: faq.items.editable ustawione na true.`)
  }

  console.log('\nMigracja zakończona.')
}

main().catch(console.error).finally(() => prisma.$disconnect())
