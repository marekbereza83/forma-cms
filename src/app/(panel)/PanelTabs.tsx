'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

/**
 * Zakładki główne panelu. Kolejność odpowiada typowemu przepływowi pracy:
 * najpierw treść stron, potem publikacje, na końcu podgląd przed publikacją.
 */
const TABS = [
  { href: '/dashboard',       label: 'Start' },
  { href: '/edit/fields',     label: 'Treść stron' },
  { href: '/edit/publikacje', label: 'Publikacje' },
]

export default function PanelTabs() {
  const pathname = usePathname()

  return (
    <nav className="panel-tabs" aria-label="Sekcje panelu">
      {TABS.map(tab => {
        const isActive = pathname === tab.href || pathname.startsWith(`${tab.href}/`)
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={isActive ? 'panel-tab is-active' : 'panel-tab'}
            aria-current={isActive ? 'page' : undefined}
          >
            {tab.label}
          </Link>
        )
      })}
      <a
        href="/preview"
        target="_blank"
        rel="noopener noreferrer"
        className="panel-tab panel-tab-external"
      >
        Podgląd
      </a>
    </nav>
  )
}
