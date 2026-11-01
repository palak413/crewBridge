import { ArrowLeft } from 'lucide-react'
import { useLocation } from 'react-router'
import { navItemFor } from '../../app/navigation'
import { Badge } from '../../components/ui/Badge'
import { ButtonLink } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState'

/** Honest placeholder for sections scheduled in later milestones. */
export function PlannedPage() {
  const { pathname } = useLocation()
  const item = navItemFor(pathname)
  if (!item) return null

  return (
    <div className="rounded-card border border-line bg-surface shadow-card">
      <EmptyState
        icon={item.icon}
        title={`${item.title} is on the way`}
        description={
          <>
            <span className="block">{item.summary}</span>
            {item.milestone && (
              <span className="mt-3 inline-block">
                <Badge tone="primary">Planned · Milestone {item.milestone}</Badge>
              </span>
            )}
          </>
        }
        action={
          <ButtonLink to="/app" variant="secondary" size="sm" leadingIcon={<ArrowLeft className="size-3.5" aria-hidden />}>
            Back to overview
          </ButtonLink>
        }
        className="py-20"
      />
    </div>
  )
}
