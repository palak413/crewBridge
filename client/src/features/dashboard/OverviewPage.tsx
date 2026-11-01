import { ArrowRight, CalendarClock, CalendarDays, CircleCheck, History, ListChecks, Plus, UserPlus, Users, type LucideIcon } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { Avatar } from '../../components/ui/Avatar'
import { Badge, StatusDot } from '../../components/ui/Badge'
import { ButtonLink } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState'
import { LoadError, LoadingRows, Skeleton } from '../../components/ui/LoadState'
import { Panel } from '../../components/ui/Panel'
import { cn } from '../../lib/cn'
import { availabilityMeta, eventStatusMeta, priorityMeta } from '../../lib/data/labels'
import { useActivity, useCurrentUser, useDepartments, useEvents, usePeople, useTasks } from '../../lib/data/queries'
import { availabilities } from '../../lib/data/schemas'
import type { Activity, CrewEvent, Department, Person, Task } from '../../lib/data/types'
import { dueInfo, formatRange, timeAgo } from '../../lib/format'
import { CompletionChart } from './CompletionChart'
import { greetingFor } from './greeting'
import { useAccess } from '../../lib/data/permissions'

const DAY = 86_400_000

function MetricStrip({ metrics, loading }: { metrics: { label: string; icon: LucideIcon; value: number; hint: string; to: string }[]; loading: boolean }) {
  return (
    <section aria-label="Key metrics" className="grid grid-cols-2 overflow-hidden rounded-card border border-line bg-surface shadow-card lg:grid-cols-4">
      {metrics.map(({ label, icon: Icon, value, hint, to }, i) => (
        <Link
          key={label}
          to={to}
          className={cn(
            'group px-4 py-4 transition-colors hover:bg-canvas sm:px-5',
            i % 2 === 1 && 'border-l border-line',
            i >= 2 && 'border-t border-line lg:border-t-0',
            i === 2 && 'lg:border-l',
          )}
        >
          <div className="flex items-center gap-2 text-[13px] text-muted-strong">
            <Icon className="size-4 text-muted" aria-hidden strokeWidth={1.75} />
            {label}
          </div>
          {loading ? (
            <Skeleton className="mt-2.5 h-7 w-12" />
          ) : (
            <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-ink" aria-label={`${label}: ${value}`}>
              {value}
            </p>
          )}
          <p className="mt-0.5 text-xs text-muted">{hint}</p>
        </Link>
      ))}
    </section>
  )
}

