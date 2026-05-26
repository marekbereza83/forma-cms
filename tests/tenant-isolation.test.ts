import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import bcrypt from 'bcryptjs'
import { prisma } from '../src/lib/db/prisma'
import { getTenantScopedClient, type TenantSession } from '../src/lib/tenant/client'
import { saveSite } from '../src/lib/cms/persistence'
import { authorizeUser } from '../src/lib/auth/authorize'
import { FormaValidationError } from '../src/lib/cms/validation/types'

const ROOT = resolve(process.cwd())

// ── Shared state seeded in beforeAll ────────────────────────────────────────
let tenantAId: string
let tenantBId: string
let userAId: string
let userBId: string
let siteBId: string
let eventBId: string
let postBId: string
let sessionA: TenantSession
let sessionB: TenantSession

const PASSWORD = 'haslo123'
const PASSWORD_HASH = bcrypt.hashSync(PASSWORD, 10)

beforeAll(async () => {
  // Clean slate — order matters (FK constraints)
  await prisma.editLog.deleteMany()
  await prisma.post.deleteMany()
  await prisma.event.deleteMany()
  await prisma.site.deleteMany()
  await prisma.user.deleteMany()
  await prisma.tenant.deleteMany()

  const baseModel = JSON.parse(
    readFileSync(resolve(ROOT, 'fixtures/forma-site.json'), 'utf-8'),
  )

  // ── Tenant A ──────────────────────────────────────────────────────────────
  const tenantA = await prisma.tenant.create({
    data: { name: 'Kancelaria Kowalski', slug: 'kowalski-test' },
  })
  tenantAId = tenantA.id

  const userA = await prisma.user.create({
    data: { email: 'kowalski@test.pl', password: PASSWORD_HASH, tenantId: tenantAId },
  })
  userAId = userA.id

  await prisma.site.create({
    data: {
      tenantId: tenantAId,
      model: JSON.stringify({ ...baseModel, tenantId: tenantAId }),
    },
  })

  await prisma.event.create({
    data: {
      tenantId: tenantAId,
      title: 'Konferencja A',
      date: new Date('2026-09-01'),
      description: 'Wydarzenie tenanta A',
    },
  })

  await prisma.post.create({
    data: { tenantId: tenantAId, title: 'Post A', body: '<p>Treść A</p>' },
  })

  sessionA = { tenantId: tenantAId, userId: userAId }

  // ── Tenant B ──────────────────────────────────────────────────────────────
  const tenantB = await prisma.tenant.create({
    data: { name: 'Kancelaria Nowak', slug: 'nowak-test' },
  })
  tenantBId = tenantB.id

  const userB = await prisma.user.create({
    data: { email: 'nowak@test.pl', password: PASSWORD_HASH, tenantId: tenantBId },
  })
  userBId = userB.id

  const siteB = await prisma.site.create({
    data: {
      tenantId: tenantBId,
      model: JSON.stringify({ ...baseModel, tenantId: tenantBId }),
    },
  })
  siteBId = siteB.id

  const eventB = await prisma.event.create({
    data: {
      tenantId: tenantBId,
      title: 'Konferencja B',
      date: new Date('2026-10-01'),
      description: 'Wydarzenie tenanta B',
    },
  })
  eventBId = eventB.id

  const postB = await prisma.post.create({
    data: { tenantId: tenantBId, title: 'Post B', body: '<p>Treść B</p>' },
  })
  postBId = postB.id

  sessionB = { tenantId: tenantBId, userId: userBId }
})

afterAll(async () => {
  await prisma.$disconnect()
})

// ────────────────────────────────────────────────────────────────────────────
describe('Tenant isolation — read', () => {
  it('User A gets their own site', async () => {
    const dbA = getTenantScopedClient(sessionA)
    const site = await dbA.getSite()
    expect(site).not.toBeNull()
    expect(site!.tenantId).toBe(tenantAId)
  })

  it('User A cannot read Tenant B site by ID via scoped client', async () => {
    const dbA = getTenantScopedClient(sessionA)
    const site = await dbA.getSiteById(siteBId)
    expect(site).toBeNull()
  })

  it('User A cannot read Tenant B event by ID via scoped client', async () => {
    const dbA = getTenantScopedClient(sessionA)
    const event = await dbA.getEventById(eventBId)
    expect(event).toBeNull()
  })

  it('User A cannot read Tenant B post by ID via scoped client', async () => {
    const dbA = getTenantScopedClient(sessionA)
    const post = await dbA.getPostById(postBId)
    expect(post).toBeNull()
  })
})

