import { Bell, CalendarDays, ChevronDown, CornerDownLeft, ListChecks, LogIn, LogOut, Menu, Search, Settings, UserRound, type LucideIcon } from 'lucide-react'
import { useCallback, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { allNav } from '../../app/navigation'
import { cn } from '../../lib/cn'
import { roleLabel } from '../../lib/data/labels'
import { useDataSource } from '../../lib/data/dataContext'
import { useCurrentUser, useEvents, usePeople, useTasks } from '../../lib/data/queries'
import { useSignOut } from '../../lib/session/useSignOut'
import { useDismiss } from '../../lib/useDismiss'
import { Avatar } from '../ui/Avatar'
import { EmptyState } from '../ui/EmptyState'

const iconButton = 'relative inline-flex size-9 items-center justify-center rounded-control text-muted-strong transition-colors hover:bg-subtle hover:text-ink'

interface Result {
  key: string
  label: string
  sub?: string
  icon: LucideIcon
  to: string
}

/** Quick search across pages, events, people and tasks. */
function QuickSearch() {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const close = useCallback(() => setOpen(false), [])
  useDismiss(open, ref, close)

  const events = useEvents()
  const people = usePeople()
  const tasks = useTasks()

  const results = useMemo<Result[]>(() => {
    const q = query.trim().toLowerCase()
    const pages: Result[] = allNav
      .filter((n) => !q || n.label.toLowerCase().includes(q))
      .map((n) => ({
        key: n.to,
        label: n.label,
        sub: 'Page',
        icon: n.icon,
        to: n.to,
      }))
    if (!q) return pages
    const ev: Result[] = (events.data ?? [])
      .filter((e) => e.title.toLowerCase().includes(q))
      .map((e) => ({
        key: e.id,
        label: e.title,
        sub: 'Event',
        icon: CalendarDays,
        to: `/app/events/${e.id}`,
      }))
    const ppl: Result[] = (people.data ?? [])
      .filter((p) => p.name.toLowerCase().includes(q))
      .map((p) => ({
        key: p.id,
        label: p.name,
        sub: roleLabel[p.role],
        icon: UserRound,
        to: `/app/volunteers?person=${p.id}`,
      }))
    const tsk: Result[] = (tasks.data ?? [])
      .filter((t) => t.title.toLowerCase().includes(q))
      .map((t) => ({
        key: t.id,
        label: t.title,
        sub: 'Task',
        icon: ListChecks,
        to: `/app/tasks?event=${t.eventId}&q=${encodeURIComponent(t.title)}`,
      }))
    return [...pages, ...ev, ...ppl, ...tsk].slice(0, 8)
  }, [query, events.data, people.data, tasks.data])

  const go = (to: string) => {
    navigate(to)
    setQuery('')
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative w-full max-w-sm">
      <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
      <input
        type="search"
        role="combobox"
        aria-expanded={open}
        aria-controls="quick-search-results"
        aria-label="Search"
        placeholder="Search pages, events, people, tasks…"
        value={query}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value)
          setActive(0)
          setOpen(true)
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setActive((a) => Math.min(a + 1, results.length - 1))
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setActive((a) => Math.max(a - 1, 0))
          } else if (e.key === 'Enter' && results[active]) {
            e.preventDefault()
            go(results[active].to)
          }
        }}
        className="h-9 w-full rounded-control border border-line bg-canvas pl-9 pr-3 text-[13px] text-ink placeholder:text-muted outline-none transition-[border-color,background-color] focus:border-line-strong focus:bg-surface [&::-webkit-search-cancel-button]:hidden"
      />
      {open && (
        <ul
          id="quick-search-results"
          role="listbox"
          className="absolute left-0 right-0 top-11 z-40 animate-fade-in overflow-hidden rounded-card border border-line bg-surface p-1 shadow-pop"
        >
          {results.length === 0 && <li className="px-3 py-2.5 text-[13px] text-muted-strong">Nothing matches “{query}”.</li>}
          {results.map((item, i) => {
            const Icon = item.icon
            return (
              <li key={item.key} role="option" aria-selected={i === active}>
                <button
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(item.to)}
                  className={cn('flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px]', i === active ? 'bg-subtle text-ink' : 'text-ink-soft')}
                >
                  <Icon aria-hidden className="size-4 text-muted" />
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  {item.sub && <span className="shrink-0 text-2xs text-muted">{item.sub}</span>}
                  {i === active && <CornerDownLeft aria-hidden className="size-3.5 text-muted" />}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function NotificationsMenu() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const close = useCallback(() => setOpen(false), [])
  useDismiss(open, ref, close)
  return (
    <div ref={ref} className="relative">
      <button type="button" aria-label="Notifications" aria-expanded={open} aria-haspopup="dialog" onClick={() => setOpen((o) => !o)} className={iconButton}>
        <Bell className="size-[18px]" aria-hidden strokeWidth={1.75} />
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 top-11 z-40 w-[min(22rem,calc(100vw-2rem))] animate-fade-in rounded-card border border-line bg-surface shadow-pop"
        >
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="text-sm font-semibold">Notifications</p>
          </div>
          <EmptyState compact icon={Bell} title="No notifications yet" description="Task assignments, urgent announcements and deadline reminders will appear here." />
        </div>
      )}
    </div>
  )
}

function ProfileMenu() {
  const me = useCurrentUser()
  const live = useDataSource().kind === 'http'
  const signOut = useSignOut()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const close = useCallback(() => setOpen(false), [])
  useDismiss(open, ref, close)
  const item = 'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] text-ink-soft hover:bg-subtle hover:text-ink'
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label="Account menu"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 items-center gap-1.5 rounded-control pl-1 pr-1.5 transition-colors hover:bg-subtle"
      >
        {me.data ? (
          <Avatar name={me.data.name} size="sm" />
        ) : (
          <span className="flex size-7 items-center justify-center rounded-full border border-line bg-canvas text-muted-strong">
            <UserRound className="size-4" aria-hidden />
          </span>
        )}
        <ChevronDown className="size-3.5 text-muted" aria-hidden />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-11 z-40 w-60 animate-fade-in rounded-card border border-line bg-surface p-1 shadow-pop">
          <div className="px-2.5 py-2">
            <p className="text-[13px] font-medium text-ink">{me.data ? me.data.name : 'Not signed in'}</p>
            <p className="text-xs text-muted-strong">
              {me.data
                ? live
                  ? `${roleLabel[me.data.role]} · ${me.data.email}`
                  : `${roleLabel[me.data.role]} · demo profile, not signed in`
                : "You're previewing the workspace."}
            </p>
          </div>
          <div className="my-1 h-px bg-line" />
          <Link role="menuitem" to="/app/settings" onClick={close} className={item}>
            <Settings className="size-4 text-muted" aria-hidden /> Settings
          </Link>
          {live ? (
            <button type="button" role="menuitem" onClick={() => void signOut()} className={cn(item, 'w-full')}>
              <LogOut className="size-4 text-muted" aria-hidden /> Sign out
            </button>
          ) : (
            <button type="button" role="menuitem" onClick={() => void signOut()} className={cn(item, 'w-full')}>
              <LogIn className="size-4 text-muted" aria-hidden /> Leave demo &amp; sign in
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export function Topbar({ title, onOpenNav }: { title: string; onOpenNav: () => void }) {
  return (
    <header className="sticky top-0 z-30 flex h-15 items-center gap-3 border-b border-line bg-canvas/85 px-4 backdrop-blur-sm sm:px-6">
      <button type="button" aria-label="Open navigation" onClick={onOpenNav} className={cn(iconButton, '-ml-1.5 lg:hidden')}>
        <Menu className="size-5" aria-hidden />
      </button>
      <h1 className="min-w-0 truncate text-[15px] font-semibold text-ink">{title}</h1>
      <div className="ml-auto flex flex-1 items-center justify-end gap-1.5 sm:gap-2">
        <div className="hidden flex-1 justify-end md:flex">
          <QuickSearch />
        </div>
        <NotificationsMenu />
        <ProfileMenu />
      </div>
    </header>
  )
}
