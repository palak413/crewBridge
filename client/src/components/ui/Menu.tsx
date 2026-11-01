import type { LucideIcon } from 'lucide-react'
import { useCallback, useRef, useState, type ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { useDismiss } from '../../lib/useDismiss'

export interface MenuItem {
  label: string
  icon?: LucideIcon
  onSelect: () => void
  danger?: boolean
  disabled?: boolean
}

/** Small action menu anchored to a trigger button. Items are real buttons (keyboard reachable). */
export function Menu({
  label,
  trigger,
  items,
  align = 'right',
  triggerClassName,
}: {
  label: string
  trigger: ReactNode
  items: (MenuItem | 'separator')[]
  align?: 'left' | 'right'
  triggerClassName?: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const close = useCallback(() => setOpen(false), [])
  useDismiss(open, ref, close)

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation()
          setOpen((o) => !o)
        }}
        className={cn(
          'inline-flex size-8 items-center justify-center rounded-control text-muted-strong transition-colors hover:bg-subtle hover:text-ink',
          triggerClassName,
        )}
      >
        {trigger}
      </button>
      {open && (
        <div
          role="menu"
          aria-label={label}
          className={cn('absolute top-9 z-40 min-w-48 animate-fade-in rounded-card border border-line bg-surface p-1 shadow-pop', align === 'right' ? 'right-0' : 'left-0')}
        >
          {items.map((item, i) =>
            item === 'separator' ? (
              <div key={`sep-${i}`} className="my-1 h-px bg-line" />
            ) : (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                disabled={item.disabled}
                onClick={(e) => {
                  e.stopPropagation()
                  setOpen(false)
                  item.onSelect()
                }}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] disabled:opacity-50',
                  item.danger ? 'text-danger hover:bg-danger-soft' : 'text-ink-soft hover:bg-subtle hover:text-ink',
                )}
              >
                {item.icon && <item.icon className={cn('size-4', item.danger ? 'text-danger' : 'text-muted')} aria-hidden />}
                {item.label}
              </button>
            ),
          )}
        </div>
      )}
    </div>
  )
}
