import { departmentInputSchema, eventInputSchema } from '@crewbridge/shared'
import { Router } from 'express'
import type { Types } from 'mongoose'
import { canSeeEvent, loadManagedEvent, loadVisibleEvent, visibleEventFilter, visiblePeopleIds } from '../auth/access'
import { me, requireRole } from '../auth/session'
import { logActivity } from '../lib/activity'
import { badRequest, conflict, notFound, oid, oidList, parse, sameId } from '../lib/http'
import type { ChannelSync } from '../integrations/nexconn/channels'
import { Activity, Department, Event, Task, User } from '../models'

/** Ensure every id refers to a person the actor can see in their directory. */
export async function assertKnownPeople(actorVisible: Types.ObjectId[], ids: Types.ObjectId[], field: string) {
  const allowed = new Set(actorVisible.map(String))
  for (const id of ids) if (!allowed.has(String(id))) throw badRequest({ [field]: 'Unknown volunteer' })
  const count = await User.countDocuments({ _id: { $in: ids } })
  if (count !== ids.length) throw badRequest({ [field]: 'Unknown volunteer' })
}

export function eventRoutes(chat: ChannelSync | null = null) {
  const r = Router()

  r.get('/', async (req, res) => {
    const events = await Event.find(visibleEventFilter(me(req))).sort({ startAt: 1 })
    res.json(events.map((e) => e.toJSON()))
  })

  r.post('/', requireRole('organizer'), async (req, res) => {
    const u = me(req)
    const data = parse(eventInputSchema, req.body)
    const event = await Event.create({ ...data, organizerId: u._id, memberIds: [] })
    await logActivity(u._id, 'created_event', event.title, null, event._id)
    res.status(201).json(event.toJSON())
  })

  r.get('/:id', async (req, res) => {
    const event = await loadVisibleEvent(me(req), oid(req.params.id, 'Event'))
    res.json(event.toJSON())
  })

  r.put('/:id', async (req, res) => {
    const u = me(req)
    const event = await loadManagedEvent(u, oid(req.params.id, 'Event'))
    const data = parse(eventInputSchema, req.body)
    event.set(data)
    await event.save()
    await logActivity(u._id, 'updated_event', event.title, null, event._id)
    res.json(event.toJSON())
  })

  r.delete('/:id', async (req, res) => {
    const event = await loadManagedEvent(me(req), oid(req.params.id, 'Event'))
    if (chat) {
      const channels = [event.chatChannelId, ...(await Department.find({ eventId: event._id }, { chatChannelId: 1 }).lean()).map((d) => d.chatChannelId)]
      chat.background('dismiss event channels', async () => {
        for (const c of channels) await chat.dismiss(c)
      })
    }
    await Promise.all([
      Task.deleteMany({ eventId: event._id }),
      Department.deleteMany({ eventId: event._id }),
      Activity.deleteMany({ eventId: event._id }),
    ])
    await event.deleteOne()
    res.status(204).end()
  })

  r.post('/:id/members', async (req, res) => {
    const u = me(req)
    const event = await loadManagedEvent(u, oid(req.params.id, 'Event'))
    const ids = oidList(req.body?.personIds, 'personIds')
    await assertKnownPeople(await visiblePeopleIds(u), ids, 'personIds')
    const added = ids.filter((id) => !event.memberIds.some((m) => sameId(m, id)))
    if (added.length) {
      event.memberIds.push(...added)
      await event.save()
      const people = await User.find({ _id: { $in: added } }, { name: 1 }).lean()
      for (const p of people) await logActivity(u._id, 'added_volunteer', p.name, event.title, event._id)
      chat?.background('sync event channel', () => chat.syncEvent(event._id))
    }
    res.json(event.toJSON())
  })

  r.delete('/:id/members/:personId', async (req, res) => {
    const event = await loadManagedEvent(me(req), oid(req.params.id, 'Event'))
    const personId = oid(req.params.personId, 'Volunteer')
    event.memberIds = event.memberIds.filter((m) => !sameId(m, personId)) as typeof event.memberIds
    await event.save()
    await Department.updateMany({ eventId: event._id }, { $pull: { memberIds: personId } })
    await Department.updateMany({ eventId: event._id, leaderId: personId }, { $set: { leaderId: null } })
    await Task.updateMany({ eventId: event._id, assigneeId: personId, status: { $ne: 'completed' } }, { $set: { assigneeId: null } })
    chat?.background('sync event channels', () => chat.syncEventTree(event._id))
    res.json(event.toJSON())
  })

  r.post('/:id/departments', async (req, res) => {
    const u = me(req)
    const event = await loadManagedEvent(u, oid(req.params.id, 'Event'))
    const data = parse(departmentInputSchema, req.body)
    const memberIds: Types.ObjectId[] = []
    let leaderId: Types.ObjectId | null = null
    if (data.leaderId) {
      leaderId = oidOrInvalid(data.leaderId, 'leaderId')
      await addEventMember(u, event, leaderId, 'leaderId')
      memberIds.push(leaderId)
    }
    if (await Department.exists({ eventId: event._id, nameKey: data.name.toLowerCase() })) {
      throw conflict('A department with this name already exists.', { name: 'Already exists in this event' })
    }
    const dept = await Department.create({ eventId: event._id, name: data.name, description: data.description, leaderId, memberIds })
    await logActivity(u._id, 'created_department', dept.name, event.title, event._id)
    if (leaderId) chat?.background('sync event channel', () => chat.syncEvent(event._id))
    res.status(201).json(dept.toJSON())
  })

  return r
}

export function oidOrInvalid(value: string, field: string) {
  try {
    return oid(value)
  } catch {
    throw badRequest({ [field]: 'Unknown volunteer' })
  }
}

/** Add a person to an event (if not already a member) after checking the actor may reference them. */
export async function addEventMember(
  actor: Parameters<typeof visiblePeopleIds>[0],
  event: InstanceType<typeof Event>,
  personId: Types.ObjectId,
  field: string,
) {
  if (event.memberIds.some((m) => sameId(m, personId))) return
  if (!canSeeEvent(actor, event)) throw notFound('Event')
  await assertKnownPeople(await visiblePeopleIds(actor), [personId], field)
  event.memberIds.push(personId)
  await event.save()
}

