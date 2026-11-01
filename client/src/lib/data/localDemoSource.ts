import type { z } from 'zod'
import { ApiError } from '../api/client'
import {
  departmentInputSchema,
  eventInputSchema,
  taskInputSchema,
  volunteerInputSchema,
  type DepartmentInput,
  type EventInput,
  type TaskInput,
  type VolunteerInput,
} from './schemas'
import { createSeed, type Workspace } from './seed'
import type { DataSource } from './source'
import type { Activity, Availability, CrewEvent, Department, Person, Task, TaskFilter, TaskStatus } from './types'

/**
 * Milestone 2 demo data source.
 *
 * Persists a demo workspace in this browser's localStorage so every action (create, edit, assign,
 * move, delete) genuinely works and survives reloads. It enforces the same validation and
 * referential rules the API will enforce in Milestone 3, and throws the same `ApiError` codes.
 * It is NOT shared between users or devices — the UI says so wherever it is used.
 */

export const STORAGE_KEY = 'crewbridge.demo.v1'

type Storage = Pick<globalThis.Storage, 'getItem' | 'setItem' | 'removeItem'>

function safeStorage(): Storage | null {
  try {
    const s = globalThis.localStorage
    const probe = '__cb_probe__'
    s.setItem(probe, '1')
    s.removeItem(probe)
    return s
  } catch {
    return null
  }
}

const statusLabel: Record<TaskStatus, string> = {
  todo: 'To do',
  in_progress: 'In progress',
  completed: 'Completed',
}

export function uid(prefix: string) {
  const rand = globalThis.crypto?.randomUUID?.().replace(/-/g, '') ?? Math.random().toString(36).slice(2) + Date.now().toString(36)
  return `${prefix}${rand.slice(0, 14)}`
}

function parse<S extends z.ZodType>(schema: S, input: unknown): z.output<S> {
  const result = schema.safeParse(input)
  if (result.success) return result.data
  const fields: Record<string, string> = {}
  for (const issue of result.error.issues) {
    const key = issue.path.join('.') || 'form'
    fields[key] ??= issue.message
  }
  throw new ApiError('VALIDATION', 'Please check the highlighted fields.', 422, fields)
}

const notFound = (what: string) => new ApiError('NOT_FOUND', `${what} not found.`, 404)
const clone = <T>(v: T): T => structuredClone(v)

function isWorkspace(v: unknown): v is Workspace {
  const w = v as Workspace
  return !!w && w.version === 1 && Array.isArray(w.people) && Array.isArray(w.events) && Array.isArray(w.tasks)
}

