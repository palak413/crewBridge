import { CalendarDays, Hash, LayoutDashboard, ListChecks, MessagesSquare, Paperclip, SendHorizontal, Users } from 'lucide-react'
import { Avatar } from '../../../components/ui/Avatar'
import { Badge, StatusDot, type BadgeTone } from '../../../components/ui/Badge'
import { LogoMark } from '../../../components/ui/Logo'
import { cn } from '../../../lib/cn'

/**
 * A static, illustrative depiction of the product used on the marketing page.
 * Purely decorative (aria-hidden) and captioned as illustrative — never presented as live data.
 */

type Card = { title: string; dept: string; priority: { label: string; tone: BadgeTone }; who: string; due: string }

const columns: { name: string; cards: Card[] }[] = [
  {
    name: 'To do',
    cards: [
      { title: 'Print badge reprints', dept: 'Registration', priority: { label: 'High', tone: 'warning' }, who: 'Meera Iyer', due: '10:30' },
      { title: 'Stock water at Hall C', dept: 'Hospitality', priority: { label: 'Medium', tone: 'neutral' }, who: 'Leo Grant', due: '11:00' },
    ],
  },
  {
    name: 'In progress',
    cards: [
      { title: 'Cover registration desk B', dept: 'Registration', priority: { label: 'Urgent', tone: 'danger' }, who: 'Ana Ruiz', due: '09:40' },
      { title: 'Projector check, Room 2', dept: 'Tech support', priority: { label: 'High', tone: 'warning' }, who: 'Dev Patel', due: '10:00' },
    ],
  },
  {
    name: 'Completed',
    cards: [{ title: 'Speaker green room setup', dept: 'Logistics', priority: { label: 'Low', tone: 'neutral' }, who: 'Sam Chen', due: '08:30' }],
  },
]

const navItems = [
  { icon: LayoutDashboard, label: 'Overview' },
  { icon: CalendarDays, label: 'Events' },
  { icon: ListChecks, label: 'Tasks', active: true },
  { icon: Users, label: 'Volunteers' },
  { icon: MessagesSquare, label: 'Messages' },
]

function TaskCard({ card }: { card: Card }) {
  return (
    <div className="rounded-[10px] border border-line bg-surface p-3 shadow-xs">
      <div className="flex items-center justify-between gap-2">
        <Badge tone={card.priority.tone} dot={card.priority.tone === 'danger'}>
          {card.priority.label}
        </Badge>
        <span className="text-2xs tabular-nums text-muted">{card.due}</span>
      </div>
      <p className="mt-2 text-[12.5px] font-medium leading-snug text-ink">{card.title}</p>
      <div className="mt-2.5 flex items-center justify-between">
        <span className="text-2xs text-muted-strong">{card.dept}</span>
        <Avatar name={card.who} size="xs" />
      </div>
    </div>
  )
}

