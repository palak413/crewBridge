import { CircleAlert, CircleCheck, X } from 'lucide-react'
import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '../../lib/cn'
import { ToastContext, type ToastInput } from './toastContext'

interface ToastItem extends ToastInput {
  id: number
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const nextId = useRef(1)

  const dismiss = useCallback((id: number) => setItems((list) => list.filter((t) => t.id !== id)), [])

  const toast = useCallback(
    (input: ToastInput) => {
      const id = nextId.current++
      setItems((list) => [...list.slice(-2), { ...input, id }])
      window.setTimeout(() => dismiss(id), input.tone === 'danger' ? 6000 : 3500)
    },
    [dismiss],
  )

  const value = useMemo(() => ({ toast }), [toast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      {createPortal(
        <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4 sm:bottom-6 sm:right-6 sm:left-auto sm:items-end">
          {items.map((t) => (
            <div
              key={t.id}
              role={t.tone === 'danger' ? 'alert' : 'status'}
              className="pointer-events-auto flex w-full max-w-sm animate-fade-in items-start gap-2.5 rounded-card border border-line bg-surface px-3.5 py-3 shadow-pop"
            >
              {t.tone === 'danger' ? (
                <CircleAlert className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden />
              ) : (
                <CircleCheck className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
              )}
              <p className={cn('min-w-0 flex-1 text-[13px] leading-5 text-ink')}>{t.message}</p>
              <button type="button" aria-label="Dismiss" onClick={() => dismiss(t.id)} className="-mr-1 rounded-md p-0.5 text-muted hover:text-ink">
                <X className="size-3.5" aria-hidden />
              </button>
            </div>
          ))}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  )
}
