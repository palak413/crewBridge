import { screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { chatStore } from '../../lib/chat/chatStore'
import { DEMO_CHAT_KEY } from '../../lib/chat/demoTransport'
import type { Person } from '../../lib/data/types'
import { MODE_KEY } from '../../lib/session/mode'
import { renderRoute } from '../../test/renderRoute'

afterEach(async () => {
  await chatStore.stop()
})

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
const me: Person = {
  id: 'u1',
  name: 'Olga Organizer',
  email: 'olga@test.dev',
  phone: null,
  role: 'organizer',
  skills: [],
  availability: 'available',
  availabilityUpdatedAt: '2026-10-01T00:00:00.000Z',
  createdAt: '2026-10-01T00:00:00.000Z',
  isDemo: false,
}

function mockLive(chatSession: () => Response) {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const path = new URL(String(input), 'http://localhost').pathname
    const key = `${init?.method ?? 'GET'} ${path}`
    if (key === 'GET /api/auth/me') return json({ user: me })
    if (key === 'POST /api/chat/session') return chatSession()
    if (key === 'GET /api/people') return json([me])
    return json([])
  })
}

describe('messages — demo workspace', () => {
  it('lists event, department and direct channels and sends a local message', async () => {
    const { user } = await renderRoute('/app/messages')
    expect(await screen.findByText(/aren’t sent through Nexconn/)).toBeInTheDocument()
    const nav = await screen.findByRole('navigation', { name: 'Conversations' })
    expect(within(nav).getByRole('button', { name: /^TechFest 2026\s*Everyone on this event/ })).toBeInTheDocument()
    expect(within(nav).getByText('Registration')).toBeInTheDocument()
    expect(within(nav).getByText('Direct messages')).toBeInTheDocument()

    await user.click(within(nav).getByRole('button', { name: /^TechFest 2026\s*Everyone on this event/ }))
    const thread = await screen.findByRole('region', { name: 'Conversation: TechFest 2026' })
    expect(await within(thread).findByText('No messages yet')).toBeInTheDocument()
    const box = within(thread).getByRole('textbox', { name: 'Message TechFest 2026' })
    await user.type(box, 'Doors open at 9{Enter}')
    expect(await within(thread).findByText('Doors open at 9')).toBeInTheDocument()
    expect(box).toHaveValue('')
    expect(localStorage.getItem(DEMO_CHAT_KEY)).toContain('Doors open at 9')
  })

  it('filters conversations', async () => {
    const { user } = await renderRoute('/app/messages')
    const nav = await screen.findByRole('navigation', { name: 'Conversations' })
    await user.type(within(nav).getByRole('searchbox', { name: 'Find a conversation' }), 'zzzz')
    expect(within(nav).getAllByText('No matches')).toHaveLength(3)
  })
})

describe('messages — live workspace', () => {
  it('explains when Nexconn is not configured on the server', async () => {
    localStorage.setItem(MODE_KEY, 'live')
    mockLive(() => json({ enabled: false }))
    await renderRoute('/app/messages')
    expect(await screen.findByText('Messaging isn’t set up yet')).toBeInTheDocument()
  })

  it('shows a retryable error when the chat session fails', async () => {
    localStorage.setItem(MODE_KEY, 'live')
    let calls = 0
    mockLive(() => (++calls === 1 ? json({ error: { code: 'CHAT_UNAVAILABLE', message: 'Messaging is temporarily unavailable.' } }, 502) : json({ enabled: false })))
    const { user } = await renderRoute('/app/messages')
    expect(await screen.findByText('Messaging is temporarily unavailable.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    await waitFor(() => expect(screen.getByText('Messaging isn’t set up yet')).toBeInTheDocument())
  })
})
