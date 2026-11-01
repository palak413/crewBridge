import { X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router'
import { navItemFor } from '../../app/navigation'
import { DataProvider } from '../../lib/data/DataProvider'
import { createHttpSource } from '../../lib/data/httpSource'
import { createLocalDemoSource } from '../../lib/data/localDemoSource'
import { getMode } from '../../lib/session/mode'
import { useDismiss } from '../../lib/useDismiss'
import { ToastProvider } from '../ui/Toast'
import { DemoBanner } from './DemoBanner'
import { RequireSession } from './RequireSession'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'

export function AppShell() {
  const location = useLocation()
  const [mode] = useState(getMode)
  const [source] = useState(() => (mode === 'live' ? createHttpSource() : mode === 'demo' ? createLocalDemoSource() : null))

  // No workspace chosen yet: sign in (or pick the demo from the sign-in page).
  if (!source) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />

  return (
    <DataProvider source={source}>
      <ToastProvider>
        {source.kind === 'http' ? (
          <RequireSession>
            <Shell />
          </RequireSession>
        ) : (
          <Shell />
        )}
      </ToastProvider>
    </DataProvider>
  )
}

function Shell() {
  const { pathname } = useLocation()
  const [navOpen, setNavOpen] = useState(false)
  const drawerRef = useRef<HTMLDivElement>(null)
  const closeNav = useCallback(() => setNavOpen(false), [])
  useDismiss(navOpen, drawerRef, closeNav)

  const title = navItemFor(pathname)?.title ?? 'CrewBridge'

  useEffect(() => {
    document.title = `${title} · CrewBridge`
  }, [title])

  // Lock background scroll while the mobile drawer is open.
  useEffect(() => {
    if (!navOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [navOpen])

  return (
    <div className="min-h-dvh">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-control focus:bg-surface focus:px-3 focus:py-2 focus:text-sm focus:shadow-pop"
      >
        Skip to content
      </a>

      <aside className="fixed inset-y-0 left-0 z-20 hidden w-62 border-r border-line bg-surface lg:block">
        <Sidebar />
      </aside>

      {navOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 animate-fade-in bg-ink/20" aria-hidden />
          <div
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
            className="absolute inset-y-0 left-0 w-[min(18rem,85vw)] animate-slide-in border-r border-line bg-surface shadow-pop"
          >
            <button
              type="button"
              aria-label="Close navigation"
              onClick={closeNav}
              className="absolute right-3 top-3.5 inline-flex size-8 items-center justify-center rounded-control text-muted-strong hover:bg-subtle hover:text-ink"
            >
              <X className="size-4" aria-hidden />
            </button>
            <Sidebar onNavigate={closeNav} />
          </div>
        </div>
      )}

      <div className="lg:pl-62">
        <Topbar title={title} onOpenNav={() => setNavOpen(true)} />
        <main id="main" className="mx-auto w-full max-w-[1240px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <DemoBanner />
          <Outlet />
        </main>
      </div>
    </div>
  )
}
