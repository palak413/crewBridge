import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  compact = false,
  className,
}: {
  icon: LucideIcon
  title: string
  description?: ReactNode
  action?: ReactNode
  compact?: boolean
  className?: string
}) {
  return (
    <div className={cn('flex flex-col items-center text-center', compact ? 'px-4 py-7' : 'px-6 py-12', className)}>
      <span className="flex size-10 items-center justify-center rounded-card border border-line bg-canvas text-muted-strong">
        <Icon className="size-[18px]" aria-hidden strokeWidth={1.75} />
      </span>
      <p className="mt-3 text-sm font-medium text-ink">{title}</p>
      {description && <p className="mt-1 max-w-xs text-[13px] leading-5 text-muted-strong">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
