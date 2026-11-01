import { ArrowLeft, Hash, RotateCcw, SendHorizontal, Users } from 'lucide-react'
import { useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react'
import { Avatar } from '../../components/ui/Avatar'
import { Button } from '../../components/ui/Button'
import { Skeleton } from '../../components/ui/LoadState'
import { cn } from '../../lib/cn'
import { chatStore, useChatState } from '../../lib/chat/chatStore'
import type { ChatMessage } from '../../lib/chat/types'
import type { Person } from '../../lib/data/types'
import type { ListItem } from './sections'

const time = (ms: number) => new Date(ms).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
const day = (ms: number) => new Date(ms).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
const NO_MESSAGES: ChatMessage[] = []
const NO_TYPING: string[] = []

export function Thread({
  item,
  people,
  presence,
  connected,
  onBack,
}: {
  item: ListItem
  people: Map<string, Person>
  presence: boolean
  connected: boolean
  onBack: () => void
}) {
  const thread = useChatState((s) => s.threads[item.key])
  const typingIds = useChatState((s) => s.typing[item.key] ?? NO_TYPING)
  const isOnline = useChatState((s) => s.online[item.ref.id])
  const me = useChatState((s) => s.session?.userId)
  const messages = thread?.messages ?? NO_MESSAGES
  const [draft, setDraft] = useState('')
  const scroller = useRef<HTMLDivElement>(null)
  const stick = useRef(true)
  const prevHeight = useRef(0)
  const prevFirst = useRef<string | undefined>(undefined)

  // Keep the view pinned to the newest message unless the user scrolled up; preserve position when older pages load.
  useLayoutEffect(() => {
    const el = scroller.current
    if (!el) return
    const first = messages[0]?.id
    if (prevFirst.current && first !== prevFirst.current && !stick.current) el.scrollTop += el.scrollHeight - prevHeight.current
    else if (stick.current) el.scrollTop = el.scrollHeight
    prevFirst.current = first
    prevHeight.current = el.scrollHeight
  }, [messages])

  const send = () => {
    const text = draft.trim()
    if (!text || !connected) return
    stick.current = true
    setDraft('')
    void chatStore.send(item.ref, text)
  }
  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      send()
    }
  }

  const typingNames = typingIds.map((id) => people.get(id)?.name.split(' ')[0] ?? 'Someone')
  const Icon = item.person ? null : item.key.startsWith('group:dep') ? Users : Hash

  return (
    <section aria-label={`Conversation: ${item.name}`} className="flex h-full min-w-0 flex-1 flex-col">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-line px-3 sm:px-4">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to conversations"
          className="-ml-1 inline-flex size-8 items-center justify-center rounded-control text-muted-strong hover:bg-subtle hover:text-ink lg:hidden"
        >
          <ArrowLeft className="size-4" aria-hidden />
        </button>
        {Icon ? (
          <span className="flex size-8 items-center justify-center rounded-lg border border-line bg-canvas text-muted-strong">
            <Icon className="size-4" aria-hidden />
          </span>
        ) : (
          <Avatar name={item.name} size="sm" />
        )}
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold text-ink">{item.name}</h2>
          <p className="truncate text-xs text-muted-strong">
            {item.person && presence ? (isOnline ? 'Online' : isOnline === false ? 'Offline' : 'Status unknown') : item.hint}
          </p>
        </div>
      </header>

      <div
        ref={scroller}
        onScroll={(e) => {
          const el = e.currentTarget
          stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 48
        }}
        className="flex-1 overflow-y-auto px-3 py-4 sm:px-5"
        aria-live="polite"
        aria-relevant="additions"
      >
        {!thread?.loaded && thread?.loading !== false ? (
          <div className="space-y-4" role="status" aria-label="Loading messages">
            {[0, 1, 2].map((i) => (
              <div key={i} className={cn('flex gap-2.5', i === 1 && 'justify-end')}>
                {i !== 1 && <Skeleton className="size-7 rounded-full" />}
                <Skeleton className={cn('h-10 rounded-2xl', i === 1 ? 'w-40' : 'w-56')} />
              </div>
            ))}
          </div>
        ) : (
          <>
            {thread?.error && (
              <div
                role="alert"
                className="mb-3 flex items-center justify-between gap-3 rounded-control border border-danger/20 bg-danger-soft px-3 py-2 text-[13px] text-danger"
              >
                {thread.error}
                <Button variant="ghost" size="sm" onClick={() => void chatStore.loadOlder(item.ref)} leadingIcon={<RotateCcw className="size-3.5" aria-hidden />}>
                  Retry
                </Button>
              </div>
            )}
            {thread?.hasMore && thread.loaded && (
              <div className="mb-4 flex justify-center">
                <Button variant="secondary" size="sm" loading={thread.loading} onClick={() => void chatStore.loadOlder(item.ref)}>
                  Load earlier messages
                </Button>
              </div>
            )}
            {messages.length === 0 && !thread?.error ? (
              <div className="flex h-full flex-col items-center justify-center py-10 text-center">
                <p className="text-sm font-medium text-ink">No messages yet</p>
                <p className="mt-1 max-w-xs text-[13px] text-muted-strong">
                  {item.person ? `Start a conversation with ${item.name.split(' ')[0]}.` : 'Say hello to the team — everyone in this channel will see it.'}
                </p>
              </div>
            ) : (
              <ol className="space-y-1">
                {messages.map((m, i) => {
                  const prev = messages[i - 1]
                  const newDay = !prev || day(prev.sentAt) !== day(m.sentAt)
                  const grouped = !newDay && prev && prev.senderId === m.senderId && m.sentAt - prev.sentAt < 5 * 60_000
                  const sender = people.get(m.senderId)
                  const name = m.mine || m.senderId === me ? 'You' : (sender?.name ?? 'Former member')
                  return (
                    <li key={m.id}>
                      {newDay && <p className="my-3 text-center text-2xs font-medium uppercase tracking-[0.06em] text-muted">{day(m.sentAt)}</p>}
                      <div className={cn('flex gap-2.5', m.mine ? 'justify-end' : 'justify-start', !grouped && 'mt-3')}>
                        {!m.mine && <span className="w-7 shrink-0">{!grouped && <Avatar name={sender?.name ?? '?'} size="sm" />}</span>}
                        <div className={cn('flex max-w-[78%] flex-col', m.mine ? 'items-end' : 'items-start')}>
                          {!grouped && (
                            <p className="mb-0.5 text-2xs text-muted-strong">
                              {!m.mine && <span className="font-medium text-ink-soft">{name} · </span>}
                              {time(m.sentAt)}
                            </p>
                          )}
                          <p
                            className={cn(
                              'whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-[13.5px] leading-5',
                              m.mine ? 'rounded-br-md bg-primary text-white' : 'rounded-bl-md border border-line bg-surface text-ink',
                              m.status === 'sending' && 'opacity-60',
                              m.text === null && 'italic text-muted-strong',
                            )}
                          >
                            {m.text ?? 'This message type isn’t supported here yet.'}
                          </p>
                          {m.status === 'failed' && (
                            <button
                              type="button"
                              onClick={() => void chatStore.send(item.ref, m.text ?? '', m.id)}
                              className="mt-0.5 inline-flex items-center gap-1 text-2xs font-medium text-danger hover:underline"
                            >
                              <RotateCcw className="size-3" aria-hidden /> Not sent — retry
                            </button>
                          )}
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ol>
            )}
          </>
        )}
      </div>

      <div className="h-5 shrink-0 px-5 text-xs text-muted-strong" aria-live="polite">
        {typingNames.length > 0 && `${typingNames.join(', ')} ${typingNames.length > 1 ? 'are' : 'is'} typing…`}
      </div>
      <form
        className="flex shrink-0 items-end gap-2 border-t border-line p-3"
        onSubmit={(e) => {
          e.preventDefault()
          send()
        }}
      >
        <textarea
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value)
            if (e.target.value) chatStore.typing(item.ref)
          }}
          onKeyDown={onKeyDown}
          rows={1}
          maxLength={2000}
          disabled={!connected}
          aria-label={`Message ${item.name}`}
          placeholder={connected ? `Message ${item.person ? item.name.split(' ')[0] : item.name}` : 'Reconnecting…'}
          className="max-h-32 min-h-9 flex-1 resize-none rounded-control border border-line bg-canvas px-3 py-2 text-[13.5px] leading-5 text-ink [field-sizing:content] placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15 disabled:opacity-60"
        />
        <Button type="submit" disabled={!draft.trim() || !connected} aria-label="Send message" className="h-9 px-3">
          <SendHorizontal className="size-4" aria-hidden />
        </Button>
      </form>
    </section>
  )
}
