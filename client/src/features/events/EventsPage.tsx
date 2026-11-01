import { CalendarDays, MapPin, Plus, Search, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { EventCover } from '../../components/data/EventCover'
import { Badge } from '../../components/ui/Badge'
import { ButtonLink } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState'
import { LoadError, Skeleton } from '../../components/ui/LoadState'
import { Segmented } from '../../components/ui/Segmented'
import { eventStatusMeta } from '../../lib/data/labels'
import { useDepartments, useEvents, useTasks } from '../../lib/data/queries'
import type { CrewEvent, EventStatus } from '../../lib/data/types'
import { formatRange, plural } from '../../lib/format'
import { statsFor, type EventStats } from './eventStats'
import { useAccess } from '../../lib/data/permissions'

type Filter = 'all' | EventStatus

function EventCard({ event, stats }: { event: CrewEvent; stats: EventStats }) {
  const status = eventStatusMeta[event.status]
  return (
    <Link
      to={`/app/events/${event.id}`}
      className="group flex flex-col overflow-hidden rounded-card border border-line bg-surface shadow-card transition-[border-color,box-shadow] hover:border-line-strong hover:shadow-pop"
    >
      <EventCover theme={event.coverTheme} url={event.coverUrl} title={event.title} className="h-24 w-full" />
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-3">
          <h2 className="min-w-0 text-[15px] font-semibold leading-snug text-ink group-hover:text-primary">{event.title}</h2>
          <Badge tone={status.tone} dot={event.status === 'live'}>
            {status.label}
          </Badge>
        </div>
        <div className="mt-2 space-y-1 text-[13px] text-muted-strong">
          <p className="flex items-center gap-1.5">
            <CalendarDays className="size-3.5 text-muted" aria-hidden />
            {formatRange(event.startAt, event.endAt)}
          </p>
          <p className="flex items-center gap-1.5 truncate">
            <MapPin className="size-3.5 shrink-0 text-muted" aria-hidden />
            <span className="truncate">{event.location}</span>
          </p>
        </div>
        <div className="mt-auto pt-4">
          <div className="flex items-center justify-between text-xs text-muted-strong">
            <span className="flex items-center gap-1.5">
              <Users className="size-3.5 text-muted" aria-hidden />
              {plural(stats.volunteers, 'volunteer')} · {plural(stats.departments, 'team')}
            </span>
            <span className="tabular-nums">
              {stats.completed}/{stats.total} tasks
            </span>
          </div>
          <div
            className="mt-2 h-1.5 overflow-hidden rounded-full bg-subtle"
            role="progressbar"
            aria-label={`${event.title} task progress`}
            aria-valuenow={stats.progress}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${stats.progress}%` }} />
          </div>
        </div>
      </div>
    </Link>
  )
}

export function EventsPage() {
  const events = useEvents()
  const departments = useDepartments()
  const tasks = useTasks()
  const can = useAccess()
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')

  const list = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (events.data ?? []).filter(
      (e) => (filter === 'all' || e.status === filter) && (!q || e.title.toLowerCase().includes(q) || e.location.toLowerCase().includes(q)),
    )
  }, [events.data, filter, query])

  const counts = useMemo(() => {
    const c: Record<Filter, number> = {
      all: 0,
      draft: 0,
      upcoming: 0,
      live: 0,
      completed: 0,
    }
    for (const e of events.data ?? []) {
      c.all++
      c[e.status]++
    }
    return c
  }, [events.data])

  const loading = events.isPending || departments.isPending || tasks.isPending
  const error = events.error ?? departments.error ?? tasks.error

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[22px] font-semibold tracking-[-0.015em] text-ink">Events</p>
          <p className="mt-1 text-sm text-muted-strong">Every event has its own workspace with departments, volunteers and tasks.</p>
        </div>
        {can.canCreateEvent && (
          <ButtonLink to="/app/events/new" leadingIcon={<Plus className="size-4" aria-hidden />}>
            Create event
          </ButtonLink>
        )}
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Segmented
          label="Filter events by status"
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: 'All', count: counts.all },
            { value: 'live', label: 'Live', count: counts.live },
            { value: 'upcoming', label: 'Upcoming', count: counts.upcoming },
            { value: 'draft', label: 'Draft', count: counts.draft },
            { value: 'completed', label: 'Completed', count: counts.completed },
          ]}
        />
        <div className="relative md:w-64">
          <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <input
            type="search"
            aria-label="Search events"
            placeholder="Search events…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-9 w-full rounded-control border border-line-strong bg-surface pl-9 pr-3 text-[13px] outline-none focus:border-primary focus:ring-3 focus:ring-primary/12"
          />
        </div>
      </div>

      {error ? (
        <div className="rounded-card border border-line bg-surface">
          <LoadError error={error} onRetry={() => void events.refetch()} />
        </div>
      ) : loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" role="status" aria-label="Loading events">
          {[0, 1, 2].map((i) => (
            <div key={i} className="overflow-hidden rounded-card border border-line bg-surface">
              <Skeleton className="h-24 rounded-none" />
              <div className="space-y-2 p-4">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="mt-6 h-1.5 w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : list.length === 0 ? (
        <div className="rounded-card border border-line bg-surface shadow-card">
          {counts.all === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title="No events yet"
              description={
                can.canCreateEvent
                  ? 'Create your first event to set up departments, invite volunteers and start assigning tasks.'
                  : 'Events you’re added to by an organizer will appear here.'
              }
              action={
                can.canCreateEvent && (
                  <ButtonLink to="/app/events/new" size="sm" leadingIcon={<Plus className="size-3.5" aria-hidden />}>
                    Create event
                  </ButtonLink>
                )
              }
            />
          ) : (
            <EmptyState icon={Search} title="No events match" description="Try a different status or search term." />
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((e) => (
            <EventCard key={e.id} event={e} stats={statsFor(e, departments.data ?? [], tasks.data ?? [])} />
          ))}
        </div>
      )}
    </div>
  )
}
