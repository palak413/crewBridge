import { SectionHeading } from './SectionHeading'

const steps = [
  { title: 'Create an event', body: 'Add dates, location and departments like Registration, Hospitality and Tech support.' },
  { title: 'Bring in your crew', body: 'Invite team leaders and volunteers. Channels for each department are set up automatically.' },
  { title: 'Assign the work', body: 'Create tasks with priorities and due times, and assign them to the right people.' },
  { title: 'Run the day live', body: 'Track progress, message teams in real time and re-dispatch urgent tasks in seconds.' },
]

export function HowItWorks() {
  return (
    <section id="how-it-works" aria-labelledby="how-title" className="scroll-mt-20 border-y border-line bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-24">
        <SectionHeading id="how-title" eyebrow="How it works" title="From plan to event day in four steps." />
        <ol className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          {steps.map((s, i) => (
            <li key={s.title} className="relative">
              <div className="flex items-center gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-sage-strong bg-sage text-[13px] font-semibold text-primary">
                  {i + 1}
                </span>
                {i < steps.length - 1 && <span aria-hidden className="hidden h-px flex-1 bg-line lg:block" />}
              </div>
              <h3 className="mt-4 text-[15px] font-semibold text-ink">{s.title}</h3>
              <p className="mt-1.5 text-sm leading-6 text-muted-strong">{s.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
