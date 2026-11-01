import { afterEach, describe, expect, it, vi } from 'vitest'
import { createChatStore } from './chatStore'
import type { ChatEvent, ChatMessage, ChatSession, ChatTransport } from './types'

const session: ChatSession = {
  userId: 'me',
  channels: [{ ref: { type: 'group', id: 'evt1' }, kind: 'event', name: 'Fair', eventId: '1', eventTitle: 'Fair' }],
  contacts: ['u2'],
}
const msg = (over: Partial<ChatMessage>): ChatMessage => ({ id: 'm', key: 'group:evt1', senderId: 'u2', text: 'hi', sentAt: 1, mine: false, status: 'sent', ...over })

function fakeTransport(over: Partial<ChatTransport> = {}) {
  let listener: (e: ChatEvent) => void = () => {}
  const t: ChatTransport = {
    kind: 'nexconn',
    start: vi.fn(async () => session),
    stop: vi.fn(async () => {}),
    loadOlder: vi.fn(async () => ({ messages: [msg({ id: 'old', sentAt: 1 })], hasMore: true })),
    send: vi.fn(async (_ref, text: string) => msg({ id: 'srv1', text, mine: true, senderId: 'me', sentAt: 5 })),
    sendTyping: vi.fn(),
    watchPresence: vi.fn(async () => {}),
    on: (l) => {
      listener = l
      return () => {}
    },
    ...over,
  }
  return { t, emit: (e: ChatEvent) => listener(e) }
}

afterEach(() => vi.useRealTimers())

describe('chat store', () => {
  it('connects, watches presence and loads history when a channel opens', async () => {
    const store = createChatStore()
    const { t } = fakeTransport()
    await store.start(() => t)
    expect(store.getState().status).toBe('connected')
    expect(t.watchPresence).toHaveBeenCalledWith(['u2'])
    store.open({ type: 'group', id: 'evt1' })
    await vi.waitFor(() => expect(store.getState().threads['group:evt1']?.loaded).toBe(true))
    expect(store.getState().threads['group:evt1'].messages.map((m) => m.id)).toEqual(['old'])
    expect(store.getState().threads['group:evt1'].hasMore).toBe(true)
  })

  it('counts unread for inactive channels and de-duplicates incoming messages', async () => {
    const store = createChatStore()
    const { t, emit } = fakeTransport()
    await store.start(() => t)
    store.open({ type: 'group', id: 'evt1' })
    await vi.waitFor(() => expect(store.getState().threads['group:evt1']?.loaded).toBe(true))
    emit({ type: 'message', message: msg({ id: 'n1', sentAt: 9 }) })
    emit({ type: 'message', message: msg({ id: 'n1', sentAt: 9 }) })
    emit({ type: 'message', message: msg({ id: 'd1', key: 'direct:u2' }) })
    expect(store.getState().threads['group:evt1'].messages.map((m) => m.id)).toEqual(['old', 'n1'])
    expect(store.getState().unread).toMatchObject({ 'direct:u2': 1 })
    expect(store.getState().unread['group:evt1'] ?? 0).toBe(0)
    store.open({ type: 'direct', id: 'u2' })
    expect(store.getState().unread['direct:u2']).toBe(0)
  })

  it('sends optimistically, then marks failures for retry', async () => {
    const store = createChatStore()
    let fail = true
    const { t } = fakeTransport({
      send: vi.fn(async (_r, text: string) => {
        if (fail) throw new Error('nope')
        return msg({ id: 'srv2', text, mine: true, sentAt: 7 })
      }),
    })
    await store.start(() => t)
    const ref = { type: 'direct' as const, id: 'u2' }
    await store.send(ref, '  hello  ')
    const [failed] = store.getState().threads['direct:u2'].messages
    expect(failed).toMatchObject({ text: 'hello', status: 'failed', mine: true })
    fail = false
    await store.send(ref, 'hello', failed.id)
    expect(store.getState().threads['direct:u2'].messages.map((m) => [m.id, m.status])).toEqual([['srv2', 'sent']])
  })

  it('clears typing after 6 seconds without updates', async () => {
    vi.useFakeTimers()
    const store = createChatStore()
    const { t, emit } = fakeTransport()
    await store.start(() => t)
    emit({ type: 'typing', key: 'direct:u2', userIds: ['u2'] })
    expect(store.getState().typing['direct:u2']).toEqual(['u2'])
    vi.advanceTimersByTime(6_100)
    expect(store.getState().typing['direct:u2']).toEqual([])
  })

  it('reports unavailable when messaging is not configured, and errors on connect failure', async () => {
    const a = createChatStore()
    await a.start(() => fakeTransport({ start: async () => null }).t)
    expect(a.getState().status).toBe('unavailable')
    const b = createChatStore()
    await b.start(() => fakeTransport({ start: async () => Promise.reject(new Error('x')) }).t)
    expect(b.getState().status).toBe('error')
    expect(b.getState().error).toBeTruthy()
  })

  it('stop disconnects and resets state', async () => {
    const store = createChatStore()
    const { t } = fakeTransport()
    await store.start(() => t)
    await store.stop()
    expect(t.stop).toHaveBeenCalled()
    expect(store.getState().status).toBe('idle')
    expect(store.getState().session).toBeNull()
  })
})
