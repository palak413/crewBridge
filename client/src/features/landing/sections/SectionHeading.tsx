import type { ReactNode } from 'react'
import { cn } from '../../../lib/cn'

export function SectionHeading({
  eyebrow,
  title,
  body,
  align = 'left',
  id,
}: {
  eyebrow: string
  title: ReactNode
  body?: ReactNode
  align?: 'left' | 'center'
  id?: string
}) {
  return (
    <div className={cn('max-w-2xl', align === 'center' && 'mx-auto text-center')}>
      <p className="text-[13px] font-medium text-primary">{eyebrow}</p>
      <h2 id={id} className="mt-2.5 text-[28px] font-semibold leading-[1.15] tracking-[-0.025em] text-ink sm:text-[34px]">
        {title}
      </h2>
      {body && <p className="mt-4 text-[15.5px] leading-7 text-muted-strong">{body}</p>}
    </div>
  )
}
