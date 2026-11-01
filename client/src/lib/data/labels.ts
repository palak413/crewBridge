import type { BadgeTone } from '../../components/ui/Badge'
import type { Availability, CoverTheme, EventStatus, TaskPriority, TaskStatus } from './types'

export const eventStatusMeta: Record<EventStatus, { label: string; tone: BadgeTone }> = {
  draft: { label: 'Draft', tone: 'neutral' },
  upcoming: { label: 'Upcoming', tone: 'primary' },
  live: { label: 'Live', tone: 'success' },
  completed: { label: 'Completed', tone: 'neutral' },
}

export const taskStatusMeta: Record<TaskStatus, { label: string }> = {
  todo: { label: 'To do' },
  in_progress: { label: 'In progress' },
  completed: { label: 'Completed' },
}

export const priorityMeta: Record<TaskPriority, { label: string; tone: BadgeTone; rank: number }> = {
  urgent: { label: 'Urgent', tone: 'danger', rank: 0 },
  high: { label: 'High', tone: 'warning', rank: 1 },
  medium: { label: 'Medium', tone: 'neutral', rank: 2 },
  low: { label: 'Low', tone: 'neutral', rank: 3 },
}

export const availabilityMeta: Record<Availability, { label: string; tone: BadgeTone }> = {
  available: { label: 'Available', tone: 'success' },
  busy: { label: 'Busy', tone: 'warning' },
  unavailable: { label: 'Unavailable', tone: 'neutral' },
}

export const roleLabel = {
  organizer: 'Organizer',
  leader: 'Team leader',
  volunteer: 'Volunteer',
} as const

/** Tonal event covers (used when no cover image URL is set). Solid fills with a quiet pattern — no gradients. */
export const coverMeta: Record<CoverTheme, { label: string; className: string }> = {
  forest: { label: 'Forest', className: 'bg-[#236B52] text-white' },
  sage: { label: 'Sage', className: 'bg-[#DCE9E0] text-[#1C5843]' },
  sand: { label: 'Sand', className: 'bg-[#EFE6D6] text-[#6E5729]' },
  slate: { label: 'Slate', className: 'bg-[#DFE6EA] text-[#34525F]' },
  clay: { label: 'Clay', className: 'bg-[#F0DDD6] text-[#7D4535]' },
}
