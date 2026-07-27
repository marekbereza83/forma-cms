import { auth } from '@/lib/auth'
import sharp from 'sharp'
import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { r2, R2_BUCKET } from '@/lib/storage/r2'

const ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
const FILENAME_RE = /^(portfolio-card|post-cover)-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp$/

// 'portfolio-card' — karta portfolio na index/portfolio, 16:9 miniatura w gridzie.
// 'post-cover' — okladka publikacji, wieksza bo pelni role hero-image na stronie artykulu.
const UPLOAD_KINDS = {
  'portfolio-card': { idField: 'cardId', width: 800, height: 450 },
  'post-cover':      { idField: 'postId', width: 1200, height: 675 },
} as const
type UploadKind = keyof typeof UPLOAD_KINDS

function detectMime(buf: Buffer): string | null {
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47) return 'image/png'
  if (buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF) return 'image/jpeg'
  if (buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP') return 'image/webp'
  return null
}

function err(status: number, message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function publicUrl(key: string): string {
  return `${process.env.R2_PUBLIC_BASE_URL}/${key}`
}

export async function POST(req: Request): Promise<Response> {
  const session = await auth()
  if (!session) return err(401, 'Unauthorized')

  const tenantId = session.user.tenantId

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return err(400, 'Invalid form data')
  }

  const file = formData.get('file')
  if (!(file instanceof File)) return err(400, 'No file provided')

  const kindRaw = formData.get('kind')
  const kind: UploadKind = typeof kindRaw === 'string' && kindRaw in UPLOAD_KINDS
    ? (kindRaw as UploadKind)
    : 'portfolio-card' // domyslnie — wsteczna zgodnosc z istniejacym klientem kart portfolio
  const { idField, width, height } = UPLOAD_KINDS[kind]

  const id = formData.get(idField)
  if (typeof id !== 'string' || !ID_RE.test(id)) {
    return err(400, `Invalid or missing ${idField}`)
  }

  if (file.type === 'image/svg+xml') return err(400, 'SVG not allowed')

  if (file.size > 5 * 1024 * 1024) {
    return err(413, 'File too large (max 5 MB)')
  }

  const buffer = Buffer.from(await file.arrayBuffer())

  if (!detectMime(buffer)) {
    return err(400, 'Unsupported file type')
  }

  let processed: Buffer
  try {
    processed = await sharp(buffer)
      .resize(width, height, { fit: 'cover', position: 'centre' })
      .webp({ quality: 85 })
      .toBuffer()
  } catch {
    return err(400, 'Image processing failed')
  }

  const filename = `${kind}-${id}.webp`
  const key = `${tenantId}/${filename}`

  try {
    await r2.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: key,
        Body: processed,
        ContentType: 'image/webp',
      })
    )
  } catch (e) {
    return err(500, 'Upload failed')
  }

  return new Response(JSON.stringify({ url: publicUrl(key) }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

export async function DELETE(req: Request): Promise<Response> {
  const session = await auth()
  if (!session) return err(401, 'Unauthorized')

  const tenantId = session.user.tenantId
  const { searchParams } = new URL(req.url)
  const filename = searchParams.get('filename') ?? ''

  if (!FILENAME_RE.test(filename)) {
    return err(400, 'Invalid filename')
  }

  try {
    await r2.send(
      new DeleteObjectCommand({
        Bucket: R2_BUCKET,
        Key: `${tenantId}/${filename}`,
      })
    )
  } catch {
    return err(500, 'Delete failed')
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}