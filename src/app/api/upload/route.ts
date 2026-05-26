import { auth } from '@/lib/auth'
import { mkdir, writeFile, unlink } from 'fs/promises'
import { join } from 'path'
import sharp from 'sharp'

const CARD_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
const FILENAME_RE = /^portfolio-card-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp$/

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

  const cardId = formData.get('cardId')
  if (typeof cardId !== 'string' || !CARD_ID_RE.test(cardId)) {
    return err(400, 'Invalid or missing cardId (expected UUID v4)')
  }

  // (a) SVG rejected explicitly — vector format can embed scripts
  if (file.type === 'image/svg+xml') return err(400, 'SVG not allowed')

  // (b) Size check before buffering
  if (file.size > 5 * 1024 * 1024) return err(413, 'File too large (max 5 MB)')

  const buffer = Buffer.from(await file.arrayBuffer())

  // (c) Magic bytes — fast rejection of disguised non-images
  if (!detectMime(buffer)) return err(400, 'Unsupported file type')

  // (d) sharp — deep sanitization + resize to portfolio slot 800×450, output webp
  let processed: Buffer
  try {
    processed = await sharp(buffer)
      .resize(800, 450, { fit: 'cover', position: 'centre' })
      .webp({ quality: 85 })
      .toBuffer()
  } catch {
    return err(400, 'Image processing failed')
  }

  const filename = `portfolio-card-${cardId}.webp`
  const uploadDir = join(process.cwd(), 'public', 'uploads', tenantId)
  await mkdir(uploadDir, { recursive: true })
  await writeFile(join(uploadDir, filename), processed)

  const url = `/uploads/${tenantId}/${filename}?v=${Date.now()}`
  return new Response(JSON.stringify({ url }), {
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

  const filePath = join(process.cwd(), 'public', 'uploads', tenantId, filename)
  try {
    await unlink(filePath)
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (e: unknown) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') {
      return err(404, 'File not found')
    }
    return err(500, 'Delete failed')
  }
}
