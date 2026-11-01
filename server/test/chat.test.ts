import { createHash } from 'node:crypto'
import request from 'supertest'
import { describe, expect, it, vi } from 'vitest'
import { createApp } from '../src/app'
import { loadEnv } from '../src/config/env'
import { createNexconnClient } from '../src/integrations/nexconn/client'
import { env as baseEnv, eventBody, signUp, useDatabase } from './helpers'

useDatabase()

const nxEnv = loadEnv({ NODE_ENV: 'test', NEXCONN_APP_KEY: 'appkey123', NEXCONN_APP_SECRET: 'super-secret', NEXCONN_AREA: 'SG' })

interface Call {
  url: string
  path: string
  headers: Record<string, string>
  body: { channelId?: string; userIds?: string[]; owner?: string; userId?: string; name?: string }
}

/** Fake Nexconn Server API that records calls. */
function fakeNexconn(fail?: (path: string) => Response | null) {
  const calls: Call[] = []
  const impl = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    const u = new URL(String(url))
    const call = { url: String(url), path: u.pathname, headers: init?.headers as Record<string, string>, body: JSON.parse(String(init?.body)) }
    calls.push(call)
    const failed = fail?.(u.pathname)
    if (failed) return failed
    const result = u.pathname === '/v4/auth/access-token/issue' ? { accessToken: `tok-${call.body.userId}`, userId: call.body.userId } : undefined
    return new Response(JSON.stringify({ code: 0, result }), { status: 200, headers: { 'content-type': 'application/json' } })
  })
  return { calls, fetch: impl as unknown as typeof fetch }
}

/** Sign up against a specific app instance (signUp in helpers uses the default app). */
async function account(app: ReturnType<typeof createApp>, role: 'organizer' | 'leader' | 'volunteer', email: string) {
  const agent = request.agent(app)
  const h = { 'X-Requested-With': 'CrewBridge' }
  const res = await agent.post('/api/auth/register').set(h).send({ role, name: `${role} ${email}`, email, password: 'secret123' })
  expect(res.status).toBe(201)
  return {
    id: res.body.user.id as string,
    post: (url: string, body?: object) => agent.post(url).set(h).send(body),
    put: (url: string, body?: object) => agent.put(url).set(h).send(body),
    delete: (url: string) => agent.delete(url).set(h),
  }
}

