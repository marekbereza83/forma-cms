/**
 * Publish to R2 — server-side tests (node env, no DOM).
 * The S3 client is mocked (vi.hoisted, like upload.test.ts) — no real R2 calls.
 * publishSite() (the Prisma loader) is not tested here; publishFiles() is the
 * testable core and buildStaticSiteFiles() is pure.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'fs'
import { resolve, join } from 'path'

// R2 env must exist before src/lib/storage/r2.ts is imported (it reads process.env).
process.env.R2_BUCKET = 'test-bucket'
process.env.R2_ACCOUNT_ID = 'test-account'
process.env.R2_ACCESS_KEY_ID = 'test-key'
process.env.R2_SECRET_ACCESS_KEY = 'test-secret'

const { mockS3Send } = vi.hoisted(() => ({ mockS3Send: vi.fn().mockResolvedValue({}) }))
vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn().mockImplementation(() => ({ send: mockS3Send })),
  PutObjectCommand: vi.fn().mockImplementation((args: unknown) => args),
}))

import { parseSiteModel } from '../src/lib/cms/schema'
import { buildStaticSiteFiles } from '../src/lib/cms/export'
import { publishFiles } from '../src/lib/cms/publish'
import { contentTypeFor } from '../src/lib/storage/r2'

const ROOT = resolve(process.cwd())

describe('buildStaticSiteFiles', () => {
  it('renders non-empty pages and collects assets into an in-memory map', () => {
    const fixture = JSON.parse(readFileSync(join(ROOT, 'fixtures/forma-site.json'), 'utf-8'))
    const { model } = parseSiteModel(fixture)
    const files = buildStaticSiteFiles(model)

    expect(Object.keys(files)).toContain('index.html')
    expect(files['index.html'].length).toBeGreaterThan(0)
    expect(Object.keys(files).some(k => k.startsWith('assets/css/'))).toBe(true)

    // Pages with zero sections are skipped (same rule as renderStaticSite).
    for (const page of model.pages) {
      if (page.sections.length === 0) expect(files[`${page.slug}.html`]).toBeUndefined()
    }
  })
})

describe('contentTypeFor', () => {
  it('maps known extensions and falls back to octet-stream', () => {
    expect(contentTypeFor('index.html')).toBe('text/html; charset=utf-8')
    expect(contentTypeFor('assets/css/forma.css')).toBe('text/css; charset=utf-8')
    expect(contentTypeFor('a/b/main.js')).toBe('text/javascript; charset=utf-8')
    expect(contentTypeFor('a/b/c.webp')).toBe('image/webp')
    expect(contentTypeFor('mystery.bin')).toBe('application/octet-stream')
  })
})

describe('publishFiles', () => {
  beforeEach(() => mockS3Send.mockClear())

  it('uploads every file under sites/<tenantId>/ with correct key, bucket, and content-type', async () => {
    const enc = new TextEncoder()
    const files = {
      'index.html': enc.encode('<html></html>'),
      'assets/css/forma.css': enc.encode('/* css */'),
    }

    const res = await publishFiles('tenant-x', files)

    expect(res.fileCount).toBe(2)
    expect(res.prefix).toBe('sites/tenant-x/')
    expect(mockS3Send).toHaveBeenCalledTimes(2)

    const args = mockS3Send.mock.calls.map(c => c[0] as { Key: string; Bucket: string; ContentType: string })
    const keys = args.map(a => a.Key)
    expect(keys).toContain('sites/tenant-x/index.html')
    expect(keys).toContain('sites/tenant-x/assets/css/forma.css')

    const html = args.find(a => a.Key.endsWith('index.html'))!
    expect(html.Bucket).toBe('test-bucket')
    expect(html.ContentType).toBe('text/html; charset=utf-8')
  })
})
