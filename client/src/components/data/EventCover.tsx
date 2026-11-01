import { useState } from 'react'
import { coverMeta } from '../../lib/data/labels'
import type { CoverTheme } from '../../lib/data/types'
import { cn } from '../../lib/cn'

/** Event cover: the image URL when set and loadable, otherwise the chosen tonal theme. */
export function EventCover({
  theme,
  url,
  title,
  className,
}: {
  theme: CoverTheme
  url: string | null
  title: string
  className?: string
}) {
  const [failed, setFailed] = useState(false)
  const meta = coverMeta[theme]
  if (url && !failed) {
    return <img src={url} alt={`${title} cover`} onError={() => setFailed(true)} className={cn('object-cover', className)} />
  }
  return (
    <div aria-hidden className={cn('relative overflow-hidden', meta.className, className)}>
      <div className="absolute inset-0 opacity-[0.14] [background-image:radial-gradient(circle_at_1px_1px,currentColor_1px,transparent_0)] [background-size:16px_16px]" />
      <svg viewBox="0 0 200 60" preserveAspectRatio="none" className="absolute inset-x-0 bottom-0 h-1/2 w-full opacity-25">
        <path d="M0 60 C 50 18, 150 18, 200 60" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M0 60 C 60 30, 140 30, 200 60" fill="none" stroke="currentColor" strokeWidth="1" />
      </svg>
    </div>
  )
}
