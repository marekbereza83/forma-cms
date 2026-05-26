import { auth } from '@/lib/auth'
import { getTenantScopedClient } from '@/lib/tenant/client'
import { renderPage } from '@/lib/cms/renderer/index'

export async function GET(req: Request) {
  const session = await auth()
  if (!session) return new Response('Unauthorized', { status: 401 })

  const { searchParams } = new URL(req.url)
  const slug = searchParams.get('page') ?? 'index'

  const db = getTenantScopedClient({ tenantId: session.user.tenantId, userId: session.user.userId })
  const site = await db.getSite()
  if (!site) return new Response('Not Found', { status: 404 })

  let html: string
  try {
    html = renderPage(site.model, slug, '/', 'preview')
  } catch {
    return new Response(`Page not found: ${slug}`, { status: 404 })
  }

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
