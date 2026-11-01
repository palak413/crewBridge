import { CircleAlert, CircleCheck, Info, TriangleAlert } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

type Tone = 'info' | 'success' | 'warning' | 'danger'

const tones: Record<Tone, { wrap: string; icon: typeof Info }> = {
  info: { wrap: 'bg-sage/70 border-sage-strong text-ink-soft [&_svg]:text-primary', icon: Info },
  success: { wrap: 'bg-success-soft border-success/20 text-ink-soft [&_svg]:text-success', icon: CircleCheck },
  warning: { wrap: 'bg-warning-soft border-warning/20 text-ink-soft [&_svg]:text-warning', icon: TriangleAlert },
  danger: { wrap: 'bg-danger-soft border-danger/20 text-ink-soft [&_svg]:text-danger', icon: CircleAlert },
}

export function Alert({
  tone = 'info',
  title,
  children,
  className,
}: {
  tone?: Tone
  title?: string
  children?: ReactNode
  className?: string
}) {
  const { wrap, icon: Icon } = tones[tone]
  return (
    <div
      role={tone === 'danger' || tone === 'warning' ? 'alert' : 'status'}
      className={cn('flex gap-2.5 rounded-control border px-3.5 py-3 text-[13px] leading-5', wrap, className)}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="min-w-0">
        {title && <p className="font-medium text-ink">{title}</p>}
        {children && <div className={cn(title && 'mt-0.5')}>{children}</div>}
      </div>
    </div>
  )
}
