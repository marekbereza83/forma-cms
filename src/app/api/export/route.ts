import { auth } from '@/lib/auth'
import { exportSite } from '@/lib/cms/export'
import { rmSync, existsSync, readFileSync, createWriteStream } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import archiver from 'archiver'

export async function POST(): Promise<Response> {
  const session = await auth()
  if (!session) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const tenantId = session.user.tenantId
  const ts = Date.now()
  const exportDir = join(tmpdir(), `forma-export-${tenantId}-${ts}`)
  const zipPath   = join(tmpdir(), `forma-export-${tenantId}-${ts}.zip`)

  try {
    await exportSite(tenantId, exportDir)

    await new Promise<void>((resolve, reject) => {
      const output  = createWriteStream(zipPath)
      const archive = archiver('zip', { zlib: { level: 6 } })
      output.on('close', resolve)
      archive.on('error', reject)
      archive.pipe(output)
      archive.directory(exportDir, false)
      void archive.finalize()
    })

    const buffer = readFileSync(zipPath)

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="forma-site.zip"',
      },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Export failed'
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  } finally {
    try { if (existsSync(exportDir)) rmSync(exportDir, { recursive: true }) } catch { /* ignore */ }
    try { if (existsSync(zipPath))   rmSync(zipPath) } catch { /* ignore */ }
  }
}
