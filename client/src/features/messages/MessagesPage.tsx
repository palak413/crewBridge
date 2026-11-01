import { MessagesSquare, PlugZap, RotateCcw, WifiOff } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState'
import { LoadError, LoadingRows } from '../../components/ui/LoadState'
import { ApiError } from '../../lib/api/client'
import { cn } from '../../lib/cn'
import { chatStore, useChatState } from '../../lib/chat/chatStore'
import { useDataSource } from '../../lib/data/dataContext'
import type { DataSource } from '../../lib/data/source'
import { usePeople } from '../../lib/data/queries'
import { ChannelList } from './ChannelList'
import { buildSections, type ListItem } from './sections'
import { Thread } from './Thread'

const NONE: never[] = []

/** The transport matching the workspace: Nexconn for live accounts, local-only for the demo. Loaded on demand. */
const makeTransport = async (src: DataSource) =>
  src.kind === 'http'
    ? (await import('../../lib/chat/nexconnTransport')).createNexconnTransport()
    : (await import('../../lib/chat/demoTransport')).createDemoTransport(src)

function useChatConnection() {
  const src = useDataSource()
  useEffect(() => {
    void chatStore.start(() => makeTransport(src))
  }, [src])
  return async () => {
    await chatStore.stop()
    await chatStore.start(() => makeTransport(src))
  }
}

export function MessagesPage() {
  const reconnect = useChatConnection()
  const [params, setParams] = useSearchParams()
  const people = usePeople()
  const status = useChatState((s) => s.status)
  const error = useChatState((s) => s.error)
  const session = useChatState((s) => s.session)
  const transport = useChatState((s) => s.transport)
  const unread = useChatState((s) => s.unread)
  const online = useChatState((s) => s.online)
  const activeKey = params.get('c')

  const peopleList = people.data ?? NONE
  const peopleById = useMemo(() => new Map(peopleList.map((p) => [p.id, p])), [peopleList])
  const sections = useMemo(() => (session ? buildSections(session, peopleList) : null), [session, peopleList])
  const all = useMemo(() => (sections ? [...sections.events, ...sections.departments, ...sections.direct] : []), [sections])
  const active = all.find((i) => i.key === activeKey) ?? null

  // On wide screens, open the first channel automatically.
  useEffect(() => {
    if (!activeKey && all.length && window.matchMedia?.('(min-width: 1024px)').matches) setParams({ c: all[0].key }, { replace: true })
  }, [activeKey, all, setParams])

  useEffect(() => {
    chatStore.open(active?.ref ?? null)
    return () => chatStore.open(null)
  }, [active])

  const select = (item: ListItem) => setParams({ c: item.key })
  const retry = () => void reconnect()

  const live = transport === 'nexconn'
  const connected = status === 'connected'

  if (status === 'unavailable') {
    return (
      <Panel>
        <EmptyState
          icon={PlugZap}
          title="Messaging isn’t set up yet"
          description="Real-time messaging uses Nexconn. An administrator needs to add the Nexconn App Key, App Secret and data center to the CrewBridge server."
          className="py-20"
        />
      </Panel>
    )
  }

  if (status === 'error' && !session) {
    return (
      <Panel>
        <LoadError error={new ApiError('SERVER_UNAVAILABLE', error ?? 'Couldn’t connect to messaging.')} onRetry={retry} className="py-20" />
      </Panel>
    )
  }

  if (!session || !sections || people.isPending) {
    return (
      <Panel>
        <div className="p-6" role="status" aria-label="Connecting to messaging">
          <LoadingRows rows={5} label="Connecting to messaging" />
        </div>
      </Panel>
    )
  }

  return (
    <div className="space-y-3">
      {!live && (
        <Alert tone="info">Demo messages are saved only in this browser and aren’t sent through Nexconn. Sign in to a live workspace for real-time messaging.</Alert>
      )}
      {live && (status === 'reconnecting' || status === 'disconnected' || status === 'connecting') && (
        <div role="status" className="flex items-center gap-2 rounded-control border border-warning/20 bg-warning-soft px-3 py-2 text-[13px] text-warning">
          <WifiOff className="size-4 shrink-0" aria-hidden />
          <span className="flex-1">{status === 'disconnected' ? 'You’re offline. Messages will resume when the connection returns.' : 'Reconnecting to messaging…'}</span>
          {status === 'disconnected' && (
            <Button variant="ghost" size="sm" onClick={retry} leadingIcon={<RotateCcw className="size-3.5" aria-hidden />}>
              Reconnect
            </Button>
          )}
        </div>
      )}
      <Panel className="flex h-[calc(100dvh-11rem)] min-h-[28rem] overflow-hidden">
        <div className={cn('w-full shrink-0 border-line lg:block lg:w-72 lg:border-r', active ? 'hidden' : 'block')}>
          <ChannelList sections={sections} activeKey={activeKey} unread={unread} online={online} presence={live} onSelect={select} />
        </div>
        {active ? (
          <Thread key={active.key} item={active} people={peopleById} presence={live} connected={connected} onBack={() => setParams({})} />
        ) : (
          <div className="hidden flex-1 lg:flex">
            <EmptyState icon={MessagesSquare} title="Choose a conversation" description="Pick an event, department or person on the left." className="m-auto" />
          </div>
        )}
      </Panel>
    </div>
  )
}

function Panel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('rounded-card border border-line bg-surface shadow-card', className)}>{children}</div>
}
