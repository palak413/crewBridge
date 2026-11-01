import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router'
import { ButtonLink } from '../components/ui/Button'
import { Logo } from '../components/ui/Logo'

export function NotFoundPage() {
  return (
    <div className="flex min-h-dvh flex-col px-5 py-6 sm:px-10">
      <Link to="/" aria-label="CrewBridge home" className="self-start">
        <Logo />
      </Link>
      <main className="flex flex-1 flex-col items-center justify-center text-center">
        <p className="text-[13px] font-medium text-primary">404</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-[-0.02em] text-ink">This page doesn't exist</h1>
        <p className="mt-2 max-w-sm text-sm text-muted-strong">The link may be outdated, or the page may have moved.</p>
        <ButtonLink to="/" variant="secondary" className="mt-6" leadingIcon={<ArrowLeft className="size-4" aria-hidden />}>
          Back to home
        </ButtonLink>
      </main>
    </div>
  )
}
