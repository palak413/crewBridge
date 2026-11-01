import { ListChecks, Plus, Search, SlidersHorizontal } from 'lucide-react'
import { useMemo, useState, type DragEvent } from 'react'
import { useSearchParams } from 'react-router'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { EmptyState } from '../../components/ui/EmptyState'
import { LoadError, Skeleton } from '../../components/ui/LoadState'
import { Segmented } from '../../components/ui/Segmented'
import { Select } from '../../components/ui/Select'
import { errorMessage, useToast } from '../../components/ui/toastContext'
import { cn } from '../../lib/cn'
import { priorityMeta, taskStatusMeta } from '../../lib/data/labels'
import { useCurrentUser, useDeleteTask, useDepartments, useEvents, useMoveTask, usePeople, useTasks } from '../../lib/data/queries'
import { taskPriorities, taskStatuses } from '../../lib/data/schemas'
import type { Task, TaskPriority, TaskStatus } from '../../lib/data/types'
import { TaskCard } from './TaskCard'
import { TaskDialog } from './TaskDialog'
import { applyFilters, matchesView, sortForBoard, type BoardFilters, type TaskView } from './taskFilters'
import { useAccess } from '../../lib/data/permissions'

/** Stable empty fallback so memoized values don't recompute every render. */
const NONE: never[] = []

const views: TaskView[] = ['all', 'mine', 'available', 'completed']
const viewLabel: Record<TaskView, string> = {
  all: 'All tasks',
  mine: 'My tasks',
  available: 'Available',
  completed: 'Completed',
}

