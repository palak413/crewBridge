/**
 * Chat domain used by the UI. The UI never imports @nexconn/* directly — only the transports do.
 */

/** A group channel (event/department) or a direct channel (id = the other user's id). */
export type ChannelRef = { type: 'group' | 'direct'; id: string }
export const keyOf = (r: ChannelRef) => `${r.type}:${r.id}`
export const refOf = (key: string): ChannelRef => {
  const i = key.indexOf(':')
  return { type: key.slice(0, i) as ChannelRef['type'], id: key.slice(i + 1) }
}

export interface ChatMessage {
  id: string
  key: string
  senderId: string
  /** Null for message types we don't render (images, files…). */
  text: string | null
  sentAt: number
  mine: boolean
  status: 'sending' | 'sent' | 'failed'
}

export interface ChatChannelInfo {
  ref: ChannelRef
  kind: 'event' | 'department'
  name: string
  eventId: string
  eventTitle: string
}

export interface ChatSession {
  userId: string
  channels: ChatChannelInfo[]
  /** People this user may message directly. */
  contacts: string[]
}

export type ConnectionState = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'disconnected' | 'unavailable' | 'error'

export type ChatEvent =
  | { type: 'message'; message: ChatMessage }
  | { type: 'typing'; key: string; userIds: string[] }
  | { type: 'presence'; online: Record<string, boolean> }
  | { type: 'connection'; state: ConnectionState; code?: number }

export interface ChatTransport {
  readonly kind: 'nexconn' | 'demo'
  /** Connect. Resolves null when messaging isn't configured on the server. */
  start(): Promise<ChatSession | null>
  stop(): Promise<void>
  /** Page backwards through history; returns oldest-first messages for this page. */
  loadOlder(ref: ChannelRef, pageSize: number): Promise<{ messages: ChatMessage[]; hasMore: boolean }>
  send(ref: ChannelRef, text: string): Promise<ChatMessage>
  /** Best-effort typing signal (direct channels only). */
  sendTyping(ref: ChannelRef): void
  watchPresence(userIds: string[]): Promise<void>
  on(listener: (e: ChatEvent) => void): () => void
}

export class ChatError extends Error {
  readonly code: number | string
  constructor(message: string, code: number | string) {
    super(message)
    this.name = 'ChatError'
    this.code = code
  }
}
