import type { Types } from 'mongoose'
import { forbidden, notFound, sameId } from '../lib/http'
import { Department, Event, User, type DepartmentDoc, type EventDoc, type UserDoc } from '../models'

/**
 * Role-based permissions.
 *
 * - Organizer: full control of events they organize (details, members, departments, tasks).
 * - Team Leader: manages the members and tasks of departments they lead.
 * - Volunteer: reads their events; moves tasks assigned to them; sets their own availability.
 *
 * Visibility: a user sees events they organize or belong to, and everything inside those events.
 */

export const visibleEventFilter = (u: UserDoc) => ({ $or: [{ organizerId: u._id }, { memberIds: u._id }] })

export async function visibleEventIds(u: UserDoc): Promise<Types.ObjectId[]> {
  const rows = await Event.find(visibleEventFilter(u), { _id: 1 }).lean()
  return rows.map((r) => r._id)
}

export const isOrganizerOf = (u: UserDoc, e: Pick<EventDoc, 'organizerId'>) => sameId(e.organizerId, u._id)
export const canSeeEvent = (u: UserDoc, e: Pick<EventDoc, 'organizerId' | 'memberIds'>) =>
  isOrganizerOf(u, e) || e.memberIds.some((m) => sameId(m, u._id))

/** Load an event the user can see; hidden events are reported as not found. */
export async function loadVisibleEvent(u: UserDoc, id: Types.ObjectId) {
  const e = await Event.findById(id)
  if (!e || !canSeeEvent(u, e)) throw notFound('Event')
  return e
}

export async function loadManagedEvent(u: UserDoc, id: Types.ObjectId) {
  const e = await loadVisibleEvent(u, id)
  if (!isOrganizerOf(u, e)) throw forbidden('Only the event organizer can do that.')
  return e
}

/** Departments in an event that the user leads. */
export async function ledDepartmentIds(u: UserDoc, eventId: Types.ObjectId) {
  const rows = await Department.find({ eventId, leaderId: u._id }, { _id: 1 }).lean()
  return rows.map((r) => String(r._id))
}

export const leads = (u: UserDoc, d: Pick<DepartmentDoc, 'leaderId'> | null) => !!d && sameId(d.leaderId, u._id)

/**
 * People a user can see in the directory: themselves, anyone sharing one of their events,
 * and anyone they added.
 */
export async function visiblePeopleIds(u: UserDoc): Promise<Types.ObjectId[]> {
  const events = await Event.find(visibleEventFilter(u), { organizerId: 1, memberIds: 1 }).lean()
  const ids = new Map<string, Types.ObjectId>([[String(u._id), u._id]])
  for (const e of events) for (const id of [e.organizerId, ...e.memberIds]) ids.set(String(id), id)
  const created = await User.find({ createdBy: u._id }, { _id: 1 }).lean()
  for (const c of created) ids.set(String(c._id), c._id)
  return [...ids.values()]
}

/** Can `u` edit `target`'s directory profile? Self, their creator, or an organizer of an event they belong to. */
export async function canManagePerson(u: UserDoc, target: UserDoc) {
  if (sameId(u._id, target._id) || sameId(target.createdBy, u._id)) return true
  if (u.role !== 'organizer') return false
  return !!(await Event.exists({ organizerId: u._id, memberIds: target._id }))
}
