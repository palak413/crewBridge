import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Mock of the parts of @nexconn/chat 26.2.1 the transport uses. Names and shapes mirror the package's
 * index.d.ts; a typo in the transport fails typecheck against the real declarations.
 */
const sdk = vi.hoisted(() => {
  const handlers: Record<string, { _invoker: Record<string, (e: unknown) => void> }> = {}
  const result = <T>(data?: T, code = 0) => ({ isOk: code === 0, code, msg: '', data })
  const sent: { channel: string; type: string; params: unknown }[] = []
  const typing: string[] = []
  const queries: unknown[] = []
  class Handler {
    _invoker: Record<string, (e: unknown) => void>
    constructor(map: Record<string, (e: unknown) => void>) {
      this._invoker = map
    }
  }
  class Identifier {
    channelType: number
    channelId: string
    constructor(channelType: number, channelId: string) {
      this.channelType = channelType
      this.channelId = channelId
    }
  }
  const NCEngine = {
    initialize: vi.fn(),
    connect: vi.fn(async ({ token }: { token: string }) => (token === 'bad' ? result(undefined, 31004) : result({ userId: 'me' }))),
    disconnect: vi.fn(async () => {}),
    addConnectionStatusHandler: (id: string, h: Handler) => (handlers[`conn:${id}`] = h),
    addMessageHandler: (id: string, h: Handler) => (handlers[`msg:${id}`] = h),
    addChannelHandler: (id: string, h: Handler) => (handlers[`chan:${id}`] = h),
    addUserHandler: (id: string, h: Handler) => (handlers[`user:${id}`] = h),
    removeConnectionStatusHandler: vi.fn(),
    removeMessageHandler: vi.fn(),
    removeChannelHandler: vi.fn(),
    removeUserHandler: vi.fn(),
    userModule: {
      subscribeEvent: vi.fn(async (p: { userIds: string[] }) => result(p.userIds)),
      getSubscribeUsersOnlineStatus: vi.fn(async (ids: string[]) => result(ids.map((userId) => ({ userId, isOnline: userId === 'u2', details: [] })))),
    },
  }
  const message = (over: Record<string, unknown> = {}) => ({
    messageId: 'm1',
    clientId: 1,
    channelIdentifier: new Identifier(3, 'evtA'),
    messageType: 'RC:TxtMsg',
    content: { text: 'hello' },
    sentTime: 1000,
    senderUserId: 'u2',
    direction: 2,
    sentStatus: 30,
    isStatusMessage: false,
    ...over,
  })
  return { handlers, result, sent, typing, queries, Handler, Identifier, NCEngine, message }
})

vi.mock('@nexconn/chat', () => {
  const { Handler, Identifier, NCEngine, result, sent, typing, queries, message } = sdk
  class SendTextMessageParams {
    content: { text: string }
    messageType = 'RC:TxtMsg'
    constructor(content: { text: string }) {
      this.content = content
    }
  }
  class Channel {
    kind: string
    channelId: string
    constructor(kind: string, channelId: string) {
      this.kind = kind
      this.channelId = channelId
    }
    async sendMessage(params: SendTextMessageParams) {
      sent.push({ channel: `${this.kind}:${this.channelId}`, type: params.messageType, params })
      return result(message({ messageId: 'srv', content: params.content, direction: 1, senderUserId: 'me', channelIdentifier: new Identifier(this.kind === 'direct' ? 1 : 3, this.channelId) }))
    }
  }
  return {
    AreaCode: { BJ: 1, SG: 2, NA: 3, SA: 5, OM: 6 },
    ChannelType: { DIRECT: 1, GROUP: 3, OPEN: 4, SYSTEM: 6, COMMUNITY: 10 },
    ConnectionStatus: { CONNECTED: 0, CONNECTING: 1, DISCONNECTED: 2, SUSPENDED: 3 },
    LogLevel: { DEBUG: 4, INFO: 3, WARN: 2, ERROR: 1 },
    MessageDirection: { SEND: 1, RECEIVE: 2 },
    MessageType: { TEXT: 'RC:TxtMsg' },
    SentStatus: { SENDING: 10, FAILED: 20, SENT: 30, READ: 50 },
    SubscribeType: { ONLINE_STATUS: 1 },
    NCEngine,
    ConnectionStatusHandler: Handler,
    MessageHandler: Handler,
    ChannelHandler: Handler,
    UserHandler: Handler,
    SendTextMessageParams,
    DirectChannelIdentifier: class extends Identifier {
      constructor(id: string) {
        super(1, id)
      }
    },
    GroupChannelIdentifier: class extends Identifier {
      constructor(id: string) {
        super(3, id)
      }
    },
    DirectChannel: class extends Channel {
      constructor(id: string) {
        super('direct', id)
      }
      async sendTypingStatus(type: string) {
        typing.push(`${this.channelId}:${type}`)
        return result()
      }
    },
    GroupChannel: class extends Channel {
      constructor(id: string) {
        super('group', id)
      }
    },
    BaseChannel: {
      createMessagesQuery: vi.fn((params: unknown) => {
        queries.push(params)
        let page = 0
        return {
          get hasNext() {
            return page < 2
          },
          loadNextPage: vi.fn(async () => {
            page++
            return result({ data: [message({ messageId: `p${page}b`, sentTime: 20 - page * 2 }), message({ messageId: `p${page}a`, sentTime: 10 - page * 2 })] })
          }),
        }
      }),
    },
  }
})

