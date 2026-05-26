import { auth } from '@/lib/auth'
import { getTenantScopedClient } from '@/lib/tenant/client'
import { notFound } from 'next/navigation'
import FieldsForm from './FieldsForm'

export const metadata = { title: 'Edycja treści — FORMA' }

export default async function FieldsPage() {
  const session = await auth()
  const db = getTenantScopedClient({ tenantId: session!.user.tenantId, userId: session!.user.userId })
  const site = await db.getSite()
  if (!site) notFound()

  return <FieldsForm initialModel={site.model} />
}
