import { ArrowLeft, ArrowRight, CalendarDays, ListChecks, MapPin, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { EventCover } from '../../components/data/EventCover'
import { Badge } from '../../components/ui/Badge'
import { ButtonLink } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { EmptyState } from '../../components/ui/EmptyState'
import { LoadError, LoadingRows } from '../../components/ui/LoadState'
import { Menu } from '../../components/ui/Menu'
import { Panel } from '../../components/ui/Panel'
import { Segmented } from '../../components/ui/Segmented'
import { errorMessage, useToast } from '../../components/ui/toastContext'
import { ApiError } from '../../lib/api/client'
import { eventStatusMeta, priorityMeta, taskStatusMeta } from '../../lib/data/labels'
import { useDeleteEvent, useDepartments, useEvent, usePeople, useTasks } from '../../lib/data/queries'
import type { CrewEvent, Department, Person, Task } from '../../lib/data/types'
import { dueInfo, formatRange, plural } from '../../lib/format'
import { DepartmentsTab } from './DepartmentsTab'
import { EventVolunteersTab } from './EventVolunteersTab'
import { statsFor } from './eventStats'
import { useAccess } from '../../lib/data/permissions'

type Tab = 'overview' | 'departments' | 'volunteers'
const tabs: Tab[] = ['overview', 'departments', 'volunteers']

function OverviewTab({ event, departments, tasks, people }: { event: CrewEvent; departments: Department[]; tasks: Task[]; people: Person[] }) {
  const stats = statsFor(event, departments, tasks)
  const byStatus = (['todo', 'in_progress', 'completed'] as const).map((s) => ({
    s,
    n: tasks.filter((t) => t.status === s).length,
  }))
  const nameOf = (id: string | null) => (id ? (people.find((p) => p.id === id)?.name ?? 'Unknown') : 'Unassigned')
  const next = tasks
    .filter((t) => t.status !== 'completed' && t.dueAt)
    .sort((a, b) => Date.parse(a.dueAt!) - Date.parse(b.dueAt!))
    .slice(0, 5)

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <Panel title="About this event">
          <p className="whitespace-pre-line px-4 py-4 text-sm leading-6 text-ink-soft sm:px-5">
            {event.description || <span className="text-muted-strong">No description yet.</span>}
          </p>
        </Panel>
        <Panel
          title="Next deadlines"
          actions={
            <Link to={`/app/tasks?event=${event.id}`} className="inline-flex items-center gap-1 text-[13px] font-medium text-primary hover:underline">
              Open board <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          }
        >
          {next.length === 0 ? (
            <EmptyState compact icon={ListChecks} title="No open deadlines" description="Open tasks with due times appear here." />
          ) : (
            <ul className="divide-y divide-line">
              {next.map((t) => {
                const due = dueInfo(t.dueAt!)
                return (
                  <li key={t.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                    <Badge tone={priorityMeta[t.priority].tone}>{priorityMeta[t.priority].label}</Badge>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-medium text-ink">{t.title}</span>
                      <span className="block truncate text-xs text-muted-strong">{nameOf(t.assigneeId)}</span>
                    </span>
                    <span
                      className={
                        due.state === 'overdue'
                          ? 'text-xs font-medium text-danger'
                          : due.state === 'soon'
                            ? 'text-xs font-medium text-warning'
                            : 'text-xs text-muted-strong'
                      }
                    >
                      {due.label}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </Panel>
      </div>
      <Panel title="Progress">
        <div className="px-4 py-4 sm:px-5">
          <p className="text-2xl font-semibold tracking-tight text-ink">
            {stats.progress}
            <span className="text-base font-medium text-muted">%</span>
          </p>
          <p className="text-xs text-muted-strong">
            {stats.completed} of {plural(stats.total, 'task')} completed
          </p>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-subtle">
            <div className="h-full rounded-full bg-primary" style={{ width: `${stats.progress}%` }} />
          </div>
          <dl className="mt-5 space-y-2.5 text-[13px]">
            {byStatus.map(({ s, n }) => (
              <div key={s} className="flex justify-between">
                <dt className="text-ink-soft">{taskStatusMeta[s].label}</dt>
                <dd className="tabular-nums text-muted-strong">{n}</dd>
              </div>
            ))}
            <div className="flex justify-between border-t border-line pt-2.5">
              <dt className="text-ink-soft">Departments</dt>
              <dd className="tabular-nums text-muted-strong">{stats.departments}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-soft">Volunteers</dt>
              <dd className="tabular-nums text-muted-strong">{stats.volunteers}</dd>
            </div>
          </dl>
        </div>
      </Panel>
    </div>
  )
}

export function EventWorkspacePage() {
  const { eventId = '' } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const tab = tabs.includes(params.get('tab') as Tab) ? (params.get('tab') as Tab) : 'overview'
  const event = useEvent(eventId)
  const departments = useDepartments(eventId)
  const tasks = useTasks({ eventId })
  const people = usePeople()
  const del = useDeleteEvent()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const can = useAccess()

  if (event.isPending) return <LoadingRows rows={5} label="Loading event" />
  if (event.error) {
    if (event.error instanceof ApiError && event.error.code === 'NOT_FOUND') {
      return (
        <div className="rounded-card border border-line bg-surface shadow-card">
          <EmptyState
            icon={CalendarDays}
            title="Event not found"
            description="It may have been deleted."
            action={
              <ButtonLink to="/app/events" variant="secondary" size="sm" leadingIcon={<ArrowLeft className="size-3.5" aria-hidden />}>
                All events
              </ButtonLink>
            }
            className="py-16"
          />
        </div>
      )
    }
    return <LoadError error={event.error} onRetry={() => void event.refetch()} />
  }

  const e = event.data
  const status = eventStatusMeta[e.status]
  const depts = departments.data ?? []
  const allPeople = people.data ?? []

  const onDelete = async () => {
    try {
      await del.mutateAsync(e.id)
      toast({ message: `Deleted “${e.title}”` })
      navigate('/app/events', { replace: true })
    } catch (err) {
      toast({ message: errorMessage(err), tone: 'danger' })
      setConfirmDelete(false)
    }
  }

  return (
    <div className="space-y-6">
      <Link to="/app/events" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted-strong hover:text-ink">
        <ArrowLeft className="size-3.5" aria-hidden /> All events
      </Link>

      <section className="overflow-hidden rounded-card border border-line bg-surface shadow-card">
        <EventCover theme={e.coverTheme} url={e.coverUrl} title={e.title} className="h-28 w-full sm:h-32" />
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-[22px] font-semibold tracking-[-0.015em] text-ink">{e.title}</h2>
              <Badge tone={status.tone} dot={e.status === 'live'}>
                {status.label}
              </Badge>
            </div>
            <div className="mt-2 flex flex-col gap-1 text-[13px] text-muted-strong sm:flex-row sm:gap-4">
              <span className="flex items-center gap-1.5">
                <CalendarDays className="size-3.5 text-muted" aria-hidden /> {formatRange(e.startAt, e.endAt)}
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="size-3.5 text-muted" aria-hidden /> {e.location}
              </span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <ButtonLink to={`/app/tasks?event=${e.id}`} variant="secondary" size="sm" leadingIcon={<ListChecks className="size-3.5" aria-hidden />}>
              Task board
            </ButtonLink>
            {can.canManageEvent(e) && (
              <>
                <ButtonLink to={`/app/events/${e.id}/edit`} variant="secondary" size="sm" leadingIcon={<Pencil className="size-3.5" aria-hidden />}>
                  Edit
                </ButtonLink>
                <Menu
                  label="More event actions"
                  trigger={<MoreHorizontal className="size-4" aria-hidden />}
                  items={[
                    {
                      label: 'Delete event',
                      icon: Trash2,
                      danger: true,
                      onSelect: () => setConfirmDelete(true),
                    },
                  ]}
                />
              </>
            )}
          </div>
        </div>
      </section>

      <Segmented
        label="Event sections"
        value={tab}
        onChange={(t) => setParams(t === 'overview' ? {} : { tab: t }, { replace: true })}
        options={[
          { value: 'overview', label: 'Overview' },
          { value: 'departments', label: 'Departments', count: depts.length },
          {
            value: 'volunteers',
            label: 'Volunteers',
            count: e.memberIds.length,
          },
        ]}
        className="sm:inline-flex"
      />

      {tab === 'overview' && <OverviewTab event={e} departments={depts} tasks={tasks.data ?? []} people={allPeople} />}
      {tab === 'departments' && <DepartmentsTab event={e} departments={depts} people={allPeople} loading={departments.isPending || people.isPending} />}
      {tab === 'volunteers' && <EventVolunteersTab event={e} departments={depts} people={allPeople} tasks={tasks.data ?? []} loading={people.isPending} />}

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this event?"
        body={
          <>
            “{e.title}” and its {plural(depts.length, 'department')} and {plural(tasks.data?.length ?? 0, 'task')} will be permanently deleted. Volunteers stay in your
            directory.
          </>
        }
        confirmLabel="Delete event"
        pending={del.isPending}
        onConfirm={onDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  )
}
