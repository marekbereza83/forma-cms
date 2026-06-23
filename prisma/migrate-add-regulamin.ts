/**
 * Migracja: dodaje stronę regulamin do istniejących rekordów Site
 * + dodaje link "Regulamin" do stopki wszystkich stron
 * + poprawia formawiz.pl → formawizerunku.pl w meta.canonical i meta.ogUrl
 *
 * Bezpieczna i idempotentna:
 * - jeśli regulamin już istnieje — pomija cały rekord
 *
 * Uruchamiaj jawnie: npm run migrate:add-regulamin
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

type FooterLink = { label: string; href: string }
type Field = { type: string; value: unknown; editable: boolean }
type Section = { id: string; recipe: string; fields: Record<string, Field> }
type PageMeta = { title?: string; description?: string; canonical?: string; ogTitle?: string; ogDescription?: string; ogUrl?: string; variant?: string }
type PageLike = { slug: string; meta?: PageMeta; sections?: Section[] }
type SiteModelLike = { pages?: PageLike[] }

const REGULAMIN_PAGE: PageLike = {
  slug: 'regulamin',
  meta: {
    title: 'Regulamin Serwisu | FORMA Wizerunku',
    description: 'Regulamin serwisu formawizerunku.pl — zasady korzystania z serwisu Forma Wizerunku.',
    canonical: 'https://formawizerunku.pl/regulamin.html',
    ogTitle: 'Regulamin Serwisu | FORMA Wizerunku',
    ogDescription: 'Regulamin serwisu formawizerunku.pl — zasady korzystania z serwisu Forma Wizerunku.',
    ogUrl: 'https://formawizerunku.pl/regulamin.html',
    variant: 'legal',
  },
  sections: [
    {
      id: 'nav',
      recipe: 'A1',
      fields: {
        logoText: { type: 'text', value: 'Forma Wizerunku', editable: false },
        ctaLabel:  { type: 'cta',  value: 'Zamów stronę',   editable: false },
      },
    },
    { id: 'regulamin', recipe: 'L1', fields: {} as Record<string, Field> },
  ],
}

const REGULAMIN_FOOTER_LINK: FooterLink = { label: 'Regulamin', href: 'regulamin.html' }

function injectRegulaminLink(links: FooterLink[]): FooterLink[] {
  if (links.some(l => l.href === 'regulamin.html')) return links
  const ppIdx = links.findIndex(l => l.href === 'privacy-policy.html')
  const insertAt = ppIdx >= 0 ? ppIdx : links.length
  return [...links.slice(0, insertAt), REGULAMIN_FOOTER_LINK, ...links.slice(insertAt)]
}

function fixDomain(url?: string): string | undefined {
  return url?.replace('formawiz.pl', 'formawizerunku.pl')
}

async function main() {
  const sites = await prisma.site.findMany()
  console.log(`Znaleziono ${sites.length} site(ów).\n`)

  for (const site of sites) {
    const model = JSON.parse(site.model as string) as SiteModelLike
    const pages = model.pages ?? []

    if (pages.some(p => p.slug === 'regulamin')) {
      console.log(`[${site.id}] POMINIĘTO: strona regulamin już istnieje.`)
      continue
    }

    // 1. Napraw formawiz.pl → formawizerunku.pl w meta każdej strony
    for (const page of pages) {
      if (page.meta) {
        page.meta.canonical = fixDomain(page.meta.canonical)
        page.meta.ogUrl     = fixDomain(page.meta.ogUrl)
      }
    }

    // 2. Dodaj link regulamin do stopki we wszystkich stronach
    for (const page of pages) {
      for (const section of page.sections ?? []) {
        if (section.id === 'footer' && section.fields['links']) {
          const links = section.fields['links'].value as FooterLink[]
          section.fields['links'].value = injectRegulaminLink(links)
        }
      }
    }

    // 3. Sklonuj stopkę z ostatniej strony mającej footer i dołącz do regulaminu
    const pagesWithFooter = pages.filter(p => p.sections?.some(s => s.id === 'footer'))
    const footerTemplate   = pagesWithFooter.at(-1)?.sections?.find(s => s.id === 'footer')

    const regulaminPage = structuredClone(REGULAMIN_PAGE) as PageLike
    if (footerTemplate) {
      regulaminPage.sections = [...(regulaminPage.sections ?? []), structuredClone(footerTemplate)]
    }

    // 4. Wstaw regulamin przed stroną 404
    const idx404 = pages.findIndex(p => p.slug === '404')
    const insertAt = idx404 >= 0 ? idx404 : pages.length
    pages.splice(insertAt, 0, regulaminPage)
    model.pages = pages

    await prisma.site.update({
      where: { id: site.id },
      data:  { model: JSON.stringify(model) },
    })

    const after = JSON.parse(
      (await prisma.site.findUnique({ where: { id: site.id } }))!.model as string
    ) as SiteModelLike

    console.log(`[${site.id}] ZMIGROWANO`)
    console.log(`  regulamin dodany:  ${after.pages?.some(p => p.slug === 'regulamin') ? 'TAK' : 'NIE ← BŁĄD'}`)
    console.log(`  liczba stron:      ${after.pages?.length ?? 0}`)
    console.log()
  }

  console.log('Migracja zakończona.')
}

main().catch(console.error).finally(() => prisma.$disconnect())
