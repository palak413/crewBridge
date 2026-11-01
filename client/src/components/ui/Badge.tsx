import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

export type BadgeTone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger'

const tones: Record<BadgeTone, string> = {
  neutral: 'bg-subtle text-muted-strong border-line',
  primary: 'bg-sage text-primary border-sage-strong',
  success: 'bg-success-soft text-success border-success/15',
  warning: 'bg-warning-soft text-warning border-warning/15',
  danger: 'bg-danger-soft text-danger border-danger/15',
}

const dots: Record<BadgeTone, string> = {
  neutral: 'bg-muted',
  primary: 'bg-primary',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
}

export function Badge({
  tone = 'neutral',
  dot = false,
  children,
  className,
}: {
  tone?: BadgeTone
  dot?: boolean
  children: ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex h-5.5 items-center gap-1.5 rounded-md border px-1.5 text-2xs font-medium whitespace-nowrap',
        tones[tone],
        className,
      )}
    >
      {dot && <span aria-hidden className={cn('size-1.5 rounded-full', dots[tone])} />}
      {children}
    </span>
  )
}

export function StatusDot({ tone, className }: { tone: BadgeTone; className?: string }) {
  return <span aria-hidden className={cn('inline-block size-2 rounded-full', dots[tone], className)} />
}