// ────────────────────────────────────────────────────────────────────────────
describe('Tenant isolation — mutation proof (jedna zmienna: tenantId w where)', () => {
  it('bez filtra tenantId: baza oddaje site B (dowod, ze dane istnieja)', async () => {
    // Jedyna roznica miedzy tym a testem ponizej: brak tenantId: sessionA.tenantId w where
    const leaked = await prisma.site.findFirst({ where: { id: siteBId } })
    expect(leaked).not.toBeNull()
    expect(leaked!.tenantId).toBe(tenantBId) // dane tenanta B sa w bazie i dostepne bez filtra
  })

  it('z filtrem tenantId z sesji A: ta sama metoda, ten sam id B → null', async () => {
    // Jedyna roznica: dodajemy tenantId: sessionA.tenantId do where
    const isolated = await prisma.site.findFirst({
      where: { id: siteBId, tenantId: sessionA.tenantId },
    })
    expect(isolated).toBeNull() // filtr tenantId = jedyna ochrona
  })
})

// ────────────────────────────────────────────────────────────────────────────
describe('saveSite — write isolation + FORMA contract', () => {
  it('saveSite(sessionA) zapisuje do bazy i tworzy wpis EditLog', async () => {
    const raw = JSON.parse(
      readFileSync(resolve(ROOT, 'fixtures/forma-site.json'), 'utf-8'),
    )
    raw.tenantId = tenantAId

    const { model, warnings } = await saveSite(sessionA, raw)

    expect(model.tenantId).toBe(tenantAId)
    expect(Array.isArray(warnings)).toBe(true)

    const log = await prisma.editLog.findFirst({
      where: { tenantId: tenantAId, action: 'site.save' },
      orderBy: { createdAt: 'desc' },
    })
    expect(log).not.toBeNull()
    expect(log!.userId).toBe(userAId)
    expect(log!.target).toBe('site')
  })

  it('saveSite(sessionA) nie modyfikuje site B (zapis A nie dotyka B)', async () => {
    const siteBBefore = await prisma.site.findUnique({ where: { tenantId: tenantBId } })

    const raw = JSON.parse(
      readFileSync(resolve(ROOT, 'fixtures/forma-site.json'), 'utf-8'),
    )
    raw.tenantId = tenantAId
    await saveSite(sessionA, raw)

    const siteBAfter = await prisma.site.findUnique({ where: { tenantId: tenantBId } })
    expect(siteBAfter!.version).toBe(siteBBefore!.version) // B niezmienione
    expect(siteBAfter!.updatedAt).toEqual(siteBBefore!.updatedAt)
  })

  it('V1 violation → FormaValidationError, baza niezmieniona', async () => {
    const raw = JSON.parse(
      readFileSync(resolve(ROOT, 'fixtures/forma-site.json'), 'utf-8'),
    )
    raw.tenantId = tenantAId
    // Inject invalid price — V1 hard rule
    const idx = raw.pages.find((p: { slug: string }) => p.slug === 'index')
    const pricing = idx.sections.find((s: { id: string }) => s.id === 'pricing')
    pricing.fields.standard.value.amount = 'zapytaj o wycene'

    const siteABefore = await prisma.site.findUnique({ where: { tenantId: tenantAId } })
    const logCountBefore = await prisma.editLog.count({ where: { tenantId: tenantAId } })

    await expect(saveSite(sessionA, raw)).rejects.toThrow(FormaValidationError)

    const siteAAfter = await prisma.site.findUnique({ where: { tenantId: tenantAId } })
    const logCountAfter = await prisma.editLog.count({ where: { tenantId: tenantAId } })

    expect(siteAAfter!.version).toBe(siteABefore!.version) // wersja niezmieniona
    expect(logCountAfter).toBe(logCountBefore) // brak nowego wpisu w EditLog
  })
})

// ────────────────────────────────────────────────────────────────────────────
describe('Auth — authorize ustawia tenantId ze źródła (nie z requestu)', () => {
  it('authorize z credentials usera A zwraca tenantId = tenantAId', async () => {
    const result = await authorizeUser({ email: 'kowalski@test.pl', password: PASSWORD })
    expect(result).not.toBeNull()
    expect(result!.tenantId).toBe(tenantAId) // tenantId pochodzi z DB, nie z formularza
    expect(result!.id).toBe(userAId)
  })

  it('authorize z credentials usera B zwraca tenantId = tenantBId (nie A)', async () => {
    const result = await authorizeUser({ email: 'nowak@test.pl', password: PASSWORD })
    expect(result).not.toBeNull()
    expect(result!.tenantId).toBe(tenantBId)
    expect(result!.tenantId).not.toBe(tenantAId)
  })

  it('bledne haslo → null (brak dostepu)', async () => {
    const result = await authorizeUser({ email: 'kowalski@test.pl', password: 'wrong' })
    expect(result).toBeNull()
  })
})
