// Migration: set editable:true for technologie.tags on the proces page
// for all existing tenants.
//
// The deliverables.items field is already editable:true in stored models —
// only the panel ListEditor lacked a DeliverableItem branch (fixed in code),
// so deliverables needs NO migration. This script only flips technologie.tags.
//
// Run with: npx tsx prisma/migrate-technologie-tags-editable.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const FIELDS_TO_ENABLE = ['tags']

async function main() {
  const sites = await prisma.site.findMany({ select: { id: true, tenantId: true, model: true } })
  console.log(`Found ${sites.length} site(s).`)

  for (const site of sites) {
    const model = JSON.parse(site.model as string)
    let changed = false

    for (const page of model.pages ?? []) {
      if (page.slug !== 'proces') continue
      for (const section of page.sections ?? []) {
        if (section.id !== 'technologie') continue
        for (const fieldName of FIELDS_TO_ENABLE) {
          if (section.fields[fieldName] && section.fields[fieldName].editable === false) {
            section.fields[fieldName].editable = true
            changed = true
            console.log(`  tenant ${site.tenantId}: technologie.${fieldName} → editable:true`)
          }
        }
      }
    }

    if (changed) {
      await prisma.site.update({
        where: { id: site.id },
        data: { model: JSON.stringify(model) },
      })
    } else {
      console.log(`  tenant ${site.tenantId}: no changes needed`)
    }
  }

  console.log('Done.')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
