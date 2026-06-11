// Migration: set editable:true for solution section fields
// (checklistTag, checklistItems, microcopy) on all existing tenants.
//
// Run with: npx tsx prisma/migrate-solution-editable.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const FIELDS_TO_ENABLE = ['checklistTag', 'checklistItems', 'microcopy']

async function main() {
  const sites = await prisma.site.findMany({ select: { id: true, tenantId: true, model: true } })
  console.log(`Found ${sites.length} site(s).`)

  for (const site of sites) {
    const model = JSON.parse(site.model as string)
    let changed = false

    for (const page of model.pages ?? []) {
      if (page.slug !== 'index') continue
      for (const section of page.sections ?? []) {
        if (section.id !== 'solution') continue
        for (const fieldName of FIELDS_TO_ENABLE) {
          if (section.fields[fieldName] && section.fields[fieldName].editable === false) {
            section.fields[fieldName].editable = true
            changed = true
            console.log(`  tenant ${site.tenantId}: solution.${fieldName} → editable:true`)
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
