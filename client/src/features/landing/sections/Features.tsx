import { Bell, CalendarDays, Check, CircleDot, Hash, ListChecks, MessagesSquare, ShieldCheck, Zap, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Avatar } from '../../../components/ui/Avatar'
import { Badge, StatusDot } from '../../../components/ui/Badge'
import { cn } from '../../../lib/cn'
import { SectionHeading } from './SectionHeading'

function Tile({
  icon: Icon,
  title,
  body,
  children,
  className,
}: {
  icon: LucideIcon
  title: string
  body: string
  children?: ReactNode
  className?: string
}) {
  return (
    <article className={cn('flex flex-col overflow-hidden rounded-panel border border-line bg-surface shadow-card', className)}>
      <div className="p-6">
        <span className="flex size-9 items-center justify-center rounded-control bg-sage text-primary">
          <Icon className="size-[18px]" aria-hidden strokeWidth={1.75} />
        </span>
        <h3 className="mt-4 text-[15.5px] font-semibold tracking-[-0.01em] text-ink">{title}</h3>
        <p className="mt-1.5 text-sm leading-6 text-muted-strong">{body}</p>
      </div>
      {children && (
        <div aria-hidden className="mt-auto border-t border-line bg-canvas px-6 py-5">
          {children}
        </div>
      )}
    </article>
  )
}

function ChatSnippet() {
  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap gap-1.5">
        {['general', 'registration', 'hospitality', 'tech-support'].map((c, i) => (
          <span
            key={c}
            className={cn(
              'inline-flex items-center gap-1 rounded-md border px-2 py-1 text-2xs',
              i === 1 ? 'border-sage-strong bg-surface font-medium text-primary' : 'border-line bg-surface text-muted-strong',
            )}
          >
            <Hash className="size-3" />
            {c}
          </span>
        ))}
      </div>
      <div className="flex gap-2.5 rounded-[10px] border border-line bg-surface p-3">
        <Avatar name="Priya Sharma" size="sm" />
        <div>
          <p className="text-2xs">
            <span className="font-medium text-ink">Priya Sharma</span> <span className="text-muted">Organizer · 09:31</span>
          </p>
          <p className="mt-0.5 text-[12.5px] text-ink-soft">Doors open in 15 minutes. Registration team, please be at your desks.</p>
        </div>
      </div>
    </div>
  )
}

function DispatchSnippet() {
  const rows = [
    { name: 'Ana Ruiz', reasons: ['Available', 'Registration', '1 active task'], score: 'Best match' },
    { name: 'Dev Patel', reasons: ['Available', 'Check-in skill', '2 active tasks'], score: 'Good match' },
  ]
  return (
    <div className="space-y-2">
      {rows.map((r, i) => (
        <div key={r.name} className="flex items-center gap-3 rounded-[10px] border border-line bg-surface p-2.5">
          <Avatar name={r.name} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-ink">{r.name}</p>
            <p className="mt-0.5 flex flex-wrap gap-x-2 gap-y-0.5 text-2xs text-muted-strong">
              {r.reasons.map((x) => (
                <span key={x} className="inline-flex items-center gap-1">
                  <Check className="size-2.5 text-success" strokeWidth={3} /> {x}
                </span>
              ))}
            </p>
          </div>
          <Badge tone={i === 0 ? 'primary' : 'neutral'}>{r.score}</Badge>
        </div>
      ))}
    </div>
  )
}

function AvailabilitySnippet() {
  const people = [
    { name: 'Meera Iyer', status: 'Available', tone: 'success' as const },
    { name: 'Leo Grant', status: 'Busy', tone: 'warning' as const },
    { name: 'Sam Chen', status: 'Unavailable', tone: 'neutral' as const },
  ]
  return (
    <ul className="space-y-2">
      {people.map((p) => (
        <li key={p.name} className="flex items-center gap-2.5">
          <Avatar name={p.name} size="xs" />
          <span className="flex-1 text-xs text-ink-soft">{p.name}</span>
          <span className="flex items-center gap-1.5 text-2xs text-muted-strong">
            <StatusDot tone={p.tone} className="size-1.5" />
            {p.status}
          </span>
        </li>
      ))}
    </ul>
  )
}

function BoardSnippet() {
  return (
    <div className="grid grid-cols-3 gap-2">
      {[
        ['To do', 3],
        ['In progress', 2],
        ['Done', 5],
      ].map(([label, n]) => (
        <div key={label} className="rounded-[10px] border border-line bg-surface p-2">
          <p className="text-2xs font-medium text-ink-soft">{label}</p>
          <div className="mt-2 space-y-1">
            {Array.from({ length: Math.min(Number(n), 3) }).map((_, i) => (
              <div key={i} className="h-1.5 rounded-full bg-line" style={{ width: `${90 - i * 18}%` }} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export function Features() {
  return (
    <section id="features" aria-labelledby="features-title" className="scroll-mt-20">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
        <SectionHeading
          id="features-title"
          eyebrow="Features"
          title="Everything your crew needs, nothing it doesn't."
          body="Built around how organizers, team leaders and volunteers actually work on event day."
        />
        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Tile
            className="lg:col-span-2"
            icon={MessagesSquare}
            title="Real-time team channels"
            body="Every event and department gets its own channel, plus direct messages — with presence, typing indicators and history. Powered by the Nexconn Chat SDK."
          >
            <ChatSnippet />
          </Tile>
          <Tile icon={ListChecks} title="Task board" body="Create, assign and track work by priority, department and due time on a clean Kanban board.">
            <BoardSnippet />
          </Tile>
          <Tile icon={CircleDot} title="Live availability" body="Volunteers mark themselves available, busy or unavailable, so you always know who can help.">
            <AvailabilitySnippet />
          </Tile>
          <Tile
            className="lg:col-span-2"
            icon={Zap}
            title="Smart task dispatch"
            body="When a gap opens, CrewBridge ranks available volunteers by team, skills and workload using transparent rules — and shows why each person is suggested. Assign directly or offer it to several; first to accept gets it."
          >
            <DispatchSnippet />
          </Tile>
          <Tile icon={CalendarDays} title="Event workspaces" body="Dates, location, departments and volunteers for each event, organized in one place." />
          <Tile icon={Bell} title="Notifications that matter" body="New assignments, urgent announcements, deadlines and acceptances — no noise." />
          <Tile icon={ShieldCheck} title="Roles & permissions" body="Organizers, team leaders and volunteers each see and do exactly what their role needs." />
        </div>
      </div>
    </section>
  )
}

