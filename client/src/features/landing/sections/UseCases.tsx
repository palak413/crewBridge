import { Building2, GraduationCap, HandHeart, Trees, type LucideIcon } from 'lucide-react'
import { useId, useRef, useState, type KeyboardEvent } from 'react'
import { cn } from '../../../lib/cn'
import { SectionHeading } from './SectionHeading'

const cases: { id: string; label: string; icon: LucideIcon; headline: string; body: string; departments: string[]; tasks: string[] }[] = [
  {
    id: 'festivals',
    label: 'College festivals',
    icon: GraduationCap,
    headline: 'Hundreds of student volunteers, one coordinated fest.',
    body: 'Run registration, hospitality, technical support and logistics as separate teams with their own channels, while organizers watch the whole event from one command center.',
    departments: ['Registration', 'Hospitality', 'Tech support', 'Logistics'],
    tasks: ['Staff check-in desks before doors open', 'Escort guest speakers to green room', 'Reset Hall B between sessions'],
  },
  {
    id: 'conferences',
    label: 'Conferences',
    icon: Building2,
    headline: 'Keep every room, session and speaker on schedule.',
    body: 'Assign room captains, track AV checks and reroute crew between tracks when sessions run long.',
    departments: ['Session rooms', 'AV', 'Speaker care', 'Info desk'],
    tasks: ['AV check in Room 3 before 10:00', 'Swap speaker order in Track B', 'Restock badge printer paper'],
  },
  {
    id: 'nonprofit',
    label: 'Nonprofit drives',
    icon: HandHeart,
    headline: 'Turn volunteer goodwill into reliable coverage.',
    body: 'Publish open shifts, let volunteers pick up what fits their availability and keep coordinators informed in real time.',
    departments: ['Intake', 'Sorting', 'Distribution', 'Outreach'],
    tasks: ['Cover 2–4pm distribution shift', 'Sort donated winter coats', 'Call back new sign-ups'],
  },
  {
    id: 'community',
    label: 'Community events',
    icon: Trees,
    headline: 'From park clean-ups to city marathons.',
    body: 'Coordinate spread-out crews across locations with team channels, live availability and urgent dispatch.',
    departments: ['Water stations', 'Marshals', 'First aid', 'Setup'],
    tasks: ['Move two marshals to the 10k turn', 'Refill station 4', 'Collect cones after the finish'],
  },
]

export function UseCases() {
  const [active, setActive] = useState(0)
  const baseId = useId()
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])
  const current = cases[active]

  const onKey = (e: KeyboardEvent) => {
    const dir = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    if (!dir) return
    e.preventDefault()
    const next = (active + dir + cases.length) % cases.length
    setActive(next)
    tabRefs.current[next]?.focus()
  }

  return (
    <section id="use-cases" aria-labelledby="use-cases-title" className="scroll-mt-20">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
        <SectionHeading id="use-cases-title" eyebrow="Use cases" title="Made for any event that runs on people." />

        <div role="tablist" aria-label="Use cases" onKeyDown={onKey} className="mt-10 flex gap-1 overflow-x-auto rounded-control border border-line bg-surface p-1 sm:inline-flex">
          {cases.map((c, i) => {
            const Icon = c.icon
            const selected = i === active
            return (
              <button
                key={c.id}
                ref={(el) => {
                  tabRefs.current[i] = el
                }}
                role="tab"
                id={`${baseId}-tab-${c.id}`}
                aria-selected={selected}
                aria-controls={`${baseId}-panel`}
                tabIndex={selected ? 0 : -1}
                onClick={() => setActive(i)}
                className={cn(
                  'inline-flex h-9 shrink-0 items-center gap-2 rounded-lg px-3 text-[13.5px] transition-colors',
                  selected ? 'bg-sage font-medium text-primary' : 'text-muted-strong hover:text-ink',
                )}
              >
                <Icon className="size-4" aria-hidden strokeWidth={1.75} />
                {c.label}
              </button>
            )
          })}
        </div>

        <div
          id={`${baseId}-panel`}
          role="tabpanel"
          aria-labelledby={`${baseId}-tab-${current.id}`}
          className="mt-6 grid gap-8 rounded-panel border border-line bg-surface p-6 shadow-card sm:p-8 lg:grid-cols-[1.2fr_1fr] lg:gap-12"
        >
          <div>
            <h3 className="text-xl font-semibold tracking-[-0.015em] text-ink">{current.headline}</h3>
            <p className="mt-3 text-[15px] leading-7 text-muted-strong">{current.body}</p>
            <p className="mt-6 text-[13px] font-medium text-ink-soft">Typical departments</p>
            <ul className="mt-2.5 flex flex-wrap gap-2">
              {current.departments.map((d) => (
                <li key={d} className="rounded-md border border-line bg-canvas px-2.5 py-1 text-[13px] text-ink-soft">
                  {d}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-card border border-line bg-canvas p-5">
            <p className="text-[13px] font-medium text-ink-soft">Example tasks</p>
            <ul className="mt-3 space-y-2.5">
              {current.tasks.map((t) => (
                <li key={t} className="flex items-start gap-2.5 rounded-[10px] border border-line bg-surface px-3 py-2.5 text-[13px] text-ink">
                  <span aria-hidden className="mt-1 size-3 shrink-0 rounded-full border-[1.5px] border-line-strong" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
