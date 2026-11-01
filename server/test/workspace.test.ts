import { describe, expect, it } from 'vitest'
import { seedDemo } from '../src/seed/seedDemo'
import { client, env, eventBody, signUp, taskBody, useDatabase } from './helpers'

useDatabase()

describe('events', () => {
  it('only organizers create events; data is serialized with string ids and ISO dates', async () => {
    const vol = await signUp('volunteer')
    expect((await vol.c.post('/api/events', eventBody())).status).toBe(403)
    const org = await signUp('organizer')
    const res = await org.c.post('/api/events', eventBody({ coverUrl: '' }))
    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({ title: 'Spring Fair', organizerId: org.user.id, memberIds: [], coverUrl: null })
    expect(typeof res.body.id).toBe('string')
    expect(res.body.startAt).toBe('2026-11-20T09:00:00.000Z')
    expect(res.body.__v).toBeUndefined()
  })

  it('validates event input', async () => {
    const org = await signUp('organizer')
    const res = await org.c.post('/api/events', eventBody({ title: 'x', endAt: '2026-11-19T00:00:00.000Z' }))
    expect(res.status).toBe(422)
    expect(res.body.error.fields).toMatchObject({ title: expect.any(String) })
    const bad = await org.c.post('/api/events', eventBody({ endAt: '2026-11-19T00:00:00.000Z' }))
    expect(bad.body.error.fields.endAt).toBeTruthy()
  })

  it('hides events from non-members and blocks non-organizer edits', async () => {
    const org = await signUp('organizer')
    const other = await signUp('organizer')
    const id = (await org.c.post('/api/events', eventBody())).body.id
    expect((await other.c.get(`/api/events/${id}`)).status).toBe(404)
    expect((await other.c.get('/api/events')).body).toEqual([])
    expect((await other.c.put(`/api/events/${id}`, eventBody())).status).toBe(404)
    expect((await org.c.get('/api/events/not-an-id')).status).toBe(404)
  })

  it('member management: add requires a known person; removal clears departments and open assignments', async () => {
    const org = await signUp('organizer')
    const stranger = await signUp('volunteer')
    const id = (await org.c.post('/api/events', eventBody())).body.id
    // Organizer can't add people outside their directory by guessing ids.
    expect((await org.c.post(`/api/events/${id}/members`, { personIds: [stranger.user.id] })).status).toBe(422)

    const p = (await org.c.post('/api/people', { name: 'Pat Helper', email: 'pat@test.dev', phone: '', role: 'volunteer', skills: ['Setup'], availability: 'available' })).body
    expect(p.skills).toEqual(['setup'])
    const ev = await org.c.post(`/api/events/${id}/members`, { personIds: [p.id] })
    expect(ev.body.memberIds).toEqual([p.id])

    const dept = (await org.c.post(`/api/events/${id}/departments`, { name: 'Logistics', description: '', leaderId: p.id })).body
    expect(dept.memberIds).toEqual([p.id])
    const task = (await org.c.post('/api/tasks', taskBody(id, { assigneeId: p.id, departmentId: dept.id }))).body

    await org.c.delete(`/api/events/${id}/members/${p.id}`)
    const [d] = (await org.c.get(`/api/departments?eventId=${id}`)).body
    expect(d).toMatchObject({ leaderId: null, memberIds: [] })
    const [t] = (await org.c.get(`/api/tasks?eventId=${id}`)).body
    expect(t.id).toBe(task.id)
    expect(t.assigneeId).toBeNull()
  })

  it('deleting an event cascades to departments and tasks', async () => {
    const org = await signUp('organizer')
    const id = (await org.c.post('/api/events', eventBody())).body.id
    await org.c.post(`/api/events/${id}/departments`, { name: 'Ops', description: '', leaderId: null })
    await org.c.post('/api/tasks', taskBody(id))
    expect((await org.c.delete(`/api/events/${id}`)).status).toBe(204)
    expect((await org.c.get('/api/departments')).body).toEqual([])
    expect((await org.c.get('/api/tasks')).body).toEqual([])
  })
})

