import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useState, type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { ApiError } from '../../lib/api/client'
import { useCurrentUser } from '../../lib/data/queries'
import { setMode } from '../../lib/session/mode'
import { Logo } from '../ui/Logo'
import { LoadError, Skeleton } from '../ui/LoadState'

const isUnauthorized = (err: unknown) => err instanceof ApiError && err.code === 'UNAUTHORIZED'

/**
 * Live workspace guard: confirms the session with GET /auth/me before rendering, and sends the user
 * back to sign in if the session is missing or expires mid-use (any API call answering 401).
 */
export function RequireSession({ children }: { children: ReactNode }) {
  const me = useCurrentUser()
  const qc = useQueryClient()
  const location = useLocation()
  const [expired, setExpired] = useState(false)

  useEffect(() => {
    const onError = (err: unknown) => {
      if (isUnauthorized(err)) setExpired(true)
    }
    const unsubQ = qc.getQueryCache().subscribe((e) => {
      if (e.type === 'updated' && e.action.type === 'error') onError(e.action.error)
    })
    const unsubM = qc.getMutationCache().subscribe((e) => {
      if (e.type === 'updated' && e.action.type === 'error') onError(e.action.error)
    })
    return () => {
      unsubQ()
      unsubM()
    }
  }, [qc])

  if (expired || isUnauthorized(me.error)) {
    setMode(null)
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: location.pathname + location.search,
          expired: !!me.data,
        }}
      />
    )
  }

  if (me.isPending) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4" role="status" aria-label="Loading your workspace">
        <Logo />
        <Skeleton className="h-2 w-40" />
      </div>
    )
  }

  if (me.isError) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-4">
        <div className="w-full max-w-sm rounded-card border border-line bg-surface shadow-card">
          <LoadError error={me.error} onRetry={() => void me.refetch()} />
        </div>
      </div>
    )
  }

  return children
}
