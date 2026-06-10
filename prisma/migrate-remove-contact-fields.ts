/**
 * Migracja: usuwa zduplikowane pola kontaktu (phoneRaw, phoneDisplay, email,
 * emailDisplay, emailHref) z fields każdej sekcji — wszystkich pages, wszystkich Site.
 *
 * PROBLEM: telefon i e-mail były przechowywane osobno w sekcjach nav, hero,
 * cta-finale, footer, formularz (do 17 kopii per tenant). Po refaktorze
 * single-source (2026-06-10) jedynym źródłem prawdy jest meta.contactPhone
 * i meta.contactEmail — renderer czyta stamtąd przez ctx.
 *
 * IDEMPOTENTNOŚĆ: sprawdza OBECNOŚĆ pól kontaktu w sekcjach. Jeśli żadne
 * nie istnieje → POMINIĘTO. Można uruchomić wielokrotnie bezpiecznie.
 *
 * META FALLBACK: jeśli meta.contactPhone / meta.contactEmail nie są ustawione,
 * uzupełnia je z wartości znalezionych w sekcjach przed usunięciem.
 * Ostateczny fallback (gdy sekcje też puste): wartości z fixture produkcyjnego.
 *
 * BACKUP: skrypt działa bezpośrednio na DATABASE_URL z .env.
 * Przed uruchomieniem na Supabase (produkcja) wykonaj ręcznie backup:
 *   Supabase Dashboard → Settings → Database → Backups → "Download backup"
 *   lub: pg_dump $DATABASE_URL > backup-pre-migration.sql
 *
 * Uruchamiaj jawnie: npm run migrate:remove-contact-fields
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

type FieldMap = Record<string, { type: string; value: unknown; editable: boolean }>
type Section  = { id: string; fields: FieldMap }
type PageLike = { slug: string; sections?: Section[] }
type MetaLike = { contactPhone?: string; contactPhoneDisplay?: string; contactEmail?: string; [key: string]: unknown }
type ModelLike = { meta?: MetaLike; pages?: PageLike[] }

const CONTACT_FIELDS_BY_SECTION: Record<string, string[]> = {
  'nav':       ['phoneRaw', 'phoneDisplay'],
  'hero':      ['phoneRaw', 'phoneDisplay'],
  'cta-finale':['phoneRaw', 'phoneDisplay'],
  'footer':    ['phoneRaw', 'phoneDisplay', 'email'],
  'formularz': ['phoneRaw', 'phoneDisplay', 'emailDisplay', 'emailHref'],
}

// Fallback values from the production fixture (used only if DB has no phone/email at all)
const FIXTURE_PHONE         = '+48668902855'
const FIXTURE_PHONE_DISPLAY = '+48 668 902 855'
const FIXTURE_EMAIL         = 'kontakt@formawizerunku.pl'

function formatPhoneDisplay(raw: string): string {
  const m = raw.replace(/\s/g, '').match(/^(\+48)(\d{3})(\d{3})(\d{3})$/)
  return m ? `${m[1]} ${m[2]} ${m[3]} ${m[4]}` : raw
}

async function main() {
  const dbUrl = process.env.DATABASE_URL ?? ''
  const isLocal = dbUrl.startsWith('file:') || dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1')

  console.log('=== migrate-remove-contact-fields ===')
  if (isLocal) {
    console.log('Środowisko: DEV (lokalny SQLite / localhost)')
    console.log('Tip: przed uruchomieniem na produkcji wykonaj backup Supabase.\n')
  } else {
    console.log('Środowisko: PRODUKCJA (zdalny host wykryty w DATABASE_URL)')
    console.log('⚠  Upewnij się że masz backup bazy przed kontynuowaniem.')
    console.log('   Supabase → Settings → Database → Backups → Download backup')
    console.log('   lub: pg_dump $DATABASE_URL > backup-pre-migration.sql\n')
  }

  const sites = await prisma.site.findMany()
  console.log(`Znaleziono ${sites.length} site(ów).\n`)

  for (const site of sites) {
    const model = JSON.parse(site.model as string) as ModelLike
    const pages = model.pages ?? []
    const meta  = model.meta ?? {}

    // ── Skanuj sekcje: zbierz wartości kontaktu i sprawdź czy jest co usuwać ──
    let foundPhone: string | undefined
    let foundEmail: string | undefined
    let totalRemoved = 0

    for (const page of pages) {
      for (const sec of page.sections ?? []) {
        const toDrop = CONTACT_FIELDS_BY_SECTION[sec.id]
        if (!toDrop) continue

        for (const key of toDrop) {
          if (!(key in sec.fields)) continue

          // Capture first non-empty phone/email before deleting
          if ((key === 'phoneRaw') && !foundPhone) {
            const val = sec.fields[key]?.value
            if (typeof val === 'string' && val.trim()) foundPhone = val.trim()
          }
          if ((key === 'email' || key === 'emailDisplay') && !foundEmail) {
            const val = sec.fields[key]?.value
            if (typeof val === 'string' && val.trim()) foundEmail = val.trim()
          }

          delete sec.fields[key]
          totalRemoved++
        }
      }
    }

    // ── Idempotency: nothing to remove ────────────────────────────────────────
    if (totalRemoved === 0) {
      console.log(`[${site.id}] POMINIĘTO: brak pól kontaktu w sekcjach (już zmigrowane).`)
      continue
    }

    // ── Uzupełnij meta jeśli brakuje ──────────────────────────────────────────
    const phoneRaw     = meta.contactPhone     ?? foundPhone     ?? FIXTURE_PHONE
    const phoneDisplay = meta.contactPhoneDisplay ?? formatPhoneDisplay(phoneRaw) ?? FIXTURE_PHONE_DISPLAY
    const email        = meta.contactEmail     ?? foundEmail     ?? FIXTURE_EMAIL

    const metaUpdated: string[] = []
    if (!meta.contactPhone)        { meta.contactPhone        = phoneRaw;     metaUpdated.push('contactPhone') }
    if (!meta.contactPhoneDisplay) { meta.contactPhoneDisplay = phoneDisplay; metaUpdated.push('contactPhoneDisplay') }
    if (!meta.contactEmail)        { meta.contactEmail        = email;        metaUpdated.push('contactEmail') }

    model.meta  = meta
    model.pages = pages

    console.log(`[${site.id}] Usuwam ${totalRemoved} pól kontaktu ze wszystkich sekcji.`)
    if (metaUpdated.length > 0) {
      console.log(`           Meta uzupełnione: ${metaUpdated.join(', ')}`)
      console.log(`             contactPhone:        ${phoneRaw}`)
      console.log(`             contactPhoneDisplay: ${phoneDisplay}`)
      console.log(`             contactEmail:        ${email}`)
    } else {
      console.log(`           Meta już zawiera contactPhone/contactEmail — nie zmieniam.`)
    }

    await prisma.site.update({
      where: { id: site.id },
      data:  { model: JSON.stringify(model) },
    })

    // ── Weryfikacja po zapisie ─────────────────────────────────────────────────
    const saved     = JSON.parse(
      (await prisma.site.findUnique({ where: { id: site.id } }))!.model as string
    ) as ModelLike

    let remainingContactFields = 0
    for (const page of saved.pages ?? []) {
      for (const sec of page.sections ?? []) {
        const toDrop = CONTACT_FIELDS_BY_SECTION[sec.id]
        if (!toDrop) continue
        for (const key of toDrop) {
          if (key in sec.fields) remainingContactFields++
        }
      }
    }

    const savedMeta = saved.meta ?? {}
    console.log(`[${site.id}] ZMIGROWANO`)
    console.log(`  Pozostałe pola kontaktu w sekcjach: ${remainingContactFields === 0 ? '(brak) ✓' : remainingContactFields + ' ← BŁĄD'}`)
    console.log(`  meta.contactPhone:        ${savedMeta.contactPhone        ?? '(brak) ← BŁĄD'}`)
    console.log(`  meta.contactPhoneDisplay: ${savedMeta.contactPhoneDisplay ?? '(brak) ← BŁĄD'}`)
    console.log(`  meta.contactEmail:        ${savedMeta.contactEmail        ?? '(brak) ← BŁĄD'}`)
    console.log()
  }

  console.log('Migracja zakończona.')
}

main().catch(console.error).finally(() => prisma.$disconnect())
