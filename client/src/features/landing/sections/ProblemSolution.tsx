import { Check, Minus } from 'lucide-react'
import { SectionHeading } from './SectionHeading'

const before = [
  'Updates buried in a dozen group chats',
  'Shift lists in spreadsheets nobody trusts',
  'No idea who is actually free right now',
  'Urgent gaps filled by frantic phone calls',
]

const after = [
  'Event and department channels in one place',
  'Every task has an owner, a due time and a status',
  'Volunteers share live availability',
  'Open tasks matched to available people in seconds',
]

export function ProblemSolution() {
  return (
    <section aria-labelledby="problem-title" className="border-y border-line bg-surface">
      <div className="mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[1fr_1.15fr] lg:gap-16 lg:py-24">
        <SectionHeading
          id="problem-title"
          eyebrow="The problem"
          title="Events run on people. People run on information."
          body="When coordination lives across chats, sheets and calls, small gaps become missed shifts and unstaffed desks. CrewBridge gives every role the same live picture."
        />
        <div className="grid overflow-hidden rounded-panel border border-line sm:grid-cols-2">
          <div className="bg-canvas p-6">
            <p className="text-[13px] font-medium text-muted-strong">Without CrewBridge</p>
            <ul className="mt-5 space-y-4">
              {before.map((t) => (
                <li key={t} className="flex gap-3 text-sm leading-6 text-muted-strong">
                  <Minus className="mt-1 size-4 shrink-0 text-muted" aria-hidden />
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="border-t border-line bg-surface p-6 sm:border-l sm:border-t-0">
            <p className="text-[13px] font-medium text-primary">With CrewBridge</p>
            <ul className="mt-5 space-y-4">
              {after.map((t) => (
                <li key={t} className="flex gap-3 text-sm leading-6 text-ink">
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-sage text-primary">
                    <Check className="size-3" strokeWidth={2.5} aria-hidden />
                  </span>
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
