/**
 * Migracja: dodaje pustą stronę-stub "publikacje" do model.pages w istniejących
 * rekordach Site, zeby "Publikacje" pojawilo sie w nawigacji (navPages buduje sie
 * z model.pages filtrowanych po navLabel — patrz renderer/shell.ts).
 *
 * Strona MA sections: [] celowo — obie faktyczne strony publikacji (lista +
 * pojedynczy artykul) sa generowane osobno przez renderer/publikacje.ts i
 * zapisywane przy eksporcie jako publikacje.html / publikacje/<slug>.html, a nie
 * przez zwykla petle po model.pages (ktora pomija strony z pustymi sections).
 *
 * Bezpieczna i idempotentna:
 * - sprawdza ZAWARTOŚĆ: czy strona o slug 'publikacje' juz istnieje
 * - jesli tak — pomija rekord bez zmian
 * - jesli nie — wstawia stub miedzy 'proces' a 'kontakt' (kolejnosc w nav)
 *
 * Backup dev.db tworzony PRZED pierwsza zmiana (tylko raz, jesli cokolwiek wymaga update).
 *
 * Uruchamiaj jawnie: npx tsx prisma/migrate-add-publikacje-page.ts
 */
import { PrismaClient } from '@prisma/client'
import { copyFileSync, existsSync } from 'fs'
import { resolve } from 'path'

const prisma = new PrismaClient()

type PageLike = { slug: string; navLabel?: string; sections?: unknown[] }
type SiteModelLike = { pages?: PageLike[] }

async function main() {
  const sites = await prisma.site.findMany()
  console.log(`Znaleziono ${sites.length} site(ów).\n`)

  let backupDone = false

  for (const site of sites) {
    const model = JSON.parse(site.model as string) as SiteModelLike
    const pages = model.pages ?? []

    const hasPublikacje = pages.some(p => p.slug === 'publikacje')

    if (hasPublikacje) {
      console.log(`[${site.id}] POMINIĘTO: strona "publikacje" już istnieje.`)
      continue
    }

    if (!backupDone) {
      const dbPath = resolve(process.cwd(), 'prisma', 'dev.db')
      if (existsSync(dbPath)) {
        const backupPath = `${dbPath}.backup-${Date.now()}`
        copyFileSync(dbPath, backupPath)
        console.log(`Backup: ${backupPath}`)
      }
      backupDone = true
    }

    // Wstaw miedzy 'proces' a 'kontakt', zeby kolejnosc w nav pasowala do designu
    // (Portfolio, Jak pracuję, Publikacje, Kontakt). Jesli ktoregos brak — na koniec.
    const kontaktIdx = pages.findIndex(p => p.slug === 'kontakt')
    const insertAt = kontaktIdx >= 0 ? kontaktIdx : pages.length
    pages.splice(insertAt, 0, { slug: 'publikacje', navLabel: 'Publikacje', sections: [] })
    console.log(`[${site.id}] Dodaję stub strony "publikacje" na pozycji ${insertAt}.`)

    model.pages = pages

    await prisma.site.update({
      where: { id: site.id },
      data:  { model: JSON.stringify(model) },
    })

    const modelAfter = JSON.parse((await prisma.site.findUnique({ where: { id: site.id } }))!.model as string) as SiteModelLike
    const added = modelAfter.pages?.some(p => p.slug === 'publikacje')
    console.log(`[${site.id}] ZMIGROWANO — strona "publikacje" dodana: ${added ? 'TAK' : 'NIE <- BLAD'}`)
    console.log()
  }

  console.log('Migracja zakończona.')
}

main().catch(console.error).finally(() => prisma.$disconnect())
