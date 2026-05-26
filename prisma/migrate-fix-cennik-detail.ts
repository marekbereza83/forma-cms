/**
 * Migracja: usuwa własne pola price (standard, extended) z sekcji cennik-detail
 * na stronie proces — naprawia duplikację ceny wprowadzoną przez migrate-add-proces.
 *
 * PROBLEM: migrate-add-proces wpisała cennik-detail z polami type:price.
 * NAPRAWA: cennik-detail NIE ma własnych pól price — renderer czyta ceny z
 * ctx.indexPricing (index.pricing jako jedyne źródło prawdy).
 *
 * IDEMPOTENTNOŚĆ: sprawdza OBECNOŚĆ pól price w cennik-detail, NIE liczbę sekcji.
 * Ta reguła naprawia lukę migrate-add-proces, która sprawdzała sections.length > 0
 * i pominęła strony już zmigrowane (ale w starej wersji z duplikacją ceny).
 *
 * Bezpieczna:
 * - jeśli cennik-detail już nie ma pól price → POMINIĘTO (idempotentna)
 * - jeśli cennik-detail ma pola price → usuwa je
 * - NIE dotyka index.pricing ani żadnych innych sekcji
 *
 * Uruchamiaj jawnie: npm run migrate:fix-cennik-detail
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

type FieldMap = Record<string, { type: string; value: unknown; editable: boolean }>
type Section   = { id: string; fields: FieldMap }
type PageLike  = { slug: string; sections?: Section[] }
type ModelLike = { pages?: PageLike[] }

async function main() {
  const sites = await prisma.site.findMany()
  console.log(`Znaleziono ${sites.length} site(ów).\n`)

  for (const site of sites) {
    const model = JSON.parse(site.model as string) as ModelLike
    const pages = model.pages ?? []

    const procesPage = pages.find(p => p.slug === 'proces')
    if (!procesPage) {
      console.log(`[${site.id}] POMINIĘTO: brak strony proces.`)
      continue
    }

    const cennik = procesPage.sections?.find(s => s.id === 'cennik-detail')
    if (!cennik) {
      console.log(`[${site.id}] POMINIĘTO: brak sekcji cennik-detail na stronie proces.`)
      continue
    }

    // Idempotency: sprawdzamy OBECNOŚĆ pól price, nie liczbę sekcji
    const priceFieldsBefore = Object.entries(cennik.fields)
      .filter(([, f]) => f.type === 'price')
      .map(([k]) => k)

    if (priceFieldsBefore.length === 0) {
      console.log(`[${site.id}] POMINIĘTO: cennik-detail już nie ma pól price (nowa wersja).`)
      continue
    }

    // Usuń pola price — zostaw tylko sectionHeadline i sectionLead
    const amountsBefore = priceFieldsBefore
      .map(k => `${k}.amount="${(cennik.fields[k].value as { amount: string }).amount}"`)
      .join(', ')

    for (const key of priceFieldsBefore) {
      delete cennik.fields[key]
    }

    console.log(`[${site.id}] Usuwam pola price z cennik-detail: ${priceFieldsBefore.join(', ')}`)
    console.log(`           (przed: ${amountsBefore})`)

    model.pages = pages

    await prisma.site.update({
      where: { id: site.id },
      data:  { model: JSON.stringify(model) },
    })

    // ── Weryfikacja po zapisie ─────────────────────────────────────────────
    const after = JSON.parse(
      (await prisma.site.findUnique({ where: { id: site.id } }))!.model as string
    ) as ModelLike

    const indexAfter  = after.pages?.find(p => p.slug === 'index')
    const procesAfter = after.pages?.find(p => p.slug === 'proces')
    const cennikAfter = procesAfter?.sections?.find(s => s.id === 'cennik-detail')

    const priceFieldsAfter = cennikAfter
      ? Object.entries(cennikAfter.fields).filter(([, f]) => f.type === 'price').map(([k]) => k)
      : []

    const indexPricingAfter = indexAfter?.sections?.find(s => s.id === 'pricing')
    const indexStdAmount = (indexPricingAfter?.fields?.['standard']?.value as { amount?: string })?.amount

    console.log(`[${site.id}] ZMIGROWANO`)
    console.log(`  index.pricing nienaruszony:     ${indexPricingAfter !== undefined ? 'TAK' : 'NIE ← BŁĄD'}`)
    console.log(`  index.pricing.standard.amount:  ${indexStdAmount ?? '(brak) ← BŁĄD'}`)
    console.log(`  cennik-detail pola price po:    ${priceFieldsAfter.length === 0 ? '(brak) ✓' : priceFieldsAfter.join(', ') + ' ← BŁĄD'}`)
    console.log(`  cennik-detail pozostałe pola:   ${cennikAfter ? Object.keys(cennikAfter.fields).join(', ') : '(brak sekcji) ← BŁĄD'}`)
    console.log()
  }

  console.log('Migracja zakończona.')
}

main().catch(console.error).finally(() => prisma.$disconnect())
