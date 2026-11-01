import {
  AreaCode,
  BaseChannel,
  ChannelHandler,
  ChannelType,
  ConnectionStatus,
  ConnectionStatusHandler,
  DirectChannel,
  DirectChannelIdentifier,
  GroupChannel,
  GroupChannelIdentifier,
  LogLevel,
  MessageDirection,
  MessageHandler,
  MessageType,
  NCEngine,
  SendTextMessageParams,
  SentStatus,
  SubscribeType,
  UserHandler,
  type Message,
  type MessagesQuery,
  type TextMessageContent,
} from '@nexconn/chat'
import { apiRequest } from '../api/client'
import { ChatError, keyOf, type ChannelRef, type ChatEvent, type ChatMessage, type ChatSession, type ChatTransport, type ConnectionState } from './types'

/**
 * Real-time messaging over the official Nexconn Chat SDK (@nexconn/chat + @nexconn/engine 26.2.1).
 *
 * - The CrewBridge API issues the user's Nexconn access token (the App Secret stays on the server) and
 *   returns only the group channels the user is authorized for; the server manages group membership.
 * - The data center comes from the server (`NEXCONN_AREA`) and is passed explicitly as `areaCode`.
 */

interface SessionResponse {
  enabled: boolean
  appKey?: string
  area?: 'SG' | 'NA' | 'SA' | 'OM'
  userId?: string
  token?: string
  channels?: { channelId: string; kind: 'event' | 'department'; eventId: string; departmentId: string | null; name: string; eventTitle: string }[]
  contacts?: string[]
}

const AREAS = { SG: AreaCode.SG, NA: AreaCode.NA, SA: AreaCode.SA, OM: AreaCode.OM } as const
const HANDLER_ID = 'crewbridge'
const TYPING_THROTTLE_MS = 4_000
// SDK validation (engine 26.2.1): ≤200 userIds per subscribe call; expiry is required, 60…2,592,000 seconds.
const PRESENCE_BATCH = 200
const PRESENCE_EXPIRY_S = 24 * 60 * 60

let initializedAppKey: string | null = null

const identifierOf = (ref: ChannelRef) => (ref.type === 'direct' ? new DirectChannelIdentifier(ref.id) : new GroupChannelIdentifier(ref.id))
const refFromMessage = (m: Message): ChannelRef => ({
  type: m.channelIdentifier.channelType === ChannelType.DIRECT ? 'direct' : 'group',
  id: m.channelIdentifier.channelId,
})

export function toChatMessage(m: Message, me: string): ChatMessage {
  return {
    id: m.messageId || `local-${m.clientId}`,
    key: keyOf(refFromMessage(m)),
    senderId: m.senderUserId,
    text: m.messageType === MessageType.TEXT ? ((m.content as TextMessageContent).text ?? '') : null,
    sentAt: m.sentTime,
    mine: m.direction === MessageDirection.SEND || m.senderUserId === me,
    status: m.sentStatus === SentStatus.FAILED ? 'failed' : m.sentStatus === SentStatus.SENDING ? 'sending' : 'sent',
  }
}

function connectionState(status: ConnectionStatus): ConnectionState {
  switch (status) {
    case ConnectionStatus.CONNECTED:
      return 'connected'
    case ConnectionStatus.CONNECTING:
      return 'connecting'
    case ConnectionStatus.SUSPENDED:
      return 'reconnecting'
    default:
      return 'disconnected'
  }
}

