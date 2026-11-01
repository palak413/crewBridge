import { RotateCcw } from 'lucide-react'
import { isRouteErrorResponse, Link, useRouteError } from 'react-router'
import { Button } from '../components/ui/Button'
import { Logo } from '../components/ui/Logo'
import { NotFoundPage } from './NotFoundPage'

/**
 * Router error boundary. Real 404s get the not-found page; anything else (e.g. a code chunk
 * that failed to download after a deploy, or a render error) gets an honest error with reload.
 */
export function RouteError() {
  const error = useRouteError()
  if (isRouteErrorResponse(error) && error.status === 404) return <NotFoundPage />

  const chunkFailed = error instanceof Error && /dynamically imported module|Importing a module script failed|Failed to fetch/i.test(error.message)

  return (
    <div className="flex min-h-dvh flex-col px-5 py-6 sm:px-10">
      <Link to="/" aria-label="CrewBridge home" className="self-start">
        <Logo />
      </Link>
      <main className="flex flex-1 flex-col items-center justify-center text-center">
        <p className="text-[13px] font-medium text-danger">Something went wrong</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-[-0.02em] text-ink">{chunkFailed ? 'This page failed to load' : 'An unexpected error occurred'}</h1>
        <p className="mt-2 max-w-sm text-sm text-muted-strong">
          {chunkFailed ? 'A newer version may be available, or your connection dropped. Reloading usually fixes it.' : 'Try reloading the page. Your data is safe.'}
        </p>
        <Button className="mt-6" onClick={() => window.location.reload()} leadingIcon={<RotateCcw className="size-4" aria-hidden />}>
          Reload page
        </Button>
      </main>
    </div>
  )
}
