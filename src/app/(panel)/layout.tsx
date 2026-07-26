import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import PanelTabs from './PanelTabs'
import PublishButton from './dashboard/PublishButton'

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect('/login')

  return (
    <div className="panel-shell">
      <header className="panel-header">
        <div className="panel-header-top">
          <span className="panel-brand">FORMA</span>
          {/* Publikacja dostepna z kazdej zakladki — po edycji tresci lub artykulu
              nie trzeba wracac na Start, zeby wypchnac zmiany na zywa strone. */}
          <PublishButton variant="inline" />
        </div>
        <PanelTabs />
      </header>
      {children}
    </div>
  )
}
