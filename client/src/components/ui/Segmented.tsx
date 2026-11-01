import { useRef, type KeyboardEvent } from 'react'
import { cn } from '../../lib/cn'

/**
 * Segmented tab control (ARIA tablist). Shares its visual language with the landing page use-case tabs.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  className,
}: {
  options: { value: T; label: string; count?: number }[]
  value: T
  onChange: (v: T) => void
  label: string
  className?: string
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const index = options.findIndex((o) => o.value === value)

  const onKey = (e: KeyboardEvent) => {
    const dir = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    if (!dir) return
    e.preventDefault()
    const next = (index + dir + options.length) % options.length
    onChange(options[next].value)
    refs.current[next]?.focus()
  }

  return (
    <div
      role="tablist"
      aria-label={label}
      onKeyDown={onKey}
      className={cn('flex max-w-full gap-1 overflow-x-auto rounded-control border border-line bg-surface p-1 [scrollbar-width:none]', className)}
    >
      {options.map((o, i) => {
        const selected = o.value === value
        return (
          <button
            key={o.value}
            ref={(el) => {
              refs.current[i] = el
            }}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(o.value)}
            className={cn(
              'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-3 text-[13px] transition-colors',
              selected ? 'bg-sage font-medium text-primary' : 'text-muted-strong hover:text-ink',
            )}
          >
            {o.label}
            {o.count !== undefined && (
              <span className={cn('tabular-nums text-2xs', selected ? 'text-primary/80' : 'text-muted')}>{o.count}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}
