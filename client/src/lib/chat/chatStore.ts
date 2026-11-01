import { useSyncExternalStore } from 'react'
import { ApiError } from '../api/client'
import { ChatError, keyOf, type ChannelRef, type ChatEvent, type ChatMessage, type ChatSession, type ChatTransport, type ConnectionState } from './types'

export interface Thread {
  messages: ChatMessage[]
  hasMore: boolean
  loading: boolean
  loaded: boolean
  error: string | null
}

export interface ChatState {
  transport: ChatTransport['kind'] | null
  status: ConnectionState
  error: string | null
  session: ChatSession | null
  threads: Record<string, Thread>
  typing: Record<string, string[]>
  online: Record<string, boolean>
  unread: Record<string, number>
  active: string | null
}

const initial: ChatState = {
  transport: null,
  status: 'idle',
  error: null,
  session: null,
  threads: {},
  typing: {},
  online: {},
  unread: {},
  active: null,
}

export const PAGE_SIZE = 30
const TYPING_TIMEOUT_MS = 6_000

const emptyThread: Thread = { messages: [], hasMore: true, loading: false, loaded: false, error: null }

function describe(err: unknown) {
  if (err instanceof ApiError || err instanceof ChatError) return err.message
  return 'Something went wrong with messaging. Please try again.'
}

/** Merge messages into a thread: de-duplicate by id, keep chronological order. */
function merge(list: ChatMessage[], incoming: ChatMessage[]) {
  const byId = new Map(list.map((m) => [m.id, m]))
  for (const m of incoming) byId.set(m.id, m)
  return [...byId.values()].sort((a, b) => a.sentAt - b.sentAt)
}

/**
 * One chat connection per tab, shared by every component (the Nexconn engine is a process-wide
 * singleton). Starts lazily when the Messages page opens and stays connected until sign-out.
 */
export function createChatStore() {
  let state = initial
  const subs = new Set<() => void>()
  let transport: ChatTransport | null = null
  let unsubscribe: (() => void) | null = null
  let starting: Promise<void> | null = null
  const typingTimers = new Map<string, ReturnType<typeof setTimeout>>()

  const set = (patch: Partial<ChatState> | ((s: ChatState) => Partial<ChatState>)) => {
    state = { ...state, ...(typeof patch === 'function' ? patch(state) : patch) }
    subs.forEach((f) => f())
  }
  const setThread = (key: string, patch: Partial<Thread>) => set((s) => ({ threads: { ...s.threads, [key]: { ...(s.threads[key] ?? emptyThread), ...patch } } }))

  function onEvent(e: ChatEvent) {
    switch (e.type) {
      case 'connection':
        set({ status: e.state })
        break
      case 'message': {
        const m = e.message
        set((s) => {
          const t = s.threads[m.key]
          const threads = t?.loaded ? { ...s.threads, [m.key]: { ...t, messages: merge(t.messages, [m]) } } : s.threads
          const unread = s.active === m.key || m.mine ? s.unread : { ...s.unread, [m.key]: (s.unread[m.key] ?? 0) + 1 }
          const typing = s.typing[m.key] ? { ...s.typing, [m.key]: s.typing[m.key].filter((id) => id !== m.senderId) } : s.typing
          return { threads, unread, typing }
        })
        break
      }
      case 'typing': {
        set((s) => ({ typing: { ...s.typing, [e.key]: e.userIds } }))
        clearTimeout(typingTimers.get(e.key))
        if (e.userIds.length)
          typingTimers.set(
            e.key,
            setTimeout(() => set((s) => ({ typing: { ...s.typing, [e.key]: [] } })), TYPING_TIMEOUT_MS),
          )
        break
      }
      case 'presence':
        set((s) => ({ online: { ...s.online, ...e.online } }))
        break
    }
  }

  async function loadOlder(ref: ChannelRef) {
    if (!transport) return
    const key = keyOf(ref)
    const t = state.threads[key] ?? emptyThread
    if (t.loading || (t.loaded && !t.hasMore)) return
    setThread(key, { loading: true, error: null })
    try {
      const page = await transport.loadOlder(ref, PAGE_SIZE)
      const cur = state.threads[key] ?? emptyThread
      setThread(key, { messages: merge(cur.messages, page.messages), hasMore: page.hasMore, loading: false, loaded: true })
    } catch (err) {
      setThread(key, { loading: false, error: describe(err) })
    }
  }

  return {
    getState: () => state,
    subscribe(fn: () => void) {
      subs.add(fn)
      return () => subs.delete(fn)
    },

    /** Connect with the given transport (no-op if already started with the same kind). */
    start(make: () => ChatTransport | Promise<ChatTransport>) {
      if (starting) return starting
      if (transport && (state.status === 'connected' || state.status === 'reconnecting')) return Promise.resolve()
      starting = (async () => {
        set({ status: 'connecting', error: null })
        try {
          transport = await make()
          unsubscribe?.()
          unsubscribe = transport.on(onEvent)
          const session = await transport.start()
          if (!session) {
            set({ status: 'unavailable', transport: transport.kind, session: null })
            return
          }
          set({ session, transport: transport.kind, status: 'connected' })
          void transport.watchPresence(session.contacts).catch(() => undefined)
        } catch (err) {
          set({ status: 'error', error: describe(err) })
        } finally {
          starting = null
        }
      })()
      return starting
    },

    async stop() {
      const t = transport
      transport = null
      unsubscribe?.()
      unsubscribe = null
      typingTimers.forEach(clearTimeout)
      typingTimers.clear()
      state = initial
      subs.forEach((f) => f())
      await t?.stop().catch(() => undefined)
    },

    /** Make a channel active: clears its unread count and loads the first page. */
    open(ref: ChannelRef | null) {
      const key = ref ? keyOf(ref) : null
      set((s) => ({ active: key, unread: key ? { ...s.unread, [key]: 0 } : s.unread }))
      if (ref && !state.threads[keyOf(ref)]?.loaded) void loadOlder(ref)
    },

    loadOlder,

    async send(ref: ChannelRef, text: string, retryId?: string) {
      if (!transport) return
      const key = keyOf(ref)
      const body = text.trim()
      if (!body) return
      const pendingId = retryId ?? `pending-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      const pending: ChatMessage = { id: pendingId, key, senderId: state.session?.userId ?? '', text: body, sentAt: Date.now(), mine: true, status: 'sending' }
      const cur = state.threads[key] ?? { ...emptyThread, loaded: true, hasMore: false }
      setThread(key, { messages: merge(cur.messages, [pending]) })
      try {
        const sent = await transport.send(ref, body)
        const t = state.threads[key] ?? emptyThread
        setThread(key, {
          messages: merge(
            t.messages.filter((m) => m.id !== pendingId),
            [sent],
          ),
        })
      } catch {
        const t = state.threads[key] ?? emptyThread
        setThread(key, { messages: t.messages.map((m) => (m.id === pendingId ? { ...m, status: 'failed' as const } : m)) })
      }
    },

    typing(ref: ChannelRef) {
      transport?.sendTyping(ref)
    },
  }
}

export type ChatStore = ReturnType<typeof createChatStore>

/** The app-wide chat store. */
export const chatStore = createChatStore()

export function useChatState<T>(select: (s: ChatState) => T, store: ChatStore = chatStore): T {
  return useSyncExternalStore(store.subscribe, () => select(store.getState()))
}
