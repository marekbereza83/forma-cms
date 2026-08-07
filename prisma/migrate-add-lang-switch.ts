import { PrismaClient } from '@prisma/client'
import { parseSiteModel } from '../src/lib/cms/schema'
import type { SiteModel } from '../src/lib/cms/types'

// Wires up the PL <-> EN language switcher and hreflang tags (see
// src/lib/cms/renderer/sections/nav.ts, lang-pairing.ts, meta.altLang). Only
// these two tenants have a translated sibling today; every other tenant is
// left untouched, so the switcher/hreflang stay absent for them (both
// SiteMeta.altLang and PostItem.altLangSlug are optional).
const PL_TENANT_ID = 'cmpmb0k6o0000wkuq6cgar9f2' // Kancelaria Kowalski
const EN_TENANT_ID = 'cmshfxqzf000012l627vexwiq' // Forma Wizerunku EN

const TARGETS: Record<string, { lang: 'pl' | 'en'; homeUrl: string }> = {
  [PL_TENANT_ID]: { lang: 'en', homeUrl: 'https://en.formawizerunku.pl/' },
  [EN_TENANT_ID]: { lang: 'pl', homeUrl: 'https://formawizerunku.pl/' },
}

// Explicit PL -> EN slug pairs for the 3 articles that actually got translated.
// Applied symmetrically below (PL post gets the EN slug, EN post gets the PL
// slug back) — individual post slugs don't match across languages the way page
// slugs do, so this can't be derived automatically (see PostItem.altLangSlug).
const POST_PAIRS: Array<[pl: string, en: string]> = [
  ['chatbot-ai-strona-kancelarii', 'ai-chatbot-law-firm-website'],
  ['formularz-kancelarii-opis-sprawy', 'law-firm-contact-form-case-description'],
  ['etyka-zawodowa-strona-kancelarii', 'law-firm-website-professional-ethics'],
]

async function main() {
  const prisma = new PrismaClient()
  try {
    const plSite = await prisma.site.findUnique({ where: { tenantId: PL_TENANT_ID } })
    const enSite = await prisma.site.findUnique({ where: { tenantId: EN_TENANT_ID } })
    if (!plSite) throw new Error(`Site not found for tenant ${PL_TENANT_ID}`)
    if (!enSite) throw new Error(`Site not found for tenant ${EN_TENANT_ID}`)

    const plModel: SiteModel = JSON.parse(plSite.model)
    const enModel: SiteModel = JSON.parse(enSite.model)

    plModel.meta.altLang = TARGETS[PL_TENANT_ID]
    enModel.meta.altLang = TARGETS[EN_TENANT_ID]

    for (const [plSlug, enSlug] of POST_PAIRS) {
      const plPost = plModel.collections.posts.find(p => p.slug === plSlug)
      const enPost = enModel.collections.posts.find(p => p.slug === enSlug)
      if (!plPost) throw new Error(`PL post not found: ${plSlug}`)
      if (!enPost) throw new Error(`EN post not found: ${enSlug}`)
      plPost.altLangSlug = enSlug
      enPost.altLangSlug = plSlug
    }

    for (const [tenantId, model] of [[PL_TENANT_ID, plModel], [EN_TENANT_ID, enModel]] as const) {
      const { model: validated, warnings } = parseSiteModel(model)
      if (warnings.length) {
        console.log(`Soft warnings dla ${tenantId} (nie blokuja zapisu):`)
        for (const w of warnings) console.log(' -', w.rule, w.message)
      }
      await prisma.site.update({
        where: { tenantId },
        data: { model: JSON.stringify(validated), version: { increment: 1 } },
      })
      console.log(`Zapisano ${tenantId}: altLang =`, model.meta.altLang)
    }
    console.log('Sparowane artykuly:', POST_PAIRS.map(([pl, en]) => `${pl} <-> ${en}`).join(', '))
  } finally {
    await prisma.$disconnect()
  }
}

main().catch(err => { console.error(err); process.exit(1) })