describe('chat session', () => {
  it('reports messaging as unavailable when Nexconn is not configured', async () => {
    expect(baseEnv.nexconn).toBeNull()
    const { c } = await signUp('volunteer')
    const res = await c.post('/api/chat/session')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ enabled: false })
  })

  it('issues a token, creates authorized channels and never exposes the App Secret', async () => {
    const nx = fakeNexconn()
    const app = createApp(nxEnv, { nexconnFetch: nx.fetch })
    const org = await account(app, 'organizer', 'org@chat.dev')

    const eventId = (await org.post('/api/events', eventBody())).body.id
    const otherEventId = (await org.post('/api/events', eventBody({ title: 'Private planning' }))).body.id
    // Organizers add a directory entry; the volunteer later claims it by registering.
    const volEntry = (await org.post('/api/people', { name: 'Vee', email: 'vee@chat.dev', phone: '', role: 'volunteer', skills: [], availability: 'available' })).body
    expect(volEntry.id).toBeTruthy()
    await org.post(`/api/events/${eventId}/members`, { personIds: [volEntry.id] })
    const dept = (await org.post(`/api/events/${eventId}/departments`, { name: 'Logistics', description: '', leaderId: null })).body
    await org.put(`/api/departments/${dept.id}/members`, { personIds: [volEntry.id] })

    // Vee claims the directory entry and opens Messages.
    const vee = await account(app, 'volunteer', 'vee@chat.dev')
    expect(vee.id).toBe(volEntry.id)
    const res = await vee.post('/api/chat/session')
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ enabled: true, appKey: 'appkey123', area: 'SG', userId: vee.id, token: `tok-${vee.id}` })
    expect(JSON.stringify(res.body)).not.toContain('super-secret')
    // Only the channels Vee belongs to.
    expect(res.body.channels.map((c: { channelId: string }) => c.channelId)).toEqual([`evt${eventId}`, `dep${dept.id}`])

    // Server API calls: signed, to the SG host, with the right members.
    const create = nx.calls.filter((c) => c.path === '/v4/group-channel/create')
    expect(create.map((c) => c.body.channelId).sort()).toEqual([`dep${dept.id}`, `evt${eventId}`].sort())
    const evtCreate = create.find((c) => c.body.channelId === `evt${eventId}`)!
    expect(evtCreate.url.startsWith('https://api.sg-light-api.com/')).toBe(true)
    expect(evtCreate.body.owner).toBe(org.id)
    expect(evtCreate.body.userIds).toEqual([vee.id])
    const { Nonce, Timestamp, Signature } = evtCreate.headers
    expect(evtCreate.headers['App-Key']).toBe('appkey123')
    expect(Nonce.length).toBeLessThanOrEqual(18)
    expect(Number(Timestamp)).toBeGreaterThan(1_600_000_000_000) // milliseconds
    expect(Signature).toBe(createHash('sha1').update(`super-secret${Nonce}${Timestamp}`).digest('hex'))
    // The private event wasn't created because nobody authorized for it opened chat.
    expect(create.some((c) => c.body.channelId === `evt${otherEventId}`)).toBe(false)

    // A second session doesn't recreate groups.
    const before = nx.calls.filter((c) => c.path === '/v4/group-channel/create').length
    await vee.post('/api/chat/session')
    expect(nx.calls.filter((c) => c.path === '/v4/group-channel/create').length).toBe(before)
  })

  it('removes people from Nexconn channels when they lose access', async () => {
    const nx = fakeNexconn()
    const app = createApp(nxEnv, { nexconnFetch: nx.fetch })
    const org = await account(app, 'organizer', 'org2@chat.dev')
    const eventId = (await org.post('/api/events', eventBody())).body.id
    const p = (await org.post('/api/people', { name: 'Pat', email: 'pat@chat.dev', phone: '', role: 'volunteer', skills: [], availability: 'available' })).body
    await org.post(`/api/events/${eventId}/members`, { personIds: [p.id] })
    const dept = (await org.post(`/api/events/${eventId}/departments`, { name: 'Ops', description: '', leaderId: p.id })).body
    await org.post('/api/chat/session') // organizer opens chat → both groups created with Pat in them

    await org.delete(`/api/events/${eventId}/members/${p.id}`)
    await vi.waitFor(() => {
      const leaves = nx.calls.filter((c) => c.path === '/v4/group-channel/leave')
      expect(leaves.map((c) => c.body.channelId).sort()).toEqual([`dep${dept.id}`, `evt${eventId}`].sort())
      expect(leaves.every((c) => c.body.userIds?.includes(p.id))).toBe(true)
    })

    await org.delete(`/api/events/${eventId}`)
    await vi.waitFor(() => expect(nx.calls.filter((c) => c.path === '/v4/group-channel/dismiss')).toHaveLength(2))
  })

  it('answers 502 CHAT_UNAVAILABLE when Nexconn rejects the request', async () => {
    const nx = fakeNexconn(() => new Response(JSON.stringify({ code: 1004, msg: 'bad sig' }), { status: 401 }))
    const app = createApp(nxEnv, { nexconnFetch: nx.fetch })
    const org = await account(app, 'organizer', 'org3@chat.dev')
    const res = await org.post('/api/chat/session')
    expect(res.status).toBe(502)
    expect(res.body.error.code).toBe('CHAT_UNAVAILABLE')
  })

  it('requires sign-in', async () => {
    const app = createApp(nxEnv, { nexconnFetch: fakeNexconn().fetch })
    expect((await request(app).post('/api/chat/session').set('X-Requested-With', 'CrewBridge')).status).toBe(401)
  })
})

describe('nexconn client', () => {
  it('fails over to the backup host on server errors', async () => {
    const nx = fakeNexconn()
    let first = true
    const flaky = (async (url: string, init?: RequestInit) => {
      if (first) {
        first = false
        return new Response('down', { status: 503 })
      }
      return nx.fetch(url, init)
    }) as typeof fetch
    const client = createNexconnClient(nxEnv.nexconn!, flaky)
    expect(await client.issueAccessToken('u1', 'User One')).toBe('tok-u1')
    expect(nx.calls[0].url.startsWith('https://api-b.sg-light-api.com/')).toBe(true)
  })

  it('splits joins into batches of 100', async () => {
    const nx = fakeNexconn()
    const client = createNexconnClient(nxEnv.nexconn!, nx.fetch)
    await client.join('evtX', Array.from({ length: 250 }, (_, i) => `u${i}`))
    expect(nx.calls.map((c) => c.body.userIds?.length)).toEqual([100, 100, 50])
  })
})

describe('nexconn env', () => {
  it('requires key, secret and area together and derives hosts from the area', () => {
    expect(() => loadEnv({ NODE_ENV: 'test', NEXCONN_APP_KEY: 'k' })).toThrow(/together/)
    expect(() => loadEnv({ NODE_ENV: 'test', NEXCONN_APP_KEY: 'k', NEXCONN_APP_SECRET: 's', NEXCONN_AREA: 'OM' })).toThrow(/NEXCONN_API_BASE/)
    expect(() => loadEnv({ NODE_ENV: 'test', NEXCONN_APP_KEY: 'k', NEXCONN_APP_SECRET: 's', NEXCONN_AREA: 'BJ' })).toThrow()
    const na = loadEnv({ NODE_ENV: 'test', NEXCONN_APP_KEY: 'k', NEXCONN_APP_SECRET: 's', NEXCONN_AREA: 'na' }).nexconn!
    expect([na.area, na.apiBase, na.apiBackup]).toEqual(['NA', 'https://api.us-light-api.com', 'https://api-b.us-light-api.com'])
  })
})
