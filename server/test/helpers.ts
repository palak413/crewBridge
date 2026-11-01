import { MongoMemoryServer } from 'mongodb-memory-server'
import mongoose from 'mongoose'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach } from 'vitest'
import { createApp } from '../src/app'
import { loadEnv } from '../src/config/env'
import { clearAll } from '../src/seed/seedDemo'
import { Department, Event, Task, User } from '../src/models'

export const env = loadEnv({ NODE_ENV: 'test' })
export const app = createApp(env)

export function useDatabase() {
  let mongo: MongoMemoryServer
  beforeAll(async () => {
    mongo = await MongoMemoryServer.create()
    await mongoose.connect(mongo.getUri('crewbridge-test'))
    await Promise.all([User, Event, Department, Task].map((m) => (m as typeof User).init()))
  }, 60_000)
  beforeEach(() => clearAll())
  afterAll(async () => {
    await mongoose.disconnect()
    await mongo?.stop()
  })
}

/** A cookie-keeping client that sends the CSRF header on every request. */
export function client() {
  const agent = request.agent(app)
  const h = { 'X-Requested-With': 'CrewBridge' }
  return {
    agent,
    get: (url: string) => agent.get(url).set(h),
    post: (url: string, body?: object) => agent.post(url).set(h).send(body),
    put: (url: string, body?: object) => agent.put(url).set(h).send(body),
    patch: (url: string, body?: object) => agent.patch(url).set(h).send(body),
    delete: (url: string) => agent.delete(url).set(h),
  }
}

let n = 0
export async function signUp(role: 'organizer' | 'leader' | 'volunteer', name = `${role} ${++n}`) {
  const c = client()
  const email = `${role}${++n}@test.dev`
  const res = await c.post('/api/auth/register', { role, name, email, password: 'secret123' })
  if (res.status !== 201) throw new Error(`register failed: ${res.status} ${JSON.stringify(res.body)}`)
  return { c, user: res.body.user as { id: string; email: string; role: string }, email }
}

export const eventBody = (over: object = {}) => ({
  title: 'Spring Fair',
  description: 'Annual fair',
  startAt: '2026-11-20T09:00:00.000Z',
  endAt: '2026-11-20T17:00:00.000Z',
  location: 'Main Hall',
  status: 'upcoming',
  coverTheme: 'forest',
  coverUrl: '',
  ...over,
})

export const taskBody = (eventId: string, over: object = {}) => ({
  eventId,
  departmentId: null,
  title: 'Set up tables',
  description: '',
  priority: 'medium',
  status: 'todo',
  assigneeId: null,
  dueAt: null,
  ...over,
})
