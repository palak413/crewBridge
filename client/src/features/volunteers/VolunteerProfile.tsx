import { CalendarDays, Mail, Pencil, Phone } from 'lucide-react'
import { Link } from 'react-router'
import { Avatar } from '../../components/ui/Avatar'
import { Badge, StatusDot } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Dialog } from '../../components/ui/Dialog'
import { errorMessage, useToast } from '../../components/ui/toastContext'
import { cn } from '../../lib/cn'
import { availabilityMeta, priorityMeta, roleLabel, taskStatusMeta } from '../../lib/data/labels'
import { useSetAvailability } from '../../lib/data/queries'
import { availabilities } from '../../lib/data/schemas'
import type { CrewEvent, Department, Person, Task } from '../../lib/data/types'
import { dueInfo, timeAgo } from '../../lib/format'
import { useAccess } from '../../lib/data/permissions'

export function VolunteerProfile({
  person,
  events,
  departments,
  tasks,
  onEdit,
  onClose,
}: {
  person: Person
  events: CrewEvent[]
  departments: Department[]
  tasks: Task[]
  onEdit: () => void
  onClose: () => void
}) {
  const toast = useToast()
  const setAvailability = useSetAvailability()
  const canEdit = useAccess().canEditPerson(person)
  const theirEvents = events.filter((e) => e.memberIds.includes(person.id))
  const theirTasks = tasks
    .filter((t) => t.assigneeId === person.id)
    .sort((a, b) => Number(a.status === 'completed') - Number(b.status === 'completed') || Date.parse(a.dueAt ?? '9999') - Date.parse(b.dueAt ?? '9999'))
  const eventTitle = new Map(events.map((e) => [e.id, e.title]))

  return (
    <Dialog open onClose={onClose} title={person.name} description={roleLabel[person.role]} variant="sheet">
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Avatar name={person.name} size="lg" />
          <div className="min-w-0 flex-1 space-y-1 text-[13px]">
            <a href={`mailto:${person.email}`} className="flex items-center gap-1.5 truncate text-ink-soft hover:text-primary">
              <Mail className="size-3.5 shrink-0 text-muted" aria-hidden />
              {person.email}
            </a>
            {person.phone && (
              <a href={`tel:${person.phone.replace(/\s/g, '')}`} className="flex items-center gap-1.5 text-ink-soft hover:text-primary">
                <Phone className="size-3.5 shrink-0 text-muted" aria-hidden />
                {person.phone}
              </a>
            )}
          </div>
          {canEdit && (
            <Button variant="secondary" size="sm" onClick={onEdit} leadingIcon={<Pencil className="size-3.5" aria-hidden />}>
              Edit
            </Button>
          )}
        </div>

        <section>
          <h3 className="text-[13px] font-medium text-ink-soft">Availability</h3>
          <div role="radiogroup" aria-label="Availability" className="mt-2 grid grid-cols-3 gap-1 rounded-control border border-line bg-canvas p-1">
            {availabilities.map((a) => {
              const meta = availabilityMeta[a]
              const on = person.availability === a
              return (
                <button
                  key={a}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  disabled={setAvailability.isPending || !canEdit}
                  onClick={() =>
                    !on &&
                    setAvailability.mutate(
                      { id: person.id, availability: a },
                      {
                        onSuccess: () =>
                          toast({
                            message: `${person.name.split(' ')[0]} is now ${meta.label.toLowerCase()}`,
                          }),
                        onError: (err) => toast({ message: errorMessage(err), tone: 'danger' }),
                      },
                    )
                  }
                  className={cn(
                    'flex h-8 items-center justify-center gap-1.5 rounded-lg text-[13px] transition-colors',
                    on ? 'bg-surface font-medium text-ink shadow-xs' : 'text-muted-strong hover:text-ink',
                  )}
                >
                  <StatusDot tone={meta.tone} />
                  {meta.label}
                </button>
              )
            })}
          </div>
          <p className="mt-1.5 text-xs text-muted">Updated {timeAgo(person.availabilityUpdatedAt)}</p>
        </section>

        <section>
          <h3 className="text-[13px] font-medium text-ink-soft">Skills</h3>
          {person.skills.length ? (
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {person.skills.map((s) => (
                <li key={s} className="rounded-md border border-line bg-canvas px-2 py-0.5 text-xs text-ink-soft">
                  {s}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-[13px] text-muted-strong">No skills listed.</p>
          )}
        </section>

        <section>
          <h3 className="text-[13px] font-medium text-ink-soft">Events & departments</h3>
          {theirEvents.length ? (
            <ul className="mt-2 space-y-2">
              {theirEvents.map((e) => {
                const depts = departments.filter((d) => d.eventId === e.id && d.memberIds.includes(person.id))
                return (
                  <li key={e.id} className="flex items-start gap-2.5 rounded-[10px] border border-line px-3 py-2.5">
                    <CalendarDays className="mt-0.5 size-4 text-muted" aria-hidden />
                    <div className="min-w-0">
                      <Link to={`/app/events/${e.id}`} className="text-[13px] font-medium text-ink hover:text-primary">
                        {e.title}
                      </Link>
                      <p className="text-xs text-muted-strong">
                        {depts.length ? depts.map((d) => (d.leaderId === person.id ? `${d.name} (lead)` : d.name)).join(', ') : 'No department yet'}
                      </p>
                    </div>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="mt-1 text-[13px] text-muted-strong">Not on any event yet. Add them from an event's Volunteers tab.</p>
          )}
        </section>

        <section>
          <h3 className="text-[13px] font-medium text-ink-soft">Assigned tasks</h3>
          {theirTasks.length ? (
            <ul className="mt-2 divide-y divide-line rounded-[10px] border border-line">
              {theirTasks.map((t) => {
                const due = t.dueAt && t.status !== 'completed' ? dueInfo(t.dueAt) : null
                return (
                  <li key={t.id} className="px-3 py-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className={cn('min-w-0 truncate text-[13px]', t.status === 'completed' ? 'text-muted-strong line-through' : 'font-medium text-ink')}>
                        {t.title}
                      </span>
                      <Badge tone={t.status === 'completed' ? 'success' : priorityMeta[t.priority].tone}>
                        {t.status === 'completed' ? 'Done' : priorityMeta[t.priority].label}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-strong">
                      {eventTitle.get(t.eventId)} · {taskStatusMeta[t.status].label}
                      {due && <span className={due.state === 'overdue' ? ' text-danger' : ''}> · {due.label}</span>}
                    </p>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="mt-1 text-[13px] text-muted-strong">No tasks assigned.</p>
          )}
        </section>
      </div>
    </Dialog>
  )
}
