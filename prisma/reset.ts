import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const prisma = new PrismaClient()

async function main() {
  console.log('RESET: kasowanie istniejących danych...')

  await prisma.site.deleteMany()
  await prisma.user.deleteMany()
  await prisma.tenant.deleteMany()

  console.log('RESET: dane skasowane. Wgrywam fixture...')

  const baseModel = JSON.parse(
    readFileSync(resolve(__dirname, '../fixtures/forma-site.json'), 'utf-8'),
  )

  const tenantA = await prisma.tenant.create({
    data: { name: 'Kancelaria Kowalski', slug: 'kowalski', archetype: 'trust-led' },
  })

  const passwordHash = await bcrypt.hash('haslo123', 10)

  await prisma.user.create({
    data: { email: 'kowalski@test.pl', password: passwordHash, tenantId: tenantA.id },
  })

  await prisma.site.create({
    data: {
      tenantId: tenantA.id,
      model: JSON.stringify({ ...baseModel, tenantId: tenantA.id }),
    },
  })

  const tenantB = await prisma.tenant.create({
    data: { name: 'Kancelaria Nowak', slug: 'nowak', archetype: 'trust-led' },
  })

  await prisma.user.create({
    data: { email: 'nowak@test.pl', password: passwordHash, tenantId: tenantB.id },
  })

  await prisma.site.create({
    data: {
      tenantId: tenantB.id,
      model: JSON.stringify({ ...baseModel, tenantId: tenantB.id }),
    },
  })

  console.log('RESET OK: fixture wgrane od nowa —', tenantA.slug, tenantB.slug)
}

main().catch(console.error).finally(() => prisma.$disconnect())