const session = {
  enabled: true,
  appKey: 'appkey123',
  area: 'SG',
  userId: 'me',
  token: 'tok-me',
  channels: [{ channelId: 'evtA', kind: 'event', eventId: 'A', departmentId: null, name: 'Fair', eventTitle: 'Fair' }],
  contacts: ['u2', 'u3'],
}
const mockSession = (body: unknown) =>
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } }))

beforeEach(() => {
  sdk.sent.length = 0
  sdk.typing.length = 0
  sdk.queries.length = 0
})

describe('nexconn transport', () => {
  it('initializes with the server-provided App Key and explicit AreaCode.SG, then connects with the issued token', async () => {
    mockSession(session)
    const { createNexconnTransport } = await import('./nexconnTransport')
    const t = createNexconnTransport()
    const s = await t.start()
    expect(sdk.NCEngine.initialize).toHaveBeenCalledWith({ appKey: 'appkey123', areaCode: 2, logLevel: 2 })
    expect(sdk.NCEngine.connect).toHaveBeenCalledWith({ token: 'tok-me' })
    expect(s).toEqual({ userId: 'me', channels: [{ ref: { type: 'group', id: 'evtA' }, kind: 'event', name: 'Fair', eventId: 'A', eventTitle: 'Fair' }], contacts: ['u2', 'u3'] })
    const [url, init] = vi.mocked(fetch).mock.calls[0]
    expect(String(url)).toBe('/api/chat/session')
    expect(init?.method).toBe('POST')
  })

  it('returns null when messaging is disabled and throws on connect failure', async () => {
    const { createNexconnTransport } = await import('./nexconnTransport')
    mockSession({ enabled: false })
    expect(await createNexconnTransport().start()).toBeNull()
    vi.restoreAllMocks()
    mockSession({ ...session, token: 'bad' })
    await expect(createNexconnTransport().start()).rejects.toMatchObject({ name: 'ChatError', code: 31004 })
  })

  it('sends text with SendTextMessageParams and pages history newest-first', async () => {
    mockSession(session)
    const { createNexconnTransport } = await import('./nexconnTransport')
    const t = createNexconnTransport()
    await t.start()
    const out = await t.send({ type: 'group', id: 'evtA' }, 'Gates open at 9')
    expect(sdk.sent).toEqual([{ channel: 'group:evtA', type: 'RC:TxtMsg', params: expect.objectContaining({ content: { text: 'Gates open at 9' } }) }])
    expect(out).toMatchObject({ id: 'srv', key: 'group:evtA', text: 'Gates open at 9', mine: true, status: 'sent' })

    const p1 = await t.loadOlder({ type: 'group', id: 'evtA' }, 30)
    expect(sdk.queries[0]).toMatchObject({ isAscending: false, pageSize: 30, channelIdentifier: { channelType: 3, channelId: 'evtA' } })
    expect(p1.messages.map((m) => m.id)).toEqual(['p1a', 'p1b']) // oldest first
    expect(p1.hasMore).toBe(true)
    const p2 = await t.loadOlder({ type: 'group', id: 'evtA' }, 30)
    expect(sdk.queries).toHaveLength(1) // the same query continues paging
    expect(p2.hasMore).toBe(false)
  })

  it('sends typing only in direct channels, throttled', async () => {
    mockSession(session)
    const { createNexconnTransport } = await import('./nexconnTransport')
    const t = createNexconnTransport()
    await t.start()
    t.sendTyping({ type: 'group', id: 'evtA' })
    t.sendTyping({ type: 'direct', id: 'u2' })
    t.sendTyping({ type: 'direct', id: 'u2' })
    await Promise.resolve()
    expect(sdk.typing).toEqual(['u2:RC:TxtMsg'])
  })

  it('emits received messages, typing, connection and presence events', async () => {
    mockSession(session)
    const { createNexconnTransport } = await import('./nexconnTransport')
    const t = createNexconnTransport()
    const events: unknown[] = []
    t.on((e) => events.push(e))
    await t.start()
    await t.watchPresence(['u2', 'u3', 'me'])
    expect(sdk.NCEngine.userModule.subscribeEvent).toHaveBeenCalledWith({ userIds: ['u2', 'u3'], subscribeType: 1, expiry: 86400 })
    sdk.handlers['msg:crewbridge']._invoker.onMessageReceived({ messages: [sdk.message(), sdk.message({ messageId: 'x', isStatusMessage: true })] })
    sdk.handlers['chan:crewbridge']._invoker.onTypingStatusChanged({ channelIdentifier: new sdk.Identifier(1, 'u2'), userTypingStatus: [{ userId: 'u2', typingMessageType: 'RC:TxtMsg', sentTime: 1 }] })
    sdk.handlers['conn:crewbridge']._invoker.onConnectionStatusChanged({ status: 3 })
    expect(events).toEqual(
      expect.arrayContaining([
        { type: 'presence', online: { u2: true, u3: false } },
        { type: 'message', message: expect.objectContaining({ id: 'm1', key: 'group:evtA', text: 'hello', mine: false }) },
        { type: 'typing', key: 'direct:u2', userIds: ['u2'] },
        { type: 'connection', state: 'reconnecting', code: undefined },
      ]),
    )
    expect(events.filter((e) => (e as { type: string }).type === 'message')).toHaveLength(1) // status messages skipped
    await t.stop()
    expect(sdk.NCEngine.disconnect).toHaveBeenCalled()
  })
})
