import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const prisma = new PrismaClient()

function parseArgs() {
  const args = process.argv.slice(2)
  const get = (flag: string) => {
    const i = args.indexOf(flag)
    return i !== -1 ? args[i + 1] : undefined
  }
  const name = get('--name')
  const email = get('--email')
  const password = get('--password')
  if (!name || !email || !password) {
    console.error('Usage: npx tsx scripts/create-tenant.ts --name "Kancelaria Demo" --email "demo@example.pl" --password "secret"')
    process.exit(1)
  }
  return { name, email, password }
}

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/ą/g, 'a').replace(/ć/g, 'c').replace(/ę/g, 'e')
    .replace(/ł/g, 'l').replace(/ń/g, 'n').replace(/ó/g, 'o')
    .replace(/ś/g, 's').replace(/ź/g, 'z').replace(/ż/g, 'z')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

async function getSourceModel() {
  // Try to copy from an existing tenant in the DB first
  const existing = await prisma.site.findFirst({ orderBy: { updatedAt: 'desc' } })
  if (existing) return JSON.parse(existing.model)
  // Fall back to the fixture
  return JSON.parse(readFileSync(resolve(__dirname, '../fixtures/forma-site.json'), 'utf-8'))
}

async function main() {
  const { name, email, password } = parseArgs()

  const baseSlug = slugify(name)
  // Ensure slug uniqueness by appending a suffix if needed
  let slug = baseSlug
  let suffix = 1
  while (await prisma.tenant.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${suffix++}`
  }

  const tenant = await prisma.tenant.create({
    data: { name, slug, archetype: 'trust-led' },
  })

  const passwordHash = await bcrypt.hash(password, 10)
  const user = await prisma.user.create({
    data: { email, password: passwordHash, tenantId: tenant.id },
  })

  const sourceModel = await getSourceModel()
  await prisma.site.create({
    data: {
      tenantId: tenant.id,
      model: JSON.stringify({ ...sourceModel, tenantId: tenant.id }),
    },
  })

  console.log(`Tenant created: ${tenant.id}, User: ${user.email}`)
}

main().catch((err) => { console.error(err); process.exit(1) }).finally(() => prisma.$disconnect())
