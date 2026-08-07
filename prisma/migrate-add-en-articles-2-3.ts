import { readFileSync } from 'fs'
import { PrismaClient } from '@prisma/client'
import { parseSiteModel } from '../src/lib/cms/schema'
import { sanitizePostBody } from '../src/lib/cms/validation/collections'
import type { SiteModel } from '../src/lib/cms/types'

const TENANT_ID = 'cmshfxqzf000012l627vexwiq'

async function main() {
  const prisma = new PrismaClient()
  try {
    const site = await prisma.site.findUnique({ where: { tenantId: TENANT_ID } })
    if (!site) throw new Error('EN site not found')
    const model: SiteModel = JSON.parse(site.model)

    const article1 = JSON.parse(readFileSync('./tmp-manual-check/formularz-kancelarii-opis-sprawy-en.json', 'utf-8'))
    const article2 = JSON.parse(readFileSync('./tmp-manual-check/etyka-zawodowa-strona-kancelarii-en.json', 'utf-8'))

    for (const article of [article1, article2]) {
      // INVARIANT #5 (CLAUDE.md): sanitizePostBody() runs before persistence, even
      // though this body already matches the closed allowlist (Codex-reviewed
      // structural clone of an already-sanitized PL source) — belt and braces.
      const sanitized = sanitizePostBody(article.body)
      if (sanitized !== article.body) {
        console.warn('UWAGA: sanitizePostBody zmienil tresc dla', article.slug, '— sprawdz roznice przed zapisem.')
      }
      article.body = sanitized
    }

    model.collections.posts = [...model.collections.posts, article1, article2]

    // Restore "Insights" nav link now that the EN blog is complete (3/3 articles).
    // PL 'publikacje' page has empty sections (rendered from the posts collection
    // directly by renderer/publikacje.ts), so no page content needs translating.
    if (!model.pages.some(p => p.slug === 'publikacje')) {
      model.pages.push({ slug: 'publikacje', navLabel: 'Insights', sections: [] } as SiteModel['pages'][number])
    }

    const { model: validated, warnings } = parseSiteModel(model)
    if (warnings.length) {
      console.log('Soft warnings (nie blokuja zapisu):')
      for (const w of warnings) console.log(' -', w.rule, w.message)
    }

    await prisma.site.update({
      where: { tenantId: TENANT_ID },
      data: { model: JSON.stringify(validated), version: { increment: 1 } },
    })
    console.log('Site model zapisany dla tenanta', TENANT_ID)
    console.log('Strony:', validated.pages.map(p => p.slug).join(', '))
    console.log('Posty:', validated.collections.posts.map(p => p.slug).join(', '))
  } finally {
    await prisma.$disconnect()
  }
}

main().catch(err => { console.error(err); process.exit(1) })
