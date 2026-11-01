import { Check, MessagesSquare, Zap } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Avatar } from '../../components/ui/Avatar'
import { Badge } from '../../components/ui/Badge'
import { Logo } from '../../components/ui/Logo'

const COPYRIGHT_YEAR = new Date().getFullYear()

/** Illustrative product moment for the auth aside. Clearly a depiction, not live data. */
function DispatchIllustration() {
  return (
    <div aria-hidden className="relative mx-auto w-full max-w-sm">
      <div className="rounded-panel border border-line bg-surface p-4 shadow-frame">
        <div className="flex items-center justify-between">
          <Badge tone="danger" dot>
            Urgent
          </Badge>
          <span className="text-2xs text-muted">Due in 20 min</span>
        </div>
        <p className="mt-3 text-sm font-medium text-ink">Cover registration desk B</p>
        <p className="mt-1 text-xs text-muted-strong">Registration · Main hall</p>
        <div className="mt-4 space-y-2">
          {[
            { name: 'Ana Ruiz', reason: 'Available · Registration team' },
            { name: 'Dev Patel', reason: 'Available · Check-in skill' },
          ].map((c, i) => (
            <div key={c.name} className="flex items-center gap-2.5 rounded-control border border-line px-2.5 py-2">
              <Avatar name={c.name} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-ink">{c.name}</p>
                <p className="truncate text-2xs text-muted-strong">{c.reason}</p>
              </div>
              {i === 0 ? (
                <span className="inline-flex items-center gap-1 text-2xs font-medium text-success">
                  <Check className="size-3" /> Accepted
                </span>
              ) : (
                <span className="text-2xs text-muted">Offered</span>
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="absolute -bottom-16 -right-8 hidden w-56 rounded-card border border-line bg-surface p-3 shadow-pop xl:block">
        <div className="flex items-center gap-2 text-2xs text-muted-strong">
          <MessagesSquare className="size-3.5 text-primary" /> #registration
        </div>
        <p className="mt-1.5 text-xs text-ink">On my way to desk B now.</p>
      </div>
    </div>
  )
}

export function AuthLayout({ title, subtitle, children, footer }: { title: string; subtitle: string; children: ReactNode; footer: ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <div className="flex flex-col px-5 py-6 sm:px-10">
        <Link to="/" aria-label="CrewBridge home" className="self-start">
          <Logo />
        </Link>
        <main className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-[380px]">
            <h1 className="text-[26px] font-semibold tracking-[-0.02em] text-ink">{title}</h1>
            <p className="mt-1.5 text-sm text-muted-strong">{subtitle}</p>
            <div className="mt-7">{children}</div>
            <div className="mt-6 text-center text-[13px] text-muted-strong">{footer}</div>
          </div>
        </main>
        <p className="text-xs text-muted">© {COPYRIGHT_YEAR} CrewBridge</p>
      </div>

      <aside className="relative hidden overflow-hidden border-l border-line bg-sage/60 lg:flex lg:flex-col lg:justify-center lg:px-14">
        <div className="dot-grid absolute inset-0 opacity-60" aria-hidden />
        <div className="relative">
          <p className="inline-flex items-center gap-1.5 text-[13px] font-medium text-primary">
            <Zap className="size-3.5" aria-hidden /> Smart task dispatch
          </p>
          <p className="mt-3 max-w-md text-[22px] font-semibold leading-snug tracking-[-0.015em] text-ink">
            When a volunteer drops out, the right replacement is one tap away.
          </p>
          <p className="mt-3 max-w-md text-sm leading-6 text-muted-strong">
            CrewBridge matches open tasks to available volunteers by team and skills — and shows exactly why each person is suggested.
          </p>
          <div className="mt-12">
            <DispatchIllustration />
          </div>
        </div>
      </aside>
    </div>
  )
}
