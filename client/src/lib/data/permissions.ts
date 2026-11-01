import { useMemo } from 'react'
import { useCurrentUser, useDepartments } from './queries'
import type { CrewEvent, Department, Person, Task } from './types'

/**
 * Client-side mirror of the API's role rules, used only to hide actions a user can't take.
 * The server enforces every rule independently (server/src/auth/access.ts).
 */
export function access(me: Person | undefined, departments: Department[]) {
  const id = me?.id
  const deptById = new Map(departments.map((d) => [d.id, d]))
  const isOrganizerOf = (e: Pick<CrewEvent, 'organizerId'> | undefined) => !!e && !!id && e.organizerId === id
  const leads = (d: Department | null | undefined) => !!d && !!id && d.leaderId === id
  const leadsAny = (eventId?: string) => departments.some((d) => leads(d) && (!eventId || d.eventId === eventId))

  return {
    me,
    canCreateEvent: me?.role === 'organizer',
    canManageEvent: isOrganizerOf,
    canEditDepartment: (e: CrewEvent | undefined, d: Department) => isOrganizerOf(e) || leads(d),
    /** Can create a task in this event (any department they lead counts). */
    canCreateTask: (e?: CrewEvent) => (e ? isOrganizerOf(e) || leadsAny(e.id) : me?.role === 'organizer' || leadsAny()),
    canManageTask: (e: CrewEvent | undefined, t: Task) => isOrganizerOf(e) || leads(t.departmentId ? deptById.get(t.departmentId) : null),
    canMoveTask: (e: CrewEvent | undefined, t: Task) => isOrganizerOf(e) || leads(t.departmentId ? deptById.get(t.departmentId) : null) || (!!id && t.assigneeId === id),
    canAddPeople: !!me && me.role !== 'volunteer',
    canEditPerson: (p: Person) => !!me && (p.id === me.id || me.role === 'organizer' || (me.role === 'leader' && p.role !== 'organizer')),
    /** Departments the user may file tasks under for an event (all for its organizer). */
    taskDepartments: (e: CrewEvent | undefined, list: Department[]) => (isOrganizerOf(e) ? list : list.filter((d) => leads(d))),
  }
}

export type Access = ReturnType<typeof access>

export function useAccess(): Access {
  const me = useCurrentUser()
  const depts = useDepartments()
  return useMemo(() => access(me.data, depts.data ?? []), [me.data, depts.data])
}