function SetupGuide({ events, departments, people, tasks }: { events: CrewEvent[]; departments: Department[]; people: Person[]; tasks: Task[] }) {
  const steps = [
    { title: 'Create your first event', body: 'Name, dates, location and a cover.', to: '/app/events/new', icon: CalendarDays, done: events.length > 0 },
    { title: 'Add departments', body: 'Registration, hospitality, tech — each gets its own channel.', to: events[0] ? `/app/events/${events[0].id}?tab=departments` : '/app/events', icon: Users, done: departments.length > 0 },
    { title: 'Add volunteers', body: 'Build your directory and place people on events.', to: '/app/volunteers', icon: UserPlus, done: people.some((p) => p.role !== 'organizer') },
    { title: 'Create and assign tasks', body: 'Track work on a shared board.', to: '/app/tasks', icon: ListChecks, done: tasks.some((t) => t.assigneeId) },
  ]
  if (steps.every((s) => s.done)) return null
  return (
    <Panel title="Get your workspace ready" description={`${steps.filter((s) => s.done).length} of 4 steps done`}>
      <ol className="divide-y divide-line">
        {steps.map(({ title, body, to, icon: Icon, done }, i) => (
          <li key={title}>
            <Link to={to} className="group flex items-center gap-3.5 px-4 py-3.5 transition-colors hover:bg-canvas sm:px-5">
              <span
                className={cn(
                  'flex size-8 shrink-0 items-center justify-center rounded-full border text-xs font-medium',
                  done ? 'border-sage-strong bg-sage text-primary' : 'border-line bg-surface text-muted-strong group-hover:border-sage-strong group-hover:bg-sage group-hover:text-primary',
                )}
              >
                {done ? <CircleCheck className="size-4" aria-label="Done" /> : i + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className={cn('flex items-center gap-2 text-sm font-medium', done ? 'text-muted-strong' : 'text-ink')}>
                  <Icon className="size-4 text-muted" aria-hidden strokeWidth={1.75} />
                  {title}
                </span>
                <span className="mt-0.5 block text-[13px] text-muted-strong">{body}</span>
              </span>
              <ArrowRight className="size-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-primary" aria-hidden />
            </Link>
          </li>
        ))}
      </ol>
    </Panel>
  )
}

function EventsPanel({ events, tasks }: { events: CrewEvent[]; tasks: Task[] }) {
  const canCreate = useAccess().canCreateEvent
  const active = events.filter((e) => e.status !== 'completed').slice(0, 4)
  return (
    <Panel
      title="Events"
      description="Status and progress for each active event"
      actions={
        <Link to="/app/events" className="inline-flex items-center gap-1 text-[13px] font-medium text-primary hover:underline">
          All events <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      }
    >
      {active.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No active events"
          description={canCreate ? 'Events you create show up here with their volunteer count and task progress.' : 'Events an organizer adds you to show up here.'}
          action={
            canCreate && <ButtonLink to="/app/events/new" variant="secondary" size="sm" leadingIcon={<Plus className="size-3.5" aria-hidden />}>
              Create event
            </ButtonLink>
          }
        />
      ) : (
        <ul className="divide-y divide-line">
          {active.map((e) => {
            const own = tasks.filter((t) => t.eventId === e.id)
            const done = own.filter((t) => t.status === 'completed').length
            const pct = own.length ? Math.round((done / own.length) * 100) : 0
            const st = eventStatusMeta[e.status]
            return (
              <li key={e.id}>
                <Link to={`/app/events/${e.id}`} className="flex flex-col gap-2 px-4 py-3.5 transition-colors hover:bg-canvas sm:flex-row sm:items-center sm:gap-4 sm:px-5">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium text-ink">{e.title}</span>
                      <Badge tone={st.tone} dot={e.status === 'live'}>
                        {st.label}
                      </Badge>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted-strong">
                      {formatRange(e.startAt, e.endAt)} · {e.memberIds.length} volunteers
                    </p>
                  </div>
                  <div className="flex items-center gap-3 sm:w-48">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-subtle">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-16 text-right text-xs tabular-nums text-muted-strong">
                      {done}/{own.length} done
                    </span>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </Panel>
  )
}

function DeadlinesPanel({ tasks, people, now }: { tasks: Task[]; people: Person[]; now: Date }) {
  const horizon = now.getTime() + 2 * DAY
  const due = tasks
    .filter((t) => t.status !== 'completed' && t.dueAt && Date.parse(t.dueAt) <= horizon)
    .sort((a, b) => Date.parse(a.dueAt!) - Date.parse(b.dueAt!))
    .slice(0, 6)
  const name = (id: string | null) => (id ? (people.find((p) => p.id === id)?.name ?? 'Unknown') : 'Unassigned')
  return (
    <Panel title="Upcoming deadlines" description="Overdue and due in the next 48 hours">
      {due.length === 0 ? (
        <EmptyState compact icon={CalendarClock} title="Nothing due" description="Tasks due in the next 48 hours are listed here." />
      ) : (
        <ul className="divide-y divide-line">
          {due.map((t) => {
            const d = dueInfo(t.dueAt!, now)
            return (
              <li key={t.id}>
                <Link to={`/app/tasks?event=${t.eventId}`} className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-canvas sm:px-5">
                  <span
                    aria-hidden
                    className={cn('mt-1.5 size-2 shrink-0 rounded-full', d.state === 'overdue' ? 'bg-danger' : d.state === 'soon' ? 'bg-warning' : 'bg-line-strong')}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium text-ink">{t.title}</span>
                    <span className="block truncate text-xs text-muted-strong">
                      {name(t.assigneeId)} · {priorityMeta[t.priority].label}
                    </span>
                  </span>
                  <span className={cn('shrink-0 text-xs', d.state === 'overdue' ? 'font-medium text-danger' : d.state === 'soon' ? 'font-medium text-warning' : 'text-muted-strong')}>
                    {d.label}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </Panel>
  )
}

function AvailabilityPanel({ people }: { people: Person[] }) {
  const crew = people.filter((p) => p.role !== 'organizer')
  const available = crew.filter((p) => p.availability === 'available').slice(0, 5)
  return (
    <Panel
      title="Volunteer availability"
      description="Live status reported by volunteers"
      actions={
        <Link to="/app/volunteers?availability=available" className="text-[13px] font-medium text-primary hover:underline">
          View
        </Link>
      }
    >
      <ul className="space-y-2.5 px-4 py-4 sm:px-5">
        {availabilities.map((a) => {
          const n = crew.filter((p) => p.availability === a).length
          const pct = crew.length ? (n / crew.length) * 100 : 0
          return (
            <li key={a} className="text-[13px]">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-ink-soft">
                  <StatusDot tone={availabilityMeta[a].tone} />
                  {availabilityMeta[a].label}
                </span>
                <span className="tabular-nums text-muted-strong">{n}</span>
              </div>
              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-subtle">
                <div
                  className={cn('h-full rounded-full', a === 'available' ? 'bg-success' : a === 'busy' ? 'bg-warning' : 'bg-muted')}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </li>
          )
        })}
      </ul>
      {available.length > 0 && (
        <div className="flex items-center justify-between border-t border-line px-4 py-3 sm:px-5">
          <span className="text-xs text-muted-strong">Free right now</span>
          <span className="flex -space-x-1.5">
            {available.map((p) => (
              <Avatar key={p.id} name={p.name} size="xs" />
            ))}
          </span>
        </div>
      )}
    </Panel>
  )
}

const verbText: Record<Activity['verb'], string> = {
  created_event: 'created event',
  updated_event: 'updated event',
  created_department: 'added department',
  added_volunteer: 'added',
  created_task: 'created',
  assigned_task: 'assigned',
  moved_task: 'moved',
  completed_task: 'completed',
}

function ActivityPanel({ activity, people, loading }: { activity: Activity[]; people: Person[]; loading: boolean }) {
  const byId = new Map(people.map((p) => [p.id, p]))
  return (
    <Panel title="Recent activity">
      {loading ? (
        <LoadingRows rows={3} />
      ) : activity.length === 0 ? (
        <EmptyState compact icon={History} title="No activity yet" description="Assignments, moves and completions appear as they happen." />
      ) : (
        <ul className="space-y-3.5 px-4 py-4 sm:px-5">
          {activity.map((a) => {
            const actor = byId.get(a.actorId)?.name ?? 'Someone'
            const detail =
              a.verb === 'assigned_task' ? ` to ${a.detail}` : a.verb === 'moved_task' ? ` to ${a.detail}` : a.verb === 'added_volunteer' ? ` to ${a.detail}` : ''
            return (
              <li key={a.id} className="flex gap-2.5">
                <Avatar name={actor} size="xs" className="mt-0.5" />
                <p className="min-w-0 text-[13px] leading-5 text-ink-soft">
                  <span className="font-medium text-ink">{actor}</span> {verbText[a.verb]} <span className="text-ink">{a.target}</span>
                  {detail}
                  <span className="block text-xs text-muted">{timeAgo(a.at)}</span>
                </p>
              </li>
            )
          })}
        </ul>
      )}
    </Panel>
  )
}

export function OverviewPage() {
  const [now] = useState(() => new Date())
  const me = useCurrentUser()
  const eventsQ = useEvents()
  const tasksQ = useTasks()
  const peopleQ = usePeople()
  const deptsQ = useDepartments()
  const canCreate = useAccess().canCreateEvent
  const activityQ = useActivity(6)

  const events = useMemo(() => eventsQ.data ?? [], [eventsQ.data])
  const tasks = useMemo(() => tasksQ.data ?? [], [tasksQ.data])
  const people = useMemo(() => peopleQ.data ?? [], [peopleQ.data])
  const loading = eventsQ.isPending || tasksQ.isPending || peopleQ.isPending || deptsQ.isPending
  const error = eventsQ.error ?? tasksQ.error ?? peopleQ.error ?? deptsQ.error

  const metrics = useMemo(() => {
    const weekAgo = now.getTime() - 7 * DAY
    return [
      { label: 'Active events', icon: CalendarDays, value: events.filter((e) => e.status === 'live' || e.status === 'upcoming').length, hint: 'Upcoming or live', to: '/app/events' },
      { label: 'Volunteers', icon: Users, value: people.filter((p) => p.role !== 'organizer').length, hint: 'In your directory', to: '/app/volunteers' },
      { label: 'Pending tasks', icon: ListChecks, value: tasks.filter((t) => t.status !== 'completed').length, hint: 'To do or in progress', to: '/app/tasks' },
      {
        label: 'Completed',
        icon: CircleCheck,
        value: tasks.filter((t) => t.completedAt && Date.parse(t.completedAt) >= weekAgo).length,
        hint: 'Last 7 days',
        to: '/app/tasks?view=completed',
      },
    ]
  }, [events, people, tasks, now])

  const firstName = me.data?.name.split(' ')[0]

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[22px] font-semibold tracking-[-0.015em] text-ink">
            {greetingFor(now)}
            {firstName ? `, ${firstName}` : ''}
          </p>
          <p className="mt-1 text-sm text-muted-strong">Here's what's happening across your events.</p>
        </div>
        {canCreate && (
          <ButtonLink to="/app/events/new" leadingIcon={<Plus className="size-4" aria-hidden />}>
            Create event
          </ButtonLink>
        )}
      </div>

      {error ? (
        <div className="rounded-card border border-line bg-surface">
          <LoadError error={error} onRetry={() => void Promise.all([eventsQ.refetch(), tasksQ.refetch(), peopleQ.refetch(), deptsQ.refetch()])} />
        </div>
      ) : (
        <>
          <MetricStrip metrics={metrics} loading={loading} />

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              {!loading && canCreate && <SetupGuide events={events} departments={deptsQ.data ?? []} people={people} tasks={tasks} />}
              {loading ? <LoadingRows rows={3} /> : <EventsPanel events={events} tasks={tasks} />}
              <Panel title="Task completion" description="Created vs. completed per day, last 14 days">
                {loading ? <Skeleton className="m-5 h-40" /> : <CompletionChart tasks={tasks} />}
              </Panel>
            </div>

            <div className="space-y-6">
              {loading ? <LoadingRows rows={3} /> : <DeadlinesPanel tasks={tasks} people={people} now={now} />}
              {!loading && <AvailabilityPanel people={people} />}
              <ActivityPanel activity={activityQ.data ?? []} people={people} loading={activityQ.isPending} />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
