import { Hash, Users } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { Avatar } from '../../components/ui/Avatar'
import { cn } from '../../lib/cn'
import type { ChatState } from '../../lib/chat/chatStore'
import type { buildSections, ListItem } from './sections'

export function ChannelList({
  sections,
  activeKey,
  unread,
  online,
  presence,
  onSelect,
}: {
  sections: ReturnType<typeof buildSections>
  activeKey: string | null
  unread: ChatState['unread']
  online: ChatState['online']
  /** Whether presence is real (live) — the demo has none. */
  presence: boolean
  onSelect: (item: ListItem) => void
}) {
  const [query, setQuery] = useState('')
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const f = (list: ListItem[]) => (q ? list.filter((i) => i.name.toLowerCase().includes(q) || i.hint.toLowerCase().includes(q)) : list)
    return { events: f(sections.events), departments: f(sections.departments), direct: f(sections.direct) }
  }, [query, sections])

  const row = (item: ListItem, icon: ReactNode) => {
    const count = unread[item.key] ?? 0
    const isOnline = online[item.ref.id]
    return (
      <li key={item.key}>
        <button
          type="button"
          onClick={() => onSelect(item)}
          aria-current={activeKey === item.key ? 'true' : undefined}
          className={cn(
            'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors',
            activeKey === item.key ? 'bg-sage text-ink' : 'text-ink-soft hover:bg-subtle hover:text-ink',
          )}
        >
          <span className="relative shrink-0">
            {icon}
            {presence && item.person && (
              <span aria-hidden className={cn('absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full ring-2 ring-surface', isOnline ? 'bg-success' : 'bg-line-strong')} />
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className={cn('block truncate text-[13px]', count ? 'font-semibold text-ink' : 'font-medium')}>{item.name}</span>
            <span className="block truncate text-2xs text-muted-strong">
              {item.person && presence ? (isOnline ? 'Online' : isOnline === false ? 'Offline' : item.hint) : item.hint}
            </span>
          </span>
          {count > 0 && (
            <span className="rounded-full bg-primary px-1.5 py-px text-2xs font-semibold tabular-nums text-white" aria-label={`${count} unread`}>
              {count > 99 ? '99+' : count}
            </span>
          )}
        </button>
      </li>
    )
  }

  const section = (title: string, items: ListItem[], icon: (i: ListItem) => ReactNode, empty: string) => (
    <div>
      <p className="px-2.5 pb-1 pt-3 text-2xs font-medium uppercase tracking-[0.06em] text-muted">{title}</p>
      {items.length ? <ul className="space-y-0.5">{items.map((i) => row(i, icon(i)))}</ul> : <p className="px-2.5 py-1.5 text-xs text-muted-strong">{empty}</p>}
    </div>
  )

  const channelIcon = (Icon: typeof Hash) => (
    <span className="flex size-7 items-center justify-center rounded-lg border border-line bg-canvas text-muted-strong">
      <Icon className="size-3.5" aria-hidden />
    </span>
  )

  return (
    <nav aria-label="Conversations" className="flex h-full flex-col">
      <div className="border-b border-line p-3">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Find a conversation"
          aria-label="Find a conversation"
          className="h-8 w-full rounded-control border border-line bg-canvas px-2.5 text-[13px] text-ink placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
        />
      </div>
      <div className="flex-1 overflow-y-auto px-2 pb-3">
        {section('Event channels', filtered.events, () => channelIcon(Hash), query ? 'No matches' : 'Join an event to see its channel.')}
        {section('Departments', filtered.departments, () => channelIcon(Users), query ? 'No matches' : 'No department channels yet.')}
        {section(
          'Direct messages',
          filtered.direct,
          (i) => (
            <Avatar name={i.name} size="sm" />
          ),
          query ? 'No matches' : 'People who share an event with you appear here.',
        )}
      </div>
    </nav>
  )
}
