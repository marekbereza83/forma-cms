/**
 * Migracja: dodaje stronę 404 do istniejących rekordów Site.
 *
 * Bezpieczna i idempotentna:
 * - jeśli strona '404' już istnieje w modelu — pomija cały rekord
 * - NIE dotyka istniejących stron
 *
 * Uruchamiaj jawnie: npx ts-node prisma/migrate-add-404-page.ts
 *
 * UWAGA: przed uruchomieniem wykonaj backup dev.db:
 *   copy prisma\dev.db "prisma\dev.db.backup-404-$(Get-Date -Format yyyyMMdd-HHmmss)"
 */
import { PrismaClient } from '@prisma/client'
import { copyFileSync, existsSync } from 'fs'
import { resolve } from 'path'

const prisma = new PrismaClient()

type PageLike = { slug: string }
type SiteModelLike = { pages?: PageLike[] }

const NAV_FIELDS = {
  logoText:     { type: 'text',    value: 'Forma Wizerunku',  editable: false },
  phoneRaw:     { type: 'contact', value: '+48500100200',     editable: false },
  phoneDisplay: { type: 'contact', value: '+48 500 100 200',  editable: false },
  ctaLabel:     { type: 'cta',     value: 'Zamów stronę',     editable: false },
}

const FOOTER_FIELDS = {
  logoText:     { type: 'text',    value: 'Forma Wizerunku',           editable: false },
  phoneRaw:     { type: 'contact', value: '+48500100200',              editable: true  },
  phoneDisplay: { type: 'contact', value: '+48 500 100 200',           editable: true  },
  email:        { type: 'contact', value: 'kontakt@formawizerunku.pl', editable: true  },
  links: {
    type: 'list',
    value: [
      { label: 'Portfolio',            href: 'portfolio.html'      },
      { label: 'Jak pracuję',          href: 'proces.html'         },
      { label: 'Kontakt',              href: 'kontakt.html'        },
      { label: 'Polityka prywatności', href: 'privacy-policy.html' },
      { label: 'Nota prawna',          href: 'legal-notice.html'   },
    ],
    editable: false,
  },
  copyright: {
    type: 'text',
    value: '© 2026 Forma Wizerunku. Wszelkie prawa zastrzeżone.',
    editable: false,
  },
}

const PAGE_404 = {
  slug: '404',
  meta: {
    title: '404 — Strona nie istnieje | FORMA',
    description: 'Strona nie znaleziona.',
    canonical: 'https://formawizerunku.pl/404.html',
    ogTitle: '404 — Strona nie istnieje | FORMA',
    ogDescription: 'Strona nie znaleziona.',
    ogUrl: 'https://formawizerunku.pl/404.html',
    variant: '404',
  },
  sections: [
    { id: 'nav',       recipe: 'A1', fields: NAV_FIELDS    },
    { id: 'not-found', recipe: 'E1', fields: {}            },
    { id: 'footer',    recipe: 'A9', fields: FOOTER_FIELDS },
  ],
}

async function main() {
  // ── Backup dev.db ─────────────────────────────────────────────────────────────
  const dbPath    = resolve(process.cwd(), 'prisma', 'dev.db')
  const backupPath = resolve(process.cwd(), 'prisma', `dev.db.backup-404-${Date.now()}`)
  if (existsSync(dbPath)) {
    copyFileSync(dbPath, backupPath)
    console.log(`Backup zapisany: ${backupPath}\n`)
  }

  const sites = await prisma.site.findMany()
  console.log(`Znaleziono ${sites.length} site(ów).\n`)

  for (const site of sites) {
    const model = JSON.parse(site.model as string) as SiteModelLike
    const pages = model.pages ?? []

    if (pages.some(p => p.slug === '404')) {
      console.log(`[${site.id}] POMINIĘTO: strona 404 już istnieje.`)
      continue
    }

    pages.push(PAGE_404 as unknown as PageLike)
    model.pages = pages

    await prisma.site.update({
      where: { id: site.id },
      data:  { model: JSON.stringify(model) },
    })

    // ── Weryfikacja ───────────────────────────────────────────────────────────
    const modelAfter = JSON.parse(
      (await prisma.site.findUnique({ where: { id: site.id } }))!.model as string
    ) as SiteModelLike

    const added404    = modelAfter.pages?.some(p => p.slug === '404')
    const indexOk     = modelAfter.pages?.some(p => p.slug === 'index')
    const kontaktOk   = modelAfter.pages?.some(p => p.slug === 'kontakt')
    const legalOk     = modelAfter.pages?.some(p => p.slug === 'legal-notice')
    const privacyOk   = modelAfter.pages?.some(p => p.slug === 'privacy-policy')

    console.log(`[${site.id}] ZMIGROWANO: dodano stronę 404`)
    console.log(`  index zachowany:           ${indexOk    ? 'TAK' : 'NIE ← BŁĄD'}`)
    console.log(`  kontakt zachowany:         ${kontaktOk  ? 'TAK' : 'NIE ← BŁĄD'}`)
    console.log(`  legal-notice zachowany:    ${legalOk    ? 'TAK' : 'NIE ← BŁĄD'}`)
    console.log(`  privacy-policy zachowany:  ${privacyOk  ? 'TAK' : 'NIE ← BŁĄD'}`)
    console.log(`  404 dodany:                ${added404   ? 'TAK' : 'NIE ← BŁĄD'}`)
    console.log(`  liczba stron:              ${modelAfter.pages?.length ?? 0}`)
    console.log()
  }

  console.log('Migracja zakończona.')
}

main().catch(console.error).finally(() => prisma.$disconnect())
