import { auth } from '@/lib/auth'
import { exportSite } from '@/lib/cms/export'
import { rmSync, existsSync, readFileSync, readdirSync, statSync } from 'fs'
import { tmpdir } from 'os'
import { join, relative } from 'path'
import { zipSync, type Zippable } from 'fflate'

// Recursively collect all files under `dir` into a fflate Zippable map.
// Keys are POSIX-style relative paths (ZIP entries).
function collectFiles(dir: string, root: string, out: Zippable): void {
  for (const entry of readdirSync(dir)) {
    const abs = join(dir, entry)
    const key = relative(root, abs).replaceAll('\\', '/')  // ZIP uses forward slashes
    if (statSync(abs).isDirectory()) {
      collectFiles(abs, root, out)
    } else {
      out[key] = new Uint8Array(readFileSync(abs))
    }
  }
}

export async function POST(): Promise<Response> {
  const session = await auth()
  if (!session) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const tenantId = session.user.tenantId
  const exportDir = join(tmpdir(), `forma-export-${tenantId}-${Date.now()}`)

  try {
    await exportSite(tenantId, exportDir)

    // Build ZIP entirely in memory — no WriteStream, no tmp ZIP file.
    // fflate.zipSync() is synchronous and works on any runtime (Vercel, Edge, Node).
    const files: Zippable = {}
    collectFiles(exportDir, exportDir, files)
    const zipped = zipSync(files, { level: 6 })
    const buffer = Buffer.from(zipped)

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
    // Clean up /tmp export dir regardless of outcome
    try { if (existsSync(exportDir)) rmSync(exportDir, { recursive: true }) } catch { /* ignore */ }
  }
}