export function TasksPage() {
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const me = useCurrentUser()
  const tasksQ = useTasks()
  const eventsQ = useEvents()
  const deptsQ = useDepartments()
  const peopleQ = usePeople()
  const move = useMoveTask()
  const del = useDeleteTask()
  const can = useAccess()

  const [dialog, setDialog] = useState<{
    task?: Task
    status?: TaskStatus
  } | null>(null)
  const [deleting, setDeleting] = useState<Task | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  const [overCol, setOverCol] = useState<TaskStatus | null>(null)

  const filters: BoardFilters = {
    view: views.includes(params.get('view') as TaskView) ? (params.get('view') as TaskView) : 'all',
    eventId: params.get('event') ?? '',
    departmentId: params.get('dept') ?? '',
    priority: taskPriorities.includes(params.get('priority') as TaskPriority) ? (params.get('priority') as TaskPriority) : '',
    query: params.get('q') ?? '',
  }

  const setFilter = (key: 'view' | 'event' | 'dept' | 'priority' | 'q', value: string) => {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (value && !(key === 'view' && value === 'all')) next.set(key, value)
        else next.delete(key)
        if (key === 'event') next.delete('dept')
        return next
      },
      { replace: true },
    )
  }

  const events = eventsQ.data ?? NONE
  const departments = deptsQ.data ?? NONE
  const people = peopleQ.data ?? NONE
  const meId = me.data?.id ?? ''
  const byPerson = useMemo(() => new Map(people.map((p) => [p.id, p])), [people])
  const eventById = useMemo(() => new Map(events.map((e) => [e.id, e])), [events])
  const eventName = useMemo(() => new Map(events.map((e) => [e.id, e.title])), [events])
  const deptName = useMemo(() => new Map(departments.map((d) => [d.id, d.name])), [departments])

  // Datasets are small; filtering on each render keeps this simple and always consistent.
  const visible = applyFilters(tasksQ.data ?? [], filters, meId).sort(sortForBoard)
  const scoped = applyFilters(tasksQ.data ?? [], { ...filters, view: 'all' }, meId)
  const viewCounts = Object.fromEntries(views.map((v) => [v, scoped.filter((t) => matchesView(t, v, meId)).length])) as Record<TaskView, number>

  const onMove = (task: Task, status: TaskStatus) => {
    if (task.status === status) return
    move.mutate(
      { id: task.id, status },
      {
        onSuccess: () =>
          toast({
            message: status === 'completed' ? `Completed “${task.title}”` : `Moved to ${taskStatusMeta[status].label}`,
          }),
        onError: (err) => toast({ message: errorMessage(err), tone: 'danger' }),
      },
    )
  }

  const onDrop = (status: TaskStatus) => (e: DragEvent) => {
    e.preventDefault()
    const id = e.dataTransfer.getData('text/plain') || dragId
    const task = (tasksQ.data ?? []).find((t) => t.id === id)
    setDragId(null)
    setOverCol(null)
    if (task && can.canMoveTask(eventById.get(task.eventId), task)) onMove(task, status)
  }

  const contextFor = (t: Task) =>
    [filters.eventId ? null : eventName.get(t.eventId), t.departmentId ? deptName.get(t.departmentId) : null].filter(Boolean).join(' · ') || 'No department'

  const loading = tasksQ.isPending || eventsQ.isPending || deptsQ.isPending || peopleQ.isPending || me.isPending
  const error = tasksQ.error ?? eventsQ.error ?? deptsQ.error ?? peopleQ.error ?? me.error
  const eventDepts = departments.filter((d) => d.eventId === filters.eventId)
  const hasFilters = !!(filters.eventId || filters.departmentId || filters.priority || filters.query)
  const columns = filters.view === 'completed' ? (['completed'] as const) : filters.view === 'available' ? (['todo', 'in_progress'] as const) : taskStatuses

  const card = (t: Task) => (
    <li key={t.id}>
      <TaskCard
        task={t}
        assignee={t.assigneeId ? byPerson.get(t.assigneeId) : undefined}
        context={contextFor(t)}
        onOpen={() => setDialog({ task: t })}
        onMove={(s) => onMove(t, s)}
        onDelete={() => setDeleting(t)}
        canEdit={can.canManageTask(eventById.get(t.eventId), t)}
        canMove={can.canMoveTask(eventById.get(t.eventId), t)}
        dragging={dragId === t.id}
        onDragStart={() => setDragId(t.id)}
        onDragEnd={() => {
          setDragId(null)
          setOverCol(null)
        }}
      />
    </li>
  )

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[22px] font-semibold tracking-[-0.015em] text-ink">Tasks</p>
          <p className="mt-1 text-sm text-muted-strong">Drag cards between columns, or use a card's menu to move it.</p>
        </div>
        <Button onClick={() => setDialog({})} disabled={events.length === 0} hidden={!can.canCreateTask()} leadingIcon={<Plus className="size-4" aria-hidden />}>
          New task
        </Button>
      </div>

      <Segmented
        label="Task views"
        value={filters.view}
        onChange={(v) => setFilter('view', v)}
        options={views.map((v) => ({
          value: v,
          label: viewLabel[v],
          count: loading ? undefined : viewCounts[v],
        }))}
        className="sm:inline-flex"
      />

      <div className="flex flex-col gap-2.5 rounded-card border border-line bg-surface p-3 shadow-xs md:flex-row md:items-center">
        <SlidersHorizontal className="hidden size-4 shrink-0 text-muted md:block" aria-hidden />
        <div className="relative md:w-56">
          <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <input
            type="search"
            aria-label="Search tasks"
            placeholder="Search tasks…"
            value={filters.query}
            onChange={(e) => setFilter('q', e.target.value)}
            className="h-10 w-full rounded-control border border-line-strong bg-surface pl-9 pr-3 text-[13px] outline-none focus:border-primary focus:ring-3 focus:ring-primary/12"
          />
        </div>
        <div className="grid grid-cols-2 gap-2.5 md:flex md:flex-1">
          <Select aria-label="Filter by event" value={filters.eventId} onChange={(e) => setFilter('event', e.target.value)} className="col-span-2 md:w-48">
            <option value="">All events</option>
            {events.map((e) => (
              <option key={e.id} value={e.id}>
                {e.title}
              </option>
            ))}
          </Select>
          <Select
            aria-label="Filter by department"
            value={filters.departmentId}
            onChange={(e) => setFilter('dept', e.target.value)}
            disabled={!filters.eventId}
            className="md:w-44"
          >
            <option value="">{filters.eventId ? 'All departments' : 'Department'}</option>
            {eventDepts.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </Select>
          <Select aria-label="Filter by priority" value={filters.priority} onChange={(e) => setFilter('priority', e.target.value)} className="md:w-36">
            <option value="">Any priority</option>
            {taskPriorities.map((p) => (
              <option key={p} value={p}>
                {priorityMeta[p].label}
              </option>
            ))}
          </Select>
        </div>
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              setParams(filters.view === 'all' ? {} : { view: filters.view }, {
                replace: true,
              })
            }
          >
            Clear filters
          </Button>
        )}
      </div>

      {error ? (
        <div className="rounded-card border border-line bg-surface">
          <LoadError error={error} onRetry={() => void tasksQ.refetch()} />
        </div>
      ) : loading ? (
        <div className="grid gap-4 lg:grid-cols-3" role="status" aria-label="Loading tasks">
          {[0, 1, 2].map((i) => (
            <div key={i} className="space-y-2 rounded-card bg-subtle p-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="rounded-card border border-line bg-surface shadow-card">
          <EmptyState icon={ListChecks} title="Create an event first" description="Tasks belong to an event. Create one, then come back to plan the work." />
        </div>
      ) : (
        <div
          className={cn(
            '-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6 lg:mx-0 lg:grid lg:overflow-visible lg:px-0',
            columns.length === 3 ? 'lg:grid-cols-3' : columns.length === 2 ? 'lg:grid-cols-2' : 'lg:grid-cols-1',
          )}
        >
          {columns.map((status) => {
            const items = visible.filter((t) => t.status === status)
            return (
              <section
                key={status}
                aria-label={`${taskStatusMeta[status].label} column`}
                onDragOver={(e) => {
                  e.preventDefault()
                  e.dataTransfer.dropEffect = 'move'
                  if (overCol !== status) setOverCol(status)
                }}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) setOverCol(null)
                }}
                onDrop={onDrop(status)}
                className={cn(
                  'flex w-[84vw] max-w-sm shrink-0 snap-start flex-col rounded-card border p-2.5 transition-colors sm:w-80 lg:w-auto lg:max-w-none',
                  overCol === status && dragId ? 'border-primary/40 bg-sage/50' : 'border-transparent bg-subtle',
                )}
              >
                <header className="flex h-9 items-center justify-between px-1.5 pb-1.5">
                  <h2 className="flex items-center gap-2 text-[13px] font-semibold text-ink-soft">
                    <span aria-hidden className={cn('size-2 rounded-full', status === 'todo' ? 'bg-muted' : status === 'in_progress' ? 'bg-warning' : 'bg-success')} />
                    {taskStatusMeta[status].label}
                    <span className="font-normal tabular-nums text-muted">{items.length}</span>
                  </h2>
                  {status !== 'completed' && (
                    <button
                      type="button"
                      aria-label={`Add task to ${taskStatusMeta[status].label}`}
                      onClick={() => setDialog({ status })}
                      className="inline-flex size-7 items-center justify-center rounded-md text-muted-strong hover:bg-surface hover:text-ink"
                    >
                      <Plus className="size-4" aria-hidden />
                    </button>
                  )}
                </header>
                {items.length === 0 ? (
                  <p className="rounded-[10px] border border-dashed border-line-strong px-3 py-6 text-center text-xs text-muted-strong">
                    {hasFilters || filters.view !== 'all' ? 'No matching tasks' : dragId ? 'Drop here' : 'Nothing here yet'}
                  </p>
                ) : (
                  <ul className="space-y-2">{items.map(card)}</ul>
                )}
              </section>
            )
          })}
        </div>
      )}

      {dialog && (
        <TaskDialog
          task={dialog.task}
          defaults={{
            eventId: filters.eventId || undefined,
            departmentId: filters.departmentId || undefined,
            status: dialog.status,
          }}
          events={events}
          departments={departments}
          people={people}
          readOnly={!!dialog.task && !can.canManageTask(eventById.get(dialog.task.eventId), dialog.task)}
          onClose={() => setDialog(null)}
          onDelete={
            dialog.task
              ? () => {
                  setDeleting(dialog.task!)
                  setDialog(null)
                }
              : undefined
          }
        />
      )}

      <ConfirmDialog
        open={!!deleting}
        title="Delete task?"
        body={<>“{deleting?.title}” will be permanently deleted.</>}
        confirmLabel="Delete task"
        pending={del.isPending}
        onCancel={() => setDeleting(null)}
        onConfirm={async () => {
          if (!deleting) return
          try {
            await del.mutateAsync(deleting.id)
            toast({ message: 'Task deleted' })
          } catch (err) {
            toast({ message: errorMessage(err), tone: 'danger' })
          }
          setDeleting(null)
        }}
      />
    </div>
  )
}
