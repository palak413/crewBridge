import {
  CalendarDays,
  ChartNoAxesColumn,
  LayoutDashboard,
  ListChecks,
  MessagesSquare,
  Settings,
  Users,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  label: string
  to: string
  icon: LucideIcon
  /** Page title shown in the top bar. */
  title: string
  /** Milestone in which the page becomes functional (for placeholder pages). */
  milestone?: number
  summary?: string
}

export const primaryNav: NavItem[] = [
  { label: 'Overview', to: '/app', icon: LayoutDashboard, title: 'Overview' },
  {
    label: 'My Events',
    to: '/app/events',
    icon: CalendarDays,
    title: 'My Events',
    summary: 'Create events, set up departments and manage each event in its own workspace.',
  },
  {
    label: 'Tasks',
    to: '/app/tasks',
    icon: ListChecks,
    title: 'Tasks',
    summary: 'A Kanban board for every event — create, assign and track work across departments.',
  },
  {
    label: 'Volunteers',
    to: '/app/volunteers',
    icon: Users,
    title: 'Volunteers',
    summary: 'Your volunteer directory with availability, departments and assigned work.',
  },
  {
    label: 'Messages',
    to: '/app/messages',
    icon: MessagesSquare,
    title: 'Messages',
    summary: 'Event, department and direct channels with real-time messaging powered by the Nexconn Chat SDK.',
  },
  {
    label: 'Analytics',
    to: '/app/analytics',
    icon: ChartNoAxesColumn,
    title: 'Analytics',
    milestone: 5,
    summary: 'Completion rates, response times and coverage — computed from your real event data.',
  },
]

export const secondaryNav: NavItem[] = [
  {
    label: 'Settings',
    to: '/app/settings',
    icon: Settings,
    title: 'Settings',
    milestone: 3,
    summary: 'Profile, workspace and notification preferences.',
  },
]

export const allNav = [...primaryNav, ...secondaryNav]

export function navItemFor(pathname: string): NavItem | undefined {
  // Longest prefix wins so /app/events/new resolves to My Events.
  return [...allNav].sort((a, b) => b.to.length - a.to.length).find((n) => pathname === n.to || pathname.startsWith(n.to + '/'))
}
