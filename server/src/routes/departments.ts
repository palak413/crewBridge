import { departmentInputSchema } from '@crewbridge/shared'
import { Router } from 'express'
import type { Types } from 'mongoose'
import { isOrganizerOf, leads, loadVisibleEvent, visibleEventIds, visiblePeopleIds } from '../auth/access'
import { me } from '../auth/session'
import { conflict, forbidden, notFound, oid, oidList, parse, sameId } from '../lib/http'
import type { ChannelSync } from '../integrations/nexconn/channels'
import { Department, Event, Task } from '../models'
import { addEventMember, assertKnownPeople, oidOrInvalid } from './events'

async function loadDept(req: Parameters<typeof me>[0]) {
  const u = me(req)
  const dept = await Department.findById(oid(req.params.id, 'Department'))
  if (!dept) throw notFound('Department')
  const event = await loadVisibleEvent(u, dept.eventId).catch(() => {
    throw notFound('Department')
  })
  return { u, dept, event, organizer: isOrganizerOf(u, event), leader: leads(u, dept) }
}

export function departmentRoutes(chat: ChannelSync | null = null) {
  const r = Router()

  r.get('/', async (req, res) => {
    const u = me(req)
    const visible = await visibleEventIds(u)
    let filter: Record<string, unknown> = { eventId: { $in: visible } }
    if (typeof req.query.eventId === 'string' && req.query.eventId) {
      const id = oid(req.query.eventId, 'Event')
      filter = { eventId: visible.some((v) => sameId(v, id)) ? id : { $in: [] } }
    }
    const depts = await Department.find(filter).collation({ locale: 'en' }).sort({ name: 1 })
    res.json(depts.map((d) => d.toJSON()))
  })

  // Organizers edit everything; a department's leader may edit its name and description.
  r.put('/:id', async (req, res) => {
    const { u, dept, event, organizer, leader } = await loadDept(req)
    if (!organizer && !leader) throw forbidden('Only the organizer or this department’s leader can edit it.')
    const data = parse(departmentInputSchema, req.body)
    if (!organizer && !sameId(data.leaderId, dept.leaderId)) throw forbidden('Only the organizer can change the leader.')
    if (await Department.exists({ _id: { $ne: dept._id }, eventId: dept.eventId, nameKey: data.name.toLowerCase() })) {
      throw conflict('A department with this name already exists.', { name: 'Already exists in this event' })
    }
    let leaderId: Types.ObjectId | null = null
    if (data.leaderId) {
      leaderId = oidOrInvalid(data.leaderId, 'leaderId')
      await addEventMember(u, event, leaderId, 'leaderId')
      if (!dept.memberIds.some((m) => sameId(m, leaderId))) dept.memberIds.push(leaderId)
    }
    dept.set({ name: data.name, description: data.description, leaderId })
    await dept.save()
    chat?.background('sync department channel', async () => {
      await chat.syncEvent(event._id)
      await chat.syncDepartment(dept._id)
    })
    res.json(dept.toJSON())
  })

  r.delete('/:id', async (req, res) => {
    const { dept, organizer } = await loadDept(req)
    if (!organizer) throw forbidden('Only the event organizer can delete departments.')
    await Task.updateMany({ departmentId: dept._id }, { $set: { departmentId: null } })
    const channelId = dept.chatChannelId
    await dept.deleteOne()
    chat?.background('dismiss department channel', () => chat.dismiss(channelId))
    res.status(204).end()
  })

  r.put('/:id/members', async (req, res) => {
    const { u, dept, event, organizer, leader } = await loadDept(req)
    if (!organizer && !leader) throw forbidden('Only the organizer or this department’s leader can change its members.')
    const ids = oidList(req.body?.personIds, 'personIds')
    const newcomers = ids.filter((id) => !event.memberIds.some((m) => sameId(m, id)))
    if (newcomers.length) {
      await assertKnownPeople(await visiblePeopleIds(u), newcomers, 'personIds')
      await Event.updateOne({ _id: event._id }, { $addToSet: { memberIds: { $each: newcomers } } })
    }
    dept.memberIds = ids as typeof dept.memberIds
    if (dept.leaderId && !ids.some((id) => sameId(id, dept.leaderId))) {
      // A leader can't remove themselves from leadership; only the organizer can.
      if (!organizer) throw forbidden('Only the organizer can remove the department leader.')
      dept.leaderId = null
    }
    await dept.save()
    chat?.background('sync department channel', async () => {
      if (newcomers.length) await chat.syncEvent(event._id)
      await chat.syncDepartment(dept._id)
    })
    res.json(dept.toJSON())
  })

  return r
}
