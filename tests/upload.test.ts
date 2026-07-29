/**
 * Upload API — server-side tests (node env, no DOM).
 * Tests call POST() and DELETE() handlers directly.
 * Both auth() and the S3 client are mocked — no real R2 calls.
 *
 * Post-R2 migration: uploads go to Cloudflare R2, not public/uploads/.
 * URL returned by POST is an absolute R2 CDN URL.
 * DELETE always returns 200 for valid keys (S3 DeleteObject is idempotent —
 * it succeeds even when the key does not exist).
 */
import { describe, it, expect, vi, beforeAll } from 'vitest'
import { deflateSync } from 'zlib'

// ── Mock auth BEFORE importing route handler ──────────────────────────────────
vi.mock('@/lib/auth', () => ({ auth: vi.fn() }))

// ── Mock S3 client — no real R2 calls in tests ────────────────────────────────
// vi.hoisted() runs before module imports so the mock factory can reference it.
const { mockS3Send } = vi.hoisted(() => ({
  mockS3Send: vi.fn().mockResolvedValue({}),
}))
vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn().mockImplementation(() => ({ send: mockS3Send })),
  PutObjectCommand: vi.fn().mockImplementation((args: unknown) => args),
  DeleteObjectCommand: vi.fn().mockImplementation((args: unknown) => args),
}))

import { auth } from '@/lib/auth'
import { POST, DELETE } from '../src/app/api/upload/route'
import type { Session } from 'next-auth'

const TEST_TENANT = 'upload-test-tenant'
const R2_BASE     = 'https://pub-test.r2.dev'

const ID_A  = '11111111-1111-4111-a111-111111111111'
const ISO_A = 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa'
const ISO_B = 'bbbbbbbb-bbbb-4bbb-abbb-bbbbbbbbbbbb'
const ISO_C = 'cccccccc-cccc-4ccc-accc-cccccccccccc'
const ISO_D = 'dddddddd-dddd-4ddd-addd-dddddddddddd'

// ── Helpers ───────────────────────────────────────────────────────────────────

function crc32(buf: Buffer): number {
  let crc = 0xFFFFFFFF
  for (const b of buf) {
    crc ^= b
    for (let j = 0; j < 8; j++) crc = crc & 1 ? 0xEDB88320 ^ (crc >>> 1) : crc >>> 1
  }
  return (crc ^ 0xFFFFFFFF) >>> 0
}

function pngChunk(tag: string, data: Buffer): Buffer {
  const tagBuf = Buffer.from(tag, 'ascii')
  const lenBuf = Buffer.allocUnsafe(4); lenBuf.writeUInt32BE(data.length)
  const crcBuf = Buffer.allocUnsafe(4); crcBuf.writeUInt32BE(crc32(Buffer.concat([tagBuf, data])))
  return Buffer.concat([lenBuf, tagBuf, data, crcBuf])
}

function minimalPng(): Buffer {
  const W = 10, H = 10
  const ihdr = Buffer.allocUnsafe(13)
  ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4)
  ihdr[8] = 8; ihdr[9] = 2
  ihdr.fill(0, 10)
  const row = Buffer.concat([Buffer.from([0]), Buffer.alloc(W * 3, 0xAA)])
  const idat = deflateSync(Buffer.concat(Array.from({ length: H }, () => row)))
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', idat),
    pngChunk('IEND', Buffer.alloc(0)),
  ])
}

function makePostRequest(file: File, cardId: string): Request {
  const fd = new FormData()
  fd.append('file', file)
  fd.append('cardId', cardId)
  return new Request('http://localhost/api/upload', { method: 'POST', body: fd })
}

function makePostCoverRequest(file: File, postId: string): Request {
  const fd = new FormData()
  fd.append('file', file)
  fd.append('kind', 'post-cover')
  fd.append('postId', postId)
  return new Request('http://localhost/api/upload', { method: 'POST', body: fd })
}

