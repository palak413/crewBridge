import { RotateCcw, TriangleAlert } from 'lucide-react'
import { cn } from '../../lib/cn'
import { Button } from './Button'
import { errorMessage } from './toastContext'

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('animate-pulse rounded-md bg-line/70', className)} />
}

/** Generic loading placeholder: a few shimmering rows. */
export function LoadingRows({ rows = 3, className, label = 'Loading' }: { rows?: number; className?: string; label?: string }) {
  return (
    <div role="status" aria-label={label} className={cn('space-y-3 p-4 sm:p-5', className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="size-8 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3 w-2/5" />
            <Skeleton className="h-2.5 w-3/5" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function LoadError({ error, onRetry, className }: { error: unknown; onRetry?: () => void; className?: string }) {
  return (
    <div role="alert" className={cn('flex flex-col items-center px-6 py-10 text-center', className)}>
      <span className="flex size-10 items-center justify-center rounded-card border border-danger/20 bg-danger-soft text-danger">
        <TriangleAlert className="size-[18px]" aria-hidden />
      </span>
      <p className="mt-3 text-sm font-medium text-ink">Couldn't load this</p>
      <p className="mt-1 max-w-xs text-[13px] text-muted-strong">{errorMessage(error)}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-4" onClick={onRetry} leadingIcon={<RotateCcw className="size-3.5" aria-hidden />}>
          Try again
        </Button>
      )}
    </div>
  )
}
