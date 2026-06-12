/**
 * Migracja: dodaje pola reassurance1/2/3 do sekcji formularz na stronie kontakt
 * oraz ustawia faq.items editable:true na stronie proces (sync z DB).
 *
 * Bezpieczna i idempotentna — pomija pola które już istnieją.
 *
 * Uruchamiaj jawnie: npm run migrate:add-reassurance-fields
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const REASSURANCE_DEFAULTS = {
  reassurance1: { type: 'text', value: 'Odpowiadam osobiście — bez automatycznych odpowiedzi',  editable: true },
  reassurance2: { type: 'text', value: 'Wstępna wycena bezpłatnie, w ciągu 24 godzin',          editable: true },
  reassurance3: { type: 'text', value: 'Specjalizuję się wyłącznie w stronach dla kancelarii prawnych', editable: true },
}

async function main() {
  const sites = await prisma.site.findMany()
  console.log(`Znaleziono ${sites.length} site(ów).\n`)

  for (const site of sites) {
    const model = JSON.parse(site.model as string) as any
    let changed = false

    for (const page of model.pages ?? []) {
      // 1. reassurance1/2/3 na kontakt.formularz
      if (page.slug === 'kontakt') {
        for (const section of page.sections ?? []) {
          if (section.id !== 'formularz') continue
          for (const [key, def] of Object.entries(REASSURANCE_DEFAULTS)) {
            if (!(key in section.fields)) {
              section.fields[key] = def
              changed = true
              console.log(`  [${site.id.slice(-6)}] dodano kontakt.formularz.${key}`)
            }
          }
        }
      }

      // 2. faq.items editable:true na proces (sync fixture z DB)
      if (page.slug === 'proces') {
        for (const section of page.sections ?? []) {
          if (section.id !== 'faq') continue
          if (section.fields['items'] && section.fields['items'].editable === false) {
            section.fields['items'].editable = true
            changed = true
            console.log(`  [${site.id.slice(-6)}] faq.items → editable:true`)
          }
        }
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

  console.log('\nMigracja zakończona.')
}

main().catch(console.error).finally(() => prisma.$disconnect())
