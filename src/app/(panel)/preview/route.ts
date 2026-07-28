export const dynamic = 'force-dynamic'
import { auth } from '@/lib/auth'
import { getTenantScopedClient } from '@/lib/tenant/client'
import { renderPage } from '@/lib/cms/renderer/index'
import { renderPostsListPage, renderPostPage } from '@/lib/cms/renderer/publikacje'

export async function GET(req: Request) {
  const session = await auth()
  if (!session) return new Response('Unauthorized', { status: 401 })

  const { searchParams } = new URL(req.url)
  const slug = searchParams.get('page') ?? 'index'

  const db = getTenantScopedClient({ tenantId: session.user.tenantId, userId: session.user.userId })
  const site = await db.getSite()
  if (!site) return new Response('Not Found', { status: 404 })

  // Strony publikacji NIE przechodza przez renderPage() — maja wlasne renderery
  // (renderer/publikacje.ts), a w model.pages siedzi tylko stub z sections: []
  // (patrz migrate-add-publikacje-page.ts). Bez tego rozgalezienia renderPage
  // zwrocilby pusta strone: brak nav, brak stopki, pusty <main>.
  let html: string
  try {
    if (slug === 'publikacje') {
      html = renderPostsListPage(site.model, '/', 'preview')
    } else if (slug.startsWith('publikacje/')) {
      const postSlug = slug.slice('publikacje/'.length)
      // Szukamy wsrod WSZYSTKICH postow, nie tylko opublikowanych — podglad ma sluzyc
      // wlasnie do obejrzenia szkicu przed publikacja.
      const post = site.model.collections.posts.find(p => p.slug === postSlug)
      if (!post) return new Response(`Publikacja nie znaleziona: ${postSlug}`, { status: 404 })
      html = renderPostPage(site.model, post, '/', 'preview')
    } else {
      html = renderPage(site.model, slug, '/', 'preview')
    }
  } catch (err) {
    return new Response(`Nie udało się wyrenderować strony "${slug}": ${err instanceof Error ? err.message : 'nieznany błąd'}`, { status: 500 })
  }

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
