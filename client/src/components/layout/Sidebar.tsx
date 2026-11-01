import { Plus } from 'lucide-react'
import { NavLink } from 'react-router'
import { primaryNav, secondaryNav, type NavItem } from '../../app/navigation'
import { cn } from '../../lib/cn'
import { ButtonLink } from '../ui/Button'
import { Logo } from '../ui/Logo'
import { useAccess } from '../../lib/data/permissions'

function NavEntry({ item, onNavigate }: { item: NavItem; onNavigate?: () => void }) {
  const Icon = item.icon
  return (
    <NavLink
      to={item.to}
      end={item.to === '/app'}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'group flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-[13.5px] transition-colors duration-150',
          isActive ? 'bg-sage font-medium text-primary' : 'text-ink-soft hover:bg-subtle hover:text-ink',
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon aria-hidden strokeWidth={isActive ? 2 : 1.75} className={cn('size-[17px]', isActive ? 'text-primary' : 'text-muted group-hover:text-ink-soft')} />
          <span className="truncate">{item.label}</span>
        </>
      )}
    </NavLink>
  )
}

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const can = useAccess()
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-15 items-center px-4">
        <Logo />
      </div>

      {can.canCreateEvent && (
        <div className="px-3 pb-2">
          <ButtonLink to="/app/events/new" onClick={onNavigate} size="md" className="w-full" leadingIcon={<Plus className="size-4" aria-hidden />}>
            Create event
          </ButtonLink>
        </div>
      )}

      <nav aria-label="Main" className="flex-1 overflow-y-auto px-3 py-2">
        <p className="px-2.5 pb-1.5 pt-2 text-2xs font-medium uppercase tracking-[0.06em] text-muted">Workspace</p>
        <ul className="space-y-0.5">
          {primaryNav.map((item) => (
            <li key={item.to}>
              <NavEntry item={item} onNavigate={onNavigate} />
            </li>
          ))}
        </ul>
      </nav>

      <div className="border-t border-line px-3 py-3">
        <ul className="space-y-0.5">
          {secondaryNav.map((item) => (
            <li key={item.to}>
              <NavEntry item={item} onNavigate={onNavigate} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
