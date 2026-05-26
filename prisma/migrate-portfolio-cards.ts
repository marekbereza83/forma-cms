/**
 * Migracja: portfolio.fields.card (obiekt) → portfolio.fields.cards (tablica)
 *
 * Bezpieczna i idempotentna:
 * - tworzy kopię bazy przed zmianami
 * - porównuje hero/pricing przed i po (muszą być identyczne)
 * - drugi przebieg loguje "pominięto, już zmigrowane"
 *
 * NIE uruchamiaj automatycznie — tylko jawnie: npm run migrate:portfolio-cards
 */
import { PrismaClient } from '@prisma/client'
import { copyFileSync, existsSync } from 'fs'
import { resolve } from 'path'

const prisma = new PrismaClient()

const DB_PATH = resolve(__dirname, 'dev.db')
const BACKUP_PATH = resolve(__dirname, `dev.db.backup-${Date.now()}`)

function backupDb() {
  if (!existsSync(DB_PATH)) {
    console.log('INFO: dev.db nie znaleziona (może Postgres?) — pomijam backup pliku.')
    return
  }
  copyFileSync(DB_PATH, BACKUP_PATH)
  console.log(`BACKUP: ${BACKUP_PATH}`)
}

type SiteModel = {
  pages?: Array<{
    slug: string
    sections?: Array<{
      id: string
      fields?: Record<string, unknown>
    }>
  }>
}

function extractVerificationSnapshot(model: SiteModel) {
  const page = model.pages?.find(p => p.slug === 'index')
  const hero = page?.sections?.find(s => s.id === 'hero')
  const pricing = page?.sections?.find(s => s.id === 'pricing')
  return {
    heroHeadline: (hero?.fields?.headline as { value?: string } | undefined)?.value ?? null,
    pricingStandardAmount: (
      (pricing?.fields?.standard as { value?: { amount?: string } } | undefined)?.value
    )?.amount ?? null,
    pricingExtendedAmount: (
      (pricing?.fields?.extended as { value?: { amount?: string } } | undefined)?.value
    )?.amount ?? null,
  }
}

async function main() {
  backupDb()

  const sites = await prisma.site.findMany()
  console.log(`Znaleziono ${sites.length} site(ów) do sprawdzenia.\n`)

  for (const site of sites) {
    const model: SiteModel = JSON.parse(site.model as string)
    const page = model.pages?.find(p => p.slug === 'index')
    const portfolioSection = page?.sections?.find(s => s.id === 'portfolio')

    if (!portfolioSection) {
      console.log(`[${site.id}] POMINIĘTO: brak sekcji portfolio.`)
      continue
    }

    const fields = portfolioSection.fields as Record<string, unknown>

    // Idempotentność: jeśli cards już istnieje — skip
    if (fields.cards !== undefined) {
      console.log(`[${site.id}] POMINIĘTO: już zmigrowane (fields.cards istnieje).`)
      continue
    }

    // Stary format nie istnieje — dane niespójne
    if (fields.card === undefined) {
      console.log(`[${site.id}] POMINIĘTO: brak fields.card i fields.cards — nieznany format.`)
      continue
    }

    // Zapis stanu przed zmianą
    const before = extractVerificationSnapshot(model)

    // Transformacja: card (obiekt) → cards (tablica z jednym elementem)
    const oldCard = fields.card as { type: string; value: unknown; editable: boolean }
    fields.cards = {
      type: 'list',
      value: [oldCard.value],
      editable: oldCard.editable,
    }
    delete fields.card

    // Zapis do bazy
    await prisma.site.update({
      where: { id: site.id },
      data:  { model: JSON.stringify(model) },
    })

    // Weryfikacja po zmianie
    const after = extractVerificationSnapshot(model)

    const heroOk    = before.heroHeadline === after.heroHeadline
    const priceStdOk  = before.pricingStandardAmount === after.pricingStandardAmount
    const priceExtOk  = before.pricingExtendedAmount === after.pricingExtendedAmount
    const allOk     = heroOk && priceStdOk && priceExtOk

    console.log(`[${site.id}] ZMIGROWANO: card → cards (1 element)`)
    console.log(`  hero.headline nietknięty:       ${heroOk    ? 'TAK' : 'NIE ← BŁĄD'}  (${before.heroHeadline})`)
    console.log(`  pricing standard.amount:        ${priceStdOk ? 'TAK' : 'NIE ← BŁĄD'}  (${before.pricingStandardAmount})`)
    console.log(`  pricing extended.amount:        ${priceExtOk ? 'TAK' : 'NIE ← BŁĄD'}  (${before.pricingExtendedAmount})`)
    console.log(`  hero/pricing nietknięte: ${allOk ? 'TAK' : 'NIE ← SPRAWDŹ BACKUP'}`)
    console.log()
  }

  console.log('Migracja zakończona.')
}

main().catch(console.error).finally(() => prisma.$disconnect())
