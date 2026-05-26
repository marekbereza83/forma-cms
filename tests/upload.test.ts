/**
 * Upload API — server-side tests (node env, no DOM).
 * Tests call POST() and DELETE() handlers directly, auth() is mocked.
 * afterAll cleans up test tenant's upload directory.
 *
 * ID_A — used only by the basic POST test (sharp.metadata() opens the file;
 *         on Windows the handle may linger briefly, so isolation tests use
 *         separate ISO_* UUIDs to avoid EBUSY / UNKNOWN write errors).
 */
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import { existsSync } from 'fs'
import { rm } from 'fs/promises'
import { join } from 'path'
import { deflateSync } from 'zlib'

// ── Mock auth BEFORE importing route handler ──────────────────────────────────
vi.mock('@/lib/auth', () => ({ auth: vi.fn() }))

import { auth } from '@/lib/auth'
import { POST, DELETE } from '../src/app/api/upload/route'
import type { Session } from 'next-auth'

const TEST_TENANT = 'upload-test-tenant'
const UPLOAD_DIR = join(process.cwd(), 'public', 'uploads', TEST_TENANT)

// Basic POST test — only ID_A used here; sharp.metadata() may briefly lock it
const ID_A = '11111111-1111-4111-a111-111111111111'

// Isolation suite — completely separate UUIDs, no overlap with ID_A
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

function makeDeleteRequest(filename: string): Request {
  return new Request(
    `http://localhost/api/upload?filename=${encodeURIComponent(filename)}`,
    { method: 'DELETE' },
  )
}

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeAll(() => {
  vi.mocked(auth).mockResolvedValue({
    user: { tenantId: TEST_TENANT, userId: 'u1', id: 'u1', email: 'test@test.pl', role: 'admin' },
    expires: new Date(Date.now() + 86_400_000).toISOString(),
  } as Session)
})

afterAll(async () => {
  try { await rm(UPLOAD_DIR, { recursive: true, force: true }) } catch { /* ok */ }
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

  it('poprawny PNG z cardId A → 200, url z ?v=, plik webp 800×450 na dysku', async () => {
    const file = new File([minimalPng()], 'photo.png', { type: 'image/png' })
    const res = await POST(makePostRequest(file, ID_A))
    expect(res.status).toBe(200)

    const json = await res.json() as { url: string }
    expect(json.url).toMatch(
      new RegExp(`^/uploads/${TEST_TENANT}/portfolio-card-${ID_A}\\.webp\\?v=\\d+$`),
    )

    const diskPath = join(UPLOAD_DIR, `portfolio-card-${ID_A}.webp`)
    expect(existsSync(diskPath)).toBe(true)

    const sharpModule = await import('sharp')
    const meta = await sharpModule.default(diskPath).metadata()
    expect(meta.format).toBe('webp')
    expect(meta.width).toBe(800)
    expect(meta.height).toBe(450)
  })
})

// ── Isolation tests ───────────────────────────────────────────────────────────
// Uses ISO_* UUIDs (distinct from ID_A used above) to avoid Windows file-handle
// conflicts caused by sharp.metadata() holding a read lock on ID_A.

describe('Izolacja slotów — stabilne cardId', () => {
  it('upload ISO_A, ISO_B, ISO_C → każdy ma swój plik, poprzednie nieruszone', async () => {
    const png = new File([minimalPng()], 'p.png', { type: 'image/png' })

    const rA = await POST(makePostRequest(png, ISO_A))
    const rB = await POST(makePostRequest(png, ISO_B))
    const rC = await POST(makePostRequest(png, ISO_C))

    expect(rA.status).toBe(200)
    expect(rB.status).toBe(200)
    expect(rC.status).toBe(200)

    expect(existsSync(join(UPLOAD_DIR, `portfolio-card-${ISO_A}.webp`))).toBe(true)
    expect(existsSync(join(UPLOAD_DIR, `portfolio-card-${ISO_B}.webp`))).toBe(true)
    expect(existsSync(join(UPLOAD_DIR, `portfolio-card-${ISO_C}.webp`))).toBe(true)
  })

  it('DELETE ISO_B (środkowa karta) → B usunięty, A i C nadal istnieją', async () => {
    const res = await DELETE(makeDeleteRequest(`portfolio-card-${ISO_B}.webp`))
    expect(res.status).toBe(200)

    expect(existsSync(join(UPLOAD_DIR, `portfolio-card-${ISO_B}.webp`))).toBe(false)
    expect(existsSync(join(UPLOAD_DIR, `portfolio-card-${ISO_A}.webp`))).toBe(true)
    expect(existsSync(join(UPLOAD_DIR, `portfolio-card-${ISO_C}.webp`))).toBe(true)
  })

  it('upload ISO_D (nowa karta po usunięciu B) → D istnieje, A i C nietknięte, B nie wraca', async () => {
    const png = new File([minimalPng()], 'p.png', { type: 'image/png' })
    const res = await POST(makePostRequest(png, ISO_D))
    expect(res.status).toBe(200)

    expect(existsSync(join(UPLOAD_DIR, `portfolio-card-${ISO_D}.webp`))).toBe(true)
    expect(existsSync(join(UPLOAD_DIR, `portfolio-card-${ISO_A}.webp`))).toBe(true)
    expect(existsSync(join(UPLOAD_DIR, `portfolio-card-${ISO_C}.webp`))).toBe(true)
    expect(existsSync(join(UPLOAD_DIR, `portfolio-card-${ISO_B}.webp`))).toBe(false)
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

  it('plik nie istnieje → 404', async () => {
    const nonExistent = 'eeeeeeee-eeee-4eee-aeee-eeeeeeeeeeee'
    const res = await DELETE(makeDeleteRequest(`portfolio-card-${nonExistent}.webp`))
    expect(res.status).toBe(404)
  })

  it('DELETE istniejącego pliku ISO_A → 200, plik usunięty', async () => {
    // ISO_A uploaded in isolation suite, not yet deleted
    expect(existsSync(join(UPLOAD_DIR, `portfolio-card-${ISO_A}.webp`))).toBe(true)
    const res = await DELETE(makeDeleteRequest(`portfolio-card-${ISO_A}.webp`))
    expect(res.status).toBe(200)
    expect(existsSync(join(UPLOAD_DIR, `portfolio-card-${ISO_A}.webp`))).toBe(false)
  })
})