describe('departments, tasks and roles', () => {
  async function world() {
    const org = await signUp('organizer')
    const id = (await org.c.post('/api/events', eventBody())).body.id
    const mk = async (name: string, email: string, role: 'leader' | 'volunteer') =>
      (await org.c.post('/api/people', { name, email, phone: '', role, skills: [], availability: 'available' })).body.id as string
    const leadId = await mk('Lee Lead', 'lee@test.dev', 'leader')
    const volId = await mk('Vic Vol', 'vic@test.dev', 'volunteer')
    await org.c.post(`/api/events/${id}/members`, { personIds: [leadId, volId] })
    const lead = client()
    expect((await lead.post('/api/auth/register', { role: 'leader', name: 'Lee Lead', email: 'lee@test.dev', password: 'secret123' })).status).toBe(201)
    const vol = client()
    expect((await vol.post('/api/auth/register', { role: 'volunteer', name: 'Vic Vol', email: 'vic@test.dev', password: 'secret123' })).status).toBe(201)
    const dept = (await org.c.post(`/api/events/${id}/departments`, { name: 'Registration', description: '', leaderId: leadId })).body
    const other = (await org.c.post(`/api/events/${id}/departments`, { name: 'Catering', description: '', leaderId: null })).body
    return { org, lead, vol, id, leadId, volId, dept, other }
  }

  it('rejects duplicate department names (case-insensitive)', async () => {
    const { org, id } = await world()
    const res = await org.c.post(`/api/events/${id}/departments`, { name: 'registration', description: '', leaderId: null })
    expect(res.status).toBe(409)
    expect(res.body.error.fields.name).toBeTruthy()
  })

  it('leaders manage their own department only', async () => {
    const { lead, id, volId, dept, other, leadId } = await world()
    expect((await lead.post(`/api/events/${id}/departments`, { name: 'Mine', description: '', leaderId: null })).status).toBe(403)
    expect((await lead.put(`/api/departments/${dept.id}/members`, { personIds: [leadId, volId] })).status).toBe(200)
    expect((await lead.put(`/api/departments/${other.id}/members`, { personIds: [volId] })).status).toBe(403)
    expect((await lead.put(`/api/departments/${dept.id}`, { name: 'Check-in', description: 'Front desk', leaderId: volId })).status).toBe(403)
    expect((await lead.put(`/api/departments/${dept.id}`, { name: 'Check-in', description: 'Front desk', leaderId: leadId })).status).toBe(200)
    expect((await lead.delete(`/api/departments/${dept.id}`)).status).toBe(403)

    expect((await lead.post('/api/tasks', taskBody(id, { departmentId: dept.id, assigneeId: volId }))).status).toBe(201)
    expect((await lead.post('/api/tasks', taskBody(id, { departmentId: other.id }))).status).toBe(403)
    expect((await lead.post('/api/tasks', taskBody(id))).status).toBe(403)
  })

  it('volunteers read their event and move only their own tasks', async () => {
    const { org, vol, id, volId, dept } = await world()
    const mine = (await org.c.post('/api/tasks', taskBody(id, { assigneeId: volId, departmentId: dept.id }))).body
    const notMine = (await org.c.post('/api/tasks', taskBody(id, { title: 'Other job' }))).body
    expect((await vol.get('/api/events')).body).toHaveLength(1)
    expect((await vol.get(`/api/tasks?eventId=${id}`)).body).toHaveLength(2)
    expect((await vol.post('/api/tasks', taskBody(id))).status).toBe(403)
    expect((await vol.put(`/api/tasks/${mine.id}`, taskBody(id, { title: 'Hacked' }))).status).toBe(403)
    expect((await vol.delete(`/api/tasks/${mine.id}`)).status).toBe(403)
    expect((await vol.patch(`/api/tasks/${notMine.id}/status`, { status: 'completed' })).status).toBe(403)
    const moved = await vol.patch(`/api/tasks/${mine.id}/status`, { status: 'completed' })
    expect(moved.status).toBe(200)
    expect(moved.body.completedAt).toBeTruthy()
    expect((await vol.patch(`/api/tasks/${mine.id}/status`, { status: 'bogus' })).status).toBe(422)
  })

  it('task references are validated', async () => {
    const { org, id, other } = await world()
    const outsider = (await org.c.post('/api/people', { name: 'Out Sider', email: 'out@test.dev', phone: '', role: 'volunteer', skills: [], availability: 'available' })).body
    const r1 = await org.c.post('/api/tasks', taskBody(id, { assigneeId: outsider.id }))
    expect(r1.status).toBe(422)
    expect(r1.body.error.fields.assigneeId).toBe('Add this person to the event first')
    const id2 = (await org.c.post('/api/events', eventBody({ title: 'Second event' }))).body.id
    const r2 = await org.c.post('/api/tasks', taskBody(id2, { departmentId: other.id }))
    expect(r2.body.error.fields.departmentId).toBeTruthy()
    const r3 = await org.c.post('/api/tasks', taskBody('64b000000000000000000000'))
    expect(r3.body.error.fields.eventId).toBeTruthy()
  })

  it('availability: self or managers only; directory scoped to shared events', async () => {
    const { org, vol, volId, leadId } = await world()
    const stranger = await signUp('volunteer')
    expect((await vol.patch(`/api/people/${volId}/availability`, { availability: 'busy' })).body.availability).toBe('busy')
    expect((await vol.patch(`/api/people/${leadId}/availability`, { availability: 'busy' })).status).toBe(403)
    expect((await org.c.patch(`/api/people/${volId}/availability`, { availability: 'available' })).status).toBe(200)
    expect((await stranger.c.patch(`/api/people/${volId}/availability`, { availability: 'busy' })).status).toBe(404)
    const names = (await vol.get('/api/people')).body.map((p: { name: string }) => p.name)
    expect(names).not.toContain(stranger.user.email)
    expect(names).toHaveLength(3)
    // Organizers can't change a claimed account's email.
    expect((await org.c.put(`/api/people/${volId}`, { name: 'Vic Vol', email: 'new@test.dev', phone: '', role: 'volunteer', skills: [], availability: 'available' })).status).toBe(403)
  })

  it('records activity for visible events', async () => {
    const { org, vol, id, volId } = await world()
    const t = (await org.c.post('/api/tasks', taskBody(id, { assigneeId: volId }))).body
    await vol.patch(`/api/tasks/${t.id}/status`, { status: 'completed' })
    const verbs = (await org.c.get('/api/activity?limit=5')).body.map((a: { verb: string }) => a.verb)
    expect(verbs.slice(0, 3)).toEqual(['completed_task', 'assigned_task', 'created_task'])
    const stranger = await signUp('organizer')
    expect((await stranger.c.get('/api/activity')).body).toEqual([])
  })
})

describe('demo seed', () => {
  it('loads the shared workspace with working logins', async () => {
    const { password, accounts } = await seedDemo(env, 'demoPass123')
    expect(password).toBe('demoPass123')
    const c = client()
    expect((await c.post('/api/auth/login', { email: accounts[0], password })).status).toBe(200)
    const events = (await c.get('/api/events')).body
    expect(events).toHaveLength(3)
    expect((await c.get('/api/tasks')).body).toHaveLength(21)
    expect(events.every((e: { isDemo: boolean }) => e.isDemo)).toBe(true)
  })
})
