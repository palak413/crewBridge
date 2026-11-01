import { describe, expect, it } from 'vitest'
import { ApiError } from '../api/client'
import { createLocalDemoSource, STORAGE_KEY } from './localDemoSource'
import type { EventInput, TaskInput } from './schemas'

function memoryStorage(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial))
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
  }
}

const now = () => new Date('2026-10-31T10:00:00Z')
const source = (storage = memoryStorage()) => createLocalDemoSource({ storage, now })

const eventInput: EventInput = {
  title: 'Winter Drive',
  description: '',
  startAt: '2026-12-01T09:00:00.000Z',
  endAt: '2026-12-01T17:00:00.000Z',
  location: 'Community hall',
  status: 'draft',
  coverTheme: 'sage',
  coverUrl: '',
}

const taskInput = (over: Partial<TaskInput> = {}): TaskInput => ({
  eventId: 'evttechfest',
  departmentId: 'depreg',
  title: 'Refill pens',
  description: '',
  priority: 'low',
  status: 'todo',
  assigneeId: null,
  dueAt: null,
  ...over,
})

describe('local demo source', () => {
  it('seeds a labelled demo workspace on first load', async () => {
    const src = source()
    expect(src.kind).toBe('local-demo')
    const events = await src.listEvents()
    expect(events.map((e) => e.title)).toEqual(['Alumni Meetup', 'TechFest 2026', 'Campus Hackathon'])
    expect(events.every((e) => e.isDemo)).toBe(true)
    expect((await src.currentUser()).role).toBe('organizer')
  })

  it('persists changes across instances sharing storage', async () => {
    const storage = memoryStorage()
    const created = await source(storage).createEvent(eventInput)
    const again = source(storage)
    expect((await again.getEvent(created.id)).title).toBe('Winter Drive')
    expect(created.isDemo).toBe(false)
  })

  it('reseeds when storage is corrupt', async () => {
    const src = source(memoryStorage({ [STORAGE_KEY]: '{not json' }))
    expect((await src.listEvents()).length).toBe(3)
  })

  it('validates event input like the API will', async () => {
    const err = await source()
      .createEvent({
        ...eventInput,
        title: 'x',
        endAt: '2026-11-30T00:00:00.000Z',
      })
      .catch((e: unknown) => e)
    expect(err).toBeInstanceOf(ApiError)
    expect((err as ApiError).code).toBe('VALIDATION')
    expect((err as ApiError).fields).toMatchObject({
      title: expect.any(String),
      endAt: 'End must be after the start',
    })
  })

  it('rejects assigning a task to someone outside the event', async () => {
    // Tara is not a TechFest member in the seed.
    const err = await source()
      .createTask(taskInput({ assigneeId: 'usrtara' }))
      .catch((e: unknown) => e)
    expect((err as ApiError).fields).toEqual({
      assigneeId: 'Add this person to the event first',
    })
  })

  it('rejects a department from another event', async () => {
    const err = await source()
      .createTask(taskInput({ departmentId: 'depops' }))
      .catch((e: unknown) => e)
    expect((err as ApiError).fields?.departmentId).toBeDefined()
  })

  it('tracks completion time when moving tasks and logs activity', async () => {
    const src = source()
    const t = await src.createTask(taskInput({ assigneeId: 'usrana' }))
    const done = await src.moveTask(t.id, 'completed')
    expect(done.completedAt).toBe(now().toISOString())
    const reopened = await src.moveTask(t.id, 'in_progress')
    expect(reopened.completedAt).toBeNull()
    const verbs = (await src.listActivity(4)).map((a) => a.verb)
    expect(verbs).toEqual(['moved_task', 'completed_task', 'assigned_task', 'created_task'])
  })

  it('removing a member clears their departments and open assignments', async () => {
    const src = source()
    await src.removeEventMember('evttechfest', 'usrmeera')
    const reg = (await src.listDepartments('evttechfest')).find((d) => d.id === 'depreg')!
    expect(reg.memberIds).not.toContain('usrmeera')
    const tasks = await src.listTasks({ eventId: 'evttechfest' })
    expect(tasks.find((t) => t.title === 'Print badge reprints')!.assigneeId).toBeNull()
  })

  it('setting a department leader adds them to the event', async () => {
    const src = source()
    const d = await src.createDepartment('evthack', {
      name: 'Judging',
      description: '',
      leaderId: 'usrzoe',
    })
    expect(d.memberIds).toEqual(['usrzoe'])
    expect((await src.getEvent('evthack')).memberIds).toContain('usrzoe')
  })

  it('rejects duplicate department names within an event', async () => {
    const err = await source()
      .createDepartment('evttechfest', {
        name: 'registration',
        description: '',
        leaderId: null,
      })
      .catch((e: unknown) => e)
    expect((err as ApiError).code).toBe('CONFLICT')
  })

  it('deleting an event cascades to its departments and tasks', async () => {
    const src = source()
    await src.deleteEvent('evttechfest')
    expect(await src.listDepartments('evttechfest')).toEqual([])
    expect(await src.listTasks({ eventId: 'evttechfest' })).toEqual([])
    await expect(src.getEvent('evttechfest')).rejects.toMatchObject({
      code: 'NOT_FOUND',
    })
  })

  it('rejects duplicate volunteer emails', async () => {
    const err = await source()
      .createVolunteer({
        name: 'Ana Two',
        email: 'ANA.RUIZ@example.org',
        phone: '',
        role: 'volunteer',
        skills: [],
        availability: 'available',
      })
      .catch((e: unknown) => e)
    expect((err as ApiError).code).toBe('CONFLICT')
  })

  it('normalises volunteer skills', async () => {
    const p = await source().createVolunteer({
      name: 'New Person',
      email: 'new@example.org',
      phone: '',
      role: 'volunteer',
      skills: ['First Aid', 'first aid', 'AV'],
      availability: 'busy',
    })
    expect(p.skills).toEqual(['first aid', 'av'])
    expect(p.phone).toBeNull()
  })

  it('reset restores the seed', async () => {
    const src = source()
    await src.deleteEvent('evttechfest')
    await src.resetDemo!()
    expect((await src.listEvents()).length).toBe(3)
  })
})
