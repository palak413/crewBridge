import type { DataSource } from '../data/source'
import { keyOf, type ChannelRef, type ChatEvent, type ChatMessage, type ChatSession, type ChatTransport } from './types'

/**
 * Demo-workspace messaging. Messages are stored only in this browser and are NOT sent through Nexconn;
 * the Messages page says so. Real-time messaging requires a live account.
 */
export const DEMO_CHAT_KEY = 'crewbridge.demo.chat.v1'

type Store = Record<string, ChatMessage[]>

function load(): Store {
  try {
    const raw = localStorage.getItem(DEMO_CHAT_KEY)
    return raw ? (JSON.parse(raw) as Store) : {}
  } catch {
    return {}
  }
}
function save(store: Store) {
  try {
    localStorage.setItem(DEMO_CHAT_KEY, JSON.stringify(store))
  } catch {
    /* in-memory only */
  }
}

export function createDemoTransport(src: DataSource): ChatTransport {
  const listeners = new Set<(e: ChatEvent) => void>()
  let store: Store = {}
  let me = ''

  return {
    kind: 'demo',

    async start() {
      const [user, events, departments, people] = await Promise.all([src.currentUser(), src.listEvents(), src.listDepartments(), src.listPeople()])
      me = user.id
      store = load()
      const byEvent = new Map(events.map((e) => [e.id, e]))
      const session: ChatSession = {
        userId: me,
        channels: [
          ...events.map((e) => ({ ref: { type: 'group' as const, id: `evt${e.id}` }, kind: 'event' as const, name: e.title, eventId: e.id, eventTitle: e.title })),
          ...departments
            .filter((d) => byEvent.has(d.eventId))
            .map((d) => ({
              ref: { type: 'group' as const, id: `dep${d.id}` },
              kind: 'department' as const,
              name: d.name,
              eventId: d.eventId,
              eventTitle: byEvent.get(d.eventId)!.title,
            })),
        ],
        contacts: people.filter((p) => p.id !== me).map((p) => p.id),
      }
      listeners.forEach((l) => l({ type: 'connection', state: 'connected' }))
      return session
    },

    async stop() {},

    async loadOlder(ref) {
      // The whole local history is one page.
      return { messages: [...(store[keyOf(ref)] ?? [])], hasMore: false }
    },

    async send(ref: ChannelRef, text: string) {
      const key = keyOf(ref)
      const msg: ChatMessage = {
        id: `demo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        key,
        senderId: me,
        text,
        sentAt: Date.now(),
        mine: true,
        status: 'sent',
      }
      store = { ...store, [key]: [...(store[key] ?? []), msg].slice(-200) }
      save(store)
      return msg
    },

    sendTyping() {},
    async watchPresence() {},

    on(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}