export function createNexconnTransport(): ChatTransport {
  const listeners = new Set<(e: ChatEvent) => void>()
  const emit = (e: ChatEvent) => listeners.forEach((l) => l(e))
  const queries = new Map<string, MessagesQuery>()
  const lastTyping = new Map<string, number>()
  let me = ''

  async function refreshPresence(userIds: string[]) {
    const online: Record<string, boolean> = {}
    for (let i = 0; i < userIds.length; i += PRESENCE_BATCH) {
      const r = await NCEngine.userModule.getSubscribeUsersOnlineStatus(userIds.slice(i, i + PRESENCE_BATCH))
      if (r.isOk) for (const s of r.data ?? []) online[s.userId] = s.isOnline
    }
    if (Object.keys(online).length) emit({ type: 'presence', online })
  }

  function addHandlers() {
    NCEngine.addConnectionStatusHandler(
      HANDLER_ID,
      new ConnectionStatusHandler({
        onConnectionStatusChanged: ({ status, code }) => emit({ type: 'connection', state: connectionState(status), code }),
      }),
    )
    NCEngine.addMessageHandler(
      HANDLER_ID,
      new MessageHandler({
        onMessageReceived: ({ messages }) => {
          for (const m of messages) if (!m.isStatusMessage) emit({ type: 'message', message: toChatMessage(m, me) })
        },
      }),
    )
    NCEngine.addChannelHandler(
      HANDLER_ID,
      new ChannelHandler({
        onTypingStatusChanged: ({ channelIdentifier, userTypingStatus }) => {
          const ref: ChannelRef = { type: channelIdentifier.channelType === ChannelType.DIRECT ? 'direct' : 'group', id: channelIdentifier.channelId }
          emit({ type: 'typing', key: keyOf(ref), userIds: userTypingStatus.map((u) => u.userId).filter((id) => id !== me) })
        },
      }),
    )
    NCEngine.addUserHandler(
      HANDLER_ID,
      new UserHandler({
        // Re-read the authoritative isOnline flag for users whose status changed.
        onSubscriptionChanged: ({ events }) => {
          const ids = events.filter((e) => e.subscribeType === SubscribeType.ONLINE_STATUS).map((e) => e.userId)
          if (ids.length) void refreshPresence(ids).catch(() => undefined)
        },
      }),
    )
  }

  function removeHandlers() {
    NCEngine.removeConnectionStatusHandler(HANDLER_ID)
    NCEngine.removeMessageHandler(HANDLER_ID)
    NCEngine.removeChannelHandler(HANDLER_ID)
    NCEngine.removeUserHandler(HANDLER_ID)
  }

  return {
    kind: 'nexconn',

    async start() {
      const s = await apiRequest<SessionResponse>('/chat/session', { method: 'POST' })
      if (!s.enabled || !s.appKey || !s.token || !s.userId || !s.area) return null
      if (initializedAppKey !== s.appKey) {
        NCEngine.initialize({ appKey: s.appKey, areaCode: AREAS[s.area], logLevel: LogLevel.WARN })
        initializedAppKey = s.appKey
      }
      removeHandlers()
      addHandlers()
      emit({ type: 'connection', state: 'connecting' })
      const r = await NCEngine.connect({ token: s.token })
      if (!r.isOk) {
        removeHandlers()
        throw new ChatError(`Couldn't connect to Nexconn (code ${r.code}).`, r.code)
      }
      me = r.data?.userId ?? s.userId
      emit({ type: 'connection', state: 'connected' })
      const session: ChatSession = {
        userId: me,
        channels: (s.channels ?? []).map((c) => ({ ref: { type: 'group', id: c.channelId }, kind: c.kind, name: c.name, eventId: c.eventId, eventTitle: c.eventTitle })),
        contacts: s.contacts ?? [],
      }
      return session
    },

    async stop() {
      removeHandlers()
      queries.clear()
      lastTyping.clear()
      await NCEngine.disconnect()
    },

    async loadOlder(ref, pageSize) {
      const key = keyOf(ref)
      let q = queries.get(key)
      if (!q) {
        q = BaseChannel.createMessagesQuery({ channelIdentifier: identifierOf(ref), isAscending: false, pageSize })
        queries.set(key, q)
      }
      const r = await q.loadNextPage()
      if (!r.isOk) throw new ChatError(`Couldn't load messages (code ${r.code}).`, r.code)
      const messages = (r.data?.data ?? []).filter((m) => !m.isStatusMessage).map((m) => toChatMessage(m, me))
      return { messages: messages.sort((a, b) => a.sentAt - b.sentAt), hasMore: q.hasNext }
    },

    async send(ref, text) {
      const channel = ref.type === 'direct' ? new DirectChannel(ref.id) : new GroupChannel(ref.id)
      const r = await channel.sendMessage(new SendTextMessageParams({ text }))
      if (!r.isOk || !r.data) throw new ChatError(`Message not sent (code ${r.code}).`, r.code)
      return toChatMessage(r.data, me)
    },

    sendTyping(ref) {
      if (ref.type !== 'direct') return
      const key = keyOf(ref)
      const now = Date.now()
      if (now - (lastTyping.get(key) ?? 0) < TYPING_THROTTLE_MS) return
      lastTyping.set(key, now)
      void new DirectChannel(ref.id).sendTypingStatus(MessageType.TEXT).catch(() => undefined)
    },

    async watchPresence(userIds) {
      const ids = [...new Set(userIds)].filter((id) => id && id !== me)
      for (let i = 0; i < ids.length; i += PRESENCE_BATCH) {
        const r = await NCEngine.userModule.subscribeEvent({ userIds: ids.slice(i, i + PRESENCE_BATCH), subscribeType: SubscribeType.ONLINE_STATUS, expiry: PRESENCE_EXPIRY_S })
        // e.g. 26020: online-status subscription isn't enabled for this app in the Nexconn console.
        if (!r.isOk) throw new ChatError(`Presence unavailable (code ${r.code}).`, r.code)
      }
      await refreshPresence(ids)
    },

    on(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}
