import { auth } from '@/lib/auth'
import { publishSite } from '@/lib/cms/publish'

// POST /api/publish — render the current tenant's site and push it to Cloudflare R2
// under sites/<tenantId>/. The site-router Worker (workers/site-router/) serves it
// on the tenant's custom domain. Sits alongside /api/export (ZIP download) — neither
// replaces the other.
export async function POST(): Promise<Response> {
  const session = await auth()
  if (!session) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const result = await publishSite(session.user.tenantId)
    return new Response(
      JSON.stringify({
        ok: true,
        fileCount: result.fileCount,
        url: process.env.SITE_PUBLIC_BASE_URL ?? null,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Publish failed'
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
