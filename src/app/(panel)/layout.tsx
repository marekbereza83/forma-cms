import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect('/login')

  return (
    <div className="panel-shell">
      <header className="panel-header">
        <span className="panel-brand">FORMA</span>
        <nav className="panel-nav">
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/edit/fields">Edycja</Link>
          <Link href="/preview" target="_blank">Podgląd</Link>
        </nav>
      </header>
      {children}
    </div>
  )
}