function ChatPane() {
  const messages = [
    { who: 'Priya Sharma', text: 'Desk B needs cover — Ana, can you take it?', time: '09:31' },
    { who: 'Ana Ruiz', text: 'Accepted. Heading there now.', time: '09:32' },
  ]
  return (
    <div className="flex h-full flex-col border-l border-line bg-surface">
      <div className="flex items-center gap-2 border-b border-line px-3.5 py-2.5">
        <Hash className="size-3.5 text-muted" />
        <span className="text-xs font-medium text-ink">registration</span>
        <span className="ml-auto flex items-center gap-1 text-2xs text-muted-strong">
          <StatusDot tone="success" className="size-1.5" /> 6 online
        </span>
      </div>
      <div className="flex-1 space-y-3.5 px-3.5 py-3.5">
        {messages.map((m) => (
          <div key={m.text} className="flex gap-2">
            <Avatar name={m.who} size="xs" className="mt-0.5" />
            <div className="min-w-0">
              <p className="text-2xs">
                <span className="font-medium text-ink">{m.who}</span> <span className="text-muted">{m.time}</span>
              </p>
              <p className="mt-0.5 text-xs leading-[1.45] text-ink-soft">{m.text}</p>
            </div>
          </div>
        ))}
        <div className="rounded-[10px] border border-sage-strong bg-sage/60 px-2.5 py-2">
          <p className="text-2xs font-medium text-primary">Task accepted</p>
          <p className="mt-0.5 text-2xs text-ink-soft">Cover registration desk B → Ana Ruiz</p>
        </div>
        <p className="flex items-center gap-1.5 text-2xs text-muted">
          <span className="flex gap-0.5">
            <span className="size-1 rounded-full bg-muted" />
            <span className="size-1 rounded-full bg-muted/70" />
            <span className="size-1 rounded-full bg-muted/40" />
          </span>
          Meera is typing
        </p>
      </div>
      <div className="m-2.5 flex items-center gap-2 rounded-[10px] border border-line-strong px-2.5 py-2">
        <span className="flex-1 text-2xs text-muted">Message #registration</span>
        <Paperclip className="size-3.5 text-muted" />
        <span className="flex size-6 items-center justify-center rounded-md bg-primary text-white">
          <SendHorizontal className="size-3" />
        </span>
      </div>
    </div>
  )
}

export function ProductPreview({ className }: { className?: string }) {
  return (
    <figure className={cn('relative', className)}>
      <div aria-hidden className="overflow-hidden rounded-panel border border-line-strong/80 bg-canvas shadow-frame">
        <div className="flex items-center gap-3 border-b border-line bg-surface px-4 py-2.5">
          <LogoMark className="size-5" />
          <span className="text-xs font-medium text-ink">TechFest 2026</span>
          <span className="hidden text-xs text-muted sm:inline">/ Tasks</span>
          <span className="ml-auto flex -space-x-1.5">
            {['Priya Sharma', 'Ana Ruiz', 'Dev Patel', 'Leo Grant'].map((n) => (
              <Avatar key={n} name={n} size="xs" />
            ))}
          </span>
        </div>
        <div className="grid h-[340px] grid-cols-1 sm:h-[380px] md:grid-cols-[150px_1fr] lg:grid-cols-[160px_1fr_260px]">
          <div className="hidden border-r border-line bg-surface px-2.5 py-3 md:block">
            {navItems.map(({ icon: Icon, label, active }) => (
              <div
                key={label}
                className={cn('flex items-center gap-2 rounded-md px-2 py-1.5 text-xs', active ? 'bg-sage font-medium text-primary' : 'text-ink-soft')}
              >
                <Icon className="size-3.5" />
                {label}
              </div>
            ))}
            <p className="mt-4 px-2 text-[10px] font-medium uppercase tracking-[0.06em] text-muted">Channels</p>
            {['general', 'registration', 'hospitality'].map((c) => (
              <div key={c} className={cn('flex items-center gap-1.5 px-2 py-1 text-xs', c === 'registration' ? 'text-ink' : 'text-muted-strong')}>
                <Hash className="size-3" />
                {c}
              </div>
            ))}
          </div>
          <div className="overflow-hidden px-3.5 py-3.5">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {columns.map((col, i) => (
                <div key={col.name} className={cn('min-w-0', i === 2 && 'hidden sm:block')}>
                  <div className="mb-2 flex items-center gap-1.5 px-0.5">
                    <span className="text-[11.5px] font-medium text-ink-soft">{col.name}</span>
                    <span className="text-2xs text-muted">{col.cards.length}</span>
                  </div>
                  <div className="space-y-2">
                    {col.cards.map((card) => (
                      <TaskCard key={card.title} card={card} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="hidden lg:block">
            <ChatPane />
          </div>
        </div>
      </div>
      <figcaption className="mt-3 text-center text-xs text-muted">Illustrative workspace. Names and tasks are examples.</figcaption>
    </figure>
  )
}
