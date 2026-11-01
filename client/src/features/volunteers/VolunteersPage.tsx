import { Mail, Search, UserPlus, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { Avatar } from '../../components/ui/Avatar'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState'
import { LoadError, LoadingRows } from '../../components/ui/LoadState'
import { Select } from '../../components/ui/Select'
import { availabilityMeta, roleLabel } from '../../lib/data/labels'
import { useDepartments, useEvents, usePeople, useTasks } from '../../lib/data/queries'
import { availabilities } from '../../lib/data/schemas'
import type { Availability, Person } from '../../lib/data/types'
import { plural } from '../../lib/format'
import { VolunteerDialog } from './VolunteerDialog'
import { VolunteerProfile } from './VolunteerProfile'
import { useAccess } from '../../lib/data/permissions'

/** Stable empty fallback so memoized values don't recompute every render. */
const NONE: never[] = []

export function VolunteersPage() {
  const [params, setParams] = useSearchParams()
  const peopleQ = usePeople()
  const eventsQ = useEvents()
  const deptsQ = useDepartments()
  const tasksQ = useTasks()
  const [adding, setAdding] = useState(false)
  const can = useAccess()
  const [editing, setEditing] = useState<Person | null>(null)

  const q = params.get('q') ?? ''
  const eventId = params.get('event') ?? ''
  const deptId = params.get('dept') ?? ''
  const availability = (availabilities as readonly string[]).includes(params.get('availability') ?? '') ? (params.get('availability') as Availability) : ''
  const skill = params.get('skill') ?? ''
  const profileId = params.get('person')

  const setParam = (key: string, value: string) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (value) next.set(key, value)
        else next.delete(key)
        if (key === 'event') next.delete('dept')
        return next
      },
      { replace: key !== 'person' },
    )

  const people = peopleQ.data ?? NONE
  const events = eventsQ.data ?? NONE
  const departments = deptsQ.data ?? NONE
  const tasks = tasksQ.data ?? NONE

  const allSkills = useMemo(() => [...new Set(people.flatMap((p) => p.skills))].sort(), [people])
  const openTasks = useMemo(() => {
    const m = new Map<string, number>()
    for (const t of tasks) if (t.assigneeId && t.status !== 'completed') m.set(t.assigneeId, (m.get(t.assigneeId) ?? 0) + 1)
    return m
  }, [tasks])

  const event = events.find((e) => e.id === eventId)
  const dept = departments.find((d) => d.id === deptId)
  const deptNames = (pid: string) =>
    departments
      .filter((d) => d.memberIds.includes(pid) && (!eventId || d.eventId === eventId))
      .map((d) => d.name)
      .filter((n, i, a) => a.indexOf(n) === i)

  const list = people.filter((p) => {
    const query = q.trim().toLowerCase()
    return (
      (!query || p.name.toLowerCase().includes(query) || p.email.toLowerCase().includes(query)) &&
      (!event || event.memberIds.includes(p.id)) &&
      (!dept || dept.memberIds.includes(p.id)) &&
      (!availability || p.availability === availability) &&
      (!skill || p.skills.includes(skill))
    )
  })

  const counts = Object.fromEntries(availabilities.map((a) => [a, people.filter((p) => p.availability === a).length])) as Record<Availability, number>
  const loading = peopleQ.isPending || eventsQ.isPending || deptsQ.isPending || tasksQ.isPending
  const error = peopleQ.error ?? eventsQ.error ?? deptsQ.error ?? tasksQ.error
  const hasFilters = !!(q || eventId || deptId || availability || skill)
  const profile = profileId ? people.find((p) => p.id === profileId) : undefined

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[22px] font-semibold tracking-[-0.015em] text-ink">Volunteers</p>
          <p className="mt-1 text-sm text-muted-strong">
            {loading ? 'Loading directory…' : `${plural(people.length, 'person', 'people')} · ${counts.available} available now`}
          </p>
        </div>
        {can.canAddPeople && (
          <Button onClick={() => setAdding(true)} leadingIcon={<UserPlus className="size-4" aria-hidden />}>
            Add volunteer
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-2.5 rounded-card border border-line bg-surface p-3 shadow-xs xl:flex-row xl:items-center">
        <div className="relative xl:w-64">
          <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <input
            type="search"
            aria-label="Search volunteers"
            placeholder="Search name or email…"
            value={q}
            onChange={(e) => setParam('q', e.target.value)}
            className="h-10 w-full rounded-control border border-line-strong bg-surface pl-9 pr-3 text-[13px] outline-none focus:border-primary focus:ring-3 focus:ring-primary/12"
          />
        </div>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 xl:flex xl:flex-1">
          <Select aria-label="Filter by event" value={eventId} onChange={(e) => setParam('event', e.target.value)} className="xl:w-44">
            <option value="">All events</option>
            {events.map((e) => (
              <option key={e.id} value={e.id}>
                {e.title}
              </option>
            ))}
          </Select>
          <Select aria-label="Filter by department" value={deptId} onChange={(e) => setParam('dept', e.target.value)} disabled={!eventId} className="xl:w-40">
            <option value="">{eventId ? 'All departments' : 'Department'}</option>
            {departments
              .filter((d) => d.eventId === eventId)
              .map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
          </Select>
          <Select aria-label="Filter by availability" value={availability} onChange={(e) => setParam('availability', e.target.value)} className="xl:w-40">
            <option value="">Any availability</option>
            {availabilities.map((a) => (
              <option key={a} value={a}>
                {availabilityMeta[a].label} ({counts[a]})
              </option>
            ))}
          </Select>
          <Select aria-label="Filter by skill" value={skill} onChange={(e) => setParam('skill', e.target.value)} className="xl:w-40">
            <option value="">Any skill</option>
            {allSkills.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </div>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={() => setParams({}, { replace: true })}>
            Clear filters
          </Button>
        )}
      </div>

      <div className="overflow-hidden rounded-card border border-line bg-surface shadow-card">
        {error ? (
          <LoadError error={error} onRetry={() => void peopleQ.refetch()} />
        ) : loading ? (
          <LoadingRows rows={6} label="Loading volunteers" />
        ) : list.length === 0 ? (
          hasFilters ? (
            <EmptyState icon={Search} title="No one matches these filters" description="Try removing a filter." />
          ) : (
            <EmptyState
              icon={Users}
              title="Your directory is empty"
              description="Add volunteers so you can place them on events and assign tasks."
              action={
                can.canAddPeople && (
                  <Button size="sm" variant="secondary" onClick={() => setAdding(true)} leadingIcon={<UserPlus className="size-3.5" aria-hidden />}>
                    Add volunteer
                  </Button>
                )
              }
            />
          )
        ) : (
          <table className="w-full text-left text-[13px]">
            <caption className="sr-only">Volunteer directory</caption>
            <thead className="hidden border-b border-line bg-canvas text-xs text-muted-strong md:table-header-group">
              <tr>
                <th scope="col" className="px-5 py-2.5 font-medium">
                  Name
                </th>
                <th scope="col" className="px-3 py-2.5 font-medium">
                  Departments
                </th>
                <th scope="col" className="px-3 py-2.5 font-medium">
                  Availability
                </th>
                <th scope="col" className="px-3 py-2.5 text-right font-medium">
                  Open tasks
                </th>
                <th scope="col" className="px-5 py-2.5">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {list.map((p) => {
                const av = availabilityMeta[p.availability]
                const names = deptNames(p.id)
                const open = openTasks.get(p.id) ?? 0
                return (
                  <tr key={p.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-3 transition-colors hover:bg-canvas md:table-row md:p-0">
                    <td className="flex min-w-0 flex-1 items-center gap-3 md:px-5 md:py-3">
                      <Avatar name={p.name} />
                      <div className="min-w-0">
                        <button
                          type="button"
                          onClick={() => setParam('person', p.id)}
                          className="block max-w-full truncate text-left font-medium text-ink hover:text-primary"
                        >
                          {p.name}
                        </button>
                        <p className="truncate text-xs text-muted-strong">
                          {roleLabel[p.role]} · {p.email}
                        </p>
                      </div>
                    </td>
                    <td className="order-last w-full pl-11 text-xs text-muted-strong md:order-none md:w-auto md:px-3 md:py-3 md:pl-3 md:text-[13px]">
                      {names.length ? names.join(', ') : <span className="text-muted">—</span>}
                    </td>
                    <td className="md:px-3 md:py-3">
                      <Badge tone={av.tone} dot>
                        {av.label}
                      </Badge>
                    </td>
                    <td className="hidden text-right tabular-nums text-ink-soft md:table-cell md:px-3 md:py-3">{open}</td>
                    <td className="md:px-5 md:py-3">
                      <div className="flex justify-end">
                        <a
                          href={`mailto:${p.email}`}
                          aria-label={`Email ${p.name}`}
                          className="inline-flex size-8 items-center justify-center rounded-control text-muted-strong hover:bg-subtle hover:text-ink"
                        >
                          <Mail className="size-4" aria-hidden />
                        </a>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
      {!loading && !error && list.length > 0 && hasFilters && (
        <p className="text-xs text-muted-strong">
          Showing {list.length} of {people.length}
        </p>
      )}

      {adding && <VolunteerDialog onClose={() => setAdding(false)} onSaved={(p) => setParam('person', p.id)} />}
      {editing && <VolunteerDialog person={editing} onClose={() => setEditing(null)} />}
      {profile && !editing && (
        <VolunteerProfile
          person={profile}
          events={events}
          departments={departments}
          tasks={tasks}
          onEdit={() => setEditing(profile)}
          onClose={() => setParam('person', '')}
        />
      )}
    </div>
  )
}
