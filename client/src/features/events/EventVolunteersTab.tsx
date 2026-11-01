import { Mail, UserMinus, UserPlus, Users } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { PeoplePicker } from '../../components/data/PeoplePicker'
import { Avatar } from '../../components/ui/Avatar'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { EmptyState } from '../../components/ui/EmptyState'
import { LoadingRows } from '../../components/ui/LoadState'
import { errorMessage, useToast } from '../../components/ui/toastContext'
import { availabilityMeta, roleLabel } from '../../lib/data/labels'
import { useAddEventMembers, useRemoveEventMember } from '../../lib/data/queries'
import type { CrewEvent, Department, Person, Task } from '../../lib/data/types'
import { plural } from '../../lib/format'
import { useAccess } from '../../lib/data/permissions'

export function EventVolunteersTab({
  event,
  departments,
  people,
  tasks,
  loading,
}: {
  event: CrewEvent
  departments: Department[]
  people: Person[]
  tasks: Task[]
  loading: boolean
}) {
  const toast = useToast()
  const add = useAddEventMembers()
  const remove = useRemoveEventMember()
  const [picking, setPicking] = useState(false)
  const [removing, setRemoving] = useState<Person | null>(null)
  const organizer = useAccess().canManageEvent(event)

  const members = people.filter((p) => event.memberIds.includes(p.id))
  const others = people.filter((p) => !event.memberIds.includes(p.id) && p.role !== 'organizer')
  const deptsOf = (pid: string) => departments.filter((d) => d.memberIds.includes(pid))
  const openTasks = (pid: string) => tasks.filter((t) => t.assigneeId === pid && t.status !== 'completed').length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] text-muted-strong">{plural(members.length, 'volunteer')} on this event</p>
        {organizer && (
          <Button size="sm" onClick={() => setPicking(true)} leadingIcon={<UserPlus className="size-3.5" aria-hidden />}>
            Add volunteers
          </Button>
        )}
      </div>

      <div className="rounded-card border border-line bg-surface shadow-card">
        {loading ? (
          <LoadingRows rows={4} />
        ) : members.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No volunteers on this event"
            description="Add people from your volunteer directory, then place them in departments."
            action={
              organizer && (
                <Button size="sm" variant="secondary" onClick={() => setPicking(true)} leadingIcon={<UserPlus className="size-3.5" aria-hidden />}>
                  Add volunteers
                </Button>
              )
            }
          />
        ) : (
          <ul className="divide-y divide-line">
            {members.map((p) => {
              const av = availabilityMeta[p.availability]
              const depts = deptsOf(p.id)
              const open = openTasks(p.id)
              return (
                <li key={p.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:flex-nowrap sm:px-5">
                  <Avatar name={p.name} />
                  <div className="min-w-0 flex-1">
                    <Link to={`/app/volunteers?person=${p.id}`} className="block truncate text-[13.5px] font-medium text-ink hover:text-primary">
                      {p.name}
                    </Link>
                    <p className="truncate text-xs text-muted-strong">
                      {roleLabel[p.role]} · {depts.length ? depts.map((d) => d.name).join(', ') : 'No department'}
                    </p>
                  </div>
                  <span className="text-xs tabular-nums text-muted-strong">{plural(open, 'open task')}</span>
                  <Badge tone={av.tone} dot>
                    {av.label}
                  </Badge>
                  <div className="flex items-center gap-1">
                    <a
                      href={`mailto:${p.email}`}
                      aria-label={`Email ${p.name}`}
                      className="inline-flex size-8 items-center justify-center rounded-control text-muted-strong hover:bg-subtle hover:text-ink"
                    >
                      <Mail className="size-4" aria-hidden />
                    </a>
                    {organizer && (
                      <button
                        type="button"
                        aria-label={`Remove ${p.name} from event`}
                        onClick={() => setRemoving(p)}
                        className="inline-flex size-8 items-center justify-center rounded-control text-muted-strong hover:bg-danger-soft hover:text-danger"
                      >
                        <UserMinus className="size-4" aria-hidden />
                      </button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {picking && (
        <PeoplePicker
          open
          title="Add volunteers"
          description={`Choose people from your directory to join ${event.title}.`}
          people={others}
          emptyText="Everyone in your directory is already on this event."
          confirmLabel={(n) => (n ? `Add ${plural(n, 'volunteer')}` : 'Add')}
          pending={add.isPending}
          onClose={() => setPicking(false)}
          onConfirm={async (ids) => {
            if (ids.length === 0) return setPicking(false)
            try {
              await add.mutateAsync({ eventId: event.id, personIds: ids })
              toast({ message: `Added ${plural(ids.length, 'volunteer')}` })
              setPicking(false)
            } catch (err) {
              toast({ message: errorMessage(err), tone: 'danger' })
            }
          }}
        />
      )}

      <ConfirmDialog
        open={!!removing}
        title={`Remove ${removing?.name ?? ''}?`}
        body="They'll leave this event's departments, and their open tasks here become unassigned. They stay in your volunteer directory."
        confirmLabel="Remove from event"
        pending={remove.isPending}
        onCancel={() => setRemoving(null)}
        onConfirm={async () => {
          if (!removing) return
          try {
            await remove.mutateAsync({
              eventId: event.id,
              personId: removing.id,
            })
            toast({ message: `Removed ${removing.name}` })
          } catch (err) {
            toast({ message: errorMessage(err), tone: 'danger' })
          }
          setRemoving(null)
        }}
      />
    </div>
  )
}
