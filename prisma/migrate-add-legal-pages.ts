/**
 * Migracja: dodaje strony legal-notice i privacy-policy do istniejących rekordów Site.
 *
 * Bezpieczna i idempotentna:
 * - jeśli legal-notice już istnieje — pomija cały rekord
 * - NIE dotyka istniejących stron (index, portfolio, proces, kontakt)
 *
 * Uruchamiaj jawnie: npm run migrate:add-legal-pages
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

type PageLike = { slug: string }
type SiteModelLike = {
  pages?: PageLike[]
}

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
  copyright: { type: 'text', value: '© 2026 Forma Wizerunku. Wszelkie prawa zastrzeżone.', editable: false },
}

const LEGAL_NOTICE_PAGE = {
  slug: 'legal-notice',
  meta: {
    title: 'Nota Prawna | FORMA Wizerunku',
    description: 'Nota prawna serwisu Forma Wizerunku.',
    canonical: 'https://formawiz.pl/legal-notice.html',
    ogTitle: 'Nota Prawna | FORMA Wizerunku',
    ogDescription: 'Nota prawna serwisu Forma Wizerunku.',
    ogUrl: 'https://formawiz.pl/legal-notice.html',
    variant: 'legal',
  },
  sections: [
    { id: 'nav',          recipe: 'A1', fields: NAV_FIELDS },
    { id: 'legal-notice', recipe: 'L1', fields: {}         },
    { id: 'footer',       recipe: 'A9', fields: FOOTER_FIELDS },
  ],
}

const PRIVACY_POLICY_PAGE = {
  slug: 'privacy-policy',
  meta: {
    title: 'Polityka Prywatności | FORMA Wizerunku',
    description: 'Polityka prywatnosci serwisu Forma Wizerunku.',
    canonical: 'https://formawiz.pl/privacy-policy.html',
    ogTitle: 'Polityka Prywatnosci | FORMA Wizerunku',
    ogDescription: 'Polityka prywatnosci serwisu Forma Wizerunku.',
    ogUrl: 'https://formawiz.pl/privacy-policy.html',
    variant: 'legal',
  },
  sections: [
    { id: 'nav',            recipe: 'A1', fields: NAV_FIELDS    },
    { id: 'privacy-policy', recipe: 'L2', fields: {}            },
    { id: 'footer',         recipe: 'A9', fields: FOOTER_FIELDS },
  ],
}

async function main() {
  const sites = await prisma.site.findMany()
  console.log(`Znaleziono ${sites.length} site(ów).\n`)

  for (const site of sites) {
    const model = JSON.parse(site.model as string) as SiteModelLike
    const pages = model.pages ?? []

    if (pages.some(p => p.slug === 'legal-notice')) {
      console.log(`[${site.id}] POMINIĘTO: strona legal-notice już istnieje.`)
      continue
    }

    pages.push(LEGAL_NOTICE_PAGE as unknown as PageLike)
    pages.push(PRIVACY_POLICY_PAGE as unknown as PageLike)
    model.pages = pages

    await prisma.site.update({
      where: { id: site.id },
      data:  { model: JSON.stringify(model) },
    })

    // Weryfikacja
    const modelAfter = JSON.parse(
      (await prisma.site.findUnique({ where: { id: site.id } }))!.model as string
    ) as SiteModelLike
    const legalAdded   = modelAfter.pages?.some(p => p.slug === 'legal-notice')
    const privacyAdded = modelAfter.pages?.some(p => p.slug === 'privacy-policy')
    const indexOk      = modelAfter.pages?.some(p => p.slug === 'index')
    const kontaktOk    = modelAfter.pages?.some(p => p.slug === 'kontakt')

    console.log(`[${site.id}] ZMIGROWANO: dodano strony prawne`)
    console.log(`  index zachowany:         ${indexOk      ? 'TAK' : 'NIE ← BŁĄD'}`)
    console.log(`  kontakt zachowany:       ${kontaktOk    ? 'TAK' : 'NIE ← BŁĄD'}`)
    console.log(`  legal-notice dodany:     ${legalAdded   ? 'TAK' : 'NIE ← BŁĄD'}`)
    console.log(`  privacy-policy dodany:   ${privacyAdded ? 'TAK' : 'NIE ← BŁĄD'}`)
    console.log(`  liczba stron:            ${modelAfter.pages?.length ?? 0}`)
    console.log()
  }

  console.log('Migracja zakończona.')
}

main().catch(console.error).finally(() => prisma.$disconnect())