export function createLocalDemoSource(options: { storage?: Storage | null; now?: () => Date } = {}): DataSource {
  const storage = options.storage === undefined ? safeStorage() : options.storage
  const now = options.now ?? (() => new Date())

  let ws: Workspace = load()

  function load(): Workspace {
    try {
      const raw = storage?.getItem(STORAGE_KEY)
      if (raw) {
        const parsed: unknown = JSON.parse(raw)
        if (isWorkspace(parsed)) return parsed
      }
    } catch {
      // Corrupt or inaccessible storage: fall through to a fresh seed.
    }
    const seeded = createSeed(now())
    persist(seeded)
    return seeded
  }

  function persist(next: Workspace) {
    try {
      storage?.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      // Quota or privacy mode: keep working in memory for this session.
    }
  }

  /** Re-read storage before each operation so changes made in another tab are respected. */
  function refresh() {
    try {
      const raw = storage?.getItem(STORAGE_KEY)
      if (raw) {
        const parsed: unknown = JSON.parse(raw)
        if (isWorkspace(parsed)) ws = parsed
      }
    } catch {
      /* keep in-memory copy */
    }
  }

  function commit() {
    persist(ws)
  }

  const stamp = () => now().toISOString()

  function log(verb: Activity['verb'], target: string, detail: string | null, eventId: string | null) {
    ws.activity.unshift({
      id: uid('act'),
      at: stamp(),
      actorId: ws.currentUserId,
      verb,
      target,
      detail,
      eventId,
    })
    ws.activity = ws.activity.slice(0, 200)
  }

  const findEvent = (id: string) => ws.events.find((e) => e.id === id) ?? null
  const findDept = (id: string) => ws.departments.find((d) => d.id === id) ?? null
  const findPerson = (id: string) => ws.people.find((p) => p.id === id) ?? null
  const findTask = (id: string) => ws.tasks.find((t) => t.id === id) ?? null

  function requireEvent(id: string) {
    const e = findEvent(id)
    if (!e) throw notFound('Event')
    return e
  }

  function ensureEventMember(event: CrewEvent, personId: string) {
    if (!findPerson(personId))
      throw new ApiError('VALIDATION', 'Unknown volunteer.', 422, {
        assigneeId: 'Unknown volunteer',
      })
    if (!event.memberIds.includes(personId)) event.memberIds.push(personId)
  }

  function validateTaskRefs(input: z.output<typeof taskInputSchema>) {
    const event = findEvent(input.eventId)
    if (!event) throw new ApiError('VALIDATION', 'Please check the highlighted fields.', 422, { eventId: 'Choose an existing event' })
    if (input.departmentId) {
      const d = findDept(input.departmentId)
      if (!d || d.eventId !== event.id) {
        throw new ApiError('VALIDATION', 'Please check the highlighted fields.', 422, { departmentId: 'This department belongs to another event' })
      }
    }
    if (input.assigneeId && !event.memberIds.includes(input.assigneeId)) {
      throw new ApiError('VALIDATION', 'Please check the highlighted fields.', 422, { assigneeId: 'Add this person to the event first' })
    }
    return event
  }

  const ok = <T>(v: T) => Promise.resolve(clone(v))
  const run = <T>(fn: () => T): Promise<T> => {
    try {
      refresh()
      return ok(fn())
    } catch (err) {
      return Promise.reject(err)
    }
  }

  return {
    kind: 'local-demo',

    currentUser: () =>
      run(() => {
        const me = findPerson(ws.currentUserId)
        if (!me) throw notFound('User')
        return me
      }),

    listEvents: () => run(() => [...ws.events].sort((a, b) => Date.parse(a.startAt) - Date.parse(b.startAt))),
    getEvent: (id) => run(() => requireEvent(id)),

    createEvent: (input: EventInput) =>
      run(() => {
        const data = parse(eventInputSchema, input)
        const ts = stamp()
        const event: CrewEvent = {
          id: uid('evt'),
          ...data,
          organizerId: ws.currentUserId,
          memberIds: [],
          createdAt: ts,
          updatedAt: ts,
          isDemo: false,
        }
        ws.events.push(event)
        log('created_event', event.title, null, event.id)
        commit()
        return event
      }),

    updateEvent: (id, input) =>
      run(() => {
        const event = requireEvent(id)
        const data = parse(eventInputSchema, input)
        Object.assign(event, data, { updatedAt: stamp() })
        log('updated_event', event.title, null, event.id)
        commit()
        return event
      }),

    deleteEvent: (id) =>
      run(() => {
        requireEvent(id)
        ws.events = ws.events.filter((e) => e.id !== id)
        ws.departments = ws.departments.filter((d) => d.eventId !== id)
        ws.tasks = ws.tasks.filter((t) => t.eventId !== id)
        commit()
      }),

    addEventMembers: (eventId, personIds) =>
      run(() => {
        const event = requireEvent(eventId)
        for (const pid of personIds) {
          const p = findPerson(pid)
          if (!p) throw notFound('Volunteer')
          if (!event.memberIds.includes(pid)) {
            event.memberIds.push(pid)
            log('added_volunteer', p.name, event.title, event.id)
          }
        }
        event.updatedAt = stamp()
        commit()
        return event
      }),

    removeEventMember: (eventId, personId) =>
      run(() => {
        const event = requireEvent(eventId)
        event.memberIds = event.memberIds.filter((id) => id !== personId)
        for (const d of ws.departments) {
          if (d.eventId !== eventId) continue
          d.memberIds = d.memberIds.filter((id) => id !== personId)
          if (d.leaderId === personId) d.leaderId = null
        }
        for (const t of ws.tasks) {
          if (t.eventId === eventId && t.assigneeId === personId && t.status !== 'completed') {
            t.assigneeId = null
            t.updatedAt = stamp()
          }
        }
        commit()
        return event
      }),

    listDepartments: (eventId) => run(() => ws.departments.filter((d) => !eventId || d.eventId === eventId).sort((a, b) => a.name.localeCompare(b.name))),

    createDepartment: (eventId, input: DepartmentInput) =>
      run(() => {
        const event = requireEvent(eventId)
        const data = parse(departmentInputSchema, input)
        if (ws.departments.some((d) => d.eventId === eventId && d.name.toLowerCase() === data.name.toLowerCase())) {
          throw new ApiError('CONFLICT', 'A department with this name already exists.', 409, { name: 'Already exists in this event' })
        }
        const memberIds: string[] = []
        if (data.leaderId) {
          ensureEventMember(event, data.leaderId)
          memberIds.push(data.leaderId)
        }
        const dept: Department = {
          id: uid('dep'),
          eventId,
          ...data,
          memberIds,
          createdAt: stamp(),
        }
        ws.departments.push(dept)
        log('created_department', dept.name, event.title, eventId)
        commit()
        return dept
      }),

    updateDepartment: (id, input) =>
      run(() => {
        const dept = findDept(id)
        if (!dept) throw notFound('Department')
        const data = parse(departmentInputSchema, input)
        if (ws.departments.some((d) => d.id !== id && d.eventId === dept.eventId && d.name.toLowerCase() === data.name.toLowerCase())) {
          throw new ApiError('CONFLICT', 'A department with this name already exists.', 409, { name: 'Already exists in this event' })
        }
        if (data.leaderId) {
          ensureEventMember(requireEvent(dept.eventId), data.leaderId)
          if (!dept.memberIds.includes(data.leaderId)) dept.memberIds.push(data.leaderId)
        }
        Object.assign(dept, data)
        commit()
        return dept
      }),

    deleteDepartment: (id) =>
      run(() => {
        if (!findDept(id)) throw notFound('Department')
        ws.departments = ws.departments.filter((d) => d.id !== id)
        for (const t of ws.tasks) if (t.departmentId === id) t.departmentId = null
        commit()
      }),

    setDepartmentMembers: (id, personIds) =>
      run(() => {
        const dept = findDept(id)
        if (!dept) throw notFound('Department')
        const event = requireEvent(dept.eventId)
        const unique = [...new Set(personIds)]
        for (const pid of unique) ensureEventMember(event, pid)
        dept.memberIds = unique
        if (dept.leaderId && !unique.includes(dept.leaderId)) dept.leaderId = null
        commit()
        return dept
      }),

    listPeople: () => run(() => [...ws.people].sort((a, b) => a.name.localeCompare(b.name))),

    createVolunteer: (input: VolunteerInput) =>
      run(() => {
        const data = parse(volunteerInputSchema, input)
        if (ws.people.some((p) => p.email.toLowerCase() === data.email.toLowerCase())) {
          throw new ApiError('CONFLICT', 'Someone with this email already exists.', 409, { email: 'Already in your directory' })
        }
        const ts = stamp()
        const person: Person = {
          id: uid('usr'),
          ...data,
          availabilityUpdatedAt: ts,
          createdAt: ts,
          isDemo: false,
        }
        ws.people.push(person)
        commit()
        return person
      }),

    updateVolunteer: (id, input) =>
      run(() => {
        const p = findPerson(id)
        if (!p) throw notFound('Volunteer')
        const data = parse(volunteerInputSchema, input)
        if (ws.people.some((o) => o.id !== id && o.email.toLowerCase() === data.email.toLowerCase())) {
          throw new ApiError('CONFLICT', 'Someone with this email already exists.', 409, { email: 'Already in your directory' })
        }
        if (p.availability !== data.availability) p.availabilityUpdatedAt = stamp()
        Object.assign(p, data, p.role === 'organizer' ? { role: 'organizer' } : {})
        commit()
        return p
      }),

    setAvailability: (id, availability: Availability) =>
      run(() => {
        const p = findPerson(id)
        if (!p) throw notFound('Volunteer')
        p.availability = availability
        p.availabilityUpdatedAt = stamp()
        commit()
        return p
      }),

    listTasks: (filter: TaskFilter = {}) =>
      run(() =>
        ws.tasks.filter(
          (t) =>
            (!filter.eventId || t.eventId === filter.eventId) &&
            (!filter.departmentId || t.departmentId === filter.departmentId) &&
            (!filter.assigneeId || t.assigneeId === filter.assigneeId),
        ),
      ),

    createTask: (input: TaskInput) =>
      run(() => {
        const data = parse(taskInputSchema, input)
        const event = validateTaskRefs(data)
        const ts = stamp()
        const task: Task = {
          id: uid('tsk'),
          ...data,
          createdBy: ws.currentUserId,
          createdAt: ts,
          updatedAt: ts,
          completedAt: data.status === 'completed' ? ts : null,
          isDemo: false,
        }
        ws.tasks.push(task)
        log('created_task', task.title, findDept(task.departmentId ?? '')?.name ?? null, event.id)
        if (task.assigneeId) log('assigned_task', task.title, findPerson(task.assigneeId)?.name ?? null, event.id)
        commit()
        return task
      }),

    updateTask: (id, input) =>
      run(() => {
        const task = findTask(id)
        if (!task) throw notFound('Task')
        const data = parse(taskInputSchema, input)
        validateTaskRefs(data)
        const prevAssignee = task.assigneeId
        const prevStatus = task.status
        const ts = stamp()
        Object.assign(task, data, { updatedAt: ts })
        if (data.status === 'completed' && prevStatus !== 'completed') task.completedAt = ts
        if (data.status !== 'completed') task.completedAt = null
        if (data.assigneeId && data.assigneeId !== prevAssignee) {
          log('assigned_task', task.title, findPerson(data.assigneeId)?.name ?? null, task.eventId)
        }
        if (data.status !== prevStatus) {
          log(data.status === 'completed' ? 'completed_task' : 'moved_task', task.title, data.status === 'completed' ? null : statusLabel[data.status], task.eventId)
        }
        commit()
        return task
      }),

    moveTask: (id, status) =>
      run(() => {
        const task = findTask(id)
        if (!task) throw notFound('Task')
        if (task.status === status) return task
        const ts = stamp()
        task.status = status
        task.updatedAt = ts
        task.completedAt = status === 'completed' ? ts : null
        log(status === 'completed' ? 'completed_task' : 'moved_task', task.title, status === 'completed' ? null : statusLabel[status], task.eventId)
        commit()
        return task
      }),

    deleteTask: (id) =>
      run(() => {
        if (!findTask(id)) throw notFound('Task')
        ws.tasks = ws.tasks.filter((t) => t.id !== id)
        commit()
      }),

    listActivity: (limit = 20) => run(() => ws.activity.slice(0, limit)),

    resetDemo: () =>
      run(() => {
        ws = createSeed(now())
        commit()
      }),
  }
}