function makeDeleteRequest(filename: string): Request {
  return new Request(
    `http://localhost/api/upload?filename=${encodeURIComponent(filename)}`,
    { method: 'DELETE' },
  )
}

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeAll(() => {
  // R2 env vars — used by the route handler; values are test stubs
  process.env.R2_PUBLIC_BASE_URL  = R2_BASE
  process.env.R2_BUCKET           = 'test-bucket'
  process.env.R2_ACCOUNT_ID       = 'test-account'
  process.env.R2_ACCESS_KEY_ID    = 'test-key'
  process.env.R2_SECRET_ACCESS_KEY = 'test-secret'

  vi.mocked(auth).mockResolvedValue({
    user: { tenantId: TEST_TENANT, userId: 'u1', id: 'u1', email: 'test@test.pl', role: 'admin' },
    expires: new Date(Date.now() + 86_400_000).toISOString(),
  } as Session)
})

// ── POST tests ────────────────────────────────────────────────────────────────

describe('POST /api/upload', () => {
  it('brak sesji → 401', async () => {
    vi.mocked(auth).mockResolvedValueOnce(null)
    const file = new File([minimalPng()], 'test.png', { type: 'image/png' })
    const res = await POST(makePostRequest(file, ID_A))
    expect(res.status).toBe(401)
  })

  it('zły typ (text/plain, złe magic bytes) → 400', async () => {
    const file = new File([Buffer.from('hello world')], 'test.txt', { type: 'text/plain' })
    const res = await POST(makePostRequest(file, ID_A))
    expect(res.status).toBe(400)
  })

  it('SVG → 400', async () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><rect width="10" height="10"/></svg>')
    const file = new File([svg], 'icon.svg', { type: 'image/svg+xml' })
    const res = await POST(makePostRequest(file, ID_A))
    expect(res.status).toBe(400)
  })

  it('za duży plik (6 MB) → 413', async () => {
    const big = Buffer.alloc(6 * 1024 * 1024)
    big[0] = 0x89; big[1] = 0x50; big[2] = 0x4E; big[3] = 0x47
    const file = new File([big], 'big.png', { type: 'image/png' })
    const res = await POST(makePostRequest(file, ID_A))
    expect(res.status).toBe(413)
  })

  it('brak cardId → 400', async () => {
    const fd = new FormData()
    fd.append('file', new File([minimalPng()], 'photo.png', { type: 'image/png' }))
    const req = new Request('http://localhost/api/upload', { method: 'POST', body: fd })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('cardId nie jest UUID → 400', async () => {
    const fd = new FormData()
    fd.append('file', new File([minimalPng()], 'photo.png', { type: 'image/png' }))
    fd.append('cardId', 'not-a-uuid')
    const req = new Request('http://localhost/api/upload', { method: 'POST', body: fd })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('poprawny PNG z cardId A → 200, absolutny URL R2, plik webp 800×450', async () => {
    mockS3Send.mockResolvedValueOnce({})  // PutObject succeeds
    const file = new File([minimalPng()], 'photo.png', { type: 'image/png' })
    const res = await POST(makePostRequest(file, ID_A))
    expect(res.status).toBe(200)

    const json = await res.json() as { url: string }
    // Sufiks losowy przy kazdym uploadzie (cache-busting, patrz route.ts) — wzorzec,
    // nie dokladny string.
    expect(json.url).toMatch(new RegExp(`^${R2_BASE}/${TEST_TENANT}/portfolio-card-${ID_A}-[0-9a-f]{8}\\.webp$`))

    // Verify the uploaded buffer is webp 800×450
    const callArgs = mockS3Send.mock.calls.at(-1)?.[0] as { Body: Buffer; ContentType: string }
    expect(callArgs.ContentType).toBe('image/webp')
    const sharpModule = await import('sharp')
    const meta = await sharpModule.default(callArgs.Body).metadata()
    expect(meta.format).toBe('webp')
    expect(meta.width).toBe(800)
    expect(meta.height).toBe(450)
  })
})

// ── post-cover (okladki publikacji) ────────────────────────────────────────────

describe('POST /api/upload — kind=post-cover', () => {
  it('poprawny PNG z postId A → 200, klucz post-cover-<id>.webp, plik webp 1200×675', async () => {
    mockS3Send.mockResolvedValueOnce({})
    const file = new File([minimalPng()], 'cover.png', { type: 'image/png' })
    const res = await POST(makePostCoverRequest(file, ID_A))
    expect(res.status).toBe(200)

    const json = await res.json() as { url: string }
    expect(json.url).toMatch(new RegExp(`^${R2_BASE}/${TEST_TENANT}/post-cover-${ID_A}-[0-9a-f]{8}\\.webp$`))

    const callArgs = mockS3Send.mock.calls.at(-1)?.[0] as { Body: Buffer; ContentType: string }
    expect(callArgs.ContentType).toBe('image/webp')
    const sharpModule = await import('sharp')
    const meta = await sharpModule.default(callArgs.Body).metadata()
    expect(meta.format).toBe('webp')
    expect(meta.width).toBe(1200)
    expect(meta.height).toBe(675)
  })

  it('brak postId (tylko kind=post-cover) → 400', async () => {
    const fd = new FormData()
    fd.append('file', new File([minimalPng()], 'cover.png', { type: 'image/png' }))
    fd.append('kind', 'post-cover')
    const req = new Request('http://localhost/api/upload', { method: 'POST', body: fd })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('brak kind → domyslnie portfolio-card (wsteczna zgodnosc), 800×450', async () => {
    mockS3Send.mockResolvedValueOnce({})
    const file = new File([minimalPng()], 'photo.png', { type: 'image/png' })
    const res = await POST(makePostRequest(file, ID_A))
    const json = await res.json() as { url: string }
    expect(json.url).toMatch(new RegExp(`portfolio-card-${ID_A}-[0-9a-f]{8}\\.webp$`))
  })
})

describe('DELETE /api/upload — kind=post-cover', () => {
  it('DELETE post-cover-<uuid>.webp (STARY format, bez sufiksu) → 200 — wsteczna zgodnosc', async () => {
    mockS3Send.mockClear()
    const res = await DELETE(makeDeleteRequest(`post-cover-${ID_A}.webp`))
    expect(res.status).toBe(200)
    const callArgs = mockS3Send.mock.calls[0]?.[0] as { Key: string }
    expect(callArgs?.Key).toBe(`${TEST_TENANT}/post-cover-${ID_A}.webp`)
  })

  it('DELETE post-cover-<uuid>-<sufiks>.webp (NOWY format) → 200', async () => {
    mockS3Send.mockClear()
    const res = await DELETE(makeDeleteRequest(`post-cover-${ID_A}-abcd1234.webp`))
    expect(res.status).toBe(200)
    const callArgs = mockS3Send.mock.calls[0]?.[0] as { Key: string }
    expect(callArgs?.Key).toBe(`${TEST_TENANT}/post-cover-${ID_A}-abcd1234.webp`)
  })

  it('nazwa spoza dozwolonych prefiksow (np. "cover-<uuid>.webp") → 400', async () => {
    const res = await DELETE(makeDeleteRequest(`cover-${ID_A}.webp`))
    expect(res.status).toBe(400)
  })
})

// ── Isolation tests ───────────────────────────────────────────────────────────
// Verify that each cardId maps to its own R2 key namespace, distinct from other
// cardIds, and that operations on one key do not affect others.

describe('Izolacja slotów — rozne cardId', () => {
  it('upload ISO_A, ISO_B, ISO_C → 200 każdy, klucze R2 są izolowane', async () => {
    const png = new File([minimalPng()], 'p.png', { type: 'image/png' })

    const rA = await POST(makePostRequest(png, ISO_A))
    const rB = await POST(makePostRequest(png, ISO_B))
    const rC = await POST(makePostRequest(png, ISO_C))

    expect(rA.status).toBe(200)
    expect(rB.status).toBe(200)
    expect(rC.status).toBe(200)

    const urlA = ((await rA.json()) as { url: string }).url
    const urlB = ((await rB.json()) as { url: string }).url
    const urlC = ((await rC.json()) as { url: string }).url

    // Each card gets its own distinct R2 key (id segment), niezaleznie od losowego sufiksu
    expect(urlA).toMatch(new RegExp(`portfolio-card-${ISO_A}-[0-9a-f]{8}\\.webp$`))
    expect(urlB).toMatch(new RegExp(`portfolio-card-${ISO_B}-[0-9a-f]{8}\\.webp$`))
    expect(urlC).toMatch(new RegExp(`portfolio-card-${ISO_C}-[0-9a-f]{8}\\.webp$`))
    expect(urlA).not.toBe(urlB)
    expect(urlB).not.toBe(urlC)
  })

  it('DELETE ISO_B → 200 (S3 DeleteObject idempotent)', async () => {
    const res = await DELETE(makeDeleteRequest(`portfolio-card-${ISO_B}.webp`))
    expect(res.status).toBe(200)
  })

  it('upload ISO_D (nowa karta) → 200, URL zawiera ISO_D', async () => {
    const png = new File([minimalPng()], 'p.png', { type: 'image/png' })
    const res = await POST(makePostRequest(png, ISO_D))
    expect(res.status).toBe(200)
    const json = await res.json() as { url: string }
    expect(json.url).toMatch(new RegExp(`portfolio-card-${ISO_D}-[0-9a-f]{8}\\.webp$`))
  })

  // ── Cache-busting: rdzen naprawy 2026-07-29 ──────────────────────────────────
  it('dwa kolejne uploady dla TEGO SAMEGO cardId → 200 kazdy, RÓŻNE URL-e', async () => {
    const png = new File([minimalPng()], 'p.png', { type: 'image/png' })

    const r1 = await POST(makePostRequest(png, ISO_A))
    const r2 = await POST(makePostRequest(png, ISO_A))
    expect(r1.status).toBe(200)
    expect(r2.status).toBe(200)

    const url1 = ((await r1.json()) as { url: string }).url
    const url2 = ((await r2.json()) as { url: string }).url

    // Bez tego przegladarka/CDN serwuja stare, zbuforowane zdjecie po podmianie —
    // to byl zglaszany blad ("wgralem nowe zdjecie, a pokazuje sie stare").
    expect(url1).not.toBe(url2)
    expect(url1).toMatch(new RegExp(`portfolio-card-${ISO_A}-[0-9a-f]{8}\\.webp$`))
    expect(url2).toMatch(new RegExp(`portfolio-card-${ISO_A}-[0-9a-f]{8}\\.webp$`))
  })
})

// ── DELETE tests ──────────────────────────────────────────────────────────────

describe('DELETE /api/upload', () => {
  it('brak sesji → 401', async () => {
    vi.mocked(auth).mockResolvedValueOnce(null)
    const res = await DELETE(makeDeleteRequest(`portfolio-card-${ISO_A}.webp`))
    expect(res.status).toBe(401)
  })

  it('nieprawidłowa nazwa (traversal) → 400', async () => {
    const res = await DELETE(makeDeleteRequest('../secret.txt'))
    expect(res.status).toBe(400)
  })

  it('nieprawidłowa nazwa (nie UUID format) → 400', async () => {
    const res = await DELETE(makeDeleteRequest('portfolio-card-0.webp'))
    expect(res.status).toBe(400)
  })

  it('klucz nie istnieje w R2 → 200 (S3 DeleteObject jest idempotentny)', async () => {
    // S3 DeleteObjectCommand returns 204/success even when the key does not exist —
    // this is standard S3/R2 behavior. The handler returns 200 in all valid-key cases.
    const nonExistent = 'eeeeeeee-eeee-4eee-aeee-eeeeeeeeeeee'
    const res = await DELETE(makeDeleteRequest(`portfolio-card-${nonExistent}.webp`))
    expect(res.status).toBe(200)
  })

  it('DELETE prawidłowego klucza → 200, S3 wywołany z poprawnym kluczem', async () => {
    mockS3Send.mockClear()
    const res = await DELETE(makeDeleteRequest(`portfolio-card-${ISO_A}.webp`))
    expect(res.status).toBe(200)
    // Verify S3 was called with the tenant-scoped key
    const callArgs = mockS3Send.mock.calls[0]?.[0] as { Key: string }
    expect(callArgs?.Key).toBe(`${TEST_TENANT}/portfolio-card-${ISO_A}.webp`)
  })
})
