import { PutObjectCommand } from '@aws-sdk/client-s3'
import { r2, R2_BUCKET, contentTypeFor } from '@/lib/storage/r2'
import { buildStaticSiteFiles } from './export'

export interface PublishResult {
  tenantId: string
  prefix: string
  fileCount: number
}

// Push an already-built file map to R2 under sites/<tenantId>/.
// Split out from publishSite() so it can be tested with a mocked S3 client,
// without touching Prisma.
export async function publishFiles(
  tenantId: string,
  files: Record<string, Uint8Array>
): Promise<PublishResult> {
  const prefix = `sites/${tenantId}/`
  const entries = Object.entries(files)

  for (const [rel, bytes] of entries) {
    await r2.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: prefix + rel,
        Body: bytes,
        ContentType: contentTypeFor(rel),
      })
    )
  }

  return { tenantId, prefix, fileCount: entries.length }
}

// Render the tenant's site and publish it to R2. Mirrors exportSite(), but
// uploads to Cloudflare instead of writing a ZIP/dir.
export async function publishSite(tenantId: string): Promise<PublishResult> {
  const { PrismaClient } = await import('@prisma/client')
  const { parseSiteModel } = await import('./schema')
  const prisma = new PrismaClient()
  try {
    const site = await prisma.site.findFirst({ where: { tenantId } })
    if (!site) throw new Error(`Site not found: ${tenantId}`)
    const { model } = parseSiteModel(JSON.parse(site.model as string))
    const files = buildStaticSiteFiles(model)
    return await publishFiles(tenantId, files)
  } finally {
    await prisma.$disconnect()
  }
}
