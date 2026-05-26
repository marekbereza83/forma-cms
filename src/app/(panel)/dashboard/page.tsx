import { auth } from '@/lib/auth'
import { getTenantScopedClient } from '@/lib/tenant/client'
import Link from 'next/link'

export const metadata = { title: 'Dashboard — FORMA' }

export default async function DashboardPage() {
  const session = await auth()
  const db = getTenantScopedClient({ tenantId: session!.user.tenantId, userId: session!.user.userId })
  const site = await db.getSite()

  return (
    <div>
      <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '1.4rem', marginBottom: '8px' }}>
        {site?.model.meta.brandName ?? 'Twoja strona'}
      </h1>
      <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginBottom: '32px' }}>
        {site?.model.meta.title}
      </p>

      <div className="dashboard-grid">
        <Link href="/edit/fields" className="dashboard-card">
          <p className="dashboard-card-title">Edycja treści</p>
          <p className="dashboard-card-desc">Nagłówki, opisy, ceny, kontakt</p>
        </Link>

        <Link href="/preview" target="_blank" className="dashboard-card">
          <p className="dashboard-card-title">Podgląd strony</p>
          <p className="dashboard-card-desc">Otwiera wyrenderowany HTML w nowej karcie</p>
        </Link>
      </div>
    </div>
  )
}
