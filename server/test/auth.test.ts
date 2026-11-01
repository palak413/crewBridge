import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { app, client, signUp, useDatabase } from './helpers'

useDatabase()

describe('auth', () => {
  it('registers, sets an httpOnly session cookie, and never returns the password hash', async () => {
    const c = client()
    const res = await c.post('/api/auth/register', { role: 'organizer', name: 'Ana Diaz', email: 'Ana@Test.dev', password: 'secret123' })
    expect(res.status).toBe(201)
    expect(res.body.user).toMatchObject({ name: 'Ana Diaz', email: 'ana@test.dev', role: 'organizer' })
    expect(res.body.user.passwordHash).toBeUndefined()
    expect(res.body.user._id).toBeUndefined()
    const cookie = String(res.headers['set-cookie'])
    expect(cookie).toMatch(/cb_session=/)
    expect(cookie).toMatch(/HttpOnly/i)
    expect(cookie).toMatch(/SameSite=Lax/i)

    const meRes = await c.get('/api/auth/me')
    expect(meRes.status).toBe(200)
    expect(meRes.body.user.email).toBe('ana@test.dev')
  })

  it('validates input with field errors', async () => {
    const res = await client().post('/api/auth/register', { role: 'boss', name: 'A', email: 'nope', password: 'short' })
    expect(res.status).toBe(422)
    expect(res.body.error.code).toBe('VALIDATION')
    expect(Object.keys(res.body.error.fields)).toEqual(expect.arrayContaining(['role', 'name', 'email', 'password']))
  })

  it('rejects duplicate emails', async () => {
    const { email } = await signUp('volunteer')
    const res = await client().post('/api/auth/register', { role: 'volunteer', name: 'Dup User', email, password: 'secret123' })
    expect(res.status).toBe(409)
    expect(res.body.error.fields.email).toBeTruthy()
  })

  it('logs in with correct credentials only', async () => {
    const { email } = await signUp('leader')
    const bad = await client().post('/api/auth/login', { email, password: 'wrong1234' })
    expect(bad.status).toBe(401)
    expect(bad.body.error.code).toBe('UNAUTHORIZED')
    const unknown = await client().post('/api/auth/login', { email: 'ghost@test.dev', password: 'secret123' })
    expect(unknown.status).toBe(401)
    const c = client()
    expect((await c.post('/api/auth/login', { email: email.toUpperCase(), password: 'secret123' })).status).toBe(200)
    expect((await c.get('/api/auth/me')).status).toBe(200)
  })

  it('logout clears the session', async () => {
    const { c } = await signUp('volunteer')
    expect((await c.post('/api/auth/logout')).status).toBe(204)
    expect((await c.get('/api/auth/me')).status).toBe(401)
  })

  it('protects routes and rejects forged tokens', async () => {
    expect((await request(app).get('/api/events')).status).toBe(401)
    const forged = await request(app).get('/api/events').set('Cookie', 'cb_session=eyJhbGciOiJub25lIn0.e30.')
    expect(forged.status).toBe(401)
  })

  it('requires the CSRF header on state-changing requests', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'a@b.co', password: 'x' })
    expect(res.status).toBe(403)
  })

  it('lets a person claim a directory entry created for their email', async () => {
    const { c } = await signUp('organizer')
    const added = await c.post('/api/people', { name: 'Invited Person', email: 'invitee@test.dev', phone: '', role: 'volunteer', skills: [], availability: 'available' })
    expect(added.status).toBe(201)
    expect(added.body.claimed).toBe(false)
    const reg = await client().post('/api/auth/register', { role: 'volunteer', name: 'Invited Person', email: 'invitee@test.dev', password: 'secret123' })
    expect(reg.status).toBe(201)
    expect(reg.body.user.id).toBe(added.body.id)
    expect(reg.body.user.claimed).toBe(true)
  })

  it('reports health and returns JSON 404s', async () => {
    expect((await request(app).get('/api/health')).body.ok).toBe(true)
    expect((await request(app).get('/api/nope')).status).toBe(401)
    const { c } = await signUp('volunteer')
    const nf = await c.get('/api/nope')
    expect(nf.status).toBe(404)
    expect(nf.body.error.code).toBe('NOT_FOUND')
  })
})
