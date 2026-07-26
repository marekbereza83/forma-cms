import { auth } from '@/lib/auth'
import { getTenantScopedClient } from '@/lib/tenant/client'
import { notFound } from 'next/navigation'
import PostsEditor from './PostsEditor'

export const metadata = { title: 'Publikacje — FORMA' }

export default async function PublikacjePage() {
  const session = await auth()
  const db = getTenantScopedClient({ tenantId: session!.user.tenantId, userId: session!.user.userId })
  const site = await db.getSite()
  if (!site) notFound()

  return <PostsEditor initialPosts={site.model.collections.posts} />
}
