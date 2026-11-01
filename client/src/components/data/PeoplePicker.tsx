import { Check, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { availabilityMeta } from '../../lib/data/labels'
import type { Person } from '../../lib/data/types'
import { cn } from '../../lib/cn'
import { Avatar } from '../ui/Avatar'
import { StatusDot } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'
import { EmptyState } from '../ui/EmptyState'
import { Users } from 'lucide-react'

/** Multi-select dialog for choosing people (event members, department members). */
export function PeoplePicker({
  open,
  title,
  description,
  people,
  initialSelected = [],
  confirmLabel,
  onConfirm,
  onClose,
  pending = false,
  emptyText = 'No one to add.',
}: {
  open: boolean
  title: string
  description?: string
  people: Person[]
  initialSelected?: string[]
  confirmLabel: (count: number) => string
  onConfirm: (ids: string[]) => void
  onClose: () => void
  pending?: boolean
  emptyText?: string
}) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Set<string>>(() => new Set(initialSelected))

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return people.filter((p) => !q || p.name.toLowerCase().includes(q) || p.skills.some((s) => s.includes(q)))
  }, [people, query])

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => onConfirm([...selected])} loading={pending}>
            {confirmLabel(selected.size)}
          </Button>
        </>
      }
    >
      {people.length === 0 ? (
        <EmptyState compact icon={Users} title={emptyText} />
      ) : (
        <>
          <div className="relative">
            <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <input
              type="search"
              aria-label="Search people"
              placeholder="Search by name or skill…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-9 w-full rounded-control border border-line-strong bg-surface pl-9 pr-3 text-[13px] outline-none focus:border-primary focus:ring-3 focus:ring-primary/12"
            />
          </div>
          <ul className="mt-3 max-h-[46dvh] divide-y divide-line overflow-y-auto rounded-card border border-line">
            {filtered.length === 0 && <li className="px-3.5 py-6 text-center text-[13px] text-muted-strong">No matches for “{query}”.</li>}
            {filtered.map((p) => {
              const on = selected.has(p.id)
              const av = availabilityMeta[p.availability]
              return (
                <li key={p.id}>
                  <label className={cn('flex cursor-pointer items-center gap-3 px-3.5 py-2.5 transition-colors', on ? 'bg-sage/40' : 'hover:bg-canvas')}>
                    <input type="checkbox" className="sr-only" checked={on} onChange={() => toggle(p.id)} />
                    <span
                      aria-hidden
                      className={cn(
                        'flex size-4.5 shrink-0 items-center justify-center rounded-[5px] border',
                        on ? 'border-primary bg-primary text-white' : 'border-line-strong bg-surface',
                      )}
                    >
                      {on && <Check className="size-3" strokeWidth={3} />}
                    </span>
                    <Avatar name={p.name} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium text-ink">{p.name}</span>
                      <span className="block truncate text-xs text-muted-strong">{p.skills.join(', ') || 'No skills listed'}</span>
                    </span>
                    <span className="hidden items-center gap-1.5 text-xs text-muted-strong sm:flex">
                      <StatusDot tone={av.tone} />
                      {av.label}
                    </span>
                  </label>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </Dialog>
  )
}
