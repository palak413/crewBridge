import { Crown, MoreHorizontal, Pencil, Plus, Trash2, UserPlus, Users } from 'lucide-react'
import { useState } from 'react'
import { PeoplePicker } from '../../components/data/PeoplePicker'
import { Avatar } from '../../components/ui/Avatar'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { EmptyState } from '../../components/ui/EmptyState'
import { LoadingRows } from '../../components/ui/LoadState'
import { Menu } from '../../components/ui/Menu'
import { errorMessage, useToast } from '../../components/ui/toastContext'
import { useDeleteDepartment, useSetDepartmentMembers } from '../../lib/data/queries'
import type { CrewEvent, Department, Person } from '../../lib/data/types'
import { plural } from '../../lib/format'
import { DepartmentDialog } from './DepartmentDialog'
import { useAccess } from '../../lib/data/permissions'

export function DepartmentsTab({ event, departments, people, loading }: { event: CrewEvent; departments: Department[]; people: Person[]; loading: boolean }) {
  const toast = useToast()
  const [editing, setEditing] = useState<Department | 'new' | null>(null)
  const [managing, setManaging] = useState<Department | null>(null)
  const [deleting, setDeleting] = useState<Department | null>(null)
  const setMembers = useSetDepartmentMembers()
  const del = useDeleteDepartment()
  const can = useAccess()
  const organizer = can.canManageEvent(event)

  const members = people.filter((p) => event.memberIds.includes(p.id))
  const byId = new Map(people.map((p) => [p.id, p]))

  const header = (
    <div className="flex items-center justify-between gap-3">
      <p className="text-[13px] text-muted-strong">{plural(departments.length, 'department')}</p>
      {organizer && (
        <Button size="sm" onClick={() => setEditing('new')} leadingIcon={<Plus className="size-3.5" aria-hidden />}>
          Add department
        </Button>
      )}
    </div>
  )

  return (
    <div className="space-y-4">
      {header}
      {loading ? (
        <LoadingRows />
      ) : departments.length === 0 ? (
        <div className="rounded-card border border-line bg-surface shadow-card">
          <EmptyState
            icon={Users}
            title="No departments yet"
            description="Split the work into teams like Registration, Hospitality or Tech support."
            action={
              organizer && (
                <Button size="sm" variant="secondary" onClick={() => setEditing('new')} leadingIcon={<Plus className="size-3.5" aria-hidden />}>
                  Add department
                </Button>
              )
            }
          />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {departments.map((d) => {
            const leader = d.leaderId ? byId.get(d.leaderId) : undefined
            const team = d.memberIds.map((id) => byId.get(id)).filter((p): p is Person => !!p)
            return (
              <article key={d.id} className="flex flex-col rounded-card border border-line bg-surface p-4 shadow-card">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="text-[15px] font-semibold text-ink">{d.name}</h3>
                    <p className="mt-0.5 text-[13px] leading-5 text-muted-strong">{d.description || 'No description'}</p>
                  </div>
                  {can.canEditDepartment(event, d) && (
                    <Menu
                      label={`Actions for ${d.name}`}
                      trigger={<MoreHorizontal className="size-4" aria-hidden />}
                      items={[
                        {
                          label: 'Edit department',
                          icon: Pencil,
                          onSelect: () => setEditing(d),
                        },
                        {
                          label: 'Manage members',
                          icon: UserPlus,
                          onSelect: () => setManaging(d),
                        },
                        ...(organizer
                          ? ([
                              'separator',
                              {
                                label: 'Delete department',
                                icon: Trash2,
                                danger: true,
                                onSelect: () => setDeleting(d),
                              },
                            ] as const)
                          : []),
                      ]}
                    />
                  )}
                </div>
                <div className="mt-4 flex items-center gap-2 text-[13px]">
                  <Crown className="size-3.5 text-muted" aria-hidden />
                  {leader ? <span className="text-ink-soft">{leader.name}</span> : <span className="text-muted-strong">No leader assigned</span>}
                </div>
                <div className="mt-auto flex items-center justify-between gap-3 pt-4">
                  <div className="flex items-center">
                    <div className="flex -space-x-1.5">
                      {team.slice(0, 5).map((p) => (
                        <Avatar key={p.id} name={p.name} size="sm" />
                      ))}
                    </div>
                    <span className="ml-2 text-xs text-muted-strong">{plural(team.length, 'member')}</span>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => setManaging(d)} leadingIcon={<UserPlus className="size-3.5" aria-hidden />}>
                    Members
                  </Button>
                </div>
              </article>
            )
          })}
        </div>
      )}

      {editing && <DepartmentDialog eventId={event.id} department={editing === 'new' ? undefined : editing} candidates={members} canChangeLeader={organizer} onClose={() => setEditing(null)} />}

      {managing && (
        <PeoplePicker
          open
          title={`${managing.name} members`}
          description="Choose from this event's volunteers. Add people to the event first from the Volunteers tab."
          people={members}
          initialSelected={managing.memberIds}
          emptyText="This event has no volunteers yet."
          confirmLabel={(n) => `Save · ${plural(n, 'member')}`}
          pending={setMembers.isPending}
          onClose={() => setManaging(null)}
          onConfirm={async (ids) => {
            try {
              await setMembers.mutateAsync({ id: managing.id, personIds: ids })
              toast({ message: `${managing.name} updated` })
              setManaging(null)
            } catch (err) {
              toast({ message: errorMessage(err), tone: 'danger' })
            }
          }}
        />
      )}

      <ConfirmDialog
        open={!!deleting}
        title="Delete department?"
        body={<>“{deleting?.name}” will be removed. Its tasks stay on the board without a department.</>}
        confirmLabel="Delete department"
        pending={del.isPending}
        onCancel={() => setDeleting(null)}
        onConfirm={async () => {
          if (!deleting) return
          try {
            await del.mutateAsync(deleting.id)
            toast({ message: `Deleted ${deleting.name}` })
          } catch (err) {
            toast({ message: errorMessage(err), tone: 'danger' })
          }
          setDeleting(null)
        }}
      />
    </div>
  )
}
