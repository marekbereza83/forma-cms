/**
 * Jednorazowy skrypt: publikuje stronę forma-production na R2.
 * Uruchamiaj: npx tsx scripts/publish-production.ts
 */
import { PrismaClient } from '@prisma/client'
import { publishSite } from '../src/lib/cms/publish'

const prisma = new PrismaClient()

async function main() {
  const sites = await prisma.site.findMany({ select: { id: true, tenantId: true } })
  console.log('Sites in DB:')
  sites.forEach(s => console.log(` - ${s.tenantId} (${s.id})`))

  const target = sites.find(s =>
    s.tenantId.includes('forma') || s.tenantId.includes('production')
  ) ?? sites[0]

  if (!target) throw new Error('Brak rekordów Site w bazie')

  console.log(`\nPublikuję tenant: ${target.tenantId}`)
  const result = await publishSite(target.tenantId)
  console.log(`\nGotowe! Opublikowano ${result.fileCount} plików pod ${result.prefix}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
