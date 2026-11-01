import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { createHttpSource } from '../lib/data/httpSource'
import type { CrewEvent, Person, Task } from '../lib/data/types'
import { MODE_KEY } from '../lib/session/mode'
import { renderRoute } from '../test/renderRoute'

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

const vol: Person = {
  id: 'u1',
  name: 'Val Volunteer',
  email: 'val@test.dev',
  phone: null,
  role: 'volunteer',
  skills: [],
  availability: 'available',
  availabilityUpdatedAt: '2026-10-01T00:00:00.000Z',
  createdAt: '2026-10-01T00:00:00.000Z',
  isDemo: false,
}
const event: CrewEvent = {
  id: 'e1',
  title: 'River Cleanup',
  description: '',
  startAt: '2026-11-20T09:00:00.000Z',
  endAt: '2026-11-20T17:00:00.000Z',
  location: 'Riverside',
  coverTheme: 'forest',
  coverUrl: null,
  status: 'upcoming',
  organizerId: 'u9',
  memberIds: ['u1'],
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
  isDemo: false,
}
const task: Task = {
  id: 't1',
  eventId: 'e1',
  departmentId: null,
  title: 'Bring gloves',
  description: '',
  priority: 'medium',
  status: 'todo',
  assigneeId: 'u9',
  dueAt: null,
  createdBy: 'u9',
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
  completedAt: null,
  isDemo: false,
}

/** Fake API: routes by path, records every call. */
function mockApi(overrides: Record<string, () => Response> = {}) {
  const routes: Record<string, () => Response> = {
    'GET /api/auth/me': () => json({ user: vol }),
    'GET /api/events': () => json([event]),
    'GET /api/departments': () => json([]),
    'GET /api/people': () => json([vol]),
    'GET /api/tasks': () => json([task]),
    'GET /api/activity': () => json([]),
    'POST /api/auth/logout': () => new Response(null, { status: 204 }),
    ...overrides,
  }
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const url = new URL(String(input), 'http://localhost')
    const key = `${init?.method ?? 'GET'} ${url.pathname}`
    const handler = routes[key]
    return handler ? handler() : json({ error: { code: 'NOT_FOUND', message: 'Not found.' } }, 404)
  })
}

describe('workspace selection', () => {
  it('sends visitors with no workspace chosen to sign in', async () => {
    localStorage.removeItem(MODE_KEY)
    const { router } = await renderRoute('/app/tasks')
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'))
  })

  it('opens the demo workspace from the sign-in page', async () => {
    localStorage.removeItem(MODE_KEY)
    const { user, router } = await renderRoute('/login')
    await user.click(screen.getByRole('button', { name: 'Explore the demo workspace' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/app'))
    expect(await screen.findByText(/Demo workspace\./)).toBeInTheDocument()
    expect(localStorage.getItem(MODE_KEY)).toBe('demo')
  })
})

describe('live workspace', () => {
  it('redirects to sign in when the session is missing', async () => {
    localStorage.setItem(MODE_KEY, 'live')
    mockApi({ 'GET /api/auth/me': () => json({ error: { code: 'UNAUTHORIZED', message: 'Please sign in.' } }, 401) })
    const { router } = await renderRoute('/app')
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'))
    expect(localStorage.getItem(MODE_KEY)).toBeNull()
  })

  it('shows live data without the demo banner and hides organizer-only actions from volunteers', async () => {
    localStorage.setItem(MODE_KEY, 'live')
    mockApi()
    await renderRoute('/app/events')
    expect(await screen.findByText('River Cleanup')).toBeInTheDocument()
    expect(screen.queryByText(/Demo workspace\./)).toBeNull()
    expect(screen.queryByRole('link', { name: 'Create event' })).toBeNull()
  })

  it('volunteers see other people’s tasks read-only', async () => {
    localStorage.setItem(MODE_KEY, 'live')
    mockApi()
    const { user } = await renderRoute('/app/tasks?view=all')
    const col = await screen.findByRole('region', { name: 'To do column' })
    expect(within(col).queryByRole('button', { name: 'Actions for Bring gloves' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'New task' })).toBeNull()
    await user.click(within(col).getByRole('button', { name: 'Bring gloves' }))
    const dialog = await screen.findByRole('dialog', { name: 'Task details' })
    expect(within(dialog).queryByRole('button', { name: 'Save changes' })).toBeNull()
  })

  it('signs out through the API and returns to sign in', async () => {
    localStorage.setItem(MODE_KEY, 'live')
    const fetchSpy = mockApi()
    const { user, router } = await renderRoute('/app')
    await user.click(await screen.findByRole('button', { name: 'Account menu' }))
    expect(screen.getByText('Volunteer · val@test.dev')).toBeInTheDocument()
    await user.click(screen.getByRole('menuitem', { name: 'Sign out' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'))
    expect(fetchSpy.mock.calls.some(([u, i]) => String(u).endsWith('/auth/logout') && i?.method === 'POST')).toBe(true)
    expect(localStorage.getItem(MODE_KEY)).toBeNull()
  })
})

describe('http source', () => {
  it('maps calls to REST endpoints with the CSRF header and cookies', async () => {
    const fetchSpy = mockApi({ 'PATCH /api/tasks/t1/status': () => json({ ...task, status: 'completed' }) })
    const src = createHttpSource()
    await src.listTasks({ eventId: 'e1', assigneeId: 'u1' })
    const moved = await src.moveTask('t1', 'completed')
    expect(moved.status).toBe('completed')
    const [listUrl] = fetchSpy.mock.calls[0]
    expect(String(listUrl)).toBe('/api/tasks?eventId=e1&assigneeId=u1')
    const init = fetchSpy.mock.calls[1][1] ?? {}
    expect(init.method).toBe('PATCH')
    expect(init.credentials).toBe('include')
    expect((init.headers as Record<string, string>)['X-Requested-With']).toBe('CrewBridge')
    expect(JSON.parse(String(init.body))).toEqual({ status: 'completed' })
  })
})
