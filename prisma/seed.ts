import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const prisma = new PrismaClient()

async function main() {
  const baseModel = JSON.parse(
    readFileSync(resolve(__dirname, '../fixtures/forma-site.json'), 'utf-8'),
  )

  // ── Tenant A ────────────────────────────────────────────────────────────────
  const tenantA = await prisma.tenant.upsert({
    where:  { slug: 'kowalski' },
    update: {},
    create: { name: 'Kancelaria Kowalski', slug: 'kowalski', archetype: 'trust-led' },
  })

  const passwordHash = await bcrypt.hash('haslo123', 10)

  await prisma.user.upsert({
    where:  { email: 'kowalski@test.pl' },
    update: {},
    create: { email: 'kowalski@test.pl', password: passwordHash, tenantId: tenantA.id },
  })

  await prisma.site.upsert({
    where:  { tenantId: tenantA.id },
    update: {},
    create: {
      tenantId: tenantA.id,
      model: JSON.stringify({ ...baseModel, tenantId: tenantA.id }),
    },
  })

  // ── Tenant B ────────────────────────────────────────────────────────────────
  const tenantB = await prisma.tenant.upsert({
    where:  { slug: 'nowak' },
    update: {},
    create: { name: 'Kancelaria Nowak', slug: 'nowak', archetype: 'trust-led' },
  })

  await prisma.user.upsert({
    where:  { email: 'nowak@test.pl' },
    update: {},
    create: { email: 'nowak@test.pl', password: passwordHash, tenantId: tenantB.id },
  })

  await prisma.site.upsert({
    where:  { tenantId: tenantB.id },
    update: {},
    create: {
      tenantId: tenantB.id,
      model: JSON.stringify({ ...baseModel, tenantId: tenantB.id }),
    },
  })

  console.log('Seed OK:', tenantA.slug, tenantB.slug)
}

main().catch(console.error).finally(() => prisma.$disconnect())
