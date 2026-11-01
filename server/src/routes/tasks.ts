import { taskInputSchema, taskStatuses, type TaskStatus } from '@crewbridge/shared'
import { Router } from 'express'
import { Types } from 'mongoose'
import { z } from 'zod'
import { isOrganizerOf, leads, visibleEventIds } from '../auth/access'
import { me } from '../auth/session'
import { logActivity, statusLabel } from '../lib/activity'
import { badRequest, forbidden, notFound, oid, parse, sameId } from '../lib/http'
import { Department, Event, Task, User, type UserDoc } from '../models'

const statusSchema = z.object({ status: z.enum(taskStatuses) })

const asId = (v: string | null, field: string) => {
  if (v === null) return null
  if (!Types.ObjectId.isValid(v)) throw badRequest({ [field]: 'Choose an existing option' })
  return new Types.ObjectId(v)
}

/** Validate references and decide whether `u` may place a task here (organizer, or leader of its department). */
async function resolveTarget(u: UserDoc, input: z.output<typeof taskInputSchema>) {
  const eventId = asId(input.eventId, 'eventId')!
  const event = await Event.findById(eventId)
  const visible = event && (isOrganizerOf(u, event) || event.memberIds.some((m) => sameId(m, u._id)))
  if (!event || !visible) throw badRequest({ eventId: 'Choose an existing event' })
  const departmentId = asId(input.departmentId, 'departmentId')
  const dept = departmentId ? await Department.findById(departmentId) : null
  if (departmentId && (!dept || !sameId(dept.eventId, event._id))) {
    throw badRequest({ departmentId: 'This department belongs to another event' })
  }
  const assigneeId = asId(input.assigneeId, 'assigneeId')
  if (assigneeId && !event.memberIds.some((m) => sameId(m, assigneeId))) {
    throw badRequest({ assigneeId: 'Add this person to the event first' })
  }
  const allowed = isOrganizerOf(u, event) || leads(u, dept)
  return { event, dept, departmentId, assigneeId, allowed }
}

async function loadTask(u: UserDoc, rawId: unknown) {
  const task = await Task.findById(oid(rawId, 'Task'))
  if (!task) throw notFound('Task')
  const event = await Event.findById(task.eventId)
  if (!event || !(isOrganizerOf(u, event) || event.memberIds.some((m) => sameId(m, u._id)))) throw notFound('Task')
  const dept = task.departmentId ? await Department.findById(task.departmentId) : null
  return { task, event, manager: isOrganizerOf(u, event) || leads(u, dept) }
}

const personName = async (id: Types.ObjectId | null | undefined) =>
  id ? ((await User.findById(id, { name: 1 }).lean())?.name ?? null) : null

function statusVerb(status: TaskStatus) {
  return status === 'completed'
    ? ({ verb: 'completed_task', detail: null } as const)
    : ({ verb: 'moved_task', detail: statusLabel[status] } as const)
}

export function taskRoutes() {
  const r = Router()

  r.get('/', async (req, res) => {
    const visible = await visibleEventIds(me(req))
    const filter: Record<string, unknown> = { eventId: { $in: visible } }
    const q = req.query
    if (typeof q.eventId === 'string' && q.eventId) {
      const id = oid(q.eventId, 'Event')
      filter.eventId = visible.some((v) => sameId(v, id)) ? id : { $in: [] }
    }
    if (typeof q.departmentId === 'string' && q.departmentId) filter.departmentId = oid(q.departmentId, 'Department')
    if (typeof q.assigneeId === 'string' && q.assigneeId) filter.assigneeId = oid(q.assigneeId, 'Volunteer')
    const tasks = await Task.find(filter).sort({ createdAt: -1 })
    res.json(tasks.map((t) => t.toJSON()))
  })

  r.post('/', async (req, res) => {
    const u = me(req)
    const data = parse(taskInputSchema, req.body)
    const { event, dept, departmentId, assigneeId, allowed } = await resolveTarget(u, data)
    if (!allowed) throw forbidden('Only the organizer or a department leader can create tasks here.')
    const task = await Task.create({
      ...data,
      eventId: event._id,
      departmentId,
      assigneeId,
      dueAt: data.dueAt ? new Date(data.dueAt) : null,
      createdBy: u._id,
      completedAt: data.status === 'completed' ? new Date() : null,
    })
    await logActivity(u._id, 'created_task', task.title, dept?.name ?? null, event._id)
    if (assigneeId) await logActivity(u._id, 'assigned_task', task.title, await personName(assigneeId), event._id)
    res.status(201).json(task.toJSON())
  })

  r.put('/:id', async (req, res) => {
    const u = me(req)
    const { task, manager } = await loadTask(u, req.params.id)
    if (!manager) throw forbidden('Only the organizer or this department’s leader can edit this task.')
    const data = parse(taskInputSchema, req.body)
    const target = await resolveTarget(u, data)
    if (!target.allowed) throw forbidden('You can’t move this task to that event or department.')
    const prevAssignee = task.assigneeId
    const prevStatus = task.status
    task.set({
      ...data,
      eventId: target.event._id,
      departmentId: target.departmentId,
      assigneeId: target.assigneeId,
      dueAt: data.dueAt ? new Date(data.dueAt) : null,
    })
    if (data.status === 'completed' && prevStatus !== 'completed') task.completedAt = new Date()
    if (data.status !== 'completed') task.completedAt = null
    await task.save()
    if (target.assigneeId && !sameId(target.assigneeId, prevAssignee)) {
      await logActivity(u._id, 'assigned_task', task.title, await personName(target.assigneeId), task.eventId)
    }
    if (data.status !== prevStatus) {
      const { verb, detail } = statusVerb(data.status)
      await logActivity(u._id, verb, task.title, detail, task.eventId)
    }
    res.json(task.toJSON())
  })

  // Status changes: managers, or the assignee for their own task.
  r.patch('/:id/status', async (req, res) => {
    const u = me(req)
    const { task, manager } = await loadTask(u, req.params.id)
    if (!manager && !sameId(task.assigneeId, u._id)) throw forbidden('You can only update tasks assigned to you.')
    const { status } = parse(statusSchema, req.body)
    if (task.status !== status) {
      task.status = status
      task.completedAt = status === 'completed' ? new Date() : null
      await task.save()
      const { verb, detail } = statusVerb(status)
      await logActivity(u._id, verb, task.title, detail, task.eventId)
    }
    res.json(task.toJSON())
  })

  r.delete('/:id', async (req, res) => {
    const { task, manager } = await loadTask(me(req), req.params.id)
    if (!manager) throw forbidden('Only the organizer or this department’s leader can delete this task.')
    await task.deleteOne()
    res.status(204).end()
  })

  return r
}
